import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import BottomSheet from '../components/BottomSheet';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type } from '../theme/colors';

/**
 * Frame 44, from Settings. Logging out also clears this phone's downloads and
 * daily reminder (AuthContext.logOut), so the copy says so rather than only
 * the design's "your progress stays saved".
 */
export default function LogOutSheetScreen({ navigation }) {
  const { logOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      // Signing out switches the app to the welcome screens, which unmounts this sheet.
      await logOut();
    } catch {
      setError('Could not log out. Try again.');
      setBusy(false);
    }
  }

  return (
    <BottomSheet onClosed={navigation.goBack} style={{ paddingBottom: insets.bottom + 20 }}>
      {(close) => (
        <>
          <Text style={styles.title}>Log out of Javi?</Text>
          <Text style={styles.body}>
            Your progress stays saved to your account. Downloaded lessons and the daily reminder are
            removed from this phone.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AuthButton label="Log out" onPress={confirm} loading={busy} />
          <AuthButton
            label="Stay logged in"
            variant="secondary"
            onPress={close}
            disabled={busy}
            style={styles.stay}
          />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 21 * 1.3,
    color: colors.text,
    marginHorizontal: 4,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
    marginHorizontal: 4,
    marginTop: 8,
    marginBottom: 24,
  },
  error: {
    ...type.small,
    color: colors.error,
    marginHorizontal: 4,
    marginBottom: 12,
  },
  stay: {
    marginTop: 12,
  },
});
