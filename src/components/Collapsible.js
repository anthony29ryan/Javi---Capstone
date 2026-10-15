import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '../theme/colors';

const TIMING = { duration: 250, easing: Easing.inOut(Easing.cubic) };

// 0 closed, 1 open. Starts where `open` starts, so a section that is open on
// arrival does not animate in; after that it glides.
function useOpenProgress(open) {
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, TIMING);
  }, [open, progress]);
  return progress;
}

/**
 * An accordion body that grows and fades open. React Native's LayoutAnimation
 * does nothing on Android in this version, which is why sections used to snap.
 *
 * The content stays mounted in an absolutely placed inner view so its full
 * height can be measured even while closed; the outer view animates from 0 to
 * that height and clips the rest.
 */
export default function Collapsible({ open, children }) {
  const progress = useOpenProgress(open);
  const contentHeight = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    height: contentHeight.value * progress.value,
    opacity: progress.value,
  }));

  return (
    <Animated.View
      style={[styles.clip, style]}
      pointerEvents={open ? 'auto' : 'none'}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!open}
    >
      <View
        style={styles.content}
        onLayout={(event) => {
          contentHeight.value = event.nativeEvent.layout.height;
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

/** The accordion's ›, turning from pointing down (closed) to up (open). */
export function Chevron({ open }) {
  const progress = useOpenProgress(open);
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.borderStrong, colors.primaryDark]),
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [90, -90])}deg` }],
  }));
  return <Animated.Text style={[styles.chevron, style]}>›</Animated.Text>;
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  chevron: {
    fontFamily: fonts.mono,
    fontSize: 16,
    lineHeight: 16,
  },
});
