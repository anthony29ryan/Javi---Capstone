import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../theme/colors';

const HALF_PULSE = { duration: 700, easing: Easing.inOut(Easing.ease) };

/**
 * A grey placeholder block that pulses while its content loads (the design's
 * 1.4 s fade to 45% and back). Size and shape come from `style`.
 */
export default function Skeleton({ style }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.45, HALF_PULSE), withTiming(1, HALF_PULSE)),
      -1
    );
  }, [reduceMotion, opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[{ backgroundColor: colors.surfaceSunken }, style, pulse]} />;
}

/**
 * A sticker's outline while it loads: white, a light 2px border and the real
 * sticker's tilt, with no hard shadow. Skeleton bars go inside.
 */
export function SkeletonSticker({ tilt = 0, style, children }) {
  return <View style={[styles.sticker, { transform: [{ rotate: `${tilt}deg` }] }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  sticker: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(46,49,65,.12)',
  },
});
