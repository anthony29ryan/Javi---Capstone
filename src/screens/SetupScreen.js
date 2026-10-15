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
import DateTimePicker from '@react-native-community/datetimepicker';

import AuthAlert from '../components/auth/AuthAlert';
import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import { useAuth } from '../context/AuthContext';
import { syncDailyReminder } from '../services/notifications';
import { DEFAULT_REMINDER_TIME, savePreferences } from '../services/preferences';
import { authColors, authRadius, authSpacing, authType, authFonts, centeredColumn, contentWidth } from '../theme/authTheme';

const PRESETS = [
  { time: '07:00', label: 'Morning' },
  { time: '13:00', label: 'Midday' },
  { time: '20:00', label: 'Evening' },
];

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

function toDate(time) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function toTimeString(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

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
  const [customOpen, setCustomOpen] = useState(false);
  const [nameError, setNameError] = useState('');
  const [failure, setFailure] = useState(null); // a key of FAILURES
  const [saving, setSaving] = useState(false);

  function pickPreset(preset) {
    // Choosing a preset closes the custom row, so only one of the two ever
    // reads as selected.
    setCustomOpen(false);
    setTime(preset);
  }

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
          <View style={styles.presets}>
            {PRESETS.map((preset) => {
              const selected = !customOpen && time === preset.time;
              return (
                <Pressable
                  key={preset.time}
                  onPress={() => pickPreset(preset.time)}
                  style={[styles.preset, selected && styles.presetSelected]}
                >
                  <Text style={[styles.presetTime, selected && styles.presetTimeSelected]}>
                    {preset.time}
                  </Text>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setCustomOpen(true)}
            style={[styles.customRow, customOpen && styles.customRowOpen]}
          >
            <Text style={[styles.customLabel, customOpen && styles.customLabelOpen]}>
              Custom time
            </Text>
            {customOpen ? (
              <Text style={styles.customValue}>{time}</Text>
            ) : (
              <Text style={styles.customSet}>Set</Text>
            )}
          </Pressable>

          {customOpen ? (
            <DateTimePicker
              value={toDate(time)}
              mode="time"
              display="spinner"
              onChange={(event, date) => {
                if (date) setTime(toTimeString(date));
              }}
            />
          ) : null}

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
  presets: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  preset: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: authRadius.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: authColors.line,
    backgroundColor: authColors.surface,
  },
  presetSelected: {
    borderColor: authColors.accent,
    backgroundColor: authColors.accentSoft,
  },
  presetTime: {
    fontFamily: authFonts.bold,
    fontSize: 15,
    lineHeight: 15 * 1.2,
    color: authColors.ink,
  },
  presetTimeSelected: {
    color: authColors.accentDeep,
  },
  presetLabel: {
    fontFamily: authFonts.medium,
    fontSize: 11,
    lineHeight: 11 * 1.2,
    color: authColors.muted,
    marginTop: 3,
  },
  customRow: {
    marginTop: 9,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: authRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: authColors.line,
    backgroundColor: authColors.surface,
  },
  customRowOpen: {
    borderColor: authColors.accent,
    backgroundColor: authColors.accentSoft,
  },
  customLabel: {
    fontFamily: authFonts.semiBold,
    fontSize: 13,
    color: authColors.ink,
  },
  customLabelOpen: {
    color: authColors.accentDeep,
  },
  customValue: {
    fontFamily: authFonts.bold,
    fontSize: 15,
    color: authColors.accentDeep,
  },
  customSet: {
    fontFamily: authFonts.medium,
    fontSize: 13,
    color: authColors.muted,
  },
  failure: {
    marginBottom: 16,
  },
  spacer: {
    flex: 1,
    minHeight: 20,
  },
});
