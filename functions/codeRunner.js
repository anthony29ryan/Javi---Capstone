// Runs Java through Judge0 CE on RapidAPI (pay as you go) and compares output.
// No Firebase here, so codeRunner.test.js can run it under plain Node. Only
// this file knows which runner is used.

const JUDGE0_HOST = 'judge0-ce.p.rapidapi.com';
const JUDGE0_URL = `https://${JUDGE0_HOST}/submissions?base64_encoded=true&wait=true`;
const JAVA_17 = 91; // "Java (JDK 17.0.6)" in Judge0 CE's /languages
const CPU_SECONDS = 5; // a program running longer is stopped as a time limit
const REQUEST_TIMEOUT_MS = 25000; // queue wait plus JVM start plus the 5 s run
const MAX_CONSOLE_CHARS = 4000; // an endless print loop should not flood the phone

const toBase64 = (text) => Buffer.from(text, 'utf8').toString('base64');
const fromBase64 = (text) => (text ? Buffer.from(text, 'base64').toString('utf8') : '');

/** Thrown when Judge0 cannot be reached or refuses the request. */
class RunnerUnavailable extends Error {
  constructor(message, { quotaUsedUp = false } = {}) {
    super(message);
    this.quotaUsedUp = quotaUsedUp;
  }
}

/**
 * Judge0 status ids (GET /statuses): 3 Accepted, 5 Time Limit Exceeded,
 * 6 Compilation Error, 7-12 runtime errors (signals, or a non-zero exit, which
 * is how an uncaught Java exception ends). 1-2 still queued and 13-14 are
 * Judge0's own failures, so those count as the runner being unavailable.
 */
function kindOf(statusId) {
  if (statusId === 3) return 'ok';
  if (statusId === 5) return 'timeout';
  if (statusId === 6) return 'compile';
  if (statusId >= 7 && statusId <= 12) return 'runtime';
  return 'unavailable';
}

/**
 * Compiles and runs one Java program. Resolves to
 * { kind: 'ok'|'compile'|'runtime'|'timeout', stdout, error, timeSeconds },
 * where `error` is the compiler or runtime message. Throws RunnerUnavailable.
 */
async function runJava(code, stdin, apiKey) {
  let response;
  try {
    response = await fetch(JUDGE0_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': JUDGE0_HOST,
      },
      // Base64 both ways: Judge0 rejects output that is not valid UTF-8 otherwise.
      // expected_output is never sent; the comparison happens here.
      body: JSON.stringify({
        language_id: JAVA_17,
        source_code: toBase64(code),
        stdin: toBase64(stdin),
        cpu_time_limit: CPU_SECONDS,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new RunnerUnavailable(`Judge0 unreachable: ${err.message}`);
  }
  // 429 is RapidAPI's rate or quota limit.
  if (response.status === 429) throw new RunnerUnavailable('Judge0 limit reached', { quotaUsedUp: true });
  if (!response.ok) throw new RunnerUnavailable(`Judge0 HTTP ${response.status}`);

  const result = await response.json();
  const kind = kindOf(result.status?.id);
  if (kind === 'unavailable') throw new RunnerUnavailable(`Judge0 status ${result.status?.id}`);

  const error = kind === 'compile' ? fromBase64(result.compile_output) : fromBase64(result.stderr);
  return {
    kind,
    stdout: fromBase64(result.stdout).slice(0, MAX_CONSOLE_CHARS),
    error: error.slice(0, MAX_CONSOLE_CHARS),
    timeSeconds: Number(result.time) || 0,
  };
}

// Line endings normalised and trailing spaces on each line and trailing blank
// lines dropped: invisible on screen, so a mismatch there would feel unfair.
// Everything else, including leading spaces and case, has to match.
const normalise = (text) => text.replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).join('\n').trimEnd();

/** True when the program's output matches the expected output. */
function outputMatches(actual, expected) {
  return normalise(actual) === normalise(expected);
}

/** A given line is one declaration, `Type name = value;`; its key is everything up to the value. */
const givenKey = (line) => line.slice(0, line.indexOf(' = ') + 3);

/**
 * For a 'given' challenge: swaps the student's given lines (the example's
 * declarations, e.g. `int n = 9;`) for one test's lines with the same keys,
 * keeping their indentation, so the program runs on that test without
 * reading any input and its line numbers never shift. Returns null if any
 * of those declarations is missing or appears twice in the code.
 */
function withGiven(code, exampleGiven, testGiven) {
  const lines = code.split('\n');
  const testLines = testGiven.split('\n');
  for (const [i, exampleLine] of exampleGiven.split('\n').entries()) {
    const key = givenKey(exampleLine);
    const found = lines.flatMap((line, at) => (line.trimStart().startsWith(key) ? [at] : []));
    if (found.length !== 1) return null;
    lines[found[0]] = lines[found[0]].match(/^[ \t]*/)[0] + testLines[i];
  }
  return lines.join('\n');
}

module.exports = { RunnerUnavailable, givenKey, kindOf, outputMatches, runJava, withGiven };
