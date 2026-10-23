import { StyleSheet, View } from 'react-native';

import { colors, fonts, spacing, type } from '../theme/colors';
import Text from './AppText';

// The design's console colours on the darker output panel.
export const CONSOLE_RED = '#F08A7E';
export const CONSOLE_MUTED = 'rgba(231,233,245,.45)';

/**
 * The "OUTPUT" heading with the run's status on the right, and the dark
 * console card below it. Shared by the Challenge and Playground screens.
 */
export default function ConsolePanel({ status, statusColor, text, textColor }) {
  return (
    <>
      <View style={styles.row}>
        <Text style={styles.title}>Output</Text>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
      </View>
      <View style={styles.console} accessibilityLiveRegion="polite">
        <Text style={styles.label}>Console</Text>
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 13 * 0.08,
    textTransform: 'uppercase',
    color: colors.text,
  },
  status: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    flexShrink: 1,
    textAlign: 'right',
  },
  console: {
    borderRadius: 18,
    backgroundColor: '#1E2236',
    padding: 14,
    minHeight: 72,
  },
  label: {
    ...type.sectionLabel,
    color: 'rgba(231,233,245,.4)',
    marginBottom: spacing.sm,
  },
  text: {
    fontFamily: fonts.monoRegular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.6,
  },
});
