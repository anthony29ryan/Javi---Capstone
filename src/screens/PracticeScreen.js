import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const STRONG_SCORE = 80;

function toPercent(score) {
  return score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function QuizRow({ module, courseTitle, score, onPress }) {
  const percent = score ? toPercent(score) : null;
  const strong = percent !== null && percent >= STRONG_SCORE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quizCard, pressed && styles.quizCardPressed]}
    >
      <View style={styles.quizBody}>
        <Text style={styles.quizEyebrow} numberOfLines={1}>
          {courseTitle}
        </Text>
        <Text style={styles.quizName}>{module.title}</Text>
        <Text style={styles.quizMeta}>
          {score ? `${score.correct} of ${score.total} last time` : 'Not attempted yet'}
        </Text>
      </View>

      <View style={[styles.badge, strong && styles.badgeStrong]}>
        <Text style={[styles.badgeValue, strong && styles.badgeValueStrong]}>
          {percent === null ? '—' : `${percent}%`}
        </Text>
        <Text style={[styles.badgeLabel, strong && styles.badgeValueStrong]}>
          {percent === null ? 'New' : 'Best'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function PracticeScreen({ navigation }) {
  const { modules, courses, moduleScores, loading, error } = useProgress();
  // Tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (modules.length === 0) {
    return <ScreenState message="No quizzes yet." hint="Content has not been published." />;
  }

  const courseTitles = Object.fromEntries(courses.map((course) => [course.id, course.title]));

  // Both stats come from progress data the context already holds, so opening
  // this screen costs no extra Firestore reads.
  const attempted = Object.values(moduleScores);
  const average =
    attempted.length > 0
      ? Math.round(attempted.reduce((sum, score) => sum + toPercent(score), 0) / attempted.length)
      : null;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.lg }]}
      data={modules}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.title}>Practice</Text>
          <View style={styles.stats}>
            <StatCard label="Average" value={average === null ? '—' : `${average}%`} />
            <StatCard label="Attempts" value={String(attempted.length)} />
          </View>
        </>
      }
      renderItem={({ item }) => (
        <QuizRow
          module={item}
          courseTitle={courseTitles[item.courseId] ?? ''}
          score={moduleScores[item.id]}
          onPress={() =>
            navigation.navigate('Quiz', { moduleId: item.id, title: item.title })
          }
        />
      )}
      ListFooterComponent={
        // Straight from the handoff, which ships this card as-is: the coding
        // problems need a cloud Java runner that does not exist yet, and the
        // design would rather say so than hide the gap.
        <View style={styles.comingLater}>
          <Text style={styles.comingLaterLabel}>Coming later</Text>
          <Text style={styles.comingLaterBody}>
            Coding problems and mini-projects run on a cloud Java service, so they stay stubbed in
            this build.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    ...centeredColumn(contentWidth.content),
    padding: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...type.pageTitle,
    color: colors.text,
    marginBottom: 18,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    marginTop: spacing.sm,
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
    fontFamily: fonts.mono,
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
  comingLater: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  comingLaterLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  comingLaterBody: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 9,
    lineHeight: 13 * 1.6,
  },
});
