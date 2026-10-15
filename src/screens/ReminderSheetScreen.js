import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/auth/AuthButton';
import BottomSheet from '../components/BottomSheet';
import ReminderTimePicker from '../components/ReminderTimePicker';
import { syncDailyReminder } from '../services/notifications';
import { savePreferences } from '../services/preferences';
import { colors, fonts, type } from '../theme/colors';

/**
 * Settings' "Reminder time": the same picker as Setup. Picking a time means
 * wanting the reminder, so saving switches it on; a refused permission keeps
 * the time but leaves it off. Settings gets the result back as route params.
 */
export default function ReminderSheetScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [time, setTime] = useState(route.params.reminderTime);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Filled on a successful save, so the close hands it to Settings.
  const result = useRef(null);

  async function save(close) {
    setSaving(true);
    setError('');
    try {
      const scheduled = await syncDailyReminder({ reminderEnabled: true, reminderTime: time });
      await savePreferences({ reminderTime: time, reminderEnabled: scheduled });
      result.current = { reminderTime: time, reminderEnabled: scheduled };
      close();
    } catch {
      setError('Could not save the reminder. Check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      onClosed={() =>
        result.current
          ? navigation.popTo('Settings', { reminder: result.current, toastAt: Date.now() })
          : navigation.goBack()
      }
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      {(close) => (
        <>
          <Text style={styles.title}>Reminder time</Text>
          <Text style={styles.body}>When should Javi nudge you to study each day?</Text>
          <ReminderTimePicker time={time} onChange={setTime} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AuthButton label="Save" onPress={() => save(close)} loading={saving} style={styles.save} />
          <AuthButton
            label="Cancel"
            variant="secondary"
            onPress={close}
            disabled={saving}
            style={styles.cancel}
          />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 21 * 1.3,
    color: colors.text,
    marginHorizontal: 4,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
    marginHorizontal: 4,
    marginTop: 6,
    marginBottom: 6,
  },
  error: {
    ...type.small,
    color: colors.error,
    marginHorizontal: 4,
    marginTop: 12,
  },
  save: {
    marginTop: 20,
  },
  cancel: {
    marginTop: 12,
  },
});
