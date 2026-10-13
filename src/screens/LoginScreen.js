import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import AuthToast from '../components/auth/AuthToast';
import { useAuth } from '../context/AuthContext';
import { authColors, authSpacing, authType, centeredColumn, contentWidth } from '../theme/authTheme';

const EMAIL_PATTERN = /.+@.+\..+/;

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

export default function LoginScreen({ navigation }) {
  const { logIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  // Wrong tries in a row on this screen, only to decide when to suggest a
  // password reset. Not a lockout: nothing is blocked because of it.
  const [failedAttempts, setFailedAttempts] = useState(0);

  function handleEmailChange(value) {
    setEmail(value);
    setError('');
    // A different address starts a fresh count.
    setFailedAttempts(0);
  }

  async function handleLogIn() {
    setError('');

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password needs at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { restored } = await logIn(trimmedEmail, password);
      if (restored) {
        // A native alert outlives this screen, which unmounts as the app
        // opens, so the message is still there when the user lands.
        Alert.alert(
          'Welcome back',
          'Your account was scheduled for deletion. Logging in cancelled that, and all of your progress is still here.'
        );
      }
    } catch (err) {
      if (CREDENTIAL_ERROR_CODES.has(err.code)) {
        // One generic message for every credential failure, regardless of
        // which one Firebase reports — distinguishing "wrong password" from
        // "no such account" would let this screen be used to check which
        // emails have signed up.
        const failures = failedAttempts + 1;
        setFailedAttempts(failures);
        setError(
          failures >= FAILURES_BEFORE_RESET_HINT
            ? 'Wrong email or password. Forgot it? Reset your password below.'
            : 'Wrong email or password.'
        );
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.');
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

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

          <Pressable
            onPress={handleGoogle}
            style={({ pressed }) => [styles.googleRow, pressed && styles.googlePressed]}
          >
            <View style={styles.googleDot} />
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
              onChangeText={handleEmailChange}
            />
            <AuthTextField
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setError('');
              }}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AuthButton
            label="Log In"
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
    justifyContent: 'center',
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
  googleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: authColors.surface2,
  },
  googleLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
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
  error: {
    ...authType.helper,
    color: authColors.error,
    marginTop: authSpacing.fieldGap,
  },
  submit: {
    marginTop: 18,
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
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: authColors.ink2,
  },
});
