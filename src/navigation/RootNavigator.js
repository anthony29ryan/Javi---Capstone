import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';

import { useAuth } from '../context/AuthContext';
import { ProgressProvider } from '../context/ProgressContext';
import { colors, fonts } from '../theme/colors';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '../theme/authTheme';
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
import LessonsScreen from '../screens/LessonsScreen';
import LoginScreen from '../screens/LoginScreen';
import ModulesScreen from '../screens/ModulesScreen';
import ProgressScreen from '../screens/ProgressScreen';
import QuizScreen from '../screens/QuizScreen';
import SignupScreen from '../screens/SignupScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

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
      <Stack.Screen name="Lessons" component={LessonsScreen} />
      {/* LessonDetail draws its own back button and breadcrumb, per the design. */}
      <Stack.Screen
        name="LessonDetail"
        component={LessonDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Quiz' }} />
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
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  if (initializing || !authFontsLoaded) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

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
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ProgressProvider>
          <AppStack needsSetup={needsSetup} />
        </ProgressProvider>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
