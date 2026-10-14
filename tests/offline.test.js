// Unit tests for src/services/offline.js, with AsyncStorage swapped for a Map.
//
//   npm test

import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

const store = new Map();
mock.module('@react-native-async-storage/async-storage', {
  defaultExport: {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => void store.set(key, value),
    removeItem: async (key) => void store.delete(key),
    getAllKeys: async () => [...store.keys()],
    multiGet: async (keys) => keys.map((key) => [key, store.get(key) ?? null]),
    multiRemove: async (keys) => keys.forEach((key) => store.delete(key)),
  },
});

const offline = await import('../src/services/offline.js');

beforeEach(() => store.clear());

test('a downloaded lesson is found by id; others are not', async () => {
  await offline.saveModule('m1', [{ id: 'l1', moduleId: 'm1' }]);
  assert.deepEqual(await offline.getDownloadedLesson('l1'), { id: 'l1', moduleId: 'm1' });
  assert.equal(await offline.getDownloadedLesson('l2'), null);
});

test('refreshDownloads rewrites only downloaded modules and drops removed lessons', async () => {
  await offline.saveModule('m1', [{ id: 'old', moduleId: 'm1' }]);
  await offline.refreshDownloads([
    { id: 'l1', moduleId: 'm1' },
    { id: 'l2', moduleId: 'm2' },
  ]);
  assert.deepEqual(await offline.getDownloadedModuleIds(), ['m1']);
  assert.equal(await offline.getDownloadedLesson('old'), null);
  assert.ok(await offline.getDownloadedLesson('l1'));
  assert.equal(await offline.getDownloadedLesson('l2'), null);
});

test('delete all keeps the snapshot; sign-out clears everything', async () => {
  await offline.saveSnapshot({ courses: [] });
  await offline.saveModule('m1', []);
  store.set('unrelated', 'x');

  await offline.removeAllModules();
  assert.deepEqual(await offline.getDownloadedModuleIds(), []);
  assert.deepEqual(await offline.loadSnapshot(), { courses: [] });

  await offline.clearOfflineData();
  assert.equal(await offline.loadSnapshot(), null);
  assert.equal(store.get('unrelated'), 'x');
});
