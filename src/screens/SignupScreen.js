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

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import PasswordRules, { passwordMeetsAllRules } from '../components/auth/PasswordRules';
import { useAuth } from '../context/AuthContext';
import { authColors, authRadius, authSpacing, authType, centeredColumn, contentWidth } from '../theme/authTheme';

const EMAIL_PATTERN = /.+@.+\..+/;

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function clearError() {
    if (error) setError('');
  }

  async function handleSignUp() {
    setError('');

    // Validated in this order, matching the design handoff, so the user
    // always sees the single most relevant problem first.
    if (!displayName.trim()) {
      setError('Enter your first name.');
      return;
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!passwordMeetsAllRules(password)) {
      setError('Your password does not meet all four requirements yet.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('Accept the terms to continue.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch (err) {
      // Firebase's own message here is a raw error code, so replace it with
      // something a learner can act on.
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'This email already has an account. Log in instead.'
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
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
          <AuthBackButton
            // After an account deletion this is the first screen, so there is
            // nothing to go back to — fall back to Welcome instead.
            onPress={() =>
              navigation.canGoBack() ? navigation.goBack() : navigation.replace('Welcome')
            }
          />

          <Text style={styles.title}>Create your account</Text>


          <View style={styles.form}>
            <AuthTextField
              placeholder="First name"
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                clearError();
              }}
            />
            <AuthTextField
              placeholder="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                clearError();
              }}
            />
            <AuthTextField
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                clearError();
              }}
            />
            <AuthTextField
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                clearError();
              }}
            />
          </View>

          <PasswordRules password={password} />

          <Pressable
            onPress={() => {
              setAgreed((value) => !value);
              clearError();
            }}
            style={styles.terms}
            hitSlop={4}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </View>
            <Text style={styles.termsLabel}>I agree to the terms and privacy policy</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AuthButton
            label="Get Started"
            onPress={handleSignUp}
            loading={submitting}
            style={styles.submit}
          />

          <Pressable
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
          >
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerAccent}>Log in</Text>
            </Text>
          </Pressable>
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
    textAlign: 'center',
    marginTop: 26,
    marginBottom: 22,
  },
  form: {
    gap: authSpacing.fieldGap,
  },
  terms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginHorizontal: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: authRadius.checkbox,
    borderWidth: 1.5,
    borderColor: authColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: authColors.accent,
    borderColor: authColors.accent,
  },
  checkboxMark: {
    color: authColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  termsLabel: {
    ...authType.helper,
    color: authColors.ink2,
    flex: 1,
  },
  error: {
    ...authType.helper,
    color: authColors.error,
    marginTop: authSpacing.fieldGap,
  },
  submit: {
    marginTop: 18,
  },
  footer: {
    marginTop: authSpacing.screenH,
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerPressed: {
    opacity: 0.6,
  },
  footerText: {
    ...authType.helper,
    color: authColors.ink2,
  },
  footerAccent: {
    color: authColors.accentDeep,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
