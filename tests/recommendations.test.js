// Unit tests for src/services/recommendations.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { pickWeakLessons } = require('../src/services/recommendations.js');

const orderedLessons = [
  { id: 'a1', moduleId: 'arrays' },
  { id: 'a2', moduleId: 'arrays' },
  { id: 'a3', moduleId: 'arrays' },
  { id: 'a4', moduleId: 'arrays' },
  { id: 'l1', moduleId: 'loops' },
  { id: 'l2', moduleId: 'loops' },
];
const done = new Set(['a1']);
const isComplete = (id) => done.has(id);
const ids = (lessons) => lessons.map((l) => l.id);

test('one weak module gives its unfinished lessons first, then finished ones', () => {
  const topics = [{ topic: 'arrays', weak: true }];
  const few = [{ id: 'a1', moduleId: 'arrays' }, { id: 'a2', moduleId: 'arrays' }];
  assert.deepStrictEqual(ids(pickWeakLessons({ topics, orderedLessons: few, isComplete, count: 3 }).lessons), ['a2', 'a1']);
  assert.deepStrictEqual(ids(pickWeakLessons({ topics, orderedLessons, isComplete, count: 3 }).lessons), ['a2', 'a3', 'a4']);
});

test('weak modules take turns, so the second is not crowded out', () => {
  const topics = [
    { topic: 'arrays', weak: true },
    { topic: 'loops', weak: true },
  ];
  const picked = pickWeakLessons({ topics, orderedLessons, isComplete, count: 3, skipId: 'a2' });
  assert.deepStrictEqual(ids(picked.lessons), ['a3', 'l1', 'a4']);
  assert.deepStrictEqual(picked.topics.map((t) => t.topic), ['arrays', 'loops']);
});

test('topics the model does not mark weak, or with no lessons, give no picks', () => {
  const topics = [{ topic: 'loops', weak: false }, { topic: 'gone', weak: true }];
  const picked = pickWeakLessons({ topics, orderedLessons, isComplete, count: 3 });
  assert.deepStrictEqual(picked.lessons, []);
  assert.deepStrictEqual(picked.topics, []);
});
