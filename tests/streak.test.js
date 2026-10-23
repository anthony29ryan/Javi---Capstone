// Unit tests for src/services/streak.js.
//
//   npm test

// Set before any Date is made: New York is where UTC dates went wrong, since
// an evening session there is already the next day in UTC.
process.env.TZ = 'America/New_York';

const assert = require('node:assert');
const { test } = require('node:test');

const { advanceStreak, liveStreak, studiedDays } = require('../src/services/streak.js');

const at = (day, hour) => new Date(2026, 9, day, hour); // October 2026, local time

test('evening sessions on consecutive local days extend the streak', () => {
  // 19:00 Mon 12th is 23:00 UTC Mon; 21:00 Tue 13th is 01:00 UTC Wed.
  const monday = advanceStreak({ current: 0, longest: 0, lastActiveDate: null }, at(12, 19));
  const tuesday = advanceStreak(monday, at(13, 21));
  assert.deepStrictEqual(tuesday, {
    current: 2,
    longest: 2,
    lastActiveDate: '2026-10-13',
    days: ['2026-10-12', '2026-10-13'],
  });
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
    // The old record's run (7th–10th) is rebuilt, then today added after the gap.
    days: ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-13'],
  });
});

test('a record saved before days existed rebuilds its run across a month end', () => {
  const streak = { current: 3, longest: 3, lastActiveDate: '2026-11-01' };
  assert.deepStrictEqual(studiedDays(streak), ['2026-10-30', '2026-10-31', '2026-11-01']);
  assert.deepStrictEqual(studiedDays({ current: 0, longest: 2, lastActiveDate: null }), []);
});

test('the days list keeps only the most recent 42 days', () => {
  const days = Array.from({ length: 42 }, (_, i) => `2026-08-${String(i % 28 + 1).padStart(2, '0')}`);
  const next = advanceStreak({ current: 1, longest: 9, lastActiveDate: '2026-10-11', days }, at(13, 9));
  assert.strictEqual(next.days.length, 42);
  assert.strictEqual(next.days[0], days[1]);
  assert.strictEqual(next.days[41], '2026-10-13');
});

test('the shown streak drops to 0 once a day is missed, not before', () => {
  const streak = { current: 7, longest: 7, lastActiveDate: '2026-10-12' };
  assert.strictEqual(liveStreak(streak, at(13, 22)).current, 7);
  assert.strictEqual(liveStreak(streak, at(14, 8)).current, 0);
  assert.strictEqual(liveStreak(streak, at(14, 8)).longest, 7);
});
