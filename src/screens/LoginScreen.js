import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthAlert from '../components/auth/AuthAlert';
import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import GoogleButton, { useGoogleSignIn } from '../components/auth/GoogleButton';
import TermsSheet from '../components/auth/TermsSheet';
import { EMAIL_PATTERN } from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { googleAvailable } from '../services/googleSignIn';
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
  const google = useGoogleSignIn(navigation);
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
              : googleAvailable
                ? 'Wrong email or password. Signed up with Google? Use Continue with Google above.'
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
          ) : google.alert ? (
            <AuthAlert {...google.alert} style={styles.banner} />
          ) : null}

          <GoogleButton onPress={google.start} loading={google.busy} dividerLabel="OR LOG IN WITH EMAIL" />

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

      <TermsSheet visible={google.termsOpen} onClose={google.decline} onAccept={google.accept} />
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
  banner: {
    marginBottom: 16,
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
