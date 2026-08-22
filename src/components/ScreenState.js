import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme/colors';

/**
 * The loading / error / empty states every data-backed screen needs.
 * Centralizing them keeps those three cases from being restyled per screen.
 *
 * Usage: <ScreenState loading />, <ScreenState error={msg} />,
 *        <ScreenState message="Nothing here yet." />
 */
export default function ScreenState({ loading, error, message, hint }) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={colors.primary} size="large" /> : null}

      {error ? (
        <>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  errorTitle: {
    ...type.cardTitle,
    color: colors.text,
  },
  errorBody: {
    ...type.small,
    color: colors.error,
    textAlign: 'center',
  },
  message: {
    ...type.body,
    color: colors.text,
    textAlign: 'center',
  },
  hint: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
