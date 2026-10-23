import { Pressable, StyleSheet, View } from 'react-native';

import { useProgress } from '../context/ProgressContext';
import { authColors } from '../theme/authTheme';
import { fonts, radius, spacing } from '../theme/colors';
import Text from './AppText';

/**
 * The design's amber "You are offline" bar: says what the screen is showing
 * instead, and retries on tap, since nothing else re-checks once offline.
 */
export default function OfflineBanner({
  message = 'You can keep studying. Changes save when you reconnect.',
}) {
  const { offline, refresh } = useProgress();
  if (!offline) return null;

  return (
    <Pressable
      onPress={refresh}
      accessibilityRole="button"
      accessibilityHint="Tries to reconnect"
      style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
    >
      <View style={styles.dot} />
      <Text style={styles.message}>
        <Text style={styles.lead}>You are offline.</Text> {message}
      </Text>
      <Text style={styles.retry}>Retry</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: authColors.warnLine,
    backgroundColor: authColors.warnSoft,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: authColors.warn,
  },
  message: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.4,
    color: authColors.warnInk,
  },
  lead: {
    fontFamily: fonts.bold,
  },
  retry: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 11 * 0.06,
    textTransform: 'uppercase',
    color: authColors.warnInk,
  },
});
