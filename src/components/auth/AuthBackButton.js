import { Pressable, StyleSheet } from 'react-native';

import { authColors, authRadius, authFonts } from '../../theme/authTheme';
import Text from '../AppText';

export default function AuthBackButton({ onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text style={styles.glyph}>←</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: authRadius.backButton,
    backgroundColor: authColors.surface,
    borderWidth: 1,
    borderColor: authColors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  glyph: {
    fontFamily: authFonts.monoRegular,
    fontSize: 18,
    color: authColors.ink,
  },
});
