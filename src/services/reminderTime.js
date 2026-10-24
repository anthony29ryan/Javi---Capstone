// Kept free of React Native imports so tests/reminderTime.test.js can run it under plain Node.

/**
 * A stored reminder time ("HH:MM", 24-hour) as the learner reads it: "20:00"
 * on a phone set to 24-hour, "8:00 PM" on one set to 12-hour.
 */
export function formatReminderTime(time, uses24Hour) {
  if (uses24Hour) return time;
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}
