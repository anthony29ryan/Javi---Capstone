import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackButton from '../components/auth/AuthBackButton';
import ScreenState from '../components/ScreenState';
import { PASS_PERCENT, scorePercent, useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

export const quizCount = (n) => (n === 1 ? '1 quiz' : `${n} quizzes`);

function QuizRow({ module, score, onPress }) {
  const percent = score ? scorePercent(score) : null;
  const strong = percent !== null && percent >= PASS_PERCENT;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quizCard, pressed && styles.quizCardPressed]}
    >
      <View style={styles.quizBody}>
        <Text style={styles.quizEyebrow}>Module {module.order}</Text>
        <Text style={styles.quizName}>{module.title}</Text>
        <Text style={styles.quizMeta}>
          {score ? `${score.correct} of ${score.total} last time` : 'Not taken yet'}
        </Text>
      </View>

      <View style={[styles.badge, strong && styles.badgeStrong]}>
        <Text style={[styles.badgeValue, strong && styles.badgeValueStrong]}>
          {percent === null ? '—' : `${percent}%`}
        </Text>
        <Text style={[styles.badgeLabel, strong && styles.badgeValueStrong]}>
          {percent === null ? 'New' : 'Last'}
        </Text>
      </View>
    </Pressable>
  );
}

/** Frame 29: every module quiz, grouped by tier. Opened from Practice's Quiz card. */
export default function QuizzesScreen({ navigation }) {
  const { courses, modules, moduleScores, loading, error, refresh } = useProgress();
  const insets = useSafeAreaInsets();

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {/* Indented to clear the floating back button below the list. */}
        <View style={styles.topRow}>
          <Text style={styles.eyebrow}>Practice</Text>
        </View>
        <Text style={styles.title}>Quizzes</Text>
        {/* The app keeps each module's latest score, not its best. */}
        <Text style={styles.intro}>
          {quizCount(modules.length)} across your modules. Your last score shows on each one.
        </Text>
  
        {courses.map((course) => {
          const courseModules = modules.filter((module) => module.courseId === course.id);
          if (!courseModules.length) return null;
          return (
            <View key={course.id} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupTitle}>{course.title}</Text>
                <View style={styles.groupRule} />
                <Text style={styles.groupCount}>{quizCount(courseModules.length)}</Text>
              </View>
              {courseModules.map((module) => (
                <QuizRow
                  key={module.id}
                  module={module}
                  score={moduleScores[module.id]}
                  onPress={() => navigation.navigate('Quiz', { moduleId: module.id, title: module.title })}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
      {/* Outside the list so it stays put while the page scrolls. */}
      <AuthBackButton
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + spacing.lg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: 20,
  },
  topRow: {
    // The button's 40px plus the design's 12px gap.
    marginLeft: 52,
    minHeight: 40,
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: 20,
    // Above the cards that scroll underneath it.
    zIndex: 2,
    elevation: 2,
  },
  eyebrow: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  title: {
    ...type.screenTitle,
    color: colors.text,
    marginTop: 18,
    marginBottom: 6,
  },
  intro: {
    ...type.body,
    color: colors.textMuted,
  },
  group: {
    gap: spacing.md,
    marginTop: 22,
  },
  groupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 13 * 0.08,
    textTransform: 'uppercase',
    color: colors.text,
  },
  groupRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  groupCount: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    color: colors.borderStrong,
  },
  quizCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quizCardPressed: {
    borderColor: colors.primary,
  },
  quizBody: {
    flex: 1,
    minWidth: 0,
  },
  quizEyebrow: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  quizName: {
    ...type.cardTitle,
    color: colors.text,
    marginTop: spacing.sm,
  },
  quizMeta: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 5,
  },
  badge: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  badgeStrong: {
    backgroundColor: colors.successBg,
  },
  badgeValue: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.textMuted,
  },
  badgeValueStrong: {
    color: colors.success,
  },
  badgeLabel: {
    ...type.sectionLabel,
    fontSize: 8.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
