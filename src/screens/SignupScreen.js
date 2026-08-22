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

import Button from '../components/Button';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, type } from '../theme/colors';

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    setError('');
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
            placeholder="you@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            placeholder="At least 6 characters"
            hint="Use 6 or more characters."
            secureTextEntry
            value={password}
            onChangeText={setPassword}
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
