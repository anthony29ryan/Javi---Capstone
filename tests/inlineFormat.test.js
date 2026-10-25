// Unit tests for src/services/inlineFormat.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { parseInline } = require('../src/services/inlineFormat.js');

const text = (value) => ({ kind: 'text', value });
const code = (value) => ({ kind: 'code', value });

test('plain text, code and bold with code inside', () => {
  assert.deepStrictEqual(parseInline('Use `x` here'), [text('Use '), code('x'), text(' here')]);
  assert.deepStrictEqual(parseInline('**`final`** is a reserved word'), [
    { kind: 'bold', children: [code('final')] },
    text(' is a reserved word'),
  ]);
});

test('italic, and italic inside bold', () => {
  assert.deepStrictEqual(parseInline('what *kind* of value'), [
    text('what '),
    { kind: 'italic', children: [text('kind')] },
    text(' of value'),
  ]);
  // concurrency-2: the bold run holds an italic word.
  assert.deepStrictEqual(parseInline('**only *one* result.** Then'), [
    { kind: 'bold', children: [text('only '), { kind: 'italic', children: [text('one')] }, text(' result.')] },
    text(' Then'),
  ]);
});

test('a lone or unclosed asterisk stays as typed', () => {
  assert.deepStrictEqual(parseInline('area = PI * r * r'), [text('area = PI * r * r')]);
  assert.deepStrictEqual(parseInline('**not closed'), [text('**not closed')]);
  assert.deepStrictEqual(parseInline('`a * b`'), [code('a * b')]);
});
