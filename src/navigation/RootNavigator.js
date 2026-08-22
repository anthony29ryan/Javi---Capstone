import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import MainTabs from './MainTabs';
import EditProfileScreen from '../screens/EditProfileScreen';
import LessonDetailScreen from '../screens/LessonDetailScreen';
import LessonsScreen from '../screens/LessonsScreen';
import LoginScreen from '../screens/LoginScreen';
import ModulesScreen from '../screens/ModulesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import QuizScreen from '../screens/QuizScreen';
import SignupScreen from '../screens/SignupScreen';

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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
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

  if (initializing) {
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
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
