// Unit tests for hosting/passwordRules.js, the email-link page's form checks.
//
//   npm test

const assert = require('node:assert');
const { test } = require('node:test');

const load = () => import('../hosting/passwordRules.js');

test('empty fields each say what to type', async () => {
  const { passwordProblems } = await load();
  assert.deepStrictEqual(passwordProblems('', ''), {
    password: 'Enter a new password.',
    repeat: 'Repeat the new password.',
  });
});

test('a password missing a rule is refused, using Firebase’s symbol set', async () => {
  const { passwordProblems } = await load();
  assert.match(passwordProblems('Studyjava1', 'Studyjava1').password, /symbol/);
  // A plus sign is not in Firebase's list, so it does not count as a symbol.
  assert.match(passwordProblems('Study+java1', 'Study+java1').password, /symbol/);
});

test('the repeat must match exactly', async () => {
  const { passwordProblems } = await load();
  assert.deepStrictEqual(passwordProblems('Study#java1', 'Study#java2'), {
    repeat: 'This does not match the new password above.',
  });
});

test('a password meeting all four rules, repeated, has no problems', async () => {
  const { passwordProblems } = await load();
  assert.deepStrictEqual(passwordProblems('Study#java1', 'Study#java1'), {});
});
