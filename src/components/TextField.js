import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme/colors';

/**
 * Labeled text input shared by the auth and profile forms. Keeping the label
 * attached to the field (rather than using placeholders as labels) means the
 * field still says what it is once the user has typed in it.
 */
export default function TextField({ label, hint, style, ...inputProps }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...inputProps}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    ...type.small,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 2,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  hint: {
    ...type.small,
    color: colors.textMuted,
    marginLeft: 2,
  },
});
