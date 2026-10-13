import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import AuthToast from '../components/auth/AuthToast';
import PasswordRules, { passwordMeetsAllRules } from '../components/auth/PasswordRules';
import { useAuth } from '../context/AuthContext';
import { authColors, authSpacing, authType, centeredColumn, contentWidth } from '../theme/authTheme';

export default function ChangePasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  async function handleSave() {
    setError('');

    if (!current) {
      setError('Enter your current password.');
      return;
    }
    // The same four rules sign-up enforces. Every screen that sets a password
    // holds the same line, so none of them becomes the weak way in.
    if (!passwordMeetsAllRules(next)) {
      setError('Your password does not meet all four requirements yet.');
      return;
    }
    if (next !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await changePassword(current, next);
      setToast('Password changed');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'That current password is not right.'
          : err.message
      );
    } finally {
      setSaving(false);
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

          <Text style={styles.title}>Change password</Text>
          <Text style={styles.body}>
            Enter your current password, then choose a new one.
          </Text>

          <View style={styles.form}>
            <AuthTextField
              placeholder="Current password"
              secureTextEntry
              value={current}
              onChangeText={(value) => {
                setCurrent(value);
                setError('');
              }}
            />
            <AuthTextField
              placeholder="New password"
              secureTextEntry
              value={next}
              onChangeText={(value) => {
                setNext(value);
                setError('');
              }}
            />
            <AuthTextField
              placeholder="Repeat new password"
              secureTextEntry
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                setError('');
              }}
            />
          </View>

          <PasswordRules password={next} />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AuthButton label="Save Password" onPress={handleSave} loading={saving} style={styles.submit} />
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
    marginTop: 26,
    marginBottom: 8,
  },
  body: {
    ...authType.body,
    color: authColors.ink2,
    marginBottom: 22,
  },
  form: {
    gap: authSpacing.fieldGap,
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
});
