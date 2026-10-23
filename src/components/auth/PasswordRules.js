import { StyleSheet, View } from 'react-native';

import { authColors, authType } from '../../theme/authTheme';
import Text from '../AppText';

// Firebase's own list of characters that count as a "symbol". Checking
// against this exact set rather than "anything not a letter or digit" avoids
// telling the user a character qualifies when the server would disagree.
// This mirrors the password policy configured in the Firebase console
// (Authentication > Settings > Password policy) — if that policy changes,
// update this list to match.
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

export function passwordMeetsAllRules(password) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** 2-column live checklist shown under every password field in this flow. */
export default function PasswordRules({ password }) {
  return (
    <View style={styles.grid}>
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);

        return (
          <View key={rule.key} style={styles.item}>
            <View style={[styles.dot, met && styles.dotMet]}>
              {met ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={[styles.label, met && styles.labelMet]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 14,
    marginHorizontal: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    width: '45%',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: authColors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMet: {
    backgroundColor: authColors.success,
  },
  check: {
    color: authColors.white,
    fontSize: 8,
    fontWeight: '600',
  },
  label: {
    ...authType.ruleLabel,
    color: authColors.muted,
  },
  labelMet: {
    color: authColors.ink,
  },
});
