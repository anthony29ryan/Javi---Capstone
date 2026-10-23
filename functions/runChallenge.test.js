// Tests for runChallenge and runCode, run against the local Firestore emulator.
//
//   npm run test:rules
//
// Judge0 is stubbed by replacing fetch. The stub "runs" a program by looking
// its code up in PROGRAMS, so a test picks behaviour by the code it sends.
process.env.GCLOUD_PROJECT = 'demo-javi-functions';
process.env.JUDGE0_KEY = 'test-key';

const assert = require('node:assert');
const { before, beforeEach, test } = require('node:test');

const { getFirestore } = require('firebase-admin/firestore');
const { runChallenge, runCode } = require('./index');

const db = getFirestore();
const call = (fn, uid, data) => fn.run({ auth: { uid, token: { email_verified: true } }, data });
const refused = (code) => (err) => err.code === code;
const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const unb64 = (text) => Buffer.from(text, 'base64').toString('utf8');
// Each program turns its stdin into a Judge0 reply.
const ran = (output, time = '0.1') => ({ status: { id: 3 }, stdout: b64(output), time });
const PROGRAMS = {
  sum: (stdin) => ran(`${stdin.split(' ').map(Number).reduce((a, b) => a + b)}\n`),
  hardCoded: () => ran('11\n'),
  broken: () => ({ status: { id: 6 }, compile_output: b64("Main.java:3: error: ';' expected") }),
  // Leaks its input through an exception, which must not reach the app on a hidden test.
  leaky: (stdin) => (stdin === '4 7' ? ran('11') : { status: { id: 11 }, stderr: b64(`secret ${stdin}`) }),
  echo: (stdin) => ran(stdin, '0.2'),
};
// A 'given' challenge's script is the student's code with one test's values
// swapped in; the stub reads n back out of it and "runs" the named program.
const GIVEN_PROGRAMS = {
  even: (n) => ran(String(n % 2 === 0)),
  hardCodedEven: () => ran('false'),
};
const givenCode = (program) => `int n = 9;\n// ${program}`;
const runStub = (body) => {
  if (!body.script.includes('int n = ')) return PROGRAMS[body.script](body.stdin);
  const n = Number(body.script.match(/int n = (-?\d+);/)[1]);
  return GIVEN_PROGRAMS[body.script.match(/\/\/ (\w+)$/)[1]](n);
};
let runnerCalls;
let runnerDown;

before(async () => {
  global.fetch = async (url, options) => {
    // Decoded, so the tests read the program and its input as plain text.
    const sent = JSON.parse(options.body);
    const body = { script: unb64(sent.source_code), stdin: unb64(sent.stdin) };
    runnerCalls.push(body);
    if (runnerDown) return { ok: false, status: runnerDown };
    return { ok: true, status: 200, json: async () => runStub(body) };
  };
  await db.doc('challenges/is-it-even').set({ title: 'Even', kind: 'given', example: { input: 'int n = 9;', output: 'false' } });
  await db.doc('challengeTests/is-it-even').set({
    hidden: [
      { input: 'int n = 4;', output: 'true' },
      { input: 'int n = -7;', output: 'false' },
      { input: 'int n = 0;', output: 'true' },
    ],
  });
  await db.doc('challenges/sum-of-two-numbers').set({ title: 'Sum', example: { input: '4 7', output: '11' } });
  await db.doc('challengeTests/sum-of-two-numbers').set({
    hidden: [
      { input: '-3 10', output: '7' },
      { input: '0 0', output: '0' },
      { input: '1000000 2345', output: '1002345' },
    ],
  });
});

beforeEach(() => {
  runnerCalls = [];
  runnerDown = 0;
});

test('signed-out callers, bad input and unknown challenges are refused', async () => {
  await assert.rejects(runChallenge.run({ data: {} }), refused('unauthenticated'));
  const ok = { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'run' };
  await assert.rejects(call(runChallenge, 'u1', { ...ok, challengeId: '../users/x' }), refused('invalid-argument'));
  await assert.rejects(call(runChallenge, 'u1', { ...ok, code: ' ' }), refused('invalid-argument'));
  await assert.rejects(call(runChallenge, 'u1', { ...ok, mode: 'grade' }), refused('invalid-argument'));
  await assert.rejects(call(runChallenge, 'u1', { ...ok, challengeId: 'nope' }), refused('not-found'));
});

test('run checks only the example and solves nothing', async () => {
  const result = await call(runChallenge, 'u2', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'run' });
  assert.strictEqual(result.status, 'passed');
  assert.strictEqual(result.solved, false);
  assert.deepStrictEqual(result.tests, [
    { label: 'Example', hidden: false, passed: true, input: '4 7', expected: '11', got: '11\n' },
  ]);
  assert.strictEqual(runnerCalls.length, 1);
  assert.ok(!(await db.doc('progress/u2').get()).exists);
});

test('a passing submit runs only the hidden tests and marks the challenge solved', async () => {
  const result = await call(runChallenge, 'u3', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'submit' });
  assert.strictEqual(result.status, 'passed');
  assert.strictEqual(result.solved, true);
  assert.deepStrictEqual(runnerCalls.map((c) => c.stdin), ['-3 10', '0 0', '1000000 2345'], 'no example run');
  assert.deepStrictEqual((await db.doc('progress/u3').get()).data().completedChallenges, ['sum-of-two-numbers']);
  assert.strictEqual((await db.doc('runUsage/u3').get()).data().challenge.length, 1, 'a submit counts once');
});

test('printing the example answer passes Run but fails the hidden tests', async () => {
  const result = await call(runChallenge, 'u4', { challengeId: 'sum-of-two-numbers', code: 'hardCoded', mode: 'submit' });
  assert.strictEqual(result.status, 'failed');
  assert.strictEqual(result.solved, false);
  // Stops at the first failure, so the other two cost nothing.
  assert.deepStrictEqual(result.tests.map((t) => [t.passed, Boolean(t.notRun)]), [[false, false], [false, true], [false, true]]);
  assert.strictEqual(runnerCalls.length, 1);
  assert.ok(!(await db.doc('progress/u4').get()).exists);
});

test('hidden tests reveal only pass or fail, never their input, output or errors', async () => {
  const result = await call(runChallenge, 'u5', { challengeId: 'sum-of-two-numbers', code: 'leaky', mode: 'submit' });
  for (const t of result.tests.filter((t) => t.hidden)) {
    assert.ok(Object.keys(t).every((key) => ['hidden', 'label', 'passed', 'notRun'].includes(key)));
  }
  assert.ok(!JSON.stringify(result).includes('-3 10'));
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('a compile error shows the real message on Run, but not on Submit, where it could quote hidden values', async () => {
  const run = await call(runChallenge, 'u6', { challengeId: 'sum-of-two-numbers', code: 'broken', mode: 'run' });
  assert.strictEqual(run.status, 'compile');
  assert.match(run.error, /';' expected/);
  const submit = await call(runChallenge, 'u6', { challengeId: 'sum-of-two-numbers', code: 'broken', mode: 'submit' });
  assert.strictEqual(submit.status, 'compile');
  assert.match(submit.error, /Press Run to see the error/);
  assert.deepStrictEqual(submit.tests, []);
  assert.strictEqual(runnerCalls.length, 2, 'one call each');
});

test('the 21st challenge check within 24 hours is refused', async () => {
  await db.doc('runUsage/u7').set({ challenge: Array.from({ length: 20 }, () => Date.now()) });
  await assert.rejects(
    call(runChallenge, 'u7', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'run' }),
    refused('resource-exhausted')
  );
  // The playground has its own allowance.
  await call(runCode, 'u7', { code: 'echo', stdin: 'hi' });
});

test('an unreachable runner or a used-up quota is not charged to the learner', async () => {
  runnerDown = 503;
  await assert.rejects(
    call(runChallenge, 'u8', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'run' }),
    refused('unavailable')
  );
  runnerDown = 429;
  await assert.rejects(call(runCode, 'u8', { code: 'echo' }), (err) => err.code === 'resource-exhausted' && /busy/.test(err.message));
  const usage = (await db.doc('runUsage/u8').get()).data();
  assert.deepStrictEqual(usage, { challenge: [], playground: [], lastMinute: [] });
});

test('the playground runs any program with its input', async () => {
  const result = await call(runCode, 'u9', { code: 'echo', stdin: 'Ada' });
  assert.deepStrictEqual(result, { status: 'ok', stdout: 'Ada', error: '', timeSeconds: 0.2, allowance: { left: 9, limit: 10 } });
  await assert.rejects(call(runCode, 'u9', { code: 'echo', stdin: 'x'.repeat(5001) }), refused('invalid-argument'));
});

test('a given challenge swaps in each test\'s values and sends no input', async () => {
  const result = await call(runChallenge, 'g1', { challengeId: 'is-it-even', code: givenCode('even'), mode: 'submit' });
  assert.strictEqual(result.status, 'passed');
  assert.deepStrictEqual(runnerCalls.map((c) => c.script.match(/int n = (-?\d+);/)[1]), ['4', '-7', '0']);
  assert.ok(runnerCalls.every((c) => c.stdin === ''));
});

test('a given challenge still catches a hard-coded answer', async () => {
  const result = await call(runChallenge, 'g2', { challengeId: 'is-it-even', code: givenCode('hardCodedEven'), mode: 'submit' });
  // Its answer (false) is wrong for the first hidden test (n = 4), so the rest are not run.
  assert.deepStrictEqual(result.tests.map((t) => t.passed), [false, false, false]);
  assert.ok(result.tests.slice(1).every((t) => t.notRun));
  assert.strictEqual(result.solved, false);
});

test('deleting the given line is refused before any run is used', async () => {
  await assert.rejects(
    call(runChallenge, 'g3', { challengeId: 'is-it-even', code: 'System.out.println(false);', mode: 'run' }),
    (err) => err.code === 'failed-precondition' && /Keep the line int n = 9;/.test(err.message)
  );
  assert.strictEqual(runnerCalls.length, 0);
  assert.ok(!(await db.doc('runUsage/g3').get()).exists, 'no run taken from the allowance');
});

test('a playground program that runs unlocks First Compile; a broken one does not', async () => {
  await call(runCode, 'p1', { code: 'broken' });
  assert.ok(!(await db.doc('progress/p1').get()).exists);
  await call(runCode, 'p1', { code: 'echo', stdin: 'hi' });
  assert.strictEqual((await db.doc('progress/p1').get()).data().ranFirstProgram, true);
});

test('a challenge with no hidden tests is graded on its example when submitted', async () => {
  await db.doc('challenges/hello-world').set({ title: 'Hello', kind: 'output', example: { input: '', output: 'Ada' } });
  await db.doc('challengeTests/hello-world').set({ hidden: [] });
  const result = await call(runChallenge, 'h1', { challengeId: 'hello-world', code: 'echo', mode: 'submit' });
  assert.strictEqual(result.status, 'failed', 'prints nothing, so it must not pass with zero tests');
  assert.strictEqual(result.tests.length, 1);
});

const { manilaDate, manilaMonth } = require('./dayStart');
const dayDoc = () => db.doc(`runUsage/_day-${manilaDate(Date.now())}`);
const monthDoc = () => db.doc(`runUsage/_month-${manilaMonth(Date.now())}`);

test('the app-wide daily cap says the server is busy until midnight, and charges the learner nothing', async () => {
  await dayDoc().set({ calls: 300 });
  try {
    await assert.rejects(
      call(runChallenge, 't1', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'run' }),
      (err) => err.code === 'resource-exhausted' && /high traffic\. It will be back at midnight/.test(err.message)
    );
    assert.strictEqual(runnerCalls.length, 0, 'Judge0 never called');
    const usage = (await db.doc('runUsage/t1').get()).data();
    assert.deepStrictEqual([usage.challenge, usage.lastMinute], [[], []], 'own tries given back');
  } finally {
    await dayDoc().delete(); // other tests share the counter
  }
});

test('the monthly stop holds even when the day has room', async () => {
  await monthDoc().set({ calls: 1350 });
  try {
    await assert.rejects(
      call(runCode, 't2', { code: 'echo' }),
      (err) => err.code === 'resource-exhausted' && /back on the 1st/.test(err.message)
    );
    assert.strictEqual(runnerCalls.length, 0);
  } finally {
    await monthDoc().delete();
  }
});

test('the budget counts every Judge0 call sent, including failed ones', async () => {
  await Promise.all([dayDoc().delete(), monthDoc().delete()]);
  await call(runChallenge, 't3', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'submit' });
  assert.strictEqual((await dayDoc().get()).data().calls, 3, 'one per hidden test');
  runnerDown = 503;
  await assert.rejects(call(runCode, 't3', { code: 'echo' }), refused('unavailable'));
  assert.strictEqual((await dayDoc().get()).data().calls, 4, 'a failed call may still be billed');
  assert.strictEqual((await monthDoc().get()).data().calls, 4);
});

test('a sixth run within a minute is refused, without using a daily try', async () => {
  for (let i = 0; i < 5; i++) await call(runCode, 't4', { code: 'echo' });
  await assert.rejects(
    call(runCode, 't4', { code: 'echo' }),
    (err) => err.code === 'resource-exhausted' && /Slow down/.test(err.message)
  );
  assert.strictEqual((await db.doc('runUsage/t4').get()).data().playground.length, 5);
});

test('each run reports the tries left today, and uses from before Manila midnight do not count', async () => {
  const { manilaDayStart } = require('./dayStart');
  const first = await call(runChallenge, 'd1', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'run' });
  assert.deepStrictEqual(first.allowance, { left: 19, limit: 20 });

  // 20 uses, all from one second before today's midnight: yesterday's, so none count.
  const yesterday = manilaDayStart(Date.now()) - 1000;
  await db.doc('runUsage/d2').set({ challenge: Array(20).fill(yesterday) });
  const fresh = await call(runChallenge, 'd2', { challengeId: 'sum-of-two-numbers', code: 'sum', mode: 'run' });
  assert.deepStrictEqual(fresh.allowance, { left: 19, limit: 20 });
  assert.strictEqual((await db.doc('runUsage/d2').get()).data().challenge.length, 1, 'yesterday dropped');
});
