import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing, type } from '../theme/colors';

/**
 * Labeled text input shared by the auth and profile forms. Keeping the label
 * attached to the field (rather than using placeholders as labels) means the
 * field still says what it is once the user has typed in it.
 *
 * Passing `secureTextEntry` also adds a reveal toggle, since typing a long
 * password blind on a phone keyboard is where most typos come from.
 */
export default function TextField({ label, hint, error, style, secureTextEntry, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputRow, focused && styles.inputRowFocused, error && styles.inputRowError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isPassword && !revealed}
          {...inputProps}
        />

        {isPassword ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            style={({ pressed }) => [styles.reveal, pressed && styles.revealPressed]}
          >
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingRight: spacing.sm,
  },
  inputRowFocused: {
    borderColor: colors.primary,
  },
  inputRowError: {
    borderColor: colors.error,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  reveal: {
    padding: spacing.sm,
  },
  revealPressed: {
    opacity: 0.5,
  },
  hint: {
    ...type.small,
    color: colors.textMuted,
    marginLeft: 2,
  },
  errorText: {
    ...type.small,
    color: colors.error,
    marginLeft: 2,
  },
});
