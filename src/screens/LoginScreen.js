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

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import AuthToast from '../components/auth/AuthToast';
import { useAuth } from '../context/AuthContext';
import { authColors, authSpacing, authType } from '../theme/authTheme';

const EMAIL_PATTERN = /.+@.+\..+/;

export default function LoginScreen({ navigation }) {
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  async function handleLogIn() {
    setError('');

    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password needs at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await logIn(email.trim(), password);
    } catch (err) {
      setError(err.message);
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
          contentContainerStyle={styles.content}
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
              onChangeText={(value) => {
                setEmail(value);
                setError('');
              }}
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

          <AuthButton label="Log In" onPress={handleLogIn} loading={submitting} style={styles.submit} />

          <Pressable
            onPress={() => navigation.navigate('Signup')}
            hitSlop={6}
            style={({ pressed }) => [styles.forgot, pressed && styles.forgotPressed]}
          >
            <Text style={styles.forgotText}>
              Don't have an account? <Text style={styles.forgotAccent}>Sign up</Text>
            </Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: authSpacing.screenH,
    paddingTop: authSpacing.screenTop,
    paddingBottom: authSpacing.screenBottom,
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
    color: authColors.ink2,
  },
  forgotAccent: {
    color: authColors.accentDeep,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
