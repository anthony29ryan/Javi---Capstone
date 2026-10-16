import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { authColors, authRadius, authType } from '../../theme/authTheme';
import Text from '../AppText';

/**
 * Buttons for the auth flow. variant: 'primary' (filled pill) | 'secondary'
 * (outlined pill) — matches the two button styles in the design handoff.
 * `loadingLabel` (e.g. "Creating account…") shows beside the spinner while
 * loading; without it the spinner stands alone.
 */
export default function AuthButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  loadingLabel,
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
        <View style={styles.busy}>
          <ActivityIndicator
            size={loadingLabel ? 'small' : undefined}
            color={isPrimary ? authColors.white : authColors.accentDeep}
          />
          {loadingLabel ? (
            <Text style={[isPrimary ? styles.primaryLabel : styles.secondaryLabel, labelStyle]}>
              {loadingLabel}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={[isPrimary ? styles.primaryLabel : styles.secondaryLabel, labelStyle]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    alignSelf: 'stretch',
    // Grows past 56 when large text wraps the label.
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: authRadius.primaryButton,
    // The deeper tone at rest and the lighter one while pressed, so a press
    // reads as the button lighting up rather than it already looking pressed.
    backgroundColor: authColors.button,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E3141',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 4,
  },
  primaryPressed: {
    backgroundColor: authColors.buttonPressed,
  },
  primaryLabel: {
    ...authType.primaryButtonLabel,
    color: authColors.white,
  },
  secondary: {
    alignSelf: 'stretch',
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  busy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disabled: {
    opacity: 0.5,
  },
});
