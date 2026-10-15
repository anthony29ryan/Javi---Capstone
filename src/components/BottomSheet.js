import { useEffect, useRef } from 'react';
import { BackHandler, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../theme/colors';

const OPEN = { duration: 400, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 280, easing: Easing.in(Easing.cubic) };
const SPRING_BACK = { damping: 20, stiffness: 220 };
// Below the screen until the sheet has measured itself, so it never flashes.
const OFFSCREEN = 2000;

/**
 * The design's bottom sheet, for screens shown with the root stack's
 * SHEET_OPTIONS. It glides up while the backdrop fades in, follows a downward
 * drag, and slides away when dragged past a third of its height, flicked,
 * or closed by the backdrop, the back button or a button inside.
 *
 * `children` is a function given `close`, which animates out and then calls
 * `onClosed` (the screen's navigation.goBack). Built on PanResponder rather
 * than react-native-gesture-handler, which the app does not otherwise need.
 */
export default function BottomSheet({ onClosed, style, children }) {
  const offset = useSharedValue(OFFSCREEN);
  const height = useSharedValue(0);
  const heightRef = useRef(0);
  const closing = useRef(false);
  const closeRef = useRef(null);

  function close() {
    if (closing.current) return;
    closing.current = true;
    offset.value = withTiming(heightRef.current || OFFSCREEN, CLOSE);
    setTimeout(onClosed, CLOSE.duration);
  }
  closeRef.current = close;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const pan = useRef(
    PanResponder.create({
      // Capture, so a drag that starts on a row or button still moves the
      // sheet; a plain tap never moves far enough to be taken.
      onMoveShouldSetPanResponderCapture: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (!closing.current) offset.value = Math.max(0, g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > heightRef.current / 3 || g.vy > 1) closeRef.current();
        else offset.value = withSpring(0, SPRING_BACK);
      },
      onPanResponderTerminate: () => {
        if (!closing.current) offset.value = withSpring(0, SPRING_BACK);
      },
    })
  ).current;

  function onLayout(event) {
    if (heightRef.current) return;
    const measured = event.nativeEvent.layout.height;
    heightRef.current = measured;
    height.value = measured;
    offset.value = measured;
    offset.value = withTiming(0, OPEN);
  }

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  // The backdrop tracks the sheet: fully dim when open, clear when gone.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: height.value ? Math.min(1, Math.max(0, 1 - offset.value / height.value)) : 0,
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        onLayout={onLayout}
        style={[styles.sheet, style, sheetStyle]}
        {...pan.panHandlers}
      >
        <View style={styles.grabber} />
        {children(close)}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,22,34,.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceSunken,
    alignSelf: 'center',
    marginBottom: 22,
  },
});
