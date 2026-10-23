import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthToast from '../components/auth/AuthToast';
import TourOverlay from '../components/TourOverlay';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import CoursesScreen from '../screens/CoursesScreen';
import HomeScreen from '../screens/HomeScreen';
import PracticeScreen from '../screens/PracticeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TutorScreen from '../screens/TutorScreen';
import { getPreferences, savePreferences } from '../services/preferences';
import { authColors } from '../theme/authTheme';
import { colors, fonts } from '../theme/colors';
import { createSlideTabNavigator } from './SlideTabs';

// Our own tab navigator, for the design's slide-in screens and swipe.
const Tab = createSlideTabNavigator();

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
// Design 1a's stamp: 420ms, peaking 60% of the way through.
const STAMP_EASING = Easing.bezier(0.3, 1.3, 0.5, 1);
// A fixed-size chip cannot grow with the largest font settings.
const MAX_FONT_SCALE = 1.2;

/**
 * 0 → 1 each time the tab becomes active: the sticker is stamped on, growing
 * from 60% past full size with twice its tilt, then settling. Instant on first
 * mount and under Reduce motion.
 */
function useStamp(focused) {
  const reduceMotion = useReducedMotion();
  const stamp = useSharedValue(1);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current || !focused || reduceMotion) {
      mounted.current = true;
      stamp.value = 1;
      return;
    }
    stamp.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(0.6, { duration: 252, easing: STAMP_EASING }),
      withTiming(1, { duration: 168, easing: STAMP_EASING })
    );
  }, [focused, reduceMotion]);

  return stamp;
}

/**
 * One tab as an outlined sticker. The design's hard drop shadow (no blur) has
 * no Android equivalent, so it is an ink copy of the chip drawn 3px lower.
 */
function StickerTab({ routeName, focused, onPress, onLongPress }) {
  const tab = TABS[routeName];
  const stamp = useStamp(focused);
  const centre = routeName === 'Tutor';
  const rest = centre ? -3 : -2;

  const lift = useAnimatedStyle(() =>
    focused
      ? {
          transform: [
            { translateY: interpolate(stamp.value, [0, 0.6, 1], [0, -4, rest]) },
            { rotate: `${interpolate(stamp.value, [0, 0.6, 1], [0, tab.tilt * 2, tab.tilt])}deg` },
            { scale: interpolate(stamp.value, [0, 0.6, 1], [0.6, 1.12, 1]) },
          ],
        }
      : { transform: [] }
  );

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
            {focused ? <View style={styles.labelFill} /> : null}
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
          {focused ? <View style={styles.stickerShadow} /> : null}
          {focused ? <View style={styles.stickerFill} /> : null}
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

/** The sticker bar under the tab screens. */
function StickerBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  // Only the Javi chat's composer should rise with the keyboard, not the bar.
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  function press(route, focused) {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  }

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + 6 }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        return (
          <StickerTab
            key={route.key}
            routeName={route.name}
            focused={focused}
            onPress={() => press(route, focused)}
            onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );
}

export default function MainTabs({ route, navigation }) {
  const { callName } = useAuth();
  const { loading } = useProgress();
  const [tourQueued, setTourQueued] = useState(false);
  const [toast, setToast] = useState('');

  // SetupScreen queues the first-time tour by writing tourSeen: false.
  useEffect(() => {
    getPreferences()
      .then((preferences) => {
        if (preferences.tourSeen === false) setTourQueued(true);
      })
      .catch(() => {});
  }, []);

  // Help & feedback replays it by popping back here with { tour: true }.
  useEffect(() => {
    if (!route.params?.tour) return;
    setTourQueued(true);
    navigation.setParams({ tour: undefined });
  }, [route.params?.tour]);

  function closeTour(sawAStop) {
    setTourQueued(false);
    if (sawAStop) setToast('You are all set');
    // If this fails the tour shows again next launch, which is harmless.
    savePreferences({ tourSeen: true }).catch(() => {});
  }

  // Waits for Home to finish loading, as in the design, so the dim falls on
  // the real screen rather than its skeleton.
  const touring = tourQueued && !loading;

  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        importantForAccessibility={touring ? 'no-hide-descendants' : 'auto'}
      >
        <Tab.Navigator tabBar={(props) => <StickerBar {...props} />}>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Courses" component={CoursesScreen} />
          <Tab.Screen name="Tutor" component={TutorScreen} />
          <Tab.Screen name="Practice" component={PracticeScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </View>
      {touring ? <TourOverlay name={callName} onClose={closeTour} /> : null}
      <AuthToast message={toast} onHide={() => setToast('')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
