// Unit tests for src/constants/accountDeletion.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { isPastDeletionWindow } = require('../src/constants/accountDeletion.js');

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-24T12:00:00+08:00');
const daysAgo = (days) => new Date(now.getTime() - days * DAY_MS);

test('an account deleted 29 days ago can still be restored', () => {
  assert.strictEqual(isPastDeletionWindow(daysAgo(29), now), false);
});

test('an account is gone from the moment its 30 days end, purged or not', () => {
  assert.strictEqual(isPastDeletionWindow(daysAgo(30), now), true);
  assert.strictEqual(isPastDeletionWindow(daysAgo(31), now), true);
});
