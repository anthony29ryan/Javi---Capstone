// Unit tests for src/services/reminderTime.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { formatReminderTime } = require('../src/services/reminderTime.js');

test('a 12-hour phone reads AM and PM, with midnight and noon as 12', () => {
  assert.strictEqual(formatReminderTime('00:05', false), '12:05 AM');
  assert.strictEqual(formatReminderTime('07:00', false), '7:00 AM');
  assert.strictEqual(formatReminderTime('12:00', false), '12:00 PM');
  assert.strictEqual(formatReminderTime('13:00', false), '1:00 PM');
  assert.strictEqual(formatReminderTime('20:00', false), '8:00 PM');
});

test('a 24-hour phone reads the stored time as it is', () => {
  assert.strictEqual(formatReminderTime('07:00', true), '07:00');
  assert.strictEqual(formatReminderTime('20:00', true), '20:00');
});
