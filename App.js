import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { lockPhonesToPortrait } from './src/services/orientation';

// Runs once, as early as possible, so a phone held sideways at launch turns
// upright before the user has time to notice.
lockPhonesToPortrait();

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        {/* Dark icons: the app is light-themed, and Home has no colored header bar. */}
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
