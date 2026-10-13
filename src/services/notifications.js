import * as Notifications from 'expo-notifications';

import { DEFAULT_REMINDER_TIME } from './preferences';

/**
 * The daily study reminder.
 *
 * This is a *local* notification scheduled on the device, not a push. That
 * distinction matters here: Expo Go dropped remote push on Android from SDK
 * 53, but local scheduled notifications still work, so the reminder is real
 * in Expo Go rather than something that only works in a native build.
 *
 * The trade is that the reminder only fires on the device that scheduled it
 * and only while the app stays installed — fine for a daily nudge, and it
 * avoids needing a server to send anything.
 */

const REMINDER_IDENTIFIER = 'daily-study-reminder';

function parseTime(value) {
  const [hours, minutes] = (value || DEFAULT_REMINDER_TIME).split(':').map(Number);
  return {
    hour: Number.isFinite(hours) ? hours : 20,
    minute: Number.isFinite(minutes) ? minutes : 0,
  };
}

/**
 * Asks for permission if it has not been decided yet. Returns whether we may
 * post notifications — the caller is expected to save the user's preference
 * either way, so a refusal turns the reminder off rather than failing.
 */
export async function ensureNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  if (!existing.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelDailyReminder() {
  await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {
    // Nothing scheduled under that id, which is the normal case the first
    // time the reminder is turned off.
  });
}

/**
 * Schedules (or reschedules) the reminder. Always cancels first: scheduling
 * with the same identifier twice would otherwise leave the old time in place
 * alongside the new one.
 */
export async function scheduleDailyReminder(time) {
  const { hour, minute } = parseTime(time);

  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_IDENTIFIER,
    content: {
      title: 'Time to practice Java',
      body: 'Ten minutes is enough. Pick up where you left off.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

/** Applies the saved preference: schedules when on, clears it when off. */
export async function syncDailyReminder({ reminderEnabled, reminderTime }) {
  if (!reminderEnabled) {
    await cancelDailyReminder();
    return false;
  }

  const allowed = await ensureNotificationPermission();
  if (!allowed) {
    await cancelDailyReminder();
    return false;
  }

  await scheduleDailyReminder(reminderTime);
  return true;
}
