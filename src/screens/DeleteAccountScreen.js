import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import {
  DELETION_WINDOW_DAYS,
  formatDeletionDate,
  permanentDeletionDate,
} from '../constants/accountDeletion';
import { useAuth } from '../context/AuthContext';
import { authColors, authRadius, authSpacing, authType, authFonts, centeredColumn, contentWidth } from '../theme/authTheme';

const CONFIRM_WORD = 'DELETE';

export default function DeleteAccountScreen({ navigation }) {
  const { scheduleAccountDeletion } = useAuth();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Exact match on purpose: typing "delete" in lowercase must not count.
  const confirmed = confirmText.trim() === CONFIRM_WORD;

  function handleDelete() {
    setError('');

    if (!password) {
      setError('Enter your password to confirm.');
      return;
    }

    // One last chance to back out before anything is scheduled.
    Alert.alert(
      'Are you sure?',
      `Your account will be deleted on ${formatDeletionDate(permanentDeletionDate(new Date()))}. Log in before then to restore it.`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, delete', style: 'destructive', onPress: scheduleDeletion },
      ]
    );
  }

  async function scheduleDeletion() {
    setDeleting(true);
    try {
      // Scheduling the deletion signs the user out, which swaps the whole
      // navigator back to the auth stack, opening on Sign up — so there is
      // nothing to navigate to here on success.
      await scheduleAccountDeletion(password);
    } catch (err) {
      setError(
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'That password is not right.'
          : err.message
      );
      setDeleting(false);
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

          <Text style={styles.title}>Delete account</Text>
          <View style={styles.warning}>
            <Text style={styles.warningBody}>
              Your account and all your progress will be permanently deleted after{' '}
              {DELETION_WINDOW_DAYS} days. Log in before then to restore it.
            </Text>
          </View>

          <Text style={styles.label}>Your password</Text>
          <AuthTextField
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
            }}
          />

          <Text style={styles.label}>Type {CONFIRM_WORD} to confirm</Text>
          <AuthTextField
            placeholder={CONFIRM_WORD}
            autoCapitalize="characters"
            autoCorrect={false}
            value={confirmText}
            onChangeText={(value) => {
              setConfirmText(value);
              setError('');
            }}
            style={styles.confirmField}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AuthButton
            label="Delete My Account"
            onPress={handleDelete}
            loading={deleting}
            disabled={!confirmed}
            style={[styles.destructive, !confirmed && styles.destructiveOff]}
          />
          <AuthButton
            label="Keep My Account"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.keep}
          />
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
    marginTop: 26,
    marginBottom: 18,
  },
  warning: {
    borderRadius: authRadius.card,
    borderWidth: 1,
    borderColor: authColors.error,
    padding: 16,
    marginBottom: 22,
  },
  warningBody: {
    fontFamily: authFonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: authColors.ink2,
  },
  label: {
    ...authType.eyebrow,
    color: authColors.muted,
    marginBottom: 8,
    marginTop: 14,
  },
  confirmField: {
    marginBottom: 4,
  },
  error: {
    ...authType.helper,
    color: authColors.error,
    marginTop: 14,
    marginHorizontal: 4,
  },
  destructive: {
    marginTop: 22,
    backgroundColor: authColors.error,
  },
  destructiveOff: {
    backgroundColor: authColors.surface2,
  },
  keep: {
    marginTop: 12,
  },
});
