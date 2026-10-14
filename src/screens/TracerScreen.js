import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Button from '../components/Button';
import { useProgress } from '../context/ProgressContext';
import { recordTraceCompletion } from '../services/progress';
import { lineMatches, mismatchIndex, straightenQuotes } from '../services/tracer';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

function formatDuration(ms) {
  const seconds = Math.round(ms / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

// shortcut: plain layout until the Code Tracer design from Claude Design is
// brought in; restyle this screen then.
export default function TracerScreen({ route, navigation }) {
  const { trace } = route.params;
  const { reloadProgress } = useProgress();

  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [elapsedMs, setElapsedMs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const startedAt = useRef(Date.now());

  useEffect(() => {
    navigation.setOptions({ title: trace.title });
  }, [trace.title]);

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

  function handleChange(raw) {
    const text = straightenQuotes(raw);
    if (!lineMatches(text, trace.lines[lineIndex])) {
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

  if (elapsedMs !== null) {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneLabel}>Drill complete</Text>
        <Text style={styles.doneTime}>{formatDuration(elapsedMs)}</Text>
        <Text style={styles.doneHint}>{trace.lines.length} lines typed</Text>
        {saveError ? (
          <>
            <Text style={styles.errorText}>{saveError}</Text>
            <Button label="Try again" variant="secondary" loading={saving} onPress={saveCompletion} />
          </>
        ) : null}
        <Button
          label="Back to drills"
          disabled={saving}
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
        />
      </View>
    );
  }

  const target = trace.lines[lineIndex];
  const attempt = typed.trimStart();
  const wrongAt = mismatchIndex(typed, target);
  const correctPart = wrongAt === -1 ? attempt : attempt.slice(0, wrongAt);
  const wrongPart = wrongAt === -1 ? '' : attempt.slice(wrongAt);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.progress}>
          Line {lineIndex + 1} of {trace.lines.length}
        </Text>

        <View style={styles.code}>
          {trace.lines.map((line, i) => (
            <Text
              key={i}
              style={[
                styles.codeLine,
                i < lineIndex && styles.codeLineDone,
                i === lineIndex && styles.codeLineCurrent,
                i > lineIndex && styles.codeLineUpcoming,
              ]}
            >
              {line}
            </Text>
          ))}
        </View>

        <Text style={styles.label}>Type the highlighted line</Text>
        <Text style={styles.target}>{target.trim()}</Text>
        {/* Green up to the first wrong character, red from there on. */}
        <Text style={styles.feedback} accessibilityLiveRegion="polite">
          <Text style={styles.feedbackRight}>{correctPart}</Text>
          <Text style={styles.feedbackWrong}>{wrongPart}</Text>
        </Text>

        <TextInput
          style={styles.input}
          value={typed}
          onChangeText={handleChange}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          // Keep the keyboard up between lines; Enter does nothing on its own.
          submitBehavior="submit"
          accessibilityLabel={`Type line ${lineIndex + 1}: ${target.trim()}`}
          placeholder="Start typing…"
          placeholderTextColor={colors.textMuted}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    padding: spacing.xl,
    gap: spacing.md,
  },
  progress: {
    ...type.small,
    color: colors.textMuted,
  },
  code: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.codeBg,
  },
  codeLine: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 20,
    color: colors.codeText,
  },
  codeLineDone: {
    color: colors.success,
  },
  codeLineCurrent: {
    backgroundColor: colors.codeLine,
  },
  codeLineUpcoming: {
    color: colors.codeLabel,
  },
  label: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  target: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.text,
  },
  feedback: {
    fontFamily: fonts.mono,
    fontSize: 14,
    minHeight: 20,
  },
  feedbackRight: {
    color: colors.success,
  },
  feedbackWrong: {
    color: colors.error,
    backgroundColor: colors.errorBg,
  },
  input: {
    fontFamily: fonts.mono,
    fontSize: 14,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  doneLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  doneTime: {
    fontFamily: fonts.bold,
    fontSize: 40,
    color: colors.text,
  },
  doneHint: {
    ...type.small,
    color: colors.textMuted,
  },
  errorText: {
    ...type.small,
    color: colors.error,
    textAlign: 'center',
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
