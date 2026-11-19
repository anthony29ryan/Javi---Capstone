// Unit tests for src/services/saveTimeout.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { savesWhenOnline, withSaveTimeout } = require('../src/services/saveTimeout.js');

test('a write that finishes in time passes its result through', async () => {
  assert.strictEqual(await withSaveTimeout(Promise.resolve('saved'), 50), 'saved');
});

test('a write that fails in time passes its error through', async () => {
  await assert.rejects(withSaveTimeout(Promise.reject(new Error('denied')), 50), /denied/);
});

test('a write that never finishes (offline) rejects as unavailable', async () => {
  await assert.rejects(withSaveTimeout(new Promise(() => {}), 20), { code: 'unavailable' });
});

test('only a timed-out write counts as saving later; a refused one does not', async () => {
  const timedOut = await withSaveTimeout(new Promise(() => {}), 20).catch((err) => err);
  assert.strictEqual(savesWhenOnline(timedOut), true);
  assert.strictEqual(savesWhenOnline(Object.assign(new Error('denied'), { code: 'permission-denied' })), false);
  assert.strictEqual(savesWhenOnline(undefined), false);
});
