import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { colors, fonts, spacing } from '../theme/colors';

// Strong ease-out: the change lands almost immediately under the finger,
// then settles.
export const PRESS_EASING = cubicBezier(0.23, 1, 0.32, 1);
export const PRESS_DURATION = '120ms';

/**
 * Shared button so every screen gets the same height, radius, and press
 * feedback instead of each one restyling a Pressable.
 *
 * variant: 'primary' (filled) | 'secondary' (outlined) | 'ghost' (text only)
 *
 * Press feedback is a Reanimated CSS transition: we flip `pressed` on
 * press-in/out and Reanimated animates between the two styles on the UI
 * thread. The outer Pressable takes the caller's `style` (margins, width,
 * alignment) so layout stays exactly as it was; the inner Animated.View owns
 * the visuals that animate.
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) {
  const [pressed, setPressed] = useState(false);
  // Users who turn on "reduce motion" still get the colour change, just not the scale.
  const reduceMotion = useReducedMotion();
  const isDisabled = disabled || loading;
  const showPressed = pressed && !isDisabled;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isDisabled}
      pressRetentionOffset={16}
      style={style}
    >
      <Animated.View
        style={[
          styles.base,
          styles[variant],
          showPressed && styles[`${variant}Pressed`],
          showPressed && !reduceMotion && styles.pressedScale,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primaryDark} />
        ) : (
          <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    opacity: 1,
    transform: [{ scale: 1 }],
    transitionProperty: ['transform', 'backgroundColor', 'opacity'],
    transitionDuration: PRESS_DURATION,
    transitionTimingFunction: PRESS_EASING,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.bold,
    letterSpacing: 14 * 0.06,
    textTransform: 'uppercase',
  },
  primary: {
    backgroundColor: colors.button,
  },
  primaryPressed: {
    backgroundColor: colors.buttonPressed,
  },
  primaryLabel: {
    color: colors.white,
  },
  secondary: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryPressed: {
    backgroundColor: colors.primarySoft,
  },
  secondaryLabel: {
    color: colors.primaryDark,
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
    fontFamily: fonts.medium,
    fontSize: 15,
    letterSpacing: 0,
    textTransform: 'none',
  },
  disabled: {
    opacity: 0.5,
  },
});
