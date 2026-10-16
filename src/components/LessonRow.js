import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, spacing } from '../theme/colors';
import Text from './AppText';

/** One lesson inside a module card: its number (or a tick), title and minutes. */
export default function LessonRow({ lesson, done, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.lessonRow, pressed && styles.lessonRowPressed]}
    >
      <View style={[styles.dot, done && styles.dotDone]}>
        <Text style={[styles.dotMark, done && styles.dotMarkDone]}>
          {done ? '✓' : (lesson.order ?? '·')}
        </Text>
      </View>
      <Text style={[styles.lessonTitle, done && styles.lessonTitleDone]} numberOfLines={2}>
        {lesson.title}
      </Text>
      <Text style={styles.lessonMinutes}>{lesson.minutes} MIN</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  lessonRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dotMark: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.borderStrong,
  },
  dotMarkDone: {
    color: colors.white,
  },
  lessonTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.35,
    color: colors.text,
  },
  lessonTitleDone: {
    color: colors.textMuted,
  },
  lessonMinutes: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.42,
    color: colors.borderStrong,
  },
});
