import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import Text from '../AppText';
import { TERMS_VERSION } from '../../constants/legal';
import { useAuth } from '../../context/AuthContext';
import { googleAvailable } from '../../services/googleSignIn';
import { authColors, authFonts, authType } from '../../theme/authTheme';

/**
 * The Google flow shared by Log in and Sign up. `start` is the button's
 * onPress. `termsOpen`, `accept` and `decline` drive a TermsSheet for a
 * first-time Google user. `alert` is an AuthAlert's props, or null.
 */
export function useGoogleSignIn(navigation) {
  const { signInWithGoogle, acceptGoogleTerms, declineGoogleTerms } = useAuth();
  const [busy, setBusy] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [alert, setAlert] = useState(null);

  function fail(err) {
    setAlert(
      err.code === 'auth/network-request-failed'
        ? {
            tone: 'warn',
            title: 'No internet connection',
            body: 'Check Wi-Fi or mobile data, then try again.',
            action: 'Try again',
            onAction: start,
          }
        : { tone: 'danger', title: 'Could not continue with Google', body: 'Something went wrong. Try again in a moment.' }
    );
  }

  async function start() {
    setAlert(null);
    setBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.needsTerms) setTermsOpen(true);
      if (result.pendingDeletion) {
        navigation.navigate('RestoreAccount', { name: result.name, removalDate: result.pendingDeletion.getTime() });
      }
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    setTermsOpen(false);
    try {
      await acceptGoogleTerms(TERMS_VERSION);
    } catch (err) {
      // The profile was not written, so undo the sign-in; tapping Google again starts over.
      await declineGoogleTerms();
      fail(err);
    }
  }

  function decline() {
    setTermsOpen(false);
    declineGoogleTerms();
  }

  return { start, busy, termsOpen, accept, decline, alert };
}

// The design's Google "G", drawn rather than bundled as an image.
function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

/**
 * Frame 10's "Continue with Google" row and the divider under it. Renders
 * nothing in Expo Go, which has no Google sign-in (see services/googleSignIn).
 */
export default function GoogleButton({ onPress, loading = false, dividerLabel }) {
  if (!googleAvailable) return null;

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ busy: loading }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed, loading && styles.busy]}
      >
        <GoogleLogo />
        <Text style={styles.label}>CONTINUE WITH GOOGLE</Text>
      </Pressable>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>{dividerLabel}</Text>
        <View style={styles.dividerLine} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 52,
    borderRadius: 26,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: {
    backgroundColor: authColors.accentSoft,
  },
  // Google's own picker covers the screen while this is set, so a dim is enough.
  busy: {
    opacity: 0.6,
  },
  label: {
    fontFamily: authFonts.semiBold,
    fontSize: 12,
    letterSpacing: 12 * 0.07,
    textTransform: 'uppercase',
    color: authColors.ink,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: authColors.line,
  },
  dividerLabel: {
    ...authType.eyebrow,
    color: authColors.muted,
  },
});
