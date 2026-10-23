import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '../theme/colors';
import { MAX_FONT_SCALE } from './AppText';

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
export default function Collapsible({ open, onHeight, children }) {
  const progress = useOpenProgress(open);
  const contentHeight = useSharedValue(0);
  // Built on first open, then kept: building every closed section up front
  // held a screen's opening slide back until all of them were done.
  const [built, setBuilt] = useState(open);
  if (open && !built) setBuilt(true);

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
          onHeight?.(event.nativeEvent.layout.height);
        }}
      >
        {built ? children : null}
      </View>
    </Animated.View>
  );
}

/**
 * Keeps a tapped section still when the open one above it closes. Without
 * this, the closing section shrinks above it and drags it up the screen.
 *
 * Spread `scrollProps` on the list (an Animated.ScrollView or FlatList), and
 * pass `onHeight(id)` to each Collapsible. Call `beforeToggle(openId,
 * tappedId, ids)` (ids in list order) before switching: when the open section
 * sits above the tapped one, the list scrolls up by its height, frame by frame
 * on the UI thread with the collapse's own timing, so the two cancel out.
 */
export function useKeepInPlace() {
  const ref = useAnimatedRef();
  // Kept from the list's own events rather than useScrollViewOffset, which
  // warns while a screen still shows its skeleton and the list is not there.
  const offset = useRef(0);
  const heights = useRef({});
  const start = useSharedValue(0);
  const distance = useSharedValue(0);
  const shift = useSharedValue(1);

  useAnimatedReaction(
    () => shift.value,
    (value, previous) => {
      if (previous === null) return;
      scrollTo(ref, 0, Math.max(0, start.value - distance.value * value), false);
    }
  );

  const track = (event) => {
    offset.current = event.nativeEvent.contentOffset.y;
  };

  return {
    scrollProps: {
      ref,
      onScroll: track,
      onMomentumScrollEnd: track,
      onScrollEndDrag: track,
      scrollEventThrottle: 16,
    },
    onHeight: (id) => (height) => {
      heights.current[id] = height;
    },
    beforeToggle(openId, tappedId, ids) {
      if (!openId || openId === tappedId || ids.indexOf(openId) > ids.indexOf(tappedId)) return;
      start.value = offset.current;
      distance.value = heights.current[openId] ?? 0;
      shift.value = 0;
      shift.value = withTiming(1, TIMING);
    },
  };
}

/** The accordion's ›, turning from pointing down (closed) to up (open). */
export function Chevron({ open }) {
  const progress = useOpenProgress(open);
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [colors.borderStrong, colors.primaryDark]),
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [90, -90])}deg` }],
  }));
  return (
    <Animated.Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.chevron, style]}>
      ›
    </Animated.Text>
  );
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
