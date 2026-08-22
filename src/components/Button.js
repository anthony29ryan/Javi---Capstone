import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../theme/colors';

/**
 * Shared button so every screen gets the same height, radius, and press
 * feedback instead of each one restyling a Pressable.
 *
 * variant: 'primary' (filled) | 'secondary' (outlined) | 'ghost' (text only)
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled && styles[`${variant}Pressed`],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryLabel: {
    color: colors.white,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  secondaryPressed: {
    backgroundColor: colors.primarySoft,
  },
  secondaryLabel: {
    color: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 44,
  },
  ghostPressed: {
    opacity: 0.6,
  },
  ghostLabel: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
});
