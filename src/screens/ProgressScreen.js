import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ScreenState from '../components/ScreenState';
import { useProgressSummary } from '../hooks/useProgressSummary';
import { colors, radius, spacing, type } from '../theme/colors';

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

function ModuleScoreRow({ title, score, isLast }) {
  return (
    <View style={[styles.moduleRow, !isLast && styles.moduleRowDivider]}>
      <Text style={styles.moduleTitle} numberOfLines={1}>
        {title}
      </Text>
      {score ? (
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>
            {score.correct}/{score.total}
          </Text>
        </View>
      ) : (
        <Text style={styles.notAttempted}>Not taken</Text>
      )}
    </View>
  );
}

export default function ProgressScreen() {
  const { progress, modules, totalLessons, completed, percent, loading, error } =
    useProgressSummary({ includeModules: true });

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (!progress) return <ScreenState message="No progress recorded yet." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statRow}>
        <StatCard
          value={progress.streak.current}
          label={`Day streak (best ${progress.streak.longest})`}
        />
        <StatCard value={completed} unit={`/${totalLessons}`} label="Lessons completed" />
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.progressText}>{percent}% of the course complete</Text>
      </View>

      <Text style={styles.sectionLabel}>Module quiz scores</Text>

      {modules.length === 0 ? (
        <Text style={styles.emptyText}>No modules published yet.</Text>
      ) : (
        <View style={styles.group}>
          {modules.map((item, index) => (
            <ModuleScoreRow
              key={item.id}
              title={item.title}
              score={progress.moduleScores[item.id]}
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
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 17,
    color: colors.textMuted,
    fontWeight: '600',
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
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  moduleRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduleTitle: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  scorePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  scoreText: {
    ...type.small,
    fontWeight: '700',
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
