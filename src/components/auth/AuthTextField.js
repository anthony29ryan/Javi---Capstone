import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { authColors, authRadius, authType } from '../../theme/authTheme';

/**
 * Text field for the auth flow. Per the design handoff, fields never show
 * their own inline error — validation messages appear as one message above
 * the screen's submit button instead, so this component only renders the
 * input itself (plus the password reveal toggle, when needed).
 */
export default function AuthTextField({ secureTextEntry, style, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={[styles.row, focused && styles.rowFocused, isPassword && styles.rowWithToggle, style]}>
      <TextInput
        style={styles.input}
        placeholderTextColor={authColors.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        secureTextEntry={isPassword && !revealed}
        {...inputProps}
      />

      {isPassword ? (
        <Pressable
          onPress={() => setRevealed((value) => !value)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          style={styles.reveal}
        >
          <Ionicons
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={authColors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: authRadius.field,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: 18,
  },
  rowWithToggle: {
    paddingRight: 52,
  },
  rowFocused: {
    borderColor: authColors.accent,
  },
  input: {
    flex: 1,
    ...authType.input,
    color: authColors.ink,
  },
  reveal: {
    position: 'absolute',
    right: 12,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
