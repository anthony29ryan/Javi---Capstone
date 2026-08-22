import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

import Avatar from '../components/Avatar';
import { useAuth } from '../context/AuthContext';
import CoursesScreen from '../screens/CoursesScreen';
import HomeScreen from '../screens/HomeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import { colors, spacing } from '../theme/colors';

const Tab = createBottomTabNavigator();

const ICONS = {
  Home: 'home',
  Learn: 'book',
  Progress: 'stats-chart',
};

function HeaderAvatar({ navigation }) {
  const { user } = useAuth();
  return (
    <Avatar user={user} size={32} onPress={() => navigation.navigate('Profile')} />
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '600', fontSize: 17, color: colors.text },
        headerRightContainerStyle: { paddingRight: spacing.lg },
        headerRight: () => <HeaderAvatar navigation={navigation} />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`}
            size={size}
            color={color}
          />
        ),
      })}
    >
      {/* Home renders its own greeting header with the avatar, so it hides the nav one. */}
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Learn" component={CoursesScreen} options={{ title: 'Courses' }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ title: 'My Progress' }} />
    </Tab.Navigator>
  );
}
