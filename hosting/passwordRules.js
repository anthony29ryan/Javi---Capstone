// The password rules for the email-link page. A copy of PASSWORD_RULES in
// src/components/auth/PasswordRules.js, which can't be imported here (it is a
// React Native component), so keep the two in step. No imports, so
// tests/authAction.test.js can load it under plain Node.

// Firebase's own list of characters that count as a "symbol".
const SYMBOL_CHARACTERS = "^$*.[]{}()?\"!@#%&/\\,><':;|_~`";

export const PASSWORD_RULES = [
  { key: 'length', label: '8 characters', test: (value) => value.length >= 8 },
  { key: 'upper', label: 'One uppercase', test: (value) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'One lowercase', test: (value) => /[a-z]/.test(value) },
  {
    key: 'symbol',
    label: 'One symbol',
    test: (value) => [...value].some((character) => SYMBOL_CHARACTERS.includes(character)),
  },
];

/** What is wrong with each field, by field name; empty when the form can be sent. */
export function passwordProblems(password, repeat) {
  const problems = {};
  if (!password) problems.password = 'Enter a new password.';
  else if (!PASSWORD_RULES.every((rule) => rule.test(password))) {
    problems.password = 'Use at least 8 characters with an uppercase letter, a lowercase letter and a symbol.';
  }
  if (!repeat) problems.repeat = 'Repeat the new password.';
  else if (repeat !== password) problems.repeat = 'This does not match the new password above.';
  return problems;
}
