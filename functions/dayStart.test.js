// Tests for dayStart.js, run under plain Node by `npm test`.
const assert = require('node:assert');
const { test } = require('node:test');

const { manilaDayStart } = require('./dayStart');

test('the day starts at midnight Manila time, which is 16:00 UTC the day before', () => {
  const start = Date.parse('2026-10-23T16:00:00Z'); // 2026-10-24 00:00 in Manila
  assert.strictEqual(manilaDayStart(start), start);
  assert.strictEqual(manilaDayStart(Date.parse('2026-10-24T15:59:59Z')), start, '23:59:59 Manila is still that day');
  assert.strictEqual(manilaDayStart(Date.parse('2026-10-24T16:00:00Z')), Date.parse('2026-10-24T16:00:00Z'), 'next midnight');
  assert.strictEqual(manilaDayStart(Date.parse('2026-10-24T03:00:00Z')), start, '11 am Manila');
});

test("the budget's day and month follow Manila's calendar", () => {
  const { manilaDate, manilaMonth } = require('./dayStart');
  assert.strictEqual(manilaDate(Date.parse('2026-10-31T15:59:59Z')), '2026-10-31');
  assert.strictEqual(manilaDate(Date.parse('2026-10-31T16:00:00Z')), '2026-11-01', 'midnight in Manila');
  assert.strictEqual(manilaMonth(Date.parse('2026-10-31T15:59:59Z')), '2026-10');
  assert.strictEqual(manilaMonth(Date.parse('2026-10-31T16:00:00Z')), '2026-11');
});
