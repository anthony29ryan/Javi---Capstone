// Unit tests for src/navigation/swipeTarget.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { swipeTarget } = require('../src/navigation/swipeTarget.js');

test('a long drag left or right moves one tab', () => {
  assert.strictEqual(swipeTarget(-80, 1, 5), 2);
  assert.strictEqual(swipeTarget(80, 1, 5), 0);
});

test('a short drag stays put', () => {
  assert.strictEqual(swipeTarget(-50, 2, 5), 2);
  assert.strictEqual(swipeTarget(30, 2, 5), 2);
});

test('the first and last tabs do not move past the ends', () => {
  assert.strictEqual(swipeTarget(120, 0, 5), 0);
  assert.strictEqual(swipeTarget(-120, 4, 5), 4);
});
