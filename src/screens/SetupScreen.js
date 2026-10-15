import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthAlert from '../components/auth/AuthAlert';
import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import ReminderTimePicker from '../components/ReminderTimePicker';
import { useAuth } from '../context/AuthContext';
import { syncDailyReminder } from '../services/notifications';
import { DEFAULT_REMINDER_TIME, savePreferences } from '../services/preferences';
import { authColors, authSpacing, authType, centeredColumn, contentWidth } from '../theme/authTheme';

const FAILURES = {
  offline: {
    tone: 'warn',
    title: 'No internet connection',
    body: 'Check Wi-Fi or mobile data, then try again.',
    action: 'Try again',
  },
  failed: {
    tone: 'danger',
    title: 'Could not save your setup',
    body: 'Something went wrong on our side. Try again in a moment.',
  },
};

/**
 * First run after email verification. The handoff cut the "why are you
 * learning Java" chips from this screen so it asks only what is needed to get
 * going — the goals still exist, but Profile details owns them now.
 */
export default function SetupScreen({ navigation }) {
  const { user, nickname, updateNickname } = useAuth();
  const insets = useSafeAreaInsets();

  // Starts as the first name, so nobody has to invent a nickname to continue.
  const [name, setName] = useState(nickname || user?.displayName || '');
  const [time, setTime] = useState(DEFAULT_REMINDER_TIME);
  const [nameError, setNameError] = useState('');
  const [failure, setFailure] = useState(null); // a key of FAILURES
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setFailure(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Add a nickname so we know what to call you.');
      return;
    }

    setSaving(true);
    try {
      if (trimmed !== nickname) await updateNickname(trimmed);
      await savePreferences({ reminderTime: time, reminderEnabled: true, setupComplete: true });
      // A refused permission prompt turns the reminder off rather than
      // blocking setup, so this never stops someone reaching the app.
      const scheduled = await syncDailyReminder({ reminderEnabled: true, reminderTime: time });
      if (!scheduled) await savePreferences({ reminderEnabled: false });

      navigation.replace('MainTabs');
    } catch (err) {
      const offline = err.code === 'unavailable' || err.code === 'auth/network-request-failed';
      setFailure(offline ? 'offline' : 'failed');
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
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 28 },
          ]} keyboardShouldPersistTaps="handled">
          <Text style={styles.step}>Step 1 of 1</Text>
          <Text style={styles.title}>Before you start</Text>
          <Text style={styles.body}>
            Tell us what to call you and when you want a daily study reminder.
          </Text>

          <Text style={styles.label}>What should we call you?</Text>
          <AuthTextField
            placeholder="Nickname"
            value={name}
            error={nameError}
            onChangeText={(value) => {
              setName(value);
              setNameError('');
            }}
            style={styles.nameField}
          />
          <View style={styles.afterName} />

          <Text style={styles.label}>Daily study reminder</Text>
          <ReminderTimePicker time={time} onChange={setTime} />

          <View style={styles.spacer} />

          {failure ? (
            <AuthAlert {...FAILURES[failure]} onAction={handleFinish} style={styles.failure} />
          ) : null}

          <AuthButton label="Start learning" onPress={handleFinish} loading={saving} />
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
  step: {
    ...authType.eyebrow,
    letterSpacing: 10 * 0.14,
    color: authColors.muted,
  },
  title: {
    ...authType.screenTitle,
    color: authColors.ink,
    marginTop: 14,
    marginBottom: 8,
  },
  body: {
    ...authType.body,
    color: authColors.ink2,
    marginBottom: 22,
  },
  label: {
    ...authType.eyebrow,
    color: authColors.muted,
  },
  nameField: {
    marginTop: 10,
  },
  // Below the field and its error, if any; on the field itself it would sit
  // between the field and the error.
  afterName: {
    height: 24,
  },
  failure: {
    marginBottom: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
});
