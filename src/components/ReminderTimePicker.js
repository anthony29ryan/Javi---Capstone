import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getCalendars } from 'expo-localization';

import { formatReminderTime } from '../services/reminderTime';
import { authColors, authFonts, authRadius } from '../theme/authTheme';
import Text from './AppText';

/** A stored "HH:MM" reminder time in the phone's own 12- or 24-hour clock, like the native picker. */
export function displayReminderTime(time) {
  return formatReminderTime(time, getCalendars()[0]?.uses24hourClock ?? false);
}

const PRESETS = [
  { time: '07:00', label: 'Morning' },
  { time: '13:00', label: 'Midday' },
  { time: '20:00', label: 'Evening' },
];

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
 * The daily reminder time: three preset cards and a custom time. Shared by
 * Setup and the Settings reminder sheet so both pick a time the same way.
 * `time` is "HH:MM", as preferences store it.
 */
export default function ReminderTimePicker({ time, onChange }) {
  // A saved time that is not a preset opens on the custom row.
  const [customOpen, setCustomOpen] = useState(() => !PRESETS.some((p) => p.time === time));
  // Apart from customOpen: on Android the picker is a dialog that shows once
  // when it mounts, so it is mounted per tap and unmounted when it closes.
  const [pickerShown, setPickerShown] = useState(false);

  function pickPreset(preset) {
    // Choosing a preset closes the custom row, so only one of the two ever
    // reads as selected.
    setCustomOpen(false);
    onChange(preset);
  }

  return (
    <>
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const selected = !customOpen && time === preset.time;
          return (
            <Pressable
              key={preset.time}
              onPress={() => pickPreset(preset.time)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.preset, selected && styles.presetSelected]}
            >
              <Text style={[styles.presetTime, selected && styles.presetTimeSelected]}>
                {displayReminderTime(preset.time)}
              </Text>
              <Text style={styles.presetLabel}>{preset.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          setCustomOpen(true);
          setPickerShown(true);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: customOpen }}
        style={[styles.customRow, customOpen && styles.customRowOpen]}
      >
        <Text style={[styles.customLabel, customOpen && styles.customLabelOpen]}>Custom time</Text>
        {customOpen ? (
          <Text style={styles.customValue}>{displayReminderTime(time)}</Text>
        ) : (
          <Text style={styles.customSet}>Set</Text>
        )}
      </Pressable>

      {pickerShown ? (
        <DateTimePicker
          value={toDate(time)}
          mode="time"
          display="spinner"
          onChange={(event, date) => {
            setPickerShown(false);
            // Cancel reports 'dismissed', which keeps the time already chosen.
            if (event.type === 'set' && date) onChange(toTimeString(date));
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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
});
