import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { authColors, authFonts, authRadius, authType } from '../../theme/authTheme';
import Text, { AppTextInput as TextInput } from '../AppText';

/** The design's inline field error: a small red "!" and the message. */
export function FieldError({ message, style }) {
  return (
    <View style={[styles.error, style]} accessibilityRole="alert">
      <View style={styles.errorDot}>
        <Text style={styles.errorDotMark}>!</Text>
      </View>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

/**
 * Text field for the auth flow, with the password reveal toggle when needed.
 * Pass `error` to give it a red border and the design's message under it;
 * without it the field renders exactly as before.
 */
export default function AuthTextField({ secureTextEntry, style, error, ...inputProps }) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = Boolean(secureTextEntry);

  const field = (
    <View
      style={[
        styles.row,
        focused && styles.rowFocused,
        error && styles.rowError,
        isPassword && styles.rowWithToggle,
        style,
      ]}
    >
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

  if (!error) return field;
  return (
    <View>
      {field}
      <FieldError message={error} />
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
  rowError: {
    borderColor: authColors.error,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 8,
    marginHorizontal: 4,
  },
  errorDot: {
    width: 15,
    height: 15,
    marginTop: 1,
    borderRadius: 8,
    backgroundColor: authColors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorDotMark: {
    fontFamily: authFonts.extraBold,
    fontSize: 9,
    color: authColors.bg,
  },
  errorText: {
    flex: 1,
    fontFamily: authFonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.45,
    color: authColors.error,
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
