import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import FloatingBackButton from '../components/FloatingBackButton';
import Button from '../components/Button';
import CodeEditor from '../components/CodeEditor';
import ConsolePanel, { CONSOLE_MUTED, CONSOLE_RED } from '../components/ConsolePanel';
import Mascot from '../components/Mascot';
import { useProgress } from '../context/ProgressContext';
import { clearDraft, describeRunError, loadDraft, runChallenge, saveDraft } from '../services/challenges';
import { recordChallengeStreak } from '../services/progress';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';
import { StatusPill } from './ChallengesScreen';

// One fixed line per kind of failure (decided over per-challenge or AI hints);
// the console above it carries the real compiler or runtime message.
const WHAT_TO_FIX = {
  compile: 'Java could not compile your code. Look at the line number in the first error: a missing ; or } is the usual cause.',
  runtime: 'Your program crashed while running. The console names the exception and the line it happened on.',
  timeout: 'A loop probably never ends. Check that its condition eventually becomes false.',
  failedExample: 'Close, but the output must match exactly, including capitals, spaces and punctuation. Compare it with the expected output.',
  failedHidden: 'Your code passes the example but not every hidden test. Make sure it works for any input, not just the example: try zero, negatives or a single value.',
  offline: 'Connect to the internet to run or submit. You can keep editing meanwhile.',
  signature: 'Keep the names and signatures the starter code gives you.',
};

/** What the Output section shows for a result: { status, statusColor, console, consoleColor, hint, tests }. */
function describe(result, running, challenge) {
  if (running) {
    return { status: 'Running…', statusColor: CONSOLE_MUTED, console: 'Compiling Main.java…', consoleColor: CONSOLE_MUTED };
  }
  if (!result) {
    return { status: 'Not run yet', statusColor: colors.textMuted, console: 'Run your code to see the output here.', consoleColor: CONSOLE_MUTED };
  }
  const red = { statusColor: colors.error, consoleColor: CONSOLE_RED };
  switch (result.status) {
    case 'offline':
      return { ...red, status: 'Runner offline', console: 'Could not reach the code runner. Your code is saved on this phone.', hint: WHAT_TO_FIX.offline };
    case 'refused':
      return { ...red, status: result.label, console: result.message };
    case 'compile':
      return {
        ...red,
        status: 'Compile error',
        console: result.error,
        // The pre-written main calls the method by name, so a changed signature fails to compile.
        hint: challenge.stub ? `${WHAT_TO_FIX.compile} ${WHAT_TO_FIX.signature}` : WHAT_TO_FIX.compile,
      };
    case 'runtime':
      return { ...red, status: 'Runtime error', console: [result.stdout, result.error].filter(Boolean).join('\n'), hint: WHAT_TO_FIX.runtime };
    case 'timeout':
      return {
        ...red,
        status: 'Time limit exceeded',
        console: 'Time limit exceeded. Your program ran too long and was stopped.',
        hint: WHAT_TO_FIX.timeout,
      };
    default: {
      const passed = result.tests.filter((t) => t.passed).length;
      const allPassed = passed === result.tests.length;
      const visibleFailed = result.tests.some((t) => !t.hidden && !t.passed);
      // A submit with hidden tests runs only those, so it has no output to show.
      const hiddenOnly = result.tests.every((t) => t.hidden);
      return {
        status: `${passed}/${result.tests.length} tests passed · ${result.timeSeconds}s`,
        statusColor: allPassed ? colors.success : colors.error,
        console: hiddenOnly ? 'Submit runs the hidden tests only. Press Run to see your output.' : result.stdout || '(no output)',
        consoleColor: !hiddenOnly && result.stdout ? colors.codeText : CONSOLE_MUTED,
        hint: allPassed ? null : visibleFailed ? WHAT_TO_FIX.failedExample : WHAT_TO_FIX.failedHidden,
        tests: result.tests,
      };
    }
  }
}

function TestCard({ test, outputOnly }) {
  // Skipped after an earlier failure, to save runner credits: neither passed nor failed.
  const tone = test.notRun
    ? { background: colors.surfaceSunken, color: colors.textMuted, icon: '–' }
    : test.passed
      ? { background: colors.successBg, color: colors.success, icon: '✓' }
      : { background: colors.errorBg, color: colors.error, icon: '✕' };
  return (
    <View style={styles.test}>
      <View style={[styles.testIcon, { backgroundColor: tone.background }]}>
        <Text style={[styles.testIconLabel, { color: tone.color }]}>{tone.icon}</Text>
      </View>
      <View style={styles.testBody}>
        <Text style={styles.testLabel}>{test.label}</Text>
        {test.hidden ? (
          <>
            <Text style={styles.testLine}>Input and expected output hidden</Text>
            <Text style={[styles.testLine, { color: tone.color }]}>
              {test.notRun ? 'Not run: an earlier test failed' : test.passed ? 'Passed' : 'Failed'}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.testLine}>
              {outputOnly ? `Expected ${test.expected}` : `Input ${test.input} · Expected ${test.expected}`}
            </Text>
            <Text style={[styles.testLine, { color: test.passed ? colors.success : colors.error }]}>
              Got {test.got.trimEnd() || '(no output)'}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

export default function ChallengeScreen({ route, navigation }) {
  const { challenge } = route.params;
  const { courses, lessons, offline, isChallengeSolved, reloadProgress } = useProgress();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const [code, setCode] = useState(null); // null until the draft has loaded
  const [running, setRunning] = useState(null); // 'run' | 'submit' while waiting
  const [hintShown, setHintShown] = useState(false);
  const [allowance, setAllowance] = useState(null); // { left, limit } from the last check
  const [result, setResult] = useState(null);
  // Kept in memory only, for the solved screen.
  const submits = useRef(0);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    loadDraft(challenge.id)
      .then((draft) => setCode(draft ?? challenge.starterCode))
      .catch(() => setCode(challenge.starterCode));
  }, [challenge]);

  function handleChange(text) {
    setCode(text);
    // Untouched starter code is not a draft, or opening a challenge would mark it In progress.
    (text === challenge.starterCode ? clearDraft(challenge.id) : saveDraft(challenge.id, text)).catch(() => {});
  }

  function resetCode() {
    Alert.alert('Reset code?', 'This replaces your code with the starter code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          handleChange(challenge.starterCode);
          setResult(null);
        },
      },
    ]);
  }

  async function check(mode) {
    if (offline) {
      setResult({ status: 'offline' });
      return;
    }
    setRunning(mode);
    setResult(null);
    try {
      const outcome = await runChallenge(challenge.id, code, mode);
      if (outcome.allowance) setAllowance(outcome.allowance);
      if (mode === 'submit') submits.current += 1;
      if (outcome.solved) {
        // The function saved the solve; the streak follows the phone's own day.
        await recordChallengeStreak().catch(() => {});
        // Already saved on the server, so a failed refresh must not read as a failed run.
        await reloadProgress().catch(() => {});
        navigation.replace('ChallengeSolved', {
          challenge,
          code,
          result: outcome,
          submits: submits.current,
          elapsedMs: Date.now() - openedAt.current,
        });
        return;
      }
      setResult(outcome);
    } catch (err) {
      setResult(describeRunError(err));
    } finally {
      setRunning(null);
    }
  }

  // Bring the result into view, since it sits below the editor.
  useEffect(() => {
    if (result) scrollRef.current?.scrollToEnd({ animated: true });
  }, [result]);

  const levelTitle = courses.find((course) => course.id === challenge.level)?.title ?? '';
  const pillStatus = isChallengeSolved(challenge.id)
    ? 'solved'
    : code !== null && code !== challenge.starterCode
      ? 'started'
      : 'new';
  const output = describe(result, running, challenge);
  const outputOnly = challenge.kind === 'output';

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.backSpace} />
            <Text style={styles.eyebrow} numberOfLines={1}>
              Code Challenges · {levelTitle}
            </Text>
            <StatusPill status={pillStatus} />
          </View>

          <View>
            <Text style={styles.title}>{challenge.title}</Text>
            <Text style={styles.meta}>
              {outputOnly ? 'Output' : 'In → Out'} · ~{challenge.minutes} min
            </Text>
          </View>

          <View>
            <Text style={styles.description}>{challenge.description}</Text>
          </View>

          <View style={styles.example}>
            <Text style={styles.exampleLabel}>Example</Text>
            {outputOnly ? null : (
              <View style={styles.exampleRow}>
                <Text style={styles.exampleKey}>Input</Text>
                <Text style={styles.exampleValue}>{challenge.example.input}</Text>
              </View>
            )}
            <View style={styles.exampleRow}>
              <Text style={styles.exampleKey}>Output</Text>
              <Text style={styles.exampleValue}>{challenge.example.output}</Text>
            </View>
          </View>

          {/* Which lessons this challenge practices, each one a way back to the lesson. */}
          <View style={styles.example}>
            <Text style={styles.exampleLabel}>Practices</Text>
            {(challenge.practices ?? []).map((lessonId) => {
              const lesson = lessons.find((l) => l.id === lessonId);
              return lesson ? (
                <Pressable
                  key={lessonId}
                  onPress={() => navigation.navigate('LessonDetail', { lessonId, lessonTitle: lesson.title })}
                  accessibilityRole="link"
                  hitSlop={4}
                >
                  <Text style={styles.practicesLink}>{lesson.title} ›</Text>
                </Pressable>
              ) : null;
            })}
            {challenge.hint ? (
              hintShown ? (
                <Text style={styles.hintBody}>{challenge.hint}</Text>
              ) : (
                <Pressable onPress={() => setHintShown(true)} accessibilityRole="button" hitSlop={4}>
                  <Text style={styles.link}>Show hint</Text>
                </Pressable>
              )
            ) : null}
          </View>

          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Your code</Text>
              <Pressable onPress={resetCode} hitSlop={8} accessibilityRole="button" disabled={code === null}>
                <Text style={styles.link}>Reset code</Text>
              </Pressable>
            </View>
            {code === null ? (
              <View style={styles.editorPlaceholder} />
            ) : (
              <CodeEditor value={code} onChangeText={handleChange} accessibilityLabel="Your Java code" />
            )}
            <View style={styles.buttons}>
              <Button
                label="▶ Run"
                variant="secondary"
                style={styles.button}
                loading={running === 'run'}
                disabled={!code?.trim() || running !== null}
                onPress={() => check('run')}
              />
              <Button
                label="Submit"
                style={styles.button}
                loading={running === 'submit'}
                disabled={!code?.trim() || running !== null}
                onPress={() => check('submit')}
              />
            </View>
            {/* Known only after a run: the counter lives on the server. */}
            {allowance ? (
              <Text style={styles.allowance}>
                {allowance.left} of {allowance.limit} checks left today
              </Text>
            ) : null}
          </View>

          <View>
            <ConsolePanel
              status={output.status}
              statusColor={output.statusColor}
              text={output.console}
              textColor={output.consoleColor}
            />
            {output.hint ? (
              <View style={styles.hint} accessibilityRole="alert">
                <Mascot variant="confused" px={36} decorative animate={false} />
                <Text style={styles.hintText}>
                  <Text style={styles.hintLead}>What to fix · </Text>
                  {output.hint}
                </Text>
              </View>
            ) : null}
            {output.tests ? (
              <View style={styles.tests}>
                {output.tests.map((test) => (
                  <TestCard key={test.label} test={test} outputOnly={outputOnly} />
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <FloatingBackButton onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: spacing.xl,
    gap: 18,
  },
  // Where the floating back button sits, so the header keeps its layout.
  backSpace: {
    width: 40,
    height: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    ...type.sectionLabel,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    color: colors.textMuted,
    flex: 1,
  },
  title: {
    ...type.screenTitle,
    color: colors.text,
  },
  meta: {
    ...type.sectionLabel,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.08,
    color: colors.textMuted,
    marginTop: 6,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.6,
    color: colors.text,
  },
  example: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    gap: 10,
  },
  exampleLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  exampleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  exampleKey: {
    width: 56,
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 12.5 * 1.5,
    color: colors.textMuted,
  },
  practicesLink: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.primaryDark,
  },
  hintBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: colors.text,
  },
  exampleValue: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.text,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 13 * 0.08,
    textTransform: 'uppercase',
    color: colors.text,
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
    paddingVertical: 6,
  },
  editorPlaceholder: {
    height: 160,
    borderRadius: 18,
    backgroundColor: colors.codeBg,
  },
  allowance: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  button: {
    flex: 1,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(180,72,62,.32)',
    backgroundColor: colors.errorBg,
  },
  hintText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.55,
    color: colors.text,
  },
  hintLead: {
    fontFamily: fonts.bold,
  },
  tests: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  test: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  testIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testIconLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  testBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  testLabel: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.text,
  },
  testLine: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.5,
    color: colors.textMuted,
  },
});
