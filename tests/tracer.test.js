// Unit tests for src/services/tracer.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { mismatchIndex, lineMatches, straightenQuotes, countsAsSlip } = require('../src/services/tracer.js');

const target = '    int count = 5;';

test('indentation and trailing spaces are ignored', () => {
  assert.ok(lineMatches('int count = 5;', target));
  assert.ok(lineMatches('  int count = 5;   ', target));
  assert.strictEqual(mismatchIndex('int count = 5; ', target), -1);
});

test('a correct prefix, or nothing typed, has no mismatch', () => {
  assert.strictEqual(mismatchIndex('', target), -1);
  assert.strictEqual(mismatchIndex('   int cou', target), -1);
  assert.ok(!lineMatches('int cou', target));
});

test('case must match', () => {
  assert.strictEqual(mismatchIndex('Int', target), 0);
  assert.ok(!lineMatches('int Count = 5;', target));
});

test('a missing semicolon does not complete the line', () => {
  assert.strictEqual(mismatchIndex('int count = 5', target), -1);
  assert.ok(!lineMatches('int count = 5', target));
});

test('spacing inside the line must match', () => {
  assert.strictEqual(mismatchIndex('int count=5;', target), 9);
  assert.ok(!lineMatches('int  count = 5;', target));
});

test('extra characters past the end are a mismatch', () => {
  assert.strictEqual(mismatchIndex('int count = 5;;', target), 14);
});

test('curly quotes from a phone keyboard become straight ones', () => {
  const typed = straightenQuotes('System.out.println(“Hi” + ‘!’);');
  assert.strictEqual(typed, `System.out.println("Hi" + '!');`);
  assert.ok(lineMatches(typed, `    System.out.println("Hi" + '!');`));
});

test('a slip counts once until the line is right again', () => {
  assert.ok(countsAsSlip('int c', 'int x', target));
  assert.ok(!countsAsSlip('int x', 'int xy', target)); // still wrong: no new slip
  assert.ok(!countsAsSlip('int x', 'int ', target)); // backspacing fixes it
  assert.ok(countsAsSlip('int c', 'int cz', target)); // slipping again counts
  assert.ok(!countsAsSlip('int c', 'int co', target));
});
