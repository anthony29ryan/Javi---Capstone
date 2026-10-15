import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import AuthAlert from '../components/auth/AuthAlert';
import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import AuthToast from '../components/auth/AuthToast';
import { EMAIL_PATTERN } from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { authColors, authSpacing, authType, centeredColumn, contentWidth, authFonts } from '../theme/authTheme';

const BANNERS = {
  // Firebase does not say how long its block lasts, so neither does this.
  paused: {
    tone: 'danger',
    title: 'Log-in paused',
    body: 'Too many wrong passwords. Wait a few minutes, or reset your password to get back in now.',
    action: 'Reset password',
  },
  offline: {
    tone: 'warn',
    title: 'No internet connection',
    body: 'Check Wi-Fi or mobile data, then try again. What you typed is kept.',
    action: 'Try again',
  },
  failed: {
    tone: 'danger',
    title: 'Could not log you in',
    body: 'Something went wrong on our side. Try again in a moment.',
  },
};

/** The first problem with the form, as { field, message }, or null. */
function firstProblem(email, password) {
  if (!email) return { field: 'email', message: 'Enter your email address.' };
  if (!EMAIL_PATTERN.test(email)) {
    return { field: 'email', message: 'That email looks incomplete. Use the full address, like name@email.com.' };
  }
  if (!password) return { field: 'password', message: 'Enter your password.' };
  if (password.length < 8) return { field: 'password', message: 'Password needs at least 8 characters.' };
  return null;
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

// Firebase's own account-enumeration protection already merges "no such
// user" and "wrong password" into `invalid-credential` on current SDKs, but
// older projects/SDK paths can still return the two separately — covering
// both here means the message shown to the user (and whether it counts
// toward the lockout) does not depend on which one Firebase happens to send.
const CREDENTIAL_ERROR_CODES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-email',
]);

// After this many wrong tries in a row, the message points at password reset,
// which is usually what someone who keeps getting it wrong actually needs.
const FAILURES_BEFORE_RESET_HINT = 3;

// Password guessing is limited by Firebase itself, on its servers: after too
// many failures it refuses sign-ins with `auth/too-many-requests` for a while.
// The app deliberately has no lockout of its own. An earlier on-device one
// kept its own count and timer, which Firebase never saw, so the two disagreed
// and the screen showed "3 attempts left" or a countdown that Firebase then
// ignored. Firebase does not say how long its block lasts, so no timer is
// shown either — a wrong countdown is worse than none. Log In also stays
// tappable: each tap asks Firebase again, so the user gets in the moment
// Firebase lifts its block instead of waiting out a guessed pause on top.

export default function LoginScreen({ navigation, route }) {
  const { logIn } = useAuth();
  const insets = useSafeAreaInsets();
  // Sign-up's "Log in instead" passes the email that was already taken.
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [problem, setProblem] = useState(null); // { field, message }
  const [banner, setBanner] = useState(null); // a key of BANNERS
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  // Wrong tries in a row on this screen, only to decide when to suggest a
  // password reset. Not a lockout: nothing is blocked because of it.
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Editing a field clears its own error; the paused banner stays until a new
  // attempt, since waiting is what lifts it.
  function edited(field) {
    if (problem?.field === field) setProblem(null);
    if (banner && banner !== 'paused') setBanner(null);
  }

  function handleEmailChange(value) {
    setEmail(value);
    edited('email');
    // A different address starts a fresh count.
    setFailedAttempts(0);
  }

  async function handleLogIn() {
    const trimmedEmail = email.trim();
    const found = firstProblem(trimmedEmail, password);
    setProblem(found);
    setBanner(null);
    if (found) return;

    setSubmitting(true);
    try {
      const { pendingDeletion, name } = await logIn(trimmedEmail, password);
      if (pendingDeletion) {
        // Frame 52: the user chooses between restoring and staying deleted.
        navigation.navigate('RestoreAccount', { name, removalDate: pendingDeletion.getTime() });
      }
    } catch (err) {
      if (CREDENTIAL_ERROR_CODES.has(err.code)) {
        // One generic message for every credential failure, regardless of
        // which one Firebase reports — distinguishing "wrong password" from
        // "no such account" would let this screen be used to check which
        // emails have signed up.
        const failures = failedAttempts + 1;
        setFailedAttempts(failures);
        setProblem({
          field: 'password',
          message:
            failures >= FAILURES_BEFORE_RESET_HINT
              ? 'Wrong email or password. Forgot it? Reset your password below.'
              : 'Wrong email or password.',
        });
      } else if (err.code === 'auth/too-many-requests') {
        setBanner('paused');
      } else if (err.code === 'auth/network-request-failed') {
        setBanner('offline');
      } else {
        setBanner('failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const bannerActions = {
    paused: () => navigation.navigate('ForgotPassword', { email: email.trim() }),
    offline: handleLogIn,
  };

  function handleGoogle() {
    // Google sign-in isn't wired up yet — this button matches the design
    // handoff visually, but OAuth needs its own setup (Firebase provider
    // config, redirect handling) that's out of scope for this pass.
    setToast('Google sign-in coming soon');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthAnimatedScreen>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + authSpacing.screenTop, paddingBottom: insets.bottom + authSpacing.screenBottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <AuthBackButton onPress={() => navigation.goBack()} />

          <Text style={styles.title}>Welcome back</Text>

          {banner ? (
            <AuthAlert {...BANNERS[banner]} onAction={bannerActions[banner]} style={styles.banner} />
          ) : null}

          <Pressable
            onPress={handleGoogle}
            style={({ pressed }) => [styles.googleRow, pressed && styles.googlePressed]}
          >
            <GoogleLogo />
            <Text style={styles.googleLabel}>CONTINUE WITH GOOGLE</Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>OR LOG IN WITH EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.form}>
            <AuthTextField
              placeholder="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              error={problem?.field === 'email' ? problem.message : undefined}
              onChangeText={handleEmailChange}
            />
            <AuthTextField
              placeholder="Password"
              secureTextEntry
              value={password}
              error={problem?.field === 'password' ? problem.message : undefined}
              onChangeText={(value) => {
                setPassword(value);
                edited('password');
              }}
            />
          </View>

          <AuthButton
            label="Log in"
            loadingLabel="Logging in…"
            onPress={handleLogIn}
            loading={submitting}
            style={styles.submit}
          />

          <Pressable
            onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
            hitSlop={6}
            style={({ pressed }) => [styles.forgot, pressed && styles.forgotPressed]}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </ScrollView>
      </AuthAnimatedScreen>

      <AuthToast message={toast} onHide={() => setToast('')} />
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
    textAlign: 'center',
    marginTop: 26,
    marginBottom: 22,
  },
  googleRow: {
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
  googlePressed: {
    backgroundColor: authColors.accentSoft,
  },
  banner: {
    marginBottom: 16,
  },
  googleLabel: {
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
  form: {
    gap: authSpacing.fieldGap,
  },
  submit: {
    marginTop: 16,
  },
  forgot: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 10,
  },
  forgotPressed: {
    opacity: 0.6,
  },
  forgotText: {
    ...authType.helper,
    fontFamily: authFonts.semiBold,
    color: authColors.ink2,
  },
});
