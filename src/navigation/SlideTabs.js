import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  TabRouter,
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { TabEnterContext } from '../components/PopIn';
import { colors } from '../theme/colors';
import { swipeTarget } from './swipeTarget';

// Design 1a "Slide and stamp": the new screen slides in on top from the side
// you moved toward while the old one drifts back and dims.
const SLIDE = { duration: 320, easing: Easing.bezier(0.45, 0, 0.2, 1) };
const SPRING_BACK = { duration: 300, easing: Easing.bezier(0.3, 1.4, 0.5, 1) };
const FADE = { duration: 120 };
// Long enough for every PopIn section's stagger to finish.
const POP_CLOCK_MS = 1000;
// While dragging, only the current screen moves, at this share of the finger.
const DRAG_SHARE = 0.35;
// Extra damping when dragging past the first or last tab.
const END_DAMPING = 0.3;

/** One tab's screen, with its own position and opacity so it can slide on its own. */
function Scene({ routeKey, render, visible, onTop, sliding, register }) {
  const x = useSharedValue(0);
  const op = useSharedValue(1);
  // The PopIn clock: at its end everything is shown, as on first launch.
  const enter = useSharedValue(POP_CLOCK_MS);
  // Registered on mount, before the parent's transition effect in the same commit.
  useEffect(() => register(routeKey, { x, op, enter }), []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    opacity: op.value,
  }));

  return (
    <Animated.View
      pointerEvents={onTop ? 'auto' : 'none'}
      style={[
        StyleSheet.absoluteFill,
        styles.scene,
        style,
        { display: visible ? 'flex' : 'none', zIndex: onTop ? 2 : 1 },
        sliding && onTop && styles.sliding,
      ]}
    >
      <TabEnterContext.Provider value={enter}>{render()}</TabEnterContext.Provider>
    </Animated.View>
  );
}

function SlideTabNavigator({ id, initialRouteName, children, screenOptions, tabBar }) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(TabRouter, {
    id,
    initialRouteName,
    children,
    screenOptions,
  });
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const focusedKey = state.routes[state.index].key;

  // Tabs mount on their first visit and then stay, keeping their state.
  const [visited, setVisited] = useState(() => new Set([focusedKey]));
  if (!visited.has(focusedKey)) setVisited(new Set(visited).add(focusedKey));

  const scenes = useRef({});
  const register = useCallback((key, values) => {
    scenes.current[key] = values;
  }, []);

  // `shown` is what is on screen, which trails the router's index until the
  // incoming scene has been placed off to the side.
  const [shown, setShown] = useState({ top: focusedKey, leaving: null });
  const hideTimer = useRef(null);
  const lastIndex = useRef(state.index);

  useEffect(() => {
    const from = lastIndex.current;
    lastIndex.current = state.index;
    if (shown.top === focusedKey) return;
    const incoming = scenes.current[focusedKey];
    const outgoing = scenes.current[shown.top];
    if (!incoming || !outgoing) {
      setShown({ top: focusedKey, leaving: null });
      return;
    }

    const dir = state.index > from ? 1 : -1;
    // Each animation first jumps to its start, so the incoming scene is placed
    // off to the side before it becomes visible and never flashes in place.
    const from0 = (value) => withTiming(value, { duration: 0 });
    if (reduceMotion) {
      incoming.enter.value = POP_CLOCK_MS;
      incoming.x.value = 0;
      incoming.op.value = withSequence(from0(0), withTiming(1, FADE));
      outgoing.op.value = withTiming(0, FADE);
    } else {
      incoming.op.value = 1;
      incoming.x.value = withSequence(from0(dir * width), withTiming(0, SLIDE));
      // The sections stay hidden while it slides, then pop in once it lands.
      incoming.enter.value = withSequence(
        from0(0),
        withDelay(SLIDE.duration, withTiming(POP_CLOCK_MS, { duration: POP_CLOCK_MS, easing: Easing.linear }))
      );
      // From wherever the drag left it.
      outgoing.x.value = withTiming(-dir * width * 0.3, SLIDE);
      outgoing.op.value = withTiming(0.5, SLIDE);
    }
    setShown({ top: focusedKey, leaving: shown.top });

    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(
      () => {
        outgoing.x.value = 0;
        outgoing.op.value = 1;
        setShown((current) => ({ ...current, leaving: null }));
      },
      reduceMotion ? FADE.duration : SLIDE.duration
    );
  }, [focusedKey]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Read inside the responder, which is created once.
  const live = useRef({});
  live.current = { state, navigation, reduceMotion, top: shown.top };

  const pan = useRef(
    PanResponder.create({
      // Only clearly sideways drags, so vertical scrolling and taps still work.
      onMoveShouldSetPanResponderCapture: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        const { state: s, reduceMotion: still, top } = live.current;
        const scene = scenes.current[top];
        if (!scene || still) return;
        const atEnd = (s.index === 0 && g.dx > 0) || (s.index === s.routes.length - 1 && g.dx < 0);
        scene.x.value = g.dx * DRAG_SHARE * (atEnd ? END_DAMPING : 1);
      },
      onPanResponderRelease: (_, g) => {
        const { state: s, navigation: nav, top } = live.current;
        const to = swipeTarget(g.dx, s.index, s.routes.length);
        if (to !== s.index) {
          nav.navigate(s.routes[to].name, s.routes[to].params);
          return;
        }
        const scene = scenes.current[top];
        if (scene) scene.x.value = withTiming(0, SPRING_BACK);
      },
      onPanResponderTerminate: () => {
        const scene = scenes.current[live.current.top];
        if (scene) scene.x.value = withTiming(0, SPRING_BACK);
      },
    })
  ).current;

  return (
    <NavigationContent>
      <View style={styles.container}>
        <View style={styles.scenes} {...pan.panHandlers}>
          {state.routes
            .filter((route) => visited.has(route.key))
            .map((route) => (
              <Scene
                key={route.key}
                routeKey={route.key}
                render={descriptors[route.key].render}
                visible={route.key === shown.top || route.key === shown.leaving}
                onTop={route.key === shown.top}
                sliding={shown.leaving !== null}
                register={register}
              />
            ))}
        </View>
        {tabBar({ state, navigation, descriptors })}
      </View>
    </NavigationContent>
  );
}

export const createSlideTabNavigator = createNavigatorFactory(SlideTabNavigator);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scenes: {
    flex: 1,
    overflow: 'hidden',
  },
  scene: {
    backgroundColor: colors.background,
  },
  sliding: {
    boxShadow: '0 0 30px rgba(46,49,65,0.2)',
  },
});
