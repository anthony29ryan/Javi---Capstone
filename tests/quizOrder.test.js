// Unit tests for src/services/quizOrder.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { pickQuizQuestions } = require('../src/services/quizOrder.js');

const lessons = [
  { id: 'l1', order: 1 },
  { id: 'l2', order: 2 },
  { id: 'l3', order: 3 },
];

// 25 questions, like a real module bank: spread over three lessons, plus two at module level.
const bank = Array.from({ length: 25 }, (_, i) => ({
  id: `q${i}`,
  lessonId: i < 23 ? `l${(i % 3) + 1}` : undefined,
  order: i,
}));

// A repeatable stand-in for Math.random.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

test('draws the quiz length from a larger bank, with no question twice', () => {
  const picked = pickQuizQuestions(bank, lessons, { length: 20, random: seededRandom(1) });
  assert.strictEqual(picked.length, 20);
  assert.strictEqual(new Set(picked.map((q) => q.id)).size, 20);
  picked.forEach((q) => assert.ok(bank.includes(q)));
});

test('a bank smaller than the quiz length is used whole', () => {
  const small = bank.slice(0, 7);
  const picked = pickQuizQuestions(small, lessons, { length: 20, random: seededRandom(2) });
  assert.deepStrictEqual(picked.map((q) => q.id).sort(), small.map((q) => q.id).sort());
});

test('questions follow lesson order, then their own order, with module-level ones last', () => {
  const picked = pickQuizQuestions(bank, lessons, { length: 25, random: seededRandom(3) });
  const rank = (q) => (q.lessonId ? lessons.find((l) => l.id === q.lessonId).order : Infinity);
  for (let i = 1; i < picked.length; i++) {
    const [before, after] = [picked[i - 1], picked[i]];
    assert.ok(
      rank(before) < rank(after) || (rank(before) === rank(after) && before.order <= after.order),
      `${before.id} should come before ${after.id}`
    );
  }
  assert.deepStrictEqual(picked.slice(-2).map((q) => q.id).sort(), ['q23', 'q24']);
});

test('the same random sequence draws the same quiz, and a different one usually does not', () => {
  const first = pickQuizQuestions(bank, lessons, { length: 20, random: seededRandom(4) });
  const again = pickQuizQuestions(bank, lessons, { length: 20, random: seededRandom(4) });
  const other = pickQuizQuestions(bank, lessons, { length: 20, random: seededRandom(5) });
  assert.deepStrictEqual(again, first);
  assert.notDeepStrictEqual(other, first);
});

test('a lesson missing from the list ranks like order 0 rather than throwing', () => {
  const picked = pickQuizQuestions(
    [{ id: 'x', lessonId: 'gone', order: 0 }, { id: 'y', lessonId: 'l1', order: 0 }],
    lessons,
    { length: 20, random: seededRandom(6) }
  );
  assert.deepStrictEqual(picked.map((q) => q.id), ['x', 'y']);
});
