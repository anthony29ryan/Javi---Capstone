import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import PasswordRules, { passwordMeetsAllRules } from '../components/auth/PasswordRules';
import { useAuth } from '../context/AuthContext';
import { authColors, authFonts, authSpacing, authType, centeredColumn, contentWidth } from '../theme/authTheme';

/**
 * Frame 48, with frame 92's wrong-current-password message. Proof is the
 * current password (AuthContext.changePassword re-authenticates first), which
 * is what OWASP ASVS and NIST ask for; Firebase signs other devices out.
 * Known gap: no email alert after a change, which would need an email service.
 */
export default function ChangePasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  // One message per field, shown all at once under each.
  const [fieldErrors, setFieldErrors] = useState({});
  // A refusal that is not about one field.
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  function edit(setter, field) {
    return (value) => {
      setter(value);
      setSaveError('');
      if (fieldErrors[field]) setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
    };
  }

  async function handleSave() {
    setSaveError('');

    // The same four rules sign-up enforces. Every screen that sets a password
    // holds the same line, so none of them becomes the weak way in.
    const errors = {
      current: current ? undefined : 'Enter your current password.',
      next: passwordMeetsAllRules(next)
        ? undefined
        : 'Your password does not meet all four requirements yet.',
      confirm: next === confirm ? undefined : 'The two passwords do not match.',
    };
    setFieldErrors(errors);
    if (errors.current || errors.next || errors.confirm) return;

    setSaving(true);
    try {
      await changePassword(current, next);
      navigation.popTo('MainTabs', {
        screen: 'Settings',
        params: { toast: 'Password updated', toastAt: Date.now() },
      });
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setFieldErrors({
          current: 'That is not your current password. Try again, or log out and use Forgot password.',
        });
      } else if (err.code === 'auth/too-many-requests') {
        setSaveError('Too many tries. Wait a few minutes, then try again.');
      } else {
        setSaveError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const top = insets.top + authSpacing.screenTop;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthAnimatedScreen>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: top, paddingBottom: insets.bottom + authSpacing.screenBottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Indented to clear the floating back button, which reserves no space. */}
          <View style={styles.header}>
            <Text style={styles.title}>Change password</Text>
          </View>
          <Text style={styles.body}>You stay logged in on this phone. Other devices are signed out.</Text>

          <View style={styles.form}>
            <AuthTextField
              placeholder="Current password"
              secureTextEntry
              value={current}
              onChangeText={edit(setCurrent, 'current')}
              error={fieldErrors.current}
            />
            <AuthTextField
              placeholder="New password"
              secureTextEntry
              value={next}
              onChangeText={edit(setNext, 'next')}
              error={fieldErrors.next}
            />
            <AuthTextField
              placeholder="Repeat new password"
              secureTextEntry
              value={confirm}
              onChangeText={edit(setConfirm, 'confirm')}
              error={fieldErrors.confirm}
            />
          </View>

          <PasswordRules password={next} />

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

          <AuthButton label="Save Password" onPress={handleSave} loading={saving} style={styles.submit} />
        </ScrollView>
      </AuthAnimatedScreen>

      <AuthBackButton onPress={() => navigation.goBack()} style={[styles.back, { top }]} />
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
  back: {
    position: 'absolute',
    left: authSpacing.screenH,
    zIndex: 2,
    shadowColor: authColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  header: {
    // Clears the floating back button: 40px plus the design's 12px gap.
    marginLeft: 52,
    minHeight: 40,
    justifyContent: 'center',
  },
  title: {
    fontFamily: authFonts.bold,
    fontSize: 22,
    lineHeight: 22 * 1.2,
    letterSpacing: -0.22,
    color: authColors.ink,
  },
  body: {
    ...authType.body,
    color: authColors.ink2,
    marginTop: 20,
    marginBottom: 20,
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
