import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts } from 'expo-font';

import { useAuth } from '../context/AuthContext';
import { ProgressProvider } from '../context/ProgressContext';
import { colors } from '../theme/colors';
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
import EditProfileScreen from '../screens/EditProfileScreen';
import LessonDetailScreen from '../screens/LessonDetailScreen';
import LessonsScreen from '../screens/LessonsScreen';
import LoginScreen from '../screens/LoginScreen';
import ModulesScreen from '../screens/ModulesScreen';
import ProfileScreen from '../screens/ProfileScreen';
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
  headerTitleStyle: { fontWeight: '600', fontSize: 17, color: colors.text },
  headerShadowVisible: false,
  headerBackTitle: '',
  contentStyle: { backgroundColor: colors.background },
};

function AuthStack() {
  return (
    // AuthStack remounts fresh every time RootNavigator switches into it —
    // on first launch (no user yet) and right after logOut() (user goes back
    // to null) — so starting it at Welcome each time covers both cases
    // without any extra state.
    <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      {/* The tab bar is the app's home; everything below is pushed over it. */}
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />

      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Name' }}
      />
      <Stack.Screen name="Modules" component={ModulesScreen} />
      <Stack.Screen name="Lessons" component={LessonsScreen} />
      <Stack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: 'Lesson' }} />
      <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Quiz' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, initializing } = useAuth();

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
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
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
        <AuthStack />
      ) : !user.emailVerified ? (
        <VerifyEmailScreen />
      ) : (
        <ProgressProvider>
          <AppStack />
        </ProgressProvider>
      )}
    </NavigationContainer>
  );
}
