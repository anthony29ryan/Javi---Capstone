import { Pressable, StyleSheet, Text } from 'react-native';

import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing } from '../theme/colors';

/**
 * One line explaining why quizzes and the tutor fail: the app is on its saved
 * copy. Tapping retries, since nothing else re-checks once the app is offline.
 */
export default function OfflineBanner() {
  const { offline, refresh } = useProgress();
  if (!offline) return null;

  return (
    <Pressable onPress={refresh} accessibilityRole="button" accessibilityHint="Tries to reconnect">
      <Text style={styles.banner}>Offline: showing downloaded lessons · Tap to retry</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: colors.textMuted,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
});
