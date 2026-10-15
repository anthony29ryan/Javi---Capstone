// Unit tests for src/services/recommendations.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { pickWeakLessons } = require('../src/services/recommendations.js');

const orderedLessons = [
  { id: 'l1', moduleId: 'loops' },
  { id: 'l2', moduleId: 'loops' },
  { id: 'l3', moduleId: 'loops' },
  { id: 's1', moduleId: 'strings' },
  { id: 's2', moduleId: 'strings' },
];
const done = new Set(['l1']);
const isComplete = (id) => done.has(id);

test('unfinished lessons of the weakest module come first, then finished ones', () => {
  const topics = [{ topic: 'loops', weak: true, accuracy: 0.62 }];
  const { lessons, topic } = pickWeakLessons({ topics, orderedLessons, isComplete, count: 3 });
  assert.deepStrictEqual(lessons.map((l) => l.id), ['l2', 'l3', 'l1']);
  assert.strictEqual(topic.accuracy, 0.62);
});

test('fills from the next weak module and skips the Continue learning lesson', () => {
  const topics = [
    { topic: 'loops', weak: true },
    { topic: 'strings', weak: true },
  ];
  const { lessons } = pickWeakLessons({ topics, orderedLessons, isComplete, count: 3, skipId: 'l2' });
  assert.deepStrictEqual(lessons.map((l) => l.id), ['l3', 'l1', 's1']);
});

test('topics the model does not mark weak give no picks', () => {
  const topics = [{ topic: 'loops', weak: false }, { topic: 'gone', weak: true }];
  const { lessons, topic } = pickWeakLessons({ topics, orderedLessons, isComplete, count: 3 });
  assert.deepStrictEqual(lessons, []);
  assert.strictEqual(topic, null);
});
