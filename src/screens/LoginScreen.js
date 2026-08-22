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

export default function LoginScreen({ navigation }) {
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogIn() {
    setError('');
    setSubmitting(true);
    try {
      await logIn(email.trim(), password);
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
          <Text style={styles.title}>Log in</Text>
          <Text style={styles.subtitle}>Pick up where you left off.</Text>
        </View>

        <View style={styles.form}>
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
            placeholder="Your password"
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
            label="Log In"
            onPress={handleLogIn}
            loading={submitting}
            style={styles.submit}
          />
        </View>

        <Pressable
          onPress={() => navigation.navigate('Signup')}
          style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
        >
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.footerLink}>Sign up</Text>
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
