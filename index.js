import { useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NIGHT_MODE_KEY, setNightMode } from './src/theme/themeMode';

// The theme has to be known before App (and through it every screen) is
// imported: each StyleSheet reads its colours once, at import. So the saved
// Night study mode setting is read first, and App is required only after.
function Root() {
  const [App, setApp] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(NIGHT_MODE_KEY)
      .then((stored) => setNightMode(stored === 'on'))
      // An unreadable setting just means the light theme.
      .catch(() => {})
      .finally(() => setApp(() => require('./App').default));
  }, []);

  return App ? <App /> : null;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
