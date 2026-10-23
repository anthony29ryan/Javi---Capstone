// Kept free of Firebase imports so tests/streak.test.js can run it under plain Node.

/**
 * The learner's own calendar day as YYYY-MM-DD.
 *
 * Deliberately local time, not toISOString(): that is UTC, where an evening
 * session in the Americas already falls on the next day and breaks the streak.
 */
function dayString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Calendar arithmetic rather than "minus 24 hours", which lands on the wrong
// day around a daylight-saving change.
function yesterdayString(now) {
  return dayString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

/** The streak after studying at `now`: unchanged today, +1 after yesterday, else restarts at 1. */
export function advanceStreak(streak, now = new Date()) {
  const today = dayString(now);
  if (streak.lastActiveDate === today) return streak;

  const current = streak.lastActiveDate === yesterdayString(now) ? streak.current + 1 : 1;
  return {
    current,
    longest: Math.max(streak.longest || 0, current),
    lastActiveDate: today,
  };
}

/**
 * The streak as it stands at `now`. The stored `current` only changes when
 * the learner studies, so after a missed day it has to be read as 0.
 */
export function liveStreak(streak, now = new Date()) {
  const alive =
    streak.lastActiveDate === dayString(now) || streak.lastActiveDate === yesterdayString(now);
  return alive ? streak : { ...streak, current: 0 };
}
