import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

const Tab = createBottomTabNavigator();

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
// A fixed-size chip cannot grow with the largest font settings.
const MAX_FONT_SCALE = 1.2;

/** 0 → 1 as the tab becomes active; instant when Android's animations are off. */
function useActiveProgress(focused) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    progress.value = reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, POP);
  }, [focused, reduceMotion]);
  return progress;
}

/**
 * One tab as an outlined sticker. The design's hard drop shadow (no blur) has
 * no Android equivalent, so it is an ink copy of the chip drawn 3px lower.
 */
function StickerTab({ routeName, onPress, onLongPress, 'aria-selected': focused, 'aria-label': ariaLabel }) {
  const tab = TABS[routeName];
  const progress = useActiveProgress(Boolean(focused));
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
      accessibilityState={{ selected: Boolean(focused) }}
      accessibilityLabel={ariaLabel ?? tab.label}
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
          <View style={[styles.javiLabel, focused && styles.stickerOn]}>
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

export default function MainTabs() {
  // Without this the bar sits under the gesture bar on phones that have one.
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Every tab screen draws its own title in the page body, at the large
        // sizes the design calls for, so none of them want a nav header.
        headerShown: false,
        // Only the chat's composer should rise with the keyboard, not the tab bar.
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 2,
          borderTopColor: authColors.ink,
          // The ink border replaces the default drop shadow.
          elevation: 0,
          height: TAB_HEIGHT + 14 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
          paddingHorizontal: 8,
        },
        tabBarButton: (props) => <StickerTab {...props} routeName={route.name} />,
      })}
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
  stickerOn: {
    backgroundColor: colors.primary,
    borderColor: authColors.ink,
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
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
});
