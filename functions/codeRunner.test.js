// Tests for codeRunner.js, run under plain Node by `npm test`. fetch is
// replaced, so no Judge0 key or network is needed.
const assert = require('node:assert');
const { test } = require('node:test');

const { RunnerUnavailable, kindOf, outputMatches, runJava } = require('./codeRunner');

const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');

function stubJudge0(reply) {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    if (reply instanceof Error) throw reply;
    if (typeof reply === 'number') return { ok: false, status: reply };
    return { ok: true, status: 200, json: async () => reply };
  };
  return calls;
}

test('Judge0 statuses map to what the screen shows', () => {
  assert.strictEqual(kindOf(3), 'ok');
  assert.strictEqual(kindOf(5), 'timeout');
  assert.strictEqual(kindOf(6), 'compile');
  assert.strictEqual(kindOf(11), 'runtime'); // an uncaught exception exits non-zero
  for (const id of [1, 2, 13, 14, undefined]) assert.strictEqual(kindOf(id), 'unavailable');
});

test('output must match apart from line endings and trailing whitespace', () => {
  assert.ok(outputMatches('Hello, World!\r\n', 'Hello, World!'));
  assert.ok(outputMatches('0 1 1 \n\n', '0 1 1'));
  assert.ok(!outputMatches('Hello World', 'Hello, World!'));
  assert.ok(!outputMatches('  11', '11'), 'leading spaces count');
  assert.ok(!outputMatches('odd', 'Odd'), 'case counts');
  assert.ok(!outputMatches('', '11'));
});

test('a run sends Java 17 with base64 code and input, and decodes the reply', async () => {
  const calls = stubJudge0({ status: { id: 3 }, stdout: b64('11\n'), stderr: null, time: '0.14' });
  const result = await runJava('class Main {}', '4 7', 'key');
  assert.deepStrictEqual(result, { kind: 'ok', stdout: '11\n', error: '', timeSeconds: 0.14 });
  assert.strictEqual(calls[0].body.language_id, 91);
  assert.strictEqual(Buffer.from(calls[0].body.stdin, 'base64').toString(), '4 7');
  assert.strictEqual(calls[0].options.headers['X-RapidAPI-Key'], 'key');
  assert.strictEqual(calls[0].body.expected_output, undefined, 'the answer never leaves the server');
});

test('a compile error returns the compiler message', async () => {
  stubJudge0({ status: { id: 6 }, compile_output: b64("Main.java:3: error: ';' expected"), time: null });
  const result = await runJava('x', '', 'key');
  assert.strictEqual(result.kind, 'compile');
  assert.match(result.error, /';' expected/);
});

test('an unreachable runner, an HTTP error and the limit throw RunnerUnavailable', async () => {
  stubJudge0(new Error('timeout'));
  await assert.rejects(runJava('x', '', 'key'), (err) => err instanceof RunnerUnavailable && !err.quotaUsedUp);
  stubJudge0(403);
  await assert.rejects(runJava('x', '', 'key'), (err) => err instanceof RunnerUnavailable && !err.quotaUsedUp);
  stubJudge0(429);
  await assert.rejects(runJava('x', '', 'key'), (err) => err instanceof RunnerUnavailable && err.quotaUsedUp);
  stubJudge0({ status: { id: 13 } });
  await assert.rejects(runJava('x', '', 'key'), RunnerUnavailable);
});

test("withGiven swaps each given declaration for the test's, keeping indentation and line count", () => {
  const { withGiven } = require('./codeRunner');
  const code = 'class Main {\n    int a = 3;\n    int b = 12;\n    int largest = a;\n}';
  assert.strictEqual(
    withGiven(code, 'int a = 3;\nint b = 12;', 'int a = -5;\nint b = -2;'),
    'class Main {\n    int a = -5;\n    int b = -2;\n    int largest = a;\n}'
  );
  assert.strictEqual(withGiven('int[] nums = {1};', 'int[] nums = {3, 8};', 'int[] nums = {7};'), 'int[] nums = {7};');
  assert.strictEqual(withGiven('System.out.println(1);', 'int n = 9;', 'int n = 1;'), null, 'line deleted');
  assert.strictEqual(withGiven('int n = 9;\nint n = 2;', 'int n = 9;', 'int n = 1;'), null, 'declared twice');
});
