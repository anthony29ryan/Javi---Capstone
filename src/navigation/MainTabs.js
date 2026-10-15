import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CoursesScreen from '../screens/CoursesScreen';
import HomeScreen from '../screens/HomeScreen';
import PracticeScreen from '../screens/PracticeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TutorScreen from '../screens/TutorScreen';
import { colors, fonts } from '../theme/colors';

const Tab = createBottomTabNavigator();

// Code-voice glyphs rather than UI icons, matching the monospace tiles used
// elsewhere in the design. The handoff is explicit that these should not be
// quietly swapped for line icons, so they are text, not an icon set.
const GLYPHS = {
  Home: '~/',
  Courses: '[ ]',
  Practice: '?',
  Tutor: '>_',
  Profile: '@',
};

// The row of tabs, before the gesture bar is accounted for.
const BAR_CONTENT_HEIGHT = 60;

/**
 * Draws the active tab's pill itself rather than using
 * `tabBarActiveBackgroundColor` with a rounded `tabBarItemStyle`.
 *
 * Those two do not combine: the radius lands on the item wrapper while the
 * background colour is painted on a view inside it, so the tint keeps its
 * square corners no matter what radius the wrapper has. Owning the pill here
 * is the only way to get the rounded shape the design asks for.
 */
function TabBarButton({ children, accessibilityState, ...rest }) {
  const focused = Boolean(accessibilityState?.selected);

  return (
    <Pressable {...rest} accessibilityState={accessibilityState} style={styles.button}>
      <View style={[styles.pill, focused && styles.pillActive]}>{children}</View>
    </Pressable>
  );
}

export default function MainTabs() {
  // Without this the bar sits under the gesture bar on phones that have one,
  // which squashes the labels and clips the pill.
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Every tab screen draws its own title in the page body, at the large
        // sizes the design calls for, so none of them want a nav header.
        headerShown: false,
        // Only the chat's composer should rise with the keyboard, not the tab bar.
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.borderStrong,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: BAR_CONTENT_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          // Keeps the outer pills off the screen edges; the design insets the
          // whole row rather than letting the first tab bleed to the corner.
          paddingHorizontal: 10,
        },
        tabBarButton: (props) => <TabBarButton {...props} />,
        tabBarIconStyle: styles.icon,
        tabBarLabelStyle: styles.label,
        tabBarIcon: ({ color }) => (
          <Text style={[styles.glyph, { color }]}>{GLYPHS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Practice" component={PracticeScreen} />
      <Tab.Screen name="Tutor" component={TutorScreen} options={{ tabBarLabel: 'Javi' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    // 4px between neighbouring pills, per the design's tab row gap.
    paddingHorizontal: 2,
  },
  pill: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primarySoft,
  },
  icon: {
    // The glyph is text, not a square icon, so the default icon box leaves a
    // gap under it that throws the glyph and label out of rhythm.
    flex: 0,
    height: 15,
  },
  glyph: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 15,
    letterSpacing: -0.26,
    textAlign: 'center',
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    lineHeight: 13,
    letterSpacing: 0.2,
    marginTop: 5,
    marginBottom: 0,
  },
});
