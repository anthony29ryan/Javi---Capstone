import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ProgressRing from '../components/ProgressRing';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

function StatCard({ value, unit, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>
        {value}
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TierRow({ title, stats, isLast }) {
  const { completed = 0, total = 0, percent = 0 } = stats ?? {};

  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <ProgressRing percent={percent} size={40} strokeWidth={3.5}>
        <Text style={styles.ringText}>{percent}%</Text>
      </ProgressRing>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowMeta}>
          {completed} of {total} lessons
        </Text>
      </View>
    </View>
  );
}

function ModuleRow({ title, stats, score, isLast }) {
  const percent = stats?.percent ?? 0;

  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <ProgressRing percent={percent} size={32} strokeWidth={3}>
        <Text style={styles.ringTextSmall}>{percent}</Text>
      </ProgressRing>

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowMeta}>
          {stats?.completed ?? 0} of {stats?.total ?? 0} lessons
        </Text>
      </View>

      {score ? (
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>
            {score.correct}/{score.total}
          </Text>
        </View>
      ) : (
        <Text style={styles.notAttempted}>No quiz</Text>
      )}
    </View>
  );
}

export default function ProgressScreen() {
  const {
    courses,
    modules,
    totalLessons,
    completedCount,
    percent,
    streak,
    moduleScores,
    moduleProgress,
    courseProgress,
    loading,
    error,
    refresh,
  } = useProgress();

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statRow}>
        <StatCard value={streak.current} label={`Day streak (best ${streak.longest})`} />
        <StatCard value={completedCount} unit={`/${totalLessons}`} label="Lessons completed" />
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.progressText}>{percent}% of the course complete</Text>
      </View>

      <Text style={styles.sectionLabel}>By tier</Text>
      {courses.length === 0 ? (
        <Text style={styles.emptyText}>No tiers published yet.</Text>
      ) : (
        <View style={styles.group}>
          {courses.map((course, index) => (
            <TierRow
              key={course.id}
              title={course.title}
              stats={courseProgress[course.id]}
              isLast={index === courses.length - 1}
            />
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>By module</Text>
      {modules.length === 0 ? (
        <Text style={styles.emptyText}>No modules published yet.</Text>
      ) : (
        <View style={styles.group}>
          {modules.map((module, index) => (
            <ModuleRow
              key={module.id}
              title={module.title}
              stats={moduleProgress[module.id]}
              score={moduleScores[module.id]}
              isLast={index === modules.length - 1}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  statValue: {
    fontSize: 30,
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 17,
    color: colors.textMuted,
    fontFamily: fonts.semiBold,
  },
  statLabel: {
    ...type.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 17,
  },
  progressBlock: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  progressText: {
    ...type.small,
    color: colors.textMuted,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
    marginTop: spacing.xxl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  group: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 58,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.text,
  },
  rowMeta: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 1,
  },
  ringText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  ringTextSmall: {
    fontSize: 10,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  scorePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  scoreText: {
    ...type.small,
    fontFamily: fonts.bold,
    color: colors.primary,
  },
  notAttempted: {
    ...type.small,
    color: colors.textMuted,
  },
  emptyText: {
    ...type.small,
    color: colors.textMuted,
  },
});
