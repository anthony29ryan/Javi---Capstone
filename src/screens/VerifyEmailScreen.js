import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import Text from '../components/AppText';
import AuthAlert from '../components/auth/AuthAlert';
import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthToast from '../components/auth/AuthToast';
import { useAuth } from '../context/AuthContext';
import { authColors, authRadius, authSpacing, authType, centeredColumn, contentWidth, authFonts } from '../theme/authTheme';

// Firebase limits how often a verification email can be resent but does not
// publish the window; 30 s proved too short. When it refuses anyway, the
// button waits much longer so it is never tappable while it cannot work.
const RESEND_COOLDOWN_SECONDS = 60;
const RATE_LIMITED_COOLDOWN_SECONDS = 5 * 60;

// "45s" under a minute, "4:59" from a minute up.
function formatWait(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

const NOTICES = {
  unverified: {
    tone: 'warn',
    title: 'Not verified yet',
    body: 'Open the link in the email first, then tap I opened the link again.',
  },
  offline: {
    tone: 'warn',
    title: 'No internet connection',
    body: 'Check Wi-Fi or mobile data, then try again.',
  },
  limit: {
    tone: 'danger',
    title: 'Too many emails sent',
    body: 'You can ask again when the timer ends. The newest link we sent still works.',
  },
  failed: {
    tone: 'danger',
    title: 'Something went wrong',
    body: 'Try again in a moment.',
  },
};

// Firebase's raw error codes, turned into one of the notices above.
function noticeFor(err) {
  if (err.code === 'auth/network-request-failed') return 'offline';
  if (err.code === 'auth/too-many-requests') return 'limit';
  return 'failed';
}

export default function VerifyEmailScreen() {
  const { user, logOut, refreshUser, resendVerification } = useAuth();
  const insets = useSafeAreaInsets();

  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // a key of NOTICES
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
    setNotice(null);
    setChecking(true);

    try {
      const verified = await refreshUser();
      // Verifying swaps this whole screen out from RootNavigator, so there is
      // nothing further to do here for the success case (and no time for a
      // toast to show before this component unmounts).
      if (!verified) setNotice('unverified');
    } catch (err) {
      setNotice(noticeFor(err));
    } finally {
      setChecking(false);
    }
  }

  async function handleResend() {
    setNotice(null);
    setSending(true);

    try {
      await resendVerification();
      setToast('Link sent again');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setNotice(noticeFor(err));
      if (err.code === 'auth/too-many-requests') setCooldown(RATE_LIMITED_COOLDOWN_SECONDS);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <AuthAnimatedScreen>
        {/* Scrolls so the buttons stay reachable on short screens; flexGrow
            plus the spacer below keeps them pinned to the bottom otherwise. */}
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + authSpacing.screenTop,
              paddingBottom: insets.bottom + authSpacing.screenH,
            },
          ]}
        >
          {/* The account already exists, so going back means signing out,
              the same as the "Wrong address?" link below. */}
          <AuthBackButton onPress={logOut} style={styles.back} />

          <View style={styles.iconTile}>
            <Ionicons name="mail-unread-outline" size={38} color={authColors.accentDeep} />
          </View>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>Tap the verification link we sent to</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.card}>
            <Text style={styles.cardEyebrow}>GOOD TO KNOW</Text>
            <Text style={styles.cardBody}>
              The link works once, and opening it on any device verifies your account. Check spam
              if it has not arrived in a minute.
            </Text>
          </View>

          {notice ? <AuthAlert {...NOTICES[notice]} style={styles.notice} /> : null}

          <View style={styles.spacer} />

          <View style={styles.actions}>
            <AuthButton label="I opened the link" onPress={handleCheck} loading={checking} />
            <AuthButton
              label={counting ? `Resend link in ${formatWait(cooldown)}` : 'Resend link'}
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
        </ScrollView>
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
  content: {
    ...centeredColumn(contentWidth.form),
    flexGrow: 1,
    paddingHorizontal: authSpacing.screenH,
    alignItems: 'center',
  },
  back: {
    alignSelf: 'flex-start',
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
    fontFamily: authFonts.semiBold,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: authColors.ink,
    textAlign: 'center',
    marginTop: 6,
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: authRadius.card,
    borderWidth: 1,
    borderColor: authColors.line,
    backgroundColor: authColors.surface,
    padding: 16,
    marginTop: 24,
  },
  cardEyebrow: {
    ...authType.eyebrow,
    color: authColors.muted,
  },
  cardBody: {
    fontFamily: authFonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.6,
    color: authColors.ink2,
    marginTop: 9,
  },
  notice: {
    alignSelf: 'stretch',
    marginTop: 16,
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
