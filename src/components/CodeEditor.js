import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { straightenQuotes } from '../services/tracer';
import { colors, fonts, spacing } from '../theme/colors';
import Text, { AppTextInput as TextInput, MAX_FONT_SCALE } from './AppText';

const FONT_SIZE = 13;
const LINE_HEIGHT = 22;
// JetBrains Mono draws every character 0.6em wide.
const CHAR_WIDTH = FONT_SIZE * 0.6;

/**
 * The Main.java card from the design: a line-number gutter beside a plain
 * multiline input. Lines never wrap, so each number stays beside its line;
 * long lines scroll sideways instead. A phone TextInput cannot turn wrapping
 * off, so the input is made as wide as its longest line, which with a
 * fixed-width font is just characters times width.
 *
 * Without onChangeText it is read-only, for showing a solution.
 */
export default function CodeEditor({ value, onChangeText, placeholder, accessibilityLabel = 'Code editor' }) {
  const { fontScale } = useWindowDimensions();
  const lines = value.split('\n');
  const longest = Math.max(...lines.map((line) => line.length));
  // The input's paddingRight sits inside this width, so it is added on top of the two spare characters.
  const width = (longest + 2) * CHAR_WIDTH * Math.min(fontScale, MAX_FONT_SCALE) + spacing.lg;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.fileName}>Main.java</Text>
        <Text style={styles.language}>Java 17</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.gutter} importantForAccessibility="no-hide-descendants">
          {lines.map((_, i) => (
            <Text key={i} style={[styles.code, styles.number]}>
              {i + 1}
            </Text>
          ))}
        </View>
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <TextInput
            style={[styles.code, styles.input, { width }]}
            value={value}
            onChangeText={onChangeText && ((text) => onChangeText(straightenQuotes(text)))}
            editable={Boolean(onChangeText)}
            placeholder={placeholder}
            placeholderTextColor={colors.codeLabel}
            multiline
            scrollEnabled={false}
            autoCorrect={false}
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            accessibilityLabel={accessibilityLabel}
          />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    backgroundColor: colors.codeBg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.codeLine,
  },
  fileName: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.codeText,
  },
  language: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.codeLabel,
  },
  body: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  gutter: {
    width: 38,
    paddingRight: 10,
  },
  code: {
    fontFamily: fonts.monoRegular,
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    // Android pads text for accents by default, which would push the input's
    // lines out of step with the gutter's.
    includeFontPadding: false,
  },
  number: {
    textAlign: 'right',
    color: 'rgba(231,233,245,.3)',
  },
  scrollContent: {
    flexGrow: 1,
  },
  input: {
    minWidth: '100%',
    padding: 0,
    paddingRight: spacing.lg,
    color: colors.codeText,
  },
});
