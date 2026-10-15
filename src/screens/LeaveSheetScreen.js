import { useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/auth/AuthButton';
import BottomSheet from '../components/BottomSheet';
import { colors, fonts, type } from '../theme/colors';

/**
 * "Are you sure you want to leave?" for the screen underneath: frame 38 (quit
 * a quiz) and frame 91 (discard profile edits). The caller passes the words:
 * { kicker?, title, body, confirmLabel, keepLabel }. Confirming closes the
 * sheet and the screen under it.
 */
export default function LeaveSheetScreen({ navigation, route }) {
  const { kicker, title, body, confirmLabel, keepLabel } = route.params;
  const insets = useSafeAreaInsets();
  // Leaving closes the sheet and the screen under it; any other close just the sheet.
  const leaving = useRef(false);

  return (
    <BottomSheet
      onClosed={() => (leaving.current ? navigation.pop(2) : navigation.goBack())}
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      {(close) => (
        <>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <AuthButton
            label={confirmLabel}
            onPress={() => {
              leaving.current = true;
              close();
            }}
            style={styles.confirm}
          />
          <AuthButton label={keepLabel} variant="secondary" onPress={close} style={styles.keep} />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...type.sectionLabel,
    color: colors.error,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 21 * 1.3,
    color: colors.text,
    marginHorizontal: 4,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
    marginHorizontal: 4,
    marginTop: 8,
    marginBottom: 24,
  },
  confirm: {
    backgroundColor: colors.error,
  },
  keep: {
    marginTop: 12,
  },
});
