import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CoursesScreen from '../screens/CoursesScreen';
import HomeScreen from '../screens/HomeScreen';
import PracticeScreen from '../screens/PracticeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TutorScreen from '../screens/TutorScreen';
import { authColors } from '../theme/authTheme';
import { colors, fonts } from '../theme/colors';

// The "top" tab navigator is React Navigation's swipeable one; it sits at the
// bottom here, so the pages follow the finger like a pager.
const Tab = createMaterialTopTabNavigator();

// Code-voice glyphs rather than UI icons, as in the design's "code-glyph
// stickers" bar. Tutor has none: it is Javi's face in the raised centre.
const TABS = {
  Home: { glyph: '~/', label: 'Home', tilt: -4 },
  Courses: { glyph: '[ ]', label: 'Courses', tilt: 4 },
  Tutor: { label: 'Javi', tilt: -5 },
  Practice: { glyph: '?', label: 'Practice', tilt: 4 },
  Settings: { glyph: '.cfg', label: 'Settings', tilt: -4 },
};

const TAB_HEIGHT = 62;
// The design's pop: a quick overshoot, like a sticker pressed on.
const POP = { duration: 200, easing: Easing.bezier(0.3, 1.6, 0.5, 1) };
// How long a tap owns the stickers before swipes drive them again.
const TAP_MS = 250;
// A fixed-size chip cannot grow with the largest font settings.
const MAX_FONT_SCALE = 1.2;

/**
 * 0 → 1 as the tab becomes active. A swipe drives it from the pager's
 * position, so a half-way drag leaves two stickers half-way; a tap plays the
 * pop instead (taps jump, so the position has nothing in between to show).
 */
function useActiveProgress({ index, focused, position, tappedRef }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    const id = position.addListener(({ value }) => {
      if (!tappedRef.current) progress.value = Math.max(0, 1 - Math.abs(value - index));
    });
    return () => position.removeListener(id);
  }, [position, index]);

  useEffect(() => {
    if (!tappedRef.current) return;
    const target = focused ? 1 : 0;
    progress.value = reduceMotion ? target : withTiming(target, POP);
  }, [focused, reduceMotion]);

  return progress;
}

/**
 * One tab as an outlined sticker. The design's hard drop shadow (no blur) has
 * no Android equivalent, so it is an ink copy of the chip drawn 3px lower.
 */
function StickerTab({ routeName, index, focused, position, tappedRef, onPress, onLongPress }) {
  const tab = TABS[routeName];
  const progress = useActiveProgress({ index, focused, position, tappedRef });
  const centre = routeName === 'Tutor';

  const lift = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * (centre ? -3 : -2) },
      { rotate: `${progress.value * tab.tilt}deg` },
    ],
  }));
  const shown = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      style={styles.button}
    >
      {centre ? (
        <>
          <Animated.View style={[styles.javi, lift]}>
            <View style={[styles.javiShadow, focused && styles.javiShadowOn]} />
            <View style={styles.javiFace}>
              <Image source={require('../../assets/mascot/neutral.png')} style={styles.javiImage} />
            </View>
          </Animated.View>
          <View style={styles.javiLabel}>
            <Animated.View style={[styles.labelFill, shown]} />
            <Text
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[styles.label, focused && styles.textOn]}
            >
              {tab.label}
            </Text>
          </View>
        </>
      ) : (
        <Animated.View style={[styles.sticker, lift]}>
          <Animated.View style={[styles.stickerShadow, shown]} />
          <Animated.View style={[styles.stickerFill, shown]} />
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[styles.glyph, focused && styles.textOn]}
          >
            {tab.glyph}
          </Text>
          <Text
            maxFontSizeMultiplier={MAX_FONT_SCALE}
            style={[styles.label, focused && styles.textOn]}
          >
            {tab.label}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}

/** The sticker bar, drawn by us since the swipeable navigator's own bar is a top bar. */
function StickerBar({ state, navigation, position }) {
  const insets = useSafeAreaInsets();
  const tappedRef = useRef(false);
  const tapTimer = useRef(null);

  // Only the Javi chat's composer should rise with the keyboard, not the bar.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
      clearTimeout(tapTimer.current);
    };
  }, []);

  if (keyboardOpen) return null;

  function press(route, focused) {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (focused || event.defaultPrevented) return;
    tappedRef.current = true;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tappedRef.current = false;
    }, TAP_MS);
    navigation.navigate(route.name, route.params);
  }

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        return (
          <StickerTab
            key={route.key}
            routeName={route.name}
            index={index}
            focused={focused}
            position={position}
            tappedRef={tappedRef}
            onPress={() => press(route, focused)}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      tabBar={(props) => <StickerBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        // Each tab loads when it, or a neighbour, is first shown, so a swipe
        // reveals real content without loading all five at launch.
        lazy: true,
        lazyPreloadDistance: 1,
        // Taps jump straight there; only swipes slide.
        animationEnabled: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Tutor" component={TutorScreen} options={{ tabBarLabel: 'Javi' }} />
      <Tab.Screen name="Practice" component={PracticeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: authColors.ink,
  },
  button: {
    flex: 1,
    height: TAB_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    // 4px between neighbouring stickers, per the design's tab row gap.
    marginHorizontal: 2,
  },
  sticker: {
    width: '100%',
    maxWidth: 68,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stickerShadow: {
    ...StyleSheet.absoluteFillObject,
    top: 3,
    bottom: -3,
    borderRadius: 16,
    backgroundColor: authColors.ink,
  },
  stickerFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: authColors.ink,
    backgroundColor: colors.primary,
  },
  glyph: {
    fontFamily: fonts.mono,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.75,
    color: colors.textMuted,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 13,
    color: colors.textMuted,
  },
  textOn: {
    color: authColors.ink,
  },
  // The raised centre button: Javi's face in the primary button colour,
  // standing 24px above the bar.
  javi: {
    position: 'absolute',
    top: -24,
    width: 52,
    height: 52,
  },
  javiShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 2,
    height: 52,
    borderRadius: 26,
    backgroundColor: authColors.ink,
  },
  javiShadowOn: {
    top: 3,
  },
  javiFace: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: authColors.ink,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    overflow: 'hidden',
  },
  javiImage: {
    width: 60,
    height: 60,
    marginTop: 10,
  },
  javiLabel: {
    position: 'absolute',
    bottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  labelFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: authColors.ink,
    backgroundColor: colors.primary,
  },
});
