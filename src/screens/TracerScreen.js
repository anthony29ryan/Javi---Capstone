import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackButton from '../components/auth/AuthBackButton';
import Button from '../components/Button';
import { useProgress } from '../context/ProgressContext';
import { recordTraceCompletion } from '../services/progress';
import { countsAsSlip, lineMatches, mismatchIndex, straightenQuotes } from '../services/tracer';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function Header({ onBack, right }) {
  return (
    <View style={styles.header}>
      <AuthBackButton onPress={onBack} />
      <Text style={styles.headerLabel}>Code Tracer</Text>
      {right ? <Text style={styles.headerRight}>{right}</Text> : null}
    </View>
  );
}

function Stat({ label, value, alert, large }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, large && styles.statValueLarge, alert && styles.statValueAlert]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The line being typed: what the student has typed so far, bright while it is
 * right and red from the first wrong character on, then the caret on the next
 * character of the target and the rest of the target dimmed.
 */
function CurrentLine({ target, typed }) {
  const expected = target.trim();
  const indent = target.slice(0, target.length - target.trimStart().length);
  const attempt = typed.trimStart();
  const wrongAt = mismatchIndex(typed, target);
  const right = wrongAt === -1 ? attempt : attempt.slice(0, wrongAt);
  const wrong = wrongAt === -1 ? '' : attempt.slice(wrongAt);
  // Past the end of the target the caret sits on a blank cell instead.
  const caret = expected[attempt.length] ?? ' ';
  const rest = expected.slice(attempt.length + 1);

  return (
    <Text style={styles.codeText} accessibilityLiveRegion="polite">
      {indent}
      <Text style={styles.charDone}>{right}</Text>
      <Text style={styles.charWrong}>{wrong}</Text>
      <Text style={styles.charCaret}>{caret}</Text>
      <Text style={styles.charPending}>{rest}</Text>
    </Text>
  );
}

export default function TracerScreen({ route, navigation }) {
  const { trace, topic, level } = route.params;
  const { reloadProgress } = useProgress();
  const insets = useSafeAreaInsets();

  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState('');
  // Kept in memory only: nothing about a drill run is written to `attempts`.
  const [charactersTyped, setCharactersTyped] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const startedAt = useRef(Date.now());

  async function saveCompletion() {
    setSaving(true);
    setSaveError('');
    try {
      await recordTraceCompletion(trace.id);
      await reloadProgress();
    } catch {
      setSaveError('Could not save this drill. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  function restart() {
    setLineIndex(0);
    setTyped('');
    setCharactersTyped(0);
    setMistakes(0);
    setElapsedMs(null);
    setSaveError('');
    startedAt.current = Date.now();
  }

  function handleChange(raw) {
    const text = straightenQuotes(raw);
    const target = trace.lines[lineIndex];
    setCharactersTyped((count) => count + Math.max(0, text.length - typed.length));
    if (countsAsSlip(typed, text, target)) setMistakes((count) => count + 1);

    if (!lineMatches(text, target)) {
      setTyped(text);
      return;
    }
    // The line is right: move on straight away, no submit step.
    setTyped('');
    if (lineIndex < trace.lines.length - 1) {
      setLineIndex(lineIndex + 1);
      return;
    }
    setElapsedMs(Date.now() - startedAt.current);
    saveCompletion();
  }

  const eyebrow = [topic, level].filter(Boolean).join(' · ');
  const screenPadding = {
    paddingTop: insets.top + spacing.lg,
    paddingBottom: insets.bottom + spacing.xl,
  };

  if (elapsedMs !== null) {
    const accuracy =
      charactersTyped > 0 ? Math.max(0, Math.round((1 - mistakes / charactersTyped) * 100)) : 100;
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, screenPadding]}
      >
        <Header onBack={() => navigation.goBack()} />
        <View>
          <Text style={styles.completeEyebrow}>Trace complete</Text>
          <Text style={styles.resultTitle}>{trace.title}</Text>
          <Text style={styles.verdict}>
            {mistakes === 0
              ? 'A clean run, with no mistakes.'
              : `${mistakes} ${mistakes === 1 ? 'slip' : 'slips'}, all fixed before moving on.`}
          </Text>
        </View>

        <View style={styles.grid}>
          <Stat label="Time" value={formatDuration(elapsedMs)} large />
          <Stat label="Lines" value={String(trace.lines.length)} large />
          <Stat label="Mistakes" value={String(mistakes)} alert={mistakes > 0} large />
          <Stat label="Accuracy" value={`${accuracy}%`} large />
        </View>

        <View>
          <Text style={styles.sectionLabel}>What you typed</Text>
          <View style={styles.listing}>
            {trace.lines.map((line, i) => (
              <Text key={i} style={styles.listingLine}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        {saveError ? (
          <>
            <Text style={styles.errorText}>{saveError}</Text>
            <Button label="Try again" variant="secondary" loading={saving} onPress={saveCompletion} />
          </>
        ) : null}
        <Button label="Type it again" disabled={saving} onPress={restart} />
        <Button
          label="Back"
          variant="secondary"
          disabled={saving}
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    );
  }

  const target = trace.lines[lineIndex];
  const remaining = trace.lines.length - lineIndex - 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, styles.drillContent, screenPadding]}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Header
            onBack={() => navigation.goBack()}
            right={`Line ${lineIndex + 1} / ${trace.lines.length}`}
          />
          <View style={styles.track}>
            <View
              style={[styles.trackFill, { width: `${(lineIndex / trace.lines.length) * 100}%` }]}
            />
          </View>
        </View>

        <View>
          <Text style={styles.drillTitle}>{trace.title}</Text>
          {eyebrow ? <Text style={styles.drillEyebrow}>{eyebrow}</Text> : null}
        </View>

        <View style={styles.stats}>
          <Stat label="Typed" value={String(charactersTyped)} />
          <Stat label="Mistakes" value={String(mistakes)} alert={mistakes > 0} />
        </View>

        <View style={styles.panel}>
          {trace.lines.slice(0, lineIndex).map((line, i) => (
            <View key={i} style={styles.codeRow}>
              <Text style={styles.codeNumber}>{i + 1}</Text>
              <Text style={[styles.codeText, styles.codeDone]}>{line}</Text>
            </View>
          ))}
          <View style={styles.codeRow}>
            <Text style={styles.codeNumber}>{lineIndex + 1}</Text>
            <CurrentLine target={target} typed={typed} />
          </View>
          {remaining > 0 ? (
            <Text style={styles.moreLines}>
              {remaining} more {remaining === 1 ? 'line' : 'lines'}
            </Text>
          ) : null}

          {/* Invisible and covering the panel, so tapping the code brings the
              keyboard back; the panel itself shows what was typed. */}
          <TextInput
            style={styles.input}
            value={typed}
            onChangeText={handleChange}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            caretHidden
            contextMenuHidden
            underlineColorAndroid="transparent"
            // Keep the keyboard up between lines; Enter does nothing on its own.
            submitBehavior="submit"
            accessibilityLabel={`Type line ${lineIndex + 1}: ${target.trim()}`}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const codeLineHeight = 16 * 2.2;

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
  drillContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerLabel: {
    ...type.sectionLabel,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    color: colors.borderStrong,
    flex: 1,
  },
  headerRight: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceSunken,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  drillTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 22 * 1.25,
    letterSpacing: -22 * 0.02,
    color: colors.text,
  },
  drillEyebrow: {
    ...type.sectionLabel,
    color: colors.borderStrong,
    marginTop: 6,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    flexBasis: '40%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  statValue: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statValueLarge: {
    fontSize: 22,
  },
  statValueAlert: {
    color: colors.error,
  },
  panel: {
    flexGrow: 1,
    minHeight: 220,
    paddingVertical: 20,
    paddingRight: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.codeBg,
  },
  codeRow: {
    flexDirection: 'row',
  },
  codeNumber: {
    width: 40,
    paddingRight: spacing.md,
    textAlign: 'right',
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: codeLineHeight,
    color: colors.codeLabel,
  },
  codeText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 16,
    lineHeight: codeLineHeight,
    color: colors.codeText,
  },
  codeDone: {
    opacity: 0.6,
  },
  charDone: {
    color: colors.codeText,
  },
  // The design's exact red and caret colours were in the part of the file
  // that could not be read; these are chosen to stay legible on the dark panel.
  charWrong: {
    color: '#FF8A80',
    backgroundColor: 'rgba(255,138,128,.18)',
  },
  charPending: {
    color: 'rgba(231,233,245,.35)',
  },
  charCaret: {
    color: colors.white,
    backgroundColor: colors.primary,
  },
  moreLines: {
    ...type.sectionLabel,
    fontSize: 11,
    color: 'rgba(231,233,245,.4)',
    marginTop: spacing.md,
    paddingLeft: 40,
  },
  // Fully transparent rather than a transparent text colour, which Android
  // ignores; at opacity 0 it still takes taps and keeps the keyboard.
  input: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  completeEyebrow: {
    ...type.sectionLabel,
    color: colors.primaryDark,
  },
  resultTitle: {
    ...type.screenTitle,
    color: colors.text,
    marginTop: 6,
  },
  verdict: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  listing: {
    padding: spacing.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  listingLine: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.8,
    color: colors.text,
  },
  errorText: {
    ...type.small,
    color: colors.error,
    textAlign: 'center',
  },
});
