// Tests for gradeAnswer, run against the local Firestore emulator.
//
//   npm run test:rules
//
// Calls the function's handler directly with a made-up request, so no
// functions emulator or deploy is needed. Its own project id keeps its data
// apart from the rules tests, which clear theirs between tests.
process.env.GCLOUD_PROJECT = 'demo-javi-functions';

const assert = require('node:assert');
const { before, test } = require('node:test');

const { getFirestore } = require('firebase-admin/firestore');
const { gradeAnswer } = require('./index');

const db = getFirestore();
const asAlice = (data) => gradeAnswer.run({ auth: { uid: 'alice' }, data });

before(async () => {
  await db.doc('answerKeys/q1').set({ moduleId: 'm1', answer: 2 });
});

test('answers are graded from the hidden key and every one is recorded', async () => {
  assert.deepStrictEqual(await asAlice({ questionId: 'q1', choice: 2, timeTakenMs: 4200.6 }), {
    correct: true,
    answer: 2,
  });
  assert.deepStrictEqual(await asAlice({ questionId: 'q1', choice: 0, timeTakenMs: 900 }), {
    correct: false,
    answer: 2,
  });

  const attempts = await db.collection('attempts').where('userId', '==', 'alice').get();
  const recorded = attempts.docs
    .map((d) => d.data())
    .sort((a, b) => a.attemptNumber - b.attemptNumber)
    .map(({ createdAt, ...rest }) => rest);
  assert.deepStrictEqual(recorded, [
    { userId: 'alice', questionId: 'q1', topic: 'm1', correct: true, timeTakenMs: 4201, attemptNumber: 1 },
    { userId: 'alice', questionId: 'q1', topic: 'm1', correct: false, timeTakenMs: 900, attemptNumber: 2 },
  ]);
});

test('signed-out callers, bad input and unknown questions are refused', async () => {
  const refused = (code) => (err) => err.code === code;
  await assert.rejects(
    gradeAnswer.run({ data: { questionId: 'q1', choice: 2, timeTakenMs: 1 } }),
    refused('unauthenticated')
  );
  await assert.rejects(asAlice({ questionId: 'q1', choice: '2', timeTakenMs: 1 }), refused('invalid-argument'));
  await assert.rejects(asAlice({ questionId: 'q1', choice: 2, timeTakenMs: -5 }), refused('invalid-argument'));
  await assert.rejects(asAlice({ questionId: '', choice: 2, timeTakenMs: 1 }), refused('invalid-argument'));
  await assert.rejects(asAlice({ questionId: 'nope', choice: 2, timeTakenMs: 1 }), refused('not-found'));
});
