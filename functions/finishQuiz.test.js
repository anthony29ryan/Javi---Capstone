// Tests for finishQuiz, run against the local Firestore emulator.
//
//   npm run test:rules
//
// Answers go through gradeAnswer first, as in the app, so the attempts that
// finishQuiz counts are the real ones. Ids start with fq- to keep clear of the
// other function tests, which share this project id.
process.env.GCLOUD_PROJECT = 'demo-javi-functions';

const assert = require('node:assert');
const { before, test } = require('node:test');

const { getFirestore } = require('firebase-admin/firestore');
const { finishQuiz, gradeAnswer } = require('./index');

const db = getFirestore();
const as = (uid) => ({
  grade: (data) => gradeAnswer.run({ auth: { uid, token: { email_verified: true } }, data }),
  finish: (data) => finishQuiz.run({ auth: { uid, token: { email_verified: true } }, data }),
});

// A three-question bank, so a whole quiz is three answers.
before(async () => {
  await Promise.all([
    db.doc('answerKeys/fq-1').set({ moduleId: 'fq-mod', answer: 0 }),
    db.doc('answerKeys/fq-2').set({ moduleId: 'fq-mod', answer: 1 }),
    db.doc('answerKeys/fq-3').set({ moduleId: 'fq-mod', answer: 2 }),
    db.doc('answerKeys/fq-other').set({ moduleId: 'fq-other-mod', answer: 0 }),
  ]);
});

const refused = (code) => (err) => err.code === code;

test('the score is counted from the recorded attempts and saved to progress', async () => {
  const user = as('fq-ann');
  await user.grade({ questionId: 'fq-1', choice: 0, timeTakenMs: 1, attemptId: 'a1' }); // right
  await user.grade({ questionId: 'fq-2', choice: 0, timeTakenMs: 1, attemptId: 'a2' }); // wrong
  await user.grade({ questionId: 'fq-3', choice: 2, timeTakenMs: 1, attemptId: 'a3' }); // right

  const answers = [
    { questionId: 'fq-1', attemptId: 'a1' },
    { questionId: 'fq-2', attemptId: 'a2' },
    { questionId: 'fq-3', attemptId: 'a3' },
  ];
  assert.deepStrictEqual(await user.finish({ moduleId: 'fq-mod', answers }), { correct: 2, total: 3 });

  const saved = (await db.doc('progress/fq-ann').get()).data().moduleScores['fq-mod'];
  assert.strictEqual(saved.correct, 2);
  assert.strictEqual(saved.total, 3);
});

test('a partial quiz, a repeated question or another module is refused', async () => {
  const user = as('fq-ben');
  await user.grade({ questionId: 'fq-1', choice: 0, timeTakenMs: 1, attemptId: 'b1' });
  await user.grade({ questionId: 'fq-other', choice: 0, timeTakenMs: 1, attemptId: 'b2' });
  const one = { questionId: 'fq-1', attemptId: 'b1' };

  // Only the right answer: would otherwise be 1/1.
  await assert.rejects(user.finish({ moduleId: 'fq-mod', answers: [one] }), refused('invalid-argument'));
  await assert.rejects(user.finish({ moduleId: 'fq-mod', answers: [one, one, one] }), refused('invalid-argument'));
  await assert.rejects(
    user.finish({
      moduleId: 'fq-mod',
      answers: [one, { questionId: 'fq-other', attemptId: 'b2' }, { questionId: 'fq-3', attemptId: 'never' }],
    }),
    refused('failed-precondition')
  );
  assert.strictEqual((await db.doc('progress/fq-ben').get()).exists, false);
});

test("another user's attempts cannot be counted", async () => {
  // fq-ann's attempts exist from the first test; fq-cal names the same ids.
  const answers = ['1', '2', '3'].map((n) => ({ questionId: `fq-${n}`, attemptId: `a${n}` }));
  await assert.rejects(as('fq-cal').finish({ moduleId: 'fq-mod', answers }), refused('failed-precondition'));
});

test('bad input and signed-out callers are refused', async () => {
  const user = as('fq-dee');
  await assert.rejects(finishQuiz.run({ data: { moduleId: 'fq-mod', answers: [] } }), refused('unauthenticated'));
  await assert.rejects(user.finish({ moduleId: 'FQ/mod', answers: [] }), refused('invalid-argument'));
  await assert.rejects(user.finish({ moduleId: 'fq-mod', answers: 'all' }), refused('invalid-argument'));
  await assert.rejects(
    user.finish({ moduleId: 'fq-mod', answers: [{ questionId: 'fq-1', attemptId: 'x/y' }] }),
    refused('invalid-argument')
  );
  const tooMany = Array.from({ length: 21 }, (_, i) => ({ questionId: `q${i}`, attemptId: 'z' }));
  await assert.rejects(user.finish({ moduleId: 'fq-mod', answers: tooMany }), refused('invalid-argument'));
});
