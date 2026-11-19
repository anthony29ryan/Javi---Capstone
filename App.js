import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ErrorBoundary from './src/components/ErrorBoundary';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { lockToPortrait } from './src/services/orientation';
import { colors } from './src/theme/colors';
import { isNightMode } from './src/theme/themeMode';

// Runs once, as early as possible, so a device held sideways at launch turns
// upright before the user has time to notice.
lockToPortrait();

export default function App() {
  return (
    // The page colour behind everything, so screen transitions never show the
    // native window (white) underneath in Night study mode.
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <AuthProvider>
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
        {/* Icons contrast with the page: Home has no colored header bar. */}
        <StatusBar style={isNightMode() ? 'light' : 'dark'} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
