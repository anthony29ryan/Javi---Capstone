import { useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/auth/AuthButton';
import BottomSheet from '../components/BottomSheet';
import { colors, fonts, type } from '../theme/colors';

/**
 * Frame 38, opened from the quiz's ✕ or Android back. The app keeps a
 * module's last score, and each checked answer is already recorded by the
 * grading function, so the copy says that rather than the design's "best
 * score" line.
 */
export default function QuitQuizSheetScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  // Quitting closes the sheet and the quiz under it; any other close just the sheet.
  const quitting = useRef(false);

  return (
    <BottomSheet
      onClosed={() => (quitting.current ? navigation.pop(2) : navigation.goBack())}
      style={{ paddingBottom: insets.bottom + 20 }}
    >
      {(close) => (
        <>
          <Text style={styles.title}>Quit this quiz?</Text>
          <Text style={styles.body}>
            Your score for this attempt won't be saved. Answers you've already checked still count
            toward Javi's suggestions.
          </Text>
          <AuthButton
            label="Quit quiz"
            onPress={() => {
              quitting.current = true;
              close();
            }}
            style={styles.quit}
          />
          <AuthButton label="Keep going" variant="secondary" onPress={close} style={styles.keep} />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
  quit: {
    backgroundColor: colors.error,
  },
  keep: {
    marginTop: 12,
  },
});
