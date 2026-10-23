import { StyleSheet } from 'react-native';

import { colors, fonts } from '../theme/colors';
import Text from './AppText';

/** The "Javi" wordmark: Baloo 2, with "vi" in the button terracotta. */
export default function Wordmark({ size = 48, style }) {
  return (
    <Text
      style={[
        styles.wordmark,
        // Baloo sits high in its line box; the padding drops it back to centre.
        { fontSize: size, lineHeight: size * (7 / 6), letterSpacing: -size * 0.01, paddingTop: size / 8 },
        style,
      ]}
      accessibilityLabel="Javi"
    >
      Ja<Text style={styles.vi}>vi</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontFamily: fonts.wordmark,
    color: colors.text,
  },
  vi: {
    color: colors.button,
  },
});
