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

import Ionicons from '@expo/vector-icons/Ionicons';

import Button from '../components/Button';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, type } from '../theme/colors';

const MIN_PASSWORD_LENGTH = 8;

// Firebase's own list of characters that count as non-alphanumeric. Checking
// against this exact set rather than "anything not a letter or digit" avoids
// telling the user a character qualifies when the server would disagree.
const SPECIAL_CHARACTERS = "^$*.[]{}()?\"!@#%&/\\,><':;|_~`";

// These mirror the password policy configured in the Firebase console
// (Authentication > Settings > Password policy). They exist here only to give
// instant feedback; the server is what actually enforces them, so if the
// console policy changes, update this list to match.
const PASSWORD_RULES = [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (value) => value.length >= MIN_PASSWORD_LENGTH,
  },
  {
    label: 'One uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    label: 'One special character',
    test: (value) => [...value].some((character) => SPECIAL_CHARACTERS.includes(character)),
  },
];

function PasswordRules({ password }) {
  return (
    <View style={styles.rules}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);

        return (
          <View key={rule.label} style={styles.rule}>
            <Ionicons
              name={met ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={met ? colors.success : colors.borderStrong}
            />
            <Text style={[styles.ruleText, met && styles.ruleTextMet]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Only flag a mismatch once the user has actually started the second field,
  // so the error does not appear while they are still typing it.
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSignUp() {
    setError('');

    if (PASSWORD_RULES.some((rule) => !rule.test(password))) {
      setError('Your password does not meet all the requirements listed below.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(email.trim(), password, displayName.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start working through the Java tiers.</Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Display name"
            placeholder="What should we call you?"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextField
            label="Email"
            placeholder="javi@gmail.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            placeholder="Choose a password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.passwordField}
          />
          <PasswordRules password={password} />
          <TextField
            label="Confirm password"
            placeholder="Re-enter your password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={mismatch ? 'Passwords do not match.' : null}
          />

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label="Sign Up"
            onPress={handleSignUp}
            loading={submitting}
            style={styles.submit}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
        >
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.footerLink}>Log in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  title: {
    ...type.screenTitle,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  // Pulls the rules checklist up against its own field rather than sitting a
  // full form gap away from it.
  passwordField: {
    marginBottom: -spacing.sm,
  },
  rules: {
    gap: spacing.xs,
    marginLeft: 2,
  },
  rule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ruleText: {
    ...type.small,
    color: colors.textMuted,
  },
  ruleTextMet: {
    color: colors.success,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorText: {
    ...type.small,
    color: colors.error,
    lineHeight: 19,
  },
  submit: {
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  footerPressed: {
    opacity: 0.6,
  },
  footerText: {
    ...type.small,
    color: colors.textMuted,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
