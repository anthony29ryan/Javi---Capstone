// Sanity checks for the trained weak-topic model on hand-made learners.
// A model can train without errors and still be meaningless, so these pin
// down behaviour a person can reason about. No emulator needed: `npm test`.

const assert = require('node:assert');
const { before, test } = require('node:test');

const { extractFeatures, loadModel, predictWeakTopics } = require('./weakTopics');

// 'C' = correct, 'W' = wrong, oldest first.
const answers = (pattern, seconds, topic = 'm1') =>
  [...pattern].map((mark, i) => ({ topic, correct: mark === 'C', timeTakenMs: seconds * 1000, createdAt: i }));

let model;
before(async () => {
  model = await loadModel();
});

test('features use only the latest 20 answers', () => {
  const features = extractFeatures(answers('WWWWW' + 'C'.repeat(20), 10));
  assert.strictEqual(features.accuracy, 1);
  assert.strictEqual(features.longestWrongStreak, 0);
});

test('features measure accuracy, capped time and the longest wrong run', () => {
  const attempts = answers('CCWWWCWC', 30);
  attempts[0].timeTakenMs = 600_000; // left the phone on one question
  const features = extractFeatures(attempts);
  assert.strictEqual(features.accuracy, 4 / 8);
  assert.strictEqual(features.avgTimeSec, (60 + 7 * 30) / 8);
  assert.strictEqual(features.longestWrongStreak, 3);
});

test('weights point the way a teacher would expect', () => {
  const [accuracy, avgTime, wrongStreak] = model.layers[0].getWeights()[0].dataSync();
  assert.ok(accuracy < 0, 'higher accuracy should mean less weak');
  assert.ok(avgTime > 0, 'slower answers should mean more weak');
  assert.ok(wrongStreak > 0, 'longer wrong streaks should mean more weak');
});

test('a strong learner is not weak and a struggling one is', () => {
  const [strong] = predictWeakTopics(model, answers('C'.repeat(20), 8));
  assert.strictEqual(strong.weak, false);
  assert.ok(strong.probability < 0.1, `got ${strong.probability}`);

  const [struggling] = predictWeakTopics(model, answers('CWWWWCWWWWWCWWCWWWWC', 30));
  assert.strictEqual(struggling.weak, true);
  assert.ok(struggling.probability > 0.9, `got ${struggling.probability}`);
});

test('slower answers and clustered mistakes each raise the probability', () => {
  const probability = (attempts) => predictWeakTopics(model, attempts)[0].probability;
  const spread = 'CWCCWCCWCCWCCWCCWCCW'; // 14/20, wrong answers apart
  const clustered = 'CCCCCCCCCCCCCCWWWWWW'; // 14/20, wrong answers together
  assert.ok(probability(answers(spread, 25)) > probability(answers(spread, 10)));
  assert.ok(probability(answers(clustered, 15)) > probability(answers(spread, 15)));
});

test('topics with under 10 answers are left out, the rest sorted most-weak first', () => {
  const result = predictWeakTopics(model, [
    ...answers('C'.repeat(15), 8, 'strong'),
    ...answers('W'.repeat(9), 30, 'too-few'),
    ...answers('WWCWWWCWWW', 30, 'weak'),
  ]);
  assert.deepStrictEqual(result.map((t) => t.topic), ['weak', 'strong']);
  assert.deepStrictEqual(predictWeakTopics(model, []), []);
});
