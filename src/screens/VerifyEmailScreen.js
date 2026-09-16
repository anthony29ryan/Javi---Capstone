import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthButton from '../components/auth/AuthButton';
import AuthToast from '../components/auth/AuthToast';
import { useAuth } from '../context/AuthContext';
import { authColors, authRadius, authSpacing, authType } from '../theme/authTheme';

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyEmailScreen() {
  const { user, logOut, refreshUser, resendVerification } = useAuth();

  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [stillUnverified, setStillUnverified] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Signing up already sent one email, so the resend button starts on cooldown.
  // Firebase rate limits this endpoint, and a user tapping it straight away
  // would burn that allowance before the first email has even arrived.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const counting = cooldown > 0;

  useEffect(() => {
    if (!counting) return undefined;

    const timer = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [counting]);

  async function handleCheck() {
    setError('');
    setStillUnverified(false);
    setChecking(true);

    try {
      const verified = await refreshUser();
      // Verifying swaps this whole screen out from RootNavigator, so there is
      // nothing further to do here for the success case (and no time for a
      // toast to show before this component unmounts).
      if (!verified) setStillUnverified(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setError('');
    setStillUnverified(false);
    setSending(true);

    try {
      await resendVerification();
      setToast('Link sent again');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <AuthAnimatedScreen style={styles.animated}>
        <View style={styles.iconTile}>
          <Ionicons name="mail-unread-outline" size={38} color={authColors.accentDeep} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>Tap the verification link we sent to</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>GOOD TO KNOW</Text>
          <Text style={styles.cardBody}>
            The link works once and expires in 30 minutes. Open it on this phone so the app can
            pick it up. Check spam if it has not arrived in a minute.
          </Text>
        </View>

        {error ? (
          <Text style={styles.notice}>{error}</Text>
        ) : stillUnverified ? (
          <Text style={styles.notice}>
            That email is still not verified. Open the link first, then try again.
          </Text>
        ) : null}

        <View style={styles.spacer} />

        <View style={styles.actions}>
          <AuthButton label="I Opened the Link" onPress={handleCheck} loading={checking} />
          <AuthButton
            label={counting ? `Resend Link in ${cooldown}s` : 'Resend Link'}
            variant="secondary"
            onPress={handleResend}
            loading={sending}
            disabled={counting}
            labelStyle={counting ? styles.resendMuted : styles.resendActive}
          />
          <Text onPress={logOut} suppressHighlighting style={styles.tertiary}>
            Wrong address? Go back and edit it.
          </Text>
        </View>
      </AuthAnimatedScreen>

      <AuthToast message={toast} onHide={() => setToast('')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.bg,
  },
  animated: {
    paddingHorizontal: authSpacing.screenH,
    paddingTop: authSpacing.screenTop,
    paddingBottom: authSpacing.screenH,
    alignItems: 'center',
  },
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: authColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  title: {
    ...authType.screenTitle,
    color: authColors.ink,
    textAlign: 'center',
    marginTop: 26,
    marginBottom: 10,
  },
  body: {
    ...authType.body,
    color: authColors.ink2,
    textAlign: 'center',
  },
  email: {
    ...authType.mono,
    color: authColors.ink,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: authRadius.card,
    borderWidth: 1,
    borderColor: authColors.line,
    padding: 16,
    marginTop: 24,
  },
  cardEyebrow: {
    ...authType.eyebrow,
    color: authColors.muted,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: authColors.ink2,
  },
  notice: {
    ...authType.helper,
    color: authColors.error,
    textAlign: 'center',
    marginTop: authSpacing.fieldGap,
    alignSelf: 'stretch',
  },
  spacer: {
    flex: 1,
    minHeight: authSpacing.screenH,
  },
  actions: {
    alignSelf: 'stretch',
    gap: authSpacing.fieldGap,
  },
  resendMuted: {
    color: authColors.muted,
  },
  resendActive: {
    color: authColors.accentDeep,
  },
  tertiary: {
    ...authType.helper,
    color: authColors.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
