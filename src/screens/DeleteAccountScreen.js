import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import Mascot from '../components/Mascot';
import {
  DELETION_WINDOW_DAYS,
  formatDeletionDate,
  permanentDeletionDate,
} from '../constants/accountDeletion';
import { useAuth } from '../context/AuthContext';
import { authColors, authFonts, authSpacing, authType, centeredColumn, contentWidth } from '../theme/authTheme';

const CONFIRM_WORD = 'DELETE';

/**
 * Frame 49, with frame 94's wrong-password message. The design's card says
 * "This cannot be undone", but logging in within the window restores the
 * account, so the card says when it goes instead. The list matches what
 * scripts/purgeDeletedAccounts.js removes.
 */
export default function DeleteAccountScreen({ navigation }) {
  const { scheduleAccountDeletion } = useAuth();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // A refusal that is not about the password itself.
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Exact match on purpose: typing "delete" in lowercase must not count.
  const confirmed = confirmText.trim() === CONFIRM_WORD;
  const ready = confirmed && password.length > 0;

  async function handleDelete() {
    setError('');
    setPasswordError('');
    setDeleting(true);
    try {
      // Scheduling the deletion signs the user out, which swaps the whole
      // navigator back to the auth stack, opening on Sign up — so there is
      // nothing to navigate to here on success.
      await scheduleAccountDeletion(password);
    } catch (err) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setPasswordError('That password is not right. Your account was not deleted.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many tries. Wait a few minutes, then try again.');
      } else {
        setError(err.message);
      }
      setDeleting(false);
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
            <Text style={styles.title}>Delete account</Text>
          </View>

          <View style={styles.farewell}>
            <Mascot variant="crying" px={120} animate={false} />
            <Text style={styles.farewellLine}>Javi will miss you.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.kicker}>Deleted in {DELETION_WINDOW_DAYS} days</Text>
            <Text style={styles.cardBody}>
              Deleting removes your lesson progress, quiz answers and scores, streak and badges, your
              Javi conversations and your profile. Log in before{' '}
              {formatDeletionDate(permanentDeletionDate(new Date()))} to restore everything.
            </Text>
          </View>

          <Text style={styles.label}>Your password</Text>
          <AuthTextField
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setPasswordError('');
              setError('');
            }}
            error={passwordError}
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
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AuthButton
            label="Delete My Account"
            onPress={handleDelete}
            loading={deleting}
            disabled={!ready}
            style={[styles.destructive, !ready && styles.destructiveOff]}
          />
          <AuthButton
            label="Keep My Account"
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.keep}
          />
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
  farewell: {
    alignItems: 'center',
    marginTop: 18,
  },
  farewellLine: {
    fontFamily: authFonts.semiBold,
    fontSize: 15,
    color: authColors.ink2,
    textAlign: 'center',
    marginTop: 10,
  },
  card: {
    marginTop: 22,
    padding: 18,
    borderRadius: 20,
    backgroundColor: authColors.errorSoft,
    borderWidth: 1,
    borderColor: authColors.errorLine,
  },
  kicker: {
    fontFamily: authFonts.bold,
    fontSize: 13,
    letterSpacing: 13 * 0.06,
    textTransform: 'uppercase',
    color: authColors.error,
  },
  cardBody: {
    fontFamily: authFonts.regular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.7,
    color: authColors.ink,
    marginTop: 12,
  },
  label: {
    ...authType.eyebrow,
    color: authColors.muted,
    marginBottom: 8,
    marginTop: 22,
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
