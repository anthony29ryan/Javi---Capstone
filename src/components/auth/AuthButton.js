import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { authColors, authRadius, authType } from '../../theme/authTheme';

/**
 * Buttons for the auth flow. variant: 'primary' (filled pill) | 'secondary'
 * (outlined pill) — matches the two button styles in the design handoff.
 */
export default function AuthButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  labelStyle,
}) {
  const isDisabled = disabled || loading;
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        isPrimary ? styles.primary : styles.secondary,
        pressed && !isDisabled && (isPrimary ? styles.primaryPressed : styles.secondaryPressed),
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? authColors.white : authColors.accentDeep} />
      ) : (
        <Text style={[isPrimary ? styles.primaryLabel : styles.secondaryLabel, labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    alignSelf: 'stretch',
    height: 56,
    borderRadius: authRadius.primaryButton,
    backgroundColor: authColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E3141',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 4,
  },
  primaryPressed: {
    backgroundColor: authColors.accentDeep,
  },
  primaryLabel: {
    ...authType.primaryButtonLabel,
    color: authColors.white,
  },
  secondary: {
    alignSelf: 'stretch',
    height: 52,
    borderRadius: authRadius.secondaryButton,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.line,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryPressed: {
    backgroundColor: authColors.accentSoft,
  },
  secondaryLabel: {
    ...authType.secondaryButtonLabel,
    color: authColors.ink,
  },
  disabled: {
    opacity: 0.5,
  },
});
