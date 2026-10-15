// Unit tests for src/services/recommendations.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { pickWeakLessons } = require('../src/services/recommendations.js');

// a1 and l1 are each module's intro (order 1), which is never picked.
const orderedLessons = [
  { id: 'a1', moduleId: 'arrays', order: 1 },
  { id: 'a2', moduleId: 'arrays', order: 2 },
  { id: 'a3', moduleId: 'arrays', order: 3 },
  { id: 'a4', moduleId: 'arrays', order: 4 },
  { id: 'a5', moduleId: 'arrays', order: 5 },
  { id: 'l1', moduleId: 'loops', order: 1 },
  { id: 'l2', moduleId: 'loops', order: 2 },
  { id: 'l3', moduleId: 'loops', order: 3 },
];
const done = new Set(['a2']);
const isComplete = (id) => done.has(id);
const ids = (lessons) => lessons.map((l) => l.id);

test('one weak module gives its unfinished lessons first, then finished ones', () => {
  const topics = [{ topic: 'arrays', weak: true }];
  const few = orderedLessons.slice(0, 3);
  assert.deepStrictEqual(ids(pickWeakLessons({ topics, orderedLessons: few, isComplete, count: 3 }).lessons), ['a3', 'a2']);
  assert.deepStrictEqual(ids(pickWeakLessons({ topics, orderedLessons, isComplete, count: 3 }).lessons), ['a3', 'a4', 'a5']);
});

test('weak modules take turns, so the second is not crowded out', () => {
  const topics = [
    { topic: 'arrays', weak: true },
    { topic: 'loops', weak: true },
  ];
  const picked = pickWeakLessons({ topics, orderedLessons, isComplete, count: 3, skipId: 'a3' });
  assert.deepStrictEqual(ids(picked.lessons), ['a4', 'l2', 'a5']);
  assert.deepStrictEqual(picked.topics.map((t) => t.topic), ['arrays', 'loops']);
});

test('with no limit, every weak module gets a turn before any second lesson, and intros never appear', () => {
  const topics = [
    { topic: 'loops', weak: true },
    { topic: 'arrays', weak: true },
  ];
  const picked = pickWeakLessons({ topics, orderedLessons, isComplete, count: Infinity });
  assert.deepStrictEqual(ids(picked.lessons), ['l2', 'a3', 'l3', 'a4', 'a5', 'a2']);
});

test('topics the model does not mark weak, or with no lessons, give no picks', () => {
  const topics = [{ topic: 'loops', weak: false }, { topic: 'gone', weak: true }];
  const picked = pickWeakLessons({ topics, orderedLessons, isComplete, count: 3 });
  assert.deepStrictEqual(picked.lessons, []);
  assert.deepStrictEqual(picked.topics, []);
});
