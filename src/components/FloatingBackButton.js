import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme/colors';
import AuthBackButton from './auth/AuthBackButton';

/**
 * The back arrow that stays put while the page scrolls. Render it after the
 * scroll view, inside a full-screen View, and leave a 40px gap in the header
 * row where an inline button would sit.
 */
export default function FloatingBackButton({ onPress }) {
  const insets = useSafeAreaInsets();
  return <AuthBackButton onPress={onPress} style={[styles.back, { top: insets.top + spacing.lg }]} />;
}

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    left: spacing.xl,
    // Above the content that scrolls underneath it.
    zIndex: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
});
