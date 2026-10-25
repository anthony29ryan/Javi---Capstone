import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text, { AppTextInput as TextInput } from '../components/AppText';
import FloatingBackButton from '../components/FloatingBackButton';
import Button from '../components/Button';
import CodeEditor from '../components/CodeEditor';
import ConsolePanel, { CONSOLE_MUTED, CONSOLE_RED } from '../components/ConsolePanel';
import { useProgress } from '../context/ProgressContext';
import { describeRunError, PLAYGROUND_DRAFT_KEY, runCode } from '../services/challenges';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

// The design's four starting points (frame 42), code copied from its pgTemplates.
const TEMPLATES = [
  {
    label: 'Sum loop',
    code: 'public class Main {\n    public static void main(String[] args) {\n        int total = 0;\n        for (int i = 1; i <= 5; i++) {\n            total += i;\n        }\n        System.out.println("Sum: " + total);\n    }\n}',
  },
  {
    label: 'Hello, World',
    code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  },
  {
    label: 'Array max',
    code: 'public class Main {\n    public static void main(String[] args) {\n        int[] nums = {4, 9, 2, 7};\n        int max = nums[0];\n        for (int n : nums) {\n            if (n > max) max = n;\n        }\n        System.out.println("Largest: " + max);\n    }\n}',
  },
  {
    label: 'Class',
    code: 'public class Main {\n    static class Dog {\n        String name;\n        Dog(String n) { name = n; }\n        void bark() {\n            System.out.println(name + " says woof");\n        }\n    }\n    public static void main(String[] args) {\n        new Dog("Rex").bark();\n        new Dog("Bo").bark();\n    }\n}',
  },
];

/** What the Output card shows for a run: { status, statusColor, text, textColor }. */
function describe(result, running) {
  if (running) return { status: 'Running…', statusColor: CONSOLE_MUTED, text: 'Compiling Main.java…', textColor: CONSOLE_MUTED };
  if (!result) {
    return { status: 'Not run yet', statusColor: colors.textMuted, text: 'Tap Run to compile and run Main.java.', textColor: CONSOLE_MUTED };
  }
  const red = { statusColor: colors.error, textColor: CONSOLE_RED };
  switch (result.status) {
    case 'ok':
      return {
        status: `Finished · ${result.timeSeconds}s`,
        statusColor: colors.success,
        text: result.stdout || '(no output)',
        textColor: result.stdout ? colors.codeText : CONSOLE_MUTED,
      };
    case 'compile':
      return { ...red, status: 'Compile error', text: result.error };
    case 'runtime':
      return { ...red, status: 'Runtime error', text: [result.stdout, result.error].filter(Boolean).join('\n') };
    case 'timeout':
      return { ...red, status: 'Time limit exceeded', text: 'Time limit exceeded. Your program ran too long and was stopped.' };
    case 'offline':
      return {
        ...red,
        status: 'Runner offline',
        text: 'Could not reach the code runner. Connect to the internet and run again. Your code is kept.',
      };
    default:
      return { ...red, status: result.label, text: result.message };
  }
}

export default function PlaygroundScreen({ navigation }) {
  const { offline, progress, reloadProgress } = useProgress();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);

  const [code, setCode] = useState(null); // null until the saved code has loaded
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [allowance, setAllowance] = useState(null); // { left, limit } from the last run

  // Empty the first time; after that, whatever was left here last.
  useEffect(() => {
    AsyncStorage.getItem(PLAYGROUND_DRAFT_KEY)
      .catch(() => null)
      .then((saved) => setCode(saved ?? ''));
  }, []);

  // The chip lit up is the sample the editor still holds untouched, if any.
  const selectedTemplate = TEMPLATES.findIndex((t) => t.code === code);

  function changeCode(text) {
    setCode(text);
    AsyncStorage.setItem(PLAYGROUND_DRAFT_KEY, text).catch(() => {});
  }

  function replaceCode(text) {
    changeCode(text);
    setResult(null);
  }

  // Code the student wrote is never thrown away on one tap; an empty editor
  // or an untouched sample has nothing to lose.
  function loadTemplate(index) {
    if (!code?.trim() || selectedTemplate >= 0) {
      replaceCode(TEMPLATES[index].code);
      return;
    }
    Alert.alert(`Load ${TEMPLATES[index].label}?`, 'This replaces your code.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: () => replaceCode(TEMPLATES[index].code) },
    ]);
  }

  function clearCode() {
    Alert.alert('Clear code?', 'This deletes everything in the editor.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => replaceCode('') },
    ]);
  }

  async function run() {
    if (offline) {
      setResult({ status: 'offline' });
      return;
    }
    setRunning(true);
    setResult(null);
    try {
      const outcome = await runCode(code, stdin);
      if (outcome.allowance) setAllowance(outcome.allowance);
      setResult(outcome);
      // The function just set ranFirstProgram, so Profile's First Compile badge shows without a restart.
      if (outcome.status === 'ok' && !progress?.ranFirstProgram) reloadProgress().catch(() => {});
    } catch (err) {
      setResult(describeRunError(err));
    } finally {
      setRunning(false);
    }
  }

  // Bring the output into view, since it sits below the editor.
  useEffect(() => {
    if (result) scrollRef.current?.scrollToEnd({ animated: true });
  }, [result]);

  const output = describe(result, running);

  return (
    <View style={styles.container}>
      {/* Android too: SDK 54 is edge-to-edge, so the window no longer resizes for the keyboard. */}
      <KeyboardAvoidingView style={styles.container} behavior="padding">
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
            <Text style={styles.eyebrow}>Practice</Text>
          </View>

          <View>
            <Text style={styles.title}>Playground</Text>
            <Text style={styles.intro}>Write any Java and run it. Start from a template or from scratch.</Text>
          </View>

          <View style={styles.chips}>
            {TEMPLATES.map((template, index) => {
              const selected = index === selectedTemplate;
              return (
                <Pressable
                  key={template.label}
                  onPress={() => !selected && loadTemplate(index)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{template.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Your code</Text>
              <Pressable onPress={clearCode} hitSlop={8} accessibilityRole="button" disabled={!code}>
                <Text style={[styles.link, !code && styles.linkDisabled]}>Clear</Text>
              </Pressable>
            </View>
            {code === null ? (
              <View style={styles.editorPlaceholder} />
            ) : (
              <CodeEditor
                value={code}
                onChangeText={changeCode}
                placeholder="Write Java here, or pick a sample above."
                accessibilityLabel="Your Java code"
              />
            )}
            <TextInput
              style={styles.input}
              value={stdin}
              onChangeText={setStdin}
              placeholder="Input, for programs that use Scanner"
              placeholderTextColor={colors.borderStrong}
              multiline
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              accessibilityLabel="Program input"
            />
            <Button
              label="▶ Run"
              style={styles.run}
              loading={running}
              disabled={!code?.trim() || running}
              onPress={run}
            />
            {/* Known only after a run: the counter lives on the server. */}
            {allowance ? (
              <Text style={styles.allowance}>
                {allowance.left} of {allowance.limit} runs left today
              </Text>
            ) : null}
          </View>

          <View>
            <ConsolePanel
              status={output.status}
              statusColor={output.statusColor}
              text={output.text}
              textColor={output.textColor}
            />
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
    marginBottom: 6,
  },
  intro: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  chipLabelSelected: {
    color: colors.white,
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
  linkDisabled: {
    opacity: 0.4,
  },
  editorPlaceholder: {
    height: 200,
    borderRadius: 18,
    backgroundColor: colors.codeBg,
  },
  input: {
    marginTop: spacing.md,
    minHeight: 48,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontFamily: fonts.monoRegular,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
  },
  allowance: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  run: {
    marginTop: 14,
  },
});
