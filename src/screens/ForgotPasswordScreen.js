import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import { useAuth } from '../context/AuthContext';
import { authColors, authRadius, authSpacing, authType, centeredColumn, contentWidth, authFonts } from '../theme/authTheme';

const EMAIL_PATTERN = /.+@.+\..+/;
const RESEND_COOLDOWN_SECONDS = 120;
const MAX_SENDS_PER_MONTH = 3;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const historyKey = (email) => `passwordResetSends:${email.toLowerCase()}`;

/**
 * Reset history for one address: when links were really sent in the last 30
 * days, and when a send was last asked for (sent or silently dropped).
 *
 * The two are kept apart so a dropped request still starts the resend
 * cooldown but never counts as a send. Otherwise every dropped request would
 * push the 30-day window forward and the address would never be let through.
 *
 * Kept per address rather than per device so that someone resetting two of
 * their own accounts is not blocked by the other one's attempts. This lives
 * on the device, so reinstalling the app resets it; a real per-account limit
 * needs a Cloud Function. Firebase also rate limits reset emails on its side.
 */
async function readHistory(email) {
  try {
    const stored = JSON.parse((await AsyncStorage.getItem(historyKey(email))) ?? 'null');
    // Older builds stored a bare array of send times.
    const history = Array.isArray(stored) ? { sends: stored, lastRequestAt: 0 } : stored;
    const cutoff = Date.now() - MONTH_MS;
    return {
      sends: (history?.sends ?? []).filter((sentAt) => sentAt > cutoff),
      lastRequestAt: history?.lastRequestAt ?? 0,
    };
  } catch {
    // Unreadable history should not stop someone getting back into their
    // account.
    return { sends: [], lastRequestAt: 0 };
  }
}

async function recordRequest(email, history, delivered) {
  const now = Date.now();
  try {
    await AsyncStorage.setItem(
      historyKey(email),
      JSON.stringify({
        sends: delivered ? [...history.sends, now] : history.sends,
        lastRequestAt: now,
      })
    );
  } catch {
    // Only costs this device its send history — not worth failing the reset.
  }
}

/** Formats the resend countdown, e.g. "1:45". */
function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * Reads storage for one address and derives both limits from it: the monthly
 * count, and the seconds left until another send is allowed.
 *
 * Deriving cooldown from the last stored timestamp — rather than trusting
 * component state — is what stops the limit from being bypassed by leaving
 * this screen and coming back to it: the countdown display is just state,
 * and navigating away remounts the component with that state reset, but
 * storage survives the remount, so a send attempt right after still sees
 * how recently the last one went out.
 */
async function getSendLimitState(email) {
  const history = await readHistory(email);
  const lastRequest = Math.max(history.lastRequestAt, ...history.sends, 0);
  const sinceLastSend = lastRequest ? Date.now() - lastRequest : Infinity;
  const cooldownRemaining =
    sinceLastSend < RESEND_COOLDOWN_SECONDS * 1000
      ? Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - sinceLastSend) / 1000)
      : 0;

  return { history, cooldownRemaining };
}

export default function ForgotPasswordScreen({ navigation, route }) {
  const { sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  // Log in hands over whatever was already typed there, so the user does not
  // retype an address they just entered.
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const counting = cooldown > 0;

  useEffect(() => {
    if (!counting) return undefined;

    const timer = setInterval(() => {
      setCooldown((seconds) => (seconds <= 1 ? 0 : seconds - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [counting]);

  // Restores the real cooldown on mount, in case this screen is a fresh
  // instance (e.g. the user went back to Log in and returned) rather than
  // the one that just sent a link. Runs once for the address handed in from
  // Log in; a mid-visit edit to the field is covered by the same check
  // inside handleSend when they actually try to send.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const trimmed = email.trim();
      if (!EMAIL_PATTERN.test(trimmed)) return;

      const { cooldownRemaining } = await getSendLimitState(trimmed);
      if (cancelled || cooldownRemaining <= 0) return;

      setSent(true);
      setSentTo(trimmed);
      setCooldown(cooldownRemaining);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSend() {
    setError('');

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter the email on your account.');
      return;
    }

    setSubmitting(true);
    try {
      const { history, cooldownRemaining } = await getSendLimitState(trimmed);

      if (cooldownRemaining > 0) {
        // Storage says a link went out more recently than this screen's own
        // state knew about — leaving and coming back is the common way that
        // happens. Snap the UI to match instead of sending another one.
        setSent(true);
        setSentTo(trimmed);
        setCooldown(cooldownRemaining);
        return;
      }

      // Past the monthly limit the request is dropped silently: the screen
      // looks exactly as if a link went out, so it gives nothing away about
      // the limit to someone trying to flood an inbox.
      const withinLimit = history.sends.length < MAX_SENDS_PER_MONTH;
      if (withinLimit) await sendPasswordReset(trimmed);
      await recordRequest(trimmed, history, withinLimit);

      // Staying put rather than routing onward: the user has to leave for their
      // inbox either way, and if the email does not arrive this screen is where
      // they can resend or fix a mistyped address.
      setSent(true);
      setSentTo(trimmed);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleEmailChange(value) {
    setEmail(value);
    setError('');

    // A different address makes the previous send irrelevant, so drop back to
    // the initial state instead of offering to resend to the old one.
    if (sent && value.trim() !== sentTo) {
      setSent(false);
      setCooldown(0);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthAnimatedScreen>
        <ScrollView contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + authSpacing.screenTop, paddingBottom: insets.bottom + authSpacing.screenBottom },
          ]} keyboardShouldPersistTaps="handled">
          <AuthBackButton onPress={() => navigation.goBack()} />

          <Text style={styles.title}>Forgot password</Text>
          <Text style={styles.body}>
            Enter the email on your account and we will send a reset link.
          </Text>

          <AuthTextField
            placeholder="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={handleEmailChange}
          />

          {sent ? (
            <View style={styles.card}>
              <Text style={styles.cardEyebrow}>LINK SENT</Text>
              <Text style={styles.cardBody}>
                Open the link we sent to <Text style={styles.cardEmail}>{sentTo}</Text> to choose a
                new password. Check spam if it has not arrived in a minute.
              </Text>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {sent ? (
            <AuthButton
              label={counting ? `Resend Link in ${formatCountdown(cooldown)}` : 'Resend Link'}
              variant="secondary"
              onPress={handleSend}
              loading={submitting}
              disabled={counting}
              labelStyle={counting ? styles.resendMuted : styles.resendActive}
              style={styles.submit}
            />
          ) : (
            <AuthButton
              label="Send Reset Link"
              onPress={handleSend}
              loading={submitting}
              style={styles.submit}
            />
          )}
        </ScrollView>
      </AuthAnimatedScreen>
    </KeyboardAvoidingView>
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
  },
  title: {
    ...authType.screenTitle,
    color: authColors.ink,
    marginTop: 26,
    marginBottom: 8,
  },
  body: {
    ...authType.body,
    color: authColors.ink2,
    marginBottom: 22,
  },
  card: {
    backgroundColor: authColors.accentSoft,
    borderRadius: authRadius.card,
    padding: 16,
    marginTop: 18,
  },
  cardEyebrow: {
    ...authType.eyebrow,
    color: authColors.accentDeep,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: authFonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: authColors.ink2,
  },
  cardEmail: {
    ...authType.mono,
    color: authColors.ink,
  },
  error: {
    ...authType.helper,
    color: authColors.error,
    marginTop: 14,
    marginHorizontal: 4,
  },
  submit: {
    marginTop: 22,
  },
  resendMuted: {
    color: authColors.muted,
  },
  resendActive: {
    color: authColors.accentDeep,
  },
});
