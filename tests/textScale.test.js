// Unit tests for src/theme/textScale.js.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const { scaleStyles } = require('../src/theme/textScale.js');

const styles = {
  body: { fontSize: 14, lineHeight: 20, color: 'black' },
  label: { fontSize: 10, letterSpacing: 1 },
  card: { padding: 16 },
};

test('multiplies text sizes and leaves everything else alone', () => {
  const scaled = scaleStyles(styles, 1.5);
  assert.deepStrictEqual(scaled.body, { fontSize: 21, lineHeight: 30, color: 'black' });
  assert.deepStrictEqual(scaled.label, { fontSize: 15, letterSpacing: 1.5 });
  assert.deepStrictEqual(scaled.card, { padding: 16 });
  assert.strictEqual(styles.body.fontSize, 14, 'the original is not changed');
});

test('only the listed keys are scaled', () => {
  const scaled = scaleStyles(styles, 2, ['body']);
  assert.strictEqual(scaled.body.fontSize, 28);
  assert.strictEqual(scaled.label, styles.label);
});

test('scale 1 returns the same object', () => {
  assert.strictEqual(scaleStyles(styles, 1), styles);
});
