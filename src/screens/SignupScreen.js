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
import AuthTextField, { FieldError } from '../components/auth/AuthTextField';
import GoogleButton, { useGoogleSignIn } from '../components/auth/GoogleButton';
import PasswordRules, { passwordMeetsAllRules } from '../components/auth/PasswordRules';
import TermsSheet from '../components/auth/TermsSheet';
import { TERMS_VERSION } from '../constants/legal';
import { EMAIL_PATTERN } from '../constants/validation';
import { useAuth } from '../context/AuthContext';
import { googleAvailable } from '../services/googleSignIn';
import { authColors, authRadius, authSpacing, authType, centeredColumn, contentWidth, authFonts } from '../theme/authTheme';

const BANNERS = {
  taken: {
    tone: 'danger',
    title: 'This email already has an account',
    // Never says which way this account signs in: that would reveal more about who has signed up.
    body: googleAvailable
      ? 'Log in with your password, or tap Continue with Google if you signed up with Google.'
      : 'Log in with it instead. If you forgot the password, reset it from the log-in screen.',
    action: 'Log in instead',
  },
  offline: {
    tone: 'warn',
    title: 'No internet connection',
    body: 'Check Wi-Fi or mobile data, then try again. What you typed is kept.',
    action: 'Try again',
  },
  failed: {
    tone: 'danger',
    title: 'Could not create your account',
    body: 'Something went wrong on our side. Try again in a moment.',
  },
};

/**
 * The first problem with the form, as { field, message }, or null when it is
 * ready to send. One at a time, in the order the fields appear.
 */
function firstProblem({ displayName, lastName, email, password, confirmPassword, agreed }) {
  if (!displayName.trim()) return { field: 'name', message: 'Enter your first name.' };
  if (!lastName.trim()) return { field: 'lastName', message: 'Enter your last name.' };
  if (!email.trim()) return { field: 'email', message: 'Enter your email address.' };
  if (!EMAIL_PATTERN.test(email.trim())) {
    return { field: 'email', message: 'That email looks incomplete. Use the full address, like name@email.com.' };
  }
  if (!password) return { field: 'password', message: 'Create a password.' };
  if (!passwordMeetsAllRules(password)) {
    return {
      field: 'password',
      message: 'Use at least 8 characters with an uppercase letter, a lowercase letter and a symbol.',
    };
  }
  if (!confirmPassword) return { field: 'confirm', message: 'Repeat your password.' };
  if (password !== confirmPassword) return { field: 'confirm', message: 'This does not match the password above.' };
  if (!agreed) return { field: 'agree', message: 'Read and accept the terms to continue.' };
  return null;
}

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState(null); // { field, message }
  const [banner, setBanner] = useState(null); // a key of BANNERS
  const [termsTab, setTermsTab] = useState(null); // 'terms' | 'privacy' while the popup is open
  const [submitting, setSubmitting] = useState(false);
  const google = useGoogleSignIn(navigation);

  // Editing a field clears its own error. The "already has an account" banner
  // stays until the email itself changes; the others go on any edit.
  function edited(field) {
    if (problem?.field === field) setProblem(null);
    if (banner && (banner !== 'taken' || field === 'email')) setBanner(null);
  }

  const errorFor = (field) => (problem?.field === field ? problem.message : undefined);

  async function handleSignUp() {
    const found = firstProblem({ displayName, lastName, email, password, confirmPassword, agreed });
    setProblem(found);
    setBanner(null);
    if (found) return;

    setSubmitting(true);
    try {
      await signUp(email.trim(), password, displayName.trim(), lastName.trim(), TERMS_VERSION);
    } catch (err) {
      // Firebase's own messages are raw error codes, so map them to ones a
      // learner can act on.
      if (err.code === 'auth/email-already-in-use') {
        setProblem({ field: 'email', message: 'An account already uses this email.' });
        setBanner('taken');
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
    taken: () => navigation.navigate('Login', { email: email.trim() }),
    offline: handleSignUp,
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

          <Text style={styles.title}>Create your account</Text>

          {banner ? (
            <AuthAlert {...BANNERS[banner]} onAction={bannerActions[banner]} style={styles.banner} />
          ) : google.alert ? (
            <AuthAlert {...google.alert} style={styles.banner} />
          ) : null}

          <GoogleButton onPress={google.start} loading={google.busy} dividerLabel="OR SIGN UP WITH EMAIL" />

          <View style={styles.form}>
            <AuthTextField
              placeholder="First name"
              value={displayName}
              error={errorFor('name')}
              onChangeText={(value) => {
                setDisplayName(value);
                edited('name');
              }}
            />
            <AuthTextField
              placeholder="Last name"
              value={lastName}
              error={errorFor('lastName')}
              onChangeText={(value) => {
                setLastName(value);
                edited('lastName');
              }}
            />
            <AuthTextField
              placeholder="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              error={errorFor('email')}
              onChangeText={(value) => {
                setEmail(value);
                edited('email');
              }}
            />
            <AuthTextField
              placeholder="Password"
              secureTextEntry
              value={password}
              error={errorFor('password')}
              onChangeText={(value) => {
                setPassword(value);
                edited('password');
              }}
            />
            <AuthTextField
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              error={errorFor('confirm')}
              onChangeText={(value) => {
                setConfirmPassword(value);
                edited('confirm');
              }}
            />
          </View>

          <PasswordRules password={password} />

          {/* Ticking goes through the Terms popup; unticking is direct. */}
          <View style={styles.terms}>
            <Pressable
              onPress={() => (agreed ? setAgreed(false) : setTermsTab('terms'))}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}
              accessibilityLabel="I agree to the terms and privacy policy"
              style={[
                styles.checkbox,
                agreed && styles.checkboxChecked,
                problem?.field === 'agree' && styles.checkboxError,
              ]}
            >
              {agreed ? <Text style={styles.checkboxMark}>✓</Text> : null}
            </Pressable>
            <Text style={styles.termsLabel}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => setTermsTab('terms')}>
                terms
              </Text>{' '}
              and{' '}
              <Text style={styles.termsLink} onPress={() => setTermsTab('privacy')}>
                privacy policy
              </Text>
            </Text>
          </View>
          {problem?.field === 'agree' ? (
            <FieldError message={problem.message} style={styles.agreeError} />
          ) : null}

          <AuthButton
            label="Get started"
            loadingLabel="Creating account…"
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

      <TermsSheet
        visible={termsTab !== null}
        initialTab={termsTab ?? 'terms'}
        onClose={() => setTermsTab(null)}
        onAccept={() => {
          setAgreed(true);
          edited('agree');
          setTermsTab(null);
        }}
      />
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
  form: {
    gap: authSpacing.fieldGap,
  },
  banner: {
    marginBottom: 16,
  },
  terms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  checkboxError: {
    borderColor: authColors.error,
  },
  checkboxMark: {
    color: authColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  termsLabel: {
    flex: 1,
    fontFamily: authFonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: authColors.ink2,
  },
  termsLink: {
    fontFamily: authFonts.semiBold,
    color: authColors.accentDeep,
    textDecorationLine: 'underline',
  },
  agreeError: {
    marginTop: 10,
  },
  submit: {
    marginTop: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  footerPressed: {
    opacity: 0.6,
  },
  footerText: {
    fontFamily: authFonts.semiBold,
    fontSize: 12,
    letterSpacing: 12 * 0.08,
    textTransform: 'uppercase',
    color: authColors.muted,
  },
  footerAccent: {
    color: authColors.accentDeep,
  },
});
