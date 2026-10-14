// Line matching for the Code Tracer drill. Kept free of Firebase imports so
// tests/tracer.test.js can run it under plain Node.
//
// Leading and trailing whitespace is ignored on both sides: indentation is
// slow to type on a phone keyboard and says nothing about knowing the syntax.
// Everything else (case, semicolons, brackets, spaces inside the line) has to
// match exactly, because reading every character is the point of the drill.

/**
 * Swaps curly quotes for straight ones. Some phone keyboards curl quotes as
 * you type, and a curly quote can never match the Java source, which would
 * leave the student stuck on that line with no way past it.
 */
export function straightenQuotes(text) {
  return text.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

/**
 * Index of the first wrong character in what has been typed so far, counted
 * in `typed` with its leading whitespace removed, or -1 if every character
 * typed so far is right (including typing nothing, or a correct prefix).
 */
export function mismatchIndex(typed, target) {
  const attempt = typed.trimStart();
  const expected = target.trim();
  for (let i = 0; i < attempt.length; i++) {
    // Past the end of the line: a trailing space is fine, anything else is not.
    if (i >= expected.length) return attempt.slice(i).trim() ? i : -1;
    if (attempt[i] !== expected[i]) return i;
  }
  return -1;
}

/** True once the typed line matches the target in full. */
export function lineMatches(typed, target) {
  return typed.trim() === target.trim();
}
