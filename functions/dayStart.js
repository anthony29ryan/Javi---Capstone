// When "today" and "this month" started for the daily limits and the Judge0
// budget. No Firebase here, so dayStart.test.js can run it under plain Node.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
// The Philippines has no daylight saving, so a fixed UTC+8 is exact all year.
// shortcut: one fixed zone for every user; switch to the device's zone if users abroad matter.
const MANILA_OFFSET_MS = 8 * HOUR_MS;

/** The epoch ms of the most recent 00:00 in Manila, at or before `now`. */
function manilaDayStart(now) {
  return Math.floor((now + MANILA_OFFSET_MS) / DAY_MS) * DAY_MS - MANILA_OFFSET_MS;
}

/** Manila's calendar date at `now`, as 'YYYY-MM-DD'. */
function manilaDate(now) {
  return new Date(now + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Manila's calendar month at `now`, as 'YYYY-MM'. */
function manilaMonth(now) {
  return manilaDate(now).slice(0, 7);
}

module.exports = { manilaDate, manilaDayStart, manilaMonth };
