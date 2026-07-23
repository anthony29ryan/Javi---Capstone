import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import CoursesScreen from '../screens/CoursesScreen';
import HomeScreen from '../screens/HomeScreen';
import LessonDetailScreen from '../screens/LessonDetailScreen';
import LessonsScreen from '../screens/LessonsScreen';
import LoginScreen from '../screens/LoginScreen';
import ModulesScreen from '../screens/ModulesScreen';
import SignupScreen from '../screens/SignupScreen';

const Stack = createNativeStackNavigator();

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
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Courses" component={CoursesScreen} options={{ title: 'Courses' }} />
      <Stack.Screen name="Modules" component={ModulesScreen} />
      <Stack.Screen name="Lessons" component={LessonsScreen} />
      <Stack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: 'Lesson' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
