// QA probe for docs/qa/iso-25010-evaluation.md, not run by npm test: F-05 boundary/negative tests against firestore.rules on the emulator.
const { createRequire } = require('node:module');
const REPO = process.env.REPO;
const r = createRequire(REPO + '/package.json');
const { readFileSync } = require('node:fs');
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { initializeTestEnvironment } = r('@firebase/rules-unit-testing');
const { doc, setDoc, serverTimestamp } = r('firebase/firestore');
let env;
const outcome = (p) => p.then(() => 'ALLOWED', () => 'DENIED');
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-qa-probe', firestore: { rules: readFileSync(REPO + '/firestore.rules', 'utf8') } });
});
after(() => env.cleanup());
const alice = () => env.authenticatedContext('alice').firestore();

test('TC-SEC-05 forged streak (current=longest=100000, 10k-char lastActiveDate)', async () => {
  const res = await outcome(setDoc(doc(alice(), 'progress/alice'), { streak: { current: 100000, longest: 100000, lastActiveDate: 'x'.repeat(10000) } }, { merge: true }));
  console.log('RESULT forged streak:', res);
});
test('TC-SEC-06 self-declared completion of 1000 arbitrary lesson ids (non-string items)', async () => {
  const ids = Array.from({ length: 1000 }, (_, i) => (i % 2 ? i : 'lesson-' + i));
  const res = await outcome(setDoc(doc(alice(), 'progress/alice'), { completedLessons: ids }, { merge: true }));
  console.log('RESULT 1000 mixed-type completedLessons:', res);
});
test('TC-SEC-07 users.email 500,000 chars, not matching the token email', async () => {
  const res = await outcome(setDoc(doc(alice(), 'users/alice'), { email: 'a'.repeat(500000), displayName: 'Alice', createdAt: serverTimestamp() }));
  console.log('RESULT 500k email:', res);
});
test('TC-SEC-08 users.goals with 20 non-string items', async () => {
  const res = await outcome(setDoc(doc(alice(), 'users/alice'), { goals: Array.from({ length: 20 }, () => ({ nested: 'x'.repeat(1000) })) }, { merge: true }));
  console.log('RESULT 20 object goals:', res);
});
test('TC-SEC-09 control: writing moduleScores from the client', async () => {
  const res = await outcome(setDoc(doc(alice(), 'progress/alice'), { moduleScores: { m1: { correct: 20, total: 20 } } }, { merge: true }));
  console.log('RESULT client moduleScores:', res);
  assert.strictEqual(res, 'DENIED');
});
