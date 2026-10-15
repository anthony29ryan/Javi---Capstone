import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';
import { useAssets } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { ProgressProvider } from '../context/ProgressContext';
import { TextSizeProvider } from '../context/TextSizeContext';
import { colors, fonts } from '../theme/colors';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  Baloo2_800ExtraBold,
} from '../theme/authTheme';
import SplashView from '../components/SplashView';
import { MASCOT_IMAGES } from '../components/Mascot';
import MainTabs from './MainTabs';
import { syncDailyReminder } from '../services/notifications';
import { getPreferences } from '../services/preferences';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ProfileDetailsScreen from '../screens/ProfileDetailsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SetupScreen from '../screens/SetupScreen';
import LessonDetailScreen from '../screens/LessonDetailScreen';
import WeakLessonsScreen from '../screens/WeakLessonsScreen';
import QuizzesScreen from '../screens/QuizzesScreen';
import AvatarSheetScreen from '../screens/AvatarSheetScreen';
import DownloadSheetScreen from '../screens/DownloadSheetScreen';
import AskJaviSheetScreen from '../screens/AskJaviSheetScreen';
import QuitQuizSheetScreen from '../screens/QuitQuizSheetScreen';
import LogOutSheetScreen from '../screens/LogOutSheetScreen';
import LoginScreen from '../screens/LoginScreen';
import ModulesScreen from '../screens/ModulesScreen';
import ProgressScreen from '../screens/ProgressScreen';
import QuizScreen from '../screens/QuizScreen';
import SignupScreen from '../screens/SignupScreen';
import TracerListScreen from '../screens/TracerListScreen';
import TracerScreen from '../screens/TracerScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

// A cream strip behind the status bar on every screen, so content scrolling
// up does not show through under the clock. Screens draw edge to edge.
function StatusStrip({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.layout}>
      {children}
      <View style={[styles.statusStrip, { height: insets.top }]} />
    </View>
  );
}

// The navigator calls a layout as a plain function, so the hook above has to
// live in a component it renders rather than in the layout itself.
const withStatusStrip = ({ children }) => <StatusStrip>{children}</StatusStrip>;

// Sheets skip the strip: theirs would sit undimmed above the backdrop, while
// the screen underneath keeps its own strip under the dim.
const bare = ({ children }) => children;

// Bottom sheets drawn as see-through screens over the one below. Transparent,
// or the stack's page background hides that screen behind the sheet. No stack
// animation: BottomSheet slides itself in and out.
const SHEET_OPTIONS = {
  headerShown: false,
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
};

// A light header on the same cream as the page keeps the status bar icons
// readable on every screen and lets the coffee accent stay on buttons and
// badges rather than a heavy top bar.
const headerScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontFamily: fonts.semiBold, fontSize: 17, color: colors.text },
  headerShadowVisible: false,
  headerBackTitle: '',
  contentStyle: { backgroundColor: colors.background },
};

function AuthStack({ afterAccountDeletion }) {
  return (
    // AuthStack remounts fresh every time RootNavigator switches into it —
    // on first launch (no user yet) and right after logOut() (user goes back
    // to null) — so choosing the first screen here covers every case. The
    // one exception to Welcome is straight after scheduling an account's
    // deletion, which lands on Sign up and says when the deletion happens.
    <Stack.Navigator
      initialRouteName={afterAccountDeletion ? 'Signup' : 'Welcome'}
      screenOptions={{ headerShown: false }}
      screenLayout={withStatusStrip}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

function AppStack({ needsSetup }) {
  return (
    <Stack.Navigator
      // A first-run user lands on Setup instead of the tabs. It is the initial
      // route rather than a redirect so there is no flash of the app behind it.
      initialRouteName={needsSetup ? 'Setup' : 'MainTabs'}
      screenOptions={headerScreenOptions}
      screenLayout={withStatusStrip}
    >
      {/* The tab bar is the app's home; everything below is pushed over it. */}
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Setup" component={SetupScreen} options={{ headerShown: false }} />

      {/* Profile is a tab now, so it is not registered here too — a name in
          both places makes navigate('Profile') ambiguous. */}
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ProfileDetails"
        component={ProfileDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DeleteAccount"
        component={DeleteAccountScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Name' }}
      />
      <Stack.Screen name="Progress" component={ProgressScreen} options={{ title: 'My Progress' }} />
      {/* Modules draws its own back button and level tag, per the design. */}
      <Stack.Screen name="Modules" component={ModulesScreen} options={{ headerShown: false }} />
      {/* LessonDetail draws its own back button and breadcrumb, per the design. */}
      <Stack.Screen
        name="LessonDetail"
        component={LessonDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="WeakLessons" component={WeakLessonsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Quizzes" component={QuizzesScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="AvatarSheet"
        component={AvatarSheetScreen}
        options={SHEET_OPTIONS}
        layout={bare}
      />
      <Stack.Screen
        name="DownloadSheet"
        component={DownloadSheetScreen}
        options={SHEET_OPTIONS}
        layout={bare}
      />
      <Stack.Screen
        name="AskJaviSheet"
        component={AskJaviSheetScreen}
        options={SHEET_OPTIONS}
        layout={bare}
      />
      {/* Quiz draws its own header: a close button, the bar and the count. */}
      <Stack.Screen name="Quiz" component={QuizScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="LogOutSheet"
        component={LogOutSheetScreen}
        options={SHEET_OPTIONS}
        layout={bare}
      />
      <Stack.Screen
        name="QuitQuizSheet"
        component={QuitQuizSheetScreen}
        options={SHEET_OPTIONS}
        layout={bare}
      />
      <Stack.Screen
        name="TracerList"
        component={TracerListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Tracer" component={TracerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, initializing, scheduledDeletion } = useAuth();

  // Whether this account has been through the setup screen. Held as
  // undefined until known so the app stays on the loader rather than
  // guessing and showing the wrong first screen.
  const [needsSetup, setNeedsSetup] = useState(undefined);
  const verified = Boolean(user?.emailVerified);

  // Keep the splash up for at least 3 seconds on launch so the branding is
  // seen, even when sign-in resolves instantly. A tap skips the rest.
  const [minimumSplashDone, setMinimumSplashDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinimumSplashDone(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!verified) {
      setNeedsSetup(undefined);
      return undefined;
    }

    let cancelled = false;
    getPreferences()
      .then((preferences) => {
        if (!cancelled) setNeedsSetup(!preferences.setupComplete);
        // Logging out clears the phone's reminder, so put the account's back.
        // Not before setup, which is where the permission prompt belongs.
        if (preferences.setupComplete) syncDailyReminder(preferences).catch(() => {});
      })
      .catch(() => {
        // If preferences cannot be read, send them to the app rather than
        // trapping them on setup — the screen can be reached again later.
        if (!cancelled) setNeedsSetup(false);
      });

    return () => {
      cancelled = true;
    };
  }, [verified, user?.uid]);

  // The auth screens (Log in, Sign up, Check your email) use their own type-
  // face per the design handoff, separate from the rest of the app. Loading
  // it here rather than per-screen means it is ready before either AuthStack
  // or the standalone VerifyEmailScreen below ever mounts.
  const [authFontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    Baloo2_800ExtraBold,
  });

  // In Expo Go images download from the dev server, so without this the
  // splash mascot appears after its wordmark.
  const [mascotImages, mascotError] = useAssets(MASCOT_IMAGES);

  // Plain background until fonts and mascot are in, so the splash appears whole.
  if (!authFontsLoaded || (!mascotImages && !mascotError)) return <View style={styles.blank} />;
  if (initializing) return <SplashView />;
  if (!minimumSplashDone) return <SplashView onSkip={() => setMinimumSplashDone(true)} />;

  return (
    <NavigationContainer>
      {/* Three states, in order: signed out, signed in but unverified, and fully
          in. ProgressProvider sits inside the last branch so it never loads
          progress for a user that does not exist yet. */}
      {!user ? (
        <AuthStack afterAccountDeletion={Boolean(scheduledDeletion)} />
      ) : !user.emailVerified ? (
        <VerifyEmailScreen />
      ) : needsSetup === undefined ? (
        <SplashView />
      ) : (
        <ProgressProvider>
          <TextSizeProvider>
            <AppStack needsSetup={needsSetup} />
          </TextSizeProvider>
        </ProgressProvider>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
  },
  statusStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
  },
  blank: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
