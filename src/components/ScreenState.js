import { StyleSheet, View } from 'react-native';

import { colors, spacing, type } from '../theme/colors';
import Text from './AppText';
import Button from './Button';

/**
 * The error / empty states every data-backed screen needs. Centralizing them
 * keeps those cases from being restyled per screen. Loading is not here:
 * each screen draws its own skeleton in its own shape.
 *
 * Usage: <ScreenState error={msg} onRetry={fn} />,
 *        <ScreenState message="Nothing here yet." />
 */
export default function ScreenState({ error, onRetry, message, hint }) {
  return (
    <View style={styles.container}>
      {error ? (
        <>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorBody}>{error}</Text>
          {onRetry ? <Button label="Try again" variant="secondary" onPress={onRetry} /> : null}
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
