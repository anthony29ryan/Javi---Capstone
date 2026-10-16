import { createContext, useContext } from 'react';
import Animated, { Easing, useAnimatedStyle } from 'react-native-reanimated';

/**
 * A clock in ms that a tab scene runs each time it slides in (see
 * src/navigation/SlideTabs.js). Outside the tab navigator there is none, and
 * PopIn shows its content as is.
 */
export const TabEnterContext = createContext(null);

// The design's popIn: fade in from 96% scale over 0.2s ("ease"), each
// section starting this long after the one before.
const STEP_MS = 40;
const DURATION_MS = 200;
const ease = Easing.bezierFn(0.25, 0.1, 0.25, 1);

/** One section of a tab screen that pops in, `index` places in the stagger. */
export default function PopIn({ index = 0, style, children }) {
  const enter = useContext(TabEnterContext);

  const popped = useAnimatedStyle(() => {
    if (!enter) return {};
    const progress = ease(Math.min(1, Math.max(0, (enter.value - index * STEP_MS) / DURATION_MS)));
    return { opacity: progress, transform: [{ scale: 0.96 + 0.04 * progress }] };
  });

  return <Animated.View style={[style, popped]}>{children}</Animated.View>;
}
