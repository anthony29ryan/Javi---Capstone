// QA probe for docs/qa/iso-25010-evaluation.md, not run by npm test: F-08 / F-09 boundary and concurrency tests on Cloud Function handlers, emulator only.
process.env.GCLOUD_PROJECT = 'demo-qa-probe-functions';
process.env.JUDGE0_KEY = 'test-key';
const REPO = process.env.REPO;
const { test, before } = require('node:test');
const { createRequire } = require('node:module');
const r = createRequire(REPO + '/functions/package.json');
const { getFirestore } = r('firebase-admin/firestore');
const { gradeAnswer, runChallenge, finishQuiz } = require(REPO + '/functions/index.js');
const db = getFirestore();
const as = (fn, uid, data) => fn.run({ auth: { uid, token: { email_verified: true } }, data });
let judgeCalls = 0;
before(async () => {
  global.fetch = async () => { judgeCalls++; return { ok: true, status: 200, json: async () => ({ status: { id: 3 }, stdout: '', time: '0.1' }) }; };
  await db.doc('answerKeys/q1').set({ moduleId: 'm1', answer: 2 });
});
const show = async (label, p) => {
  try { console.log('RESULT', label, '=> OK', JSON.stringify(await p)); }
  catch (e) { console.log('RESULT', label, '=> ERROR code=' + (e.code ?? '(none)'), 'httpsError=' + (e.httpErrorCode ? 'yes' : 'no'), String(e.message).slice(0, 120)); }
};
test('TC-FUN-09 gradeAnswer choice=999 (out of range)', () => show('choice 999', as(gradeAnswer, 'p1', { questionId: 'q1', choice: 999, timeTakenMs: 10 })));
test('TC-FUN-10 gradeAnswer timeTakenMs=1e15', () => show('timeTakenMs 1e15', as(gradeAnswer, 'p1', { questionId: 'q1', choice: 1, timeTakenMs: 1e15 })));
test('TC-INT-03 gradeAnswer: 4 concurrent calls, same attemptId, choices 0..3', async () => {
  const replies = await Promise.allSettled([0, 1, 2, 3].map((c) => as(gradeAnswer, 'p2', { questionId: 'q1', choice: c, timeTakenMs: 10, attemptId: 'race1' })));
  console.log('RESULT concurrent replies:', JSON.stringify(replies.map((x) => x.value ?? x.reason?.code)));
  const stored = (await db.doc('attempts/p2_q1_race1').get()).data();
  console.log('RESULT stored choice:', stored.choice, 'correct:', stored.correct, 'attemptNumber:', stored.attemptNumber);
});
test('TC-FUN-11 runChallenge challengeId of 2000 chars', () => show('challengeId 2000', as(runChallenge, 'p3', { challengeId: 'a'.repeat(2000), code: 'class Main{}', mode: 'run' })));
test('TC-FUN-12 finishQuiz with a repeated question (what a reshuffled quiz sends)', async () => {
  await show('finishQuiz duplicate', as(finishQuiz, 'p4', { moduleId: 'm1', answers: [{ questionId: 'q1', attemptId: 'a1' }, { questionId: 'q1', attemptId: 'a2' }] }));
});
