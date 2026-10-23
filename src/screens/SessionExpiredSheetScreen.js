import { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import BottomSheet from '../components/BottomSheet';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type } from '../theme/colors';

/**
 * Frame 98, opened by Welcome when Firebase ended the session on its own
 * (AuthContext.expiredEmail). The design says the app signs you out "after 30
 * days away", which is not how Firebase works, so the body names the usual
 * real cause instead. It sits over Welcome, so closing it is allowed.
 */
export default function SessionExpiredSheetScreen({ navigation }) {
  const { expiredEmail, clearExpired } = useAuth();
  const insets = useSafeAreaInsets();
  // Kept for after the close animation, which ends in onClosed.
  const email = useRef(expiredEmail ?? '');
  const logInNext = useRef(false);

  function closed() {
    clearExpired();
    // replace, so back from Login returns to Welcome rather than this sheet.
    if (logInNext.current) navigation.replace('Login', { email: email.current });
    else navigation.goBack();
  }

  return (
    <BottomSheet onClosed={closed} style={{ paddingBottom: insets.bottom + 20 }}>
      {(close) => (
        <>
          <Text style={styles.label}>Signed out</Text>
          <Text style={styles.title} accessibilityRole="header">
            Your session expired
          </Text>
          <Text style={styles.body}>
            You were signed out, maybe because your password changed on another device. Log in again
            to keep going. Your progress is saved to your account.
          </Text>
          <AuthButton
            label="Log in again"
            onPress={() => {
              logInNext.current = true;
              close();
            }}
          />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.sectionLabel,
    fontSize: 12,
    letterSpacing: 12 * 0.12,
    color: colors.textMuted,
    marginHorizontal: 4,
    marginBottom: 8,
  },
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
});
