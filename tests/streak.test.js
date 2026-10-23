// Unit tests for src/services/streak.js.
//
//   npm test

// Set before any Date is made: New York is where UTC dates went wrong, since
// an evening session there is already the next day in UTC.
process.env.TZ = 'America/New_York';

const assert = require('node:assert');
const { test } = require('node:test');

const { advanceStreak, liveStreak } = require('../src/services/streak.js');

const at = (day, hour) => new Date(2026, 9, day, hour); // October 2026, local time

test('evening sessions on consecutive local days extend the streak', () => {
  // 19:00 Mon 12th is 23:00 UTC Mon; 21:00 Tue 13th is 01:00 UTC Wed.
  const monday = advanceStreak({ current: 0, longest: 0, lastActiveDate: null }, at(12, 19));
  const tuesday = advanceStreak(monday, at(13, 21));
  assert.deepStrictEqual(tuesday, { current: 2, longest: 2, lastActiveDate: '2026-10-13' });
});

test('a second session the same day changes nothing', () => {
  const streak = { current: 3, longest: 5, lastActiveDate: '2026-10-13' };
  assert.strictEqual(advanceStreak(streak, at(13, 23)), streak);
});

test('a missed day restarts the streak and keeps the longest', () => {
  const streak = { current: 4, longest: 4, lastActiveDate: '2026-10-10' };
  assert.deepStrictEqual(advanceStreak(streak, at(13, 9)), {
    current: 1,
    longest: 4,
    lastActiveDate: '2026-10-13',
  });
});

test('the shown streak drops to 0 once a day is missed, not before', () => {
  const streak = { current: 7, longest: 7, lastActiveDate: '2026-10-12' };
  assert.strictEqual(liveStreak(streak, at(13, 22)).current, 7);
  assert.strictEqual(liveStreak(streak, at(14, 8)).current, 0);
  assert.strictEqual(liveStreak(streak, at(14, 8)).longest, 7);
});
