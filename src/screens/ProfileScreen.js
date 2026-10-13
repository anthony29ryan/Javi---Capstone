import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '../components/Avatar';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const WEAK_SCORE = 80;

function toPercent(score) {
  return score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
}

function masteryLabel(percent) {
  if (percent >= 60) return 'Advanced';
  if (percent >= 20) return 'Intermediate';
  return 'Beginner';
}

/**
 * Badges are computed from progress on every render rather than stored and
 * awarded. The project deliberately has no achievement engine, and it does not
 * need one: each of these is a plain question about data already loaded, so
 * there is nothing to keep in sync and nothing to backfill for existing users.
 */
function earnedBadges({ completedCount, percent, streak, moduleScores }) {
  const scores = Object.values(moduleScores);
  const best = scores.length > 0 ? Math.max(...scores.map(toPercent)) : 0;

  return [
    { key: 'first', title: 'First steps', sub: 'One lesson done', earned: completedCount >= 1 },
    { key: 'five', title: 'Getting going', sub: 'Five lessons', earned: completedCount >= 5 },
    { key: 'half', title: 'Halfway', sub: '50% complete', earned: percent >= 50 },
    { key: 'quiz', title: 'Quiz taker', sub: 'First quiz', earned: scores.length >= 1 },
    { key: 'high', title: 'High scorer', sub: '80% on a quiz', earned: best >= 80 },
    { key: 'streak', title: 'Week streak', sub: 'Seven days', earned: (streak.longest ?? 0) >= 7 },
  ];
}

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    courses,
    modules,
    moduleScores,
    moduleProgress,
    courseProgress,
    completedCount,
    totalLessons,
    percent,
    streak,
    loading,
    error,
  } = useProgress();

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;

  const name = user?.displayName || user?.email?.split('@')[0] || 'there';

  const modulesDone = modules.filter((m) => (moduleProgress[m.id]?.percent ?? 0) === 100).length;

  const moduleTitles = Object.fromEntries(modules.map((m) => [m.id, m.title]));
  const weak = Object.entries(moduleScores)
    .map(([moduleId, score]) => ({
      id: moduleId,
      name: moduleTitles[moduleId] ?? 'Module',
      score: toPercent(score),
    }))
    .filter((item) => item.score < WEAK_SCORE)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const badges = earnedBadges({ completedCount, percent, streak, moduleScores });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.identity}>
        <Avatar user={user} size={64} />
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.mastery}>{masteryLabel(percent)}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={({ pressed }) => [styles.gear, pressed && styles.gearPressed]}
        >
          <Text style={styles.gearGlyph}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <View>
            <Text style={styles.sectionLabel}>Course progress</Text>
            <Text style={styles.bigPercent}>{percent}%</Text>
          </View>
          <Text style={styles.progressMeta}>
            {completedCount} of {totalLessons} lessons{'\n'}
            {modulesDone} modules finished
          </Text>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>

        <View style={styles.levels}>
          {courses.map((course) => {
            const coursePercent = courseProgress[course.id]?.percent ?? 0;
            return (
              <View key={course.id} style={styles.level}>
                <Text style={styles.levelLabel} numberOfLines={1}>
                  {course.title}
                </Text>
                <View style={styles.levelTrack}>
                  <View style={[styles.levelFill, { width: `${coursePercent}%` }]} />
                </View>
                <Text style={styles.levelPercent}>{coursePercent}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={styles.heading}>Needs a second pass</Text>
      {weak.length > 0 ? (
        <View style={styles.weakList}>
          {weak.map((item) => (
            <Pressable
              key={item.id}
              onPress={() =>
                navigation.navigate('Lessons', { moduleId: item.id, moduleTitle: item.name })
              }
              style={({ pressed }) => [styles.weakRow, pressed && styles.weakRowPressed]}
            >
              <View style={styles.weakBody}>
                <Text style={styles.weakName}>{item.name}</Text>
                <Text style={styles.weakWhy}>Lowest quiz score so far</Text>
              </View>
              <Text style={styles.weakScore}>{item.score}%</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyNote}>
          Nothing flagged yet. Take a few module quizzes and the weakest ones show up here.
        </Text>
      )}
      {/* Ranking by raw score is a stand-in. The design intends this list to
          come from the trained model, which predicts weak topics from attempt
          features rather than just the last score — that needs a Cloud
          Function to run inference, which this build does not have. */}
      <Text style={styles.footnote}>
        Ranked by quiz score for now. Personalised predictions need the trained model, which is
        not running in this build.
      </Text>

      <Text style={styles.heading}>Badges</Text>
      <Text style={styles.headingNote}>In-app rewards, not academic certifications.</Text>
      <View style={styles.badgeGrid}>
        {badges.map((badge) => (
          <View key={badge.key} style={styles.badgeCell}>
            <View style={[styles.badge, badge.earned && styles.badgeEarned]}>
              <View style={[styles.badgeIcon, badge.earned && styles.badgeIconEarned]} />
              <Text style={[styles.badgeTitle, badge.earned && styles.badgeTitleEarned]}>
                {badge.title}
              </Text>
              <Text style={styles.badgeSub}>{badge.sub}</Text>
            </View>
          </View>
        ))}
      </View>
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
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 22 * 1.2,
    letterSpacing: -0.22,
    color: colors.text,
  },
  mastery: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 11 * 0.08,
    textTransform: 'uppercase',
    color: colors.primaryDark,
    marginTop: 5,
  },
  gear: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearPressed: {
    backgroundColor: colors.primarySoft,
  },
  gearGlyph: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.textMuted,
  },
  progressCard: {
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  bigPercent: {
    fontFamily: fonts.bold,
    fontSize: 38,
    letterSpacing: -0.76,
    color: colors.text,
    marginTop: 10,
  },
  progressMeta: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 12.5 * 1.6,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
    marginTop: spacing.lg,
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  levels: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  level: {
    flex: 1,
  },
  levelLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9.5,
    letterSpacing: 0.95,
    textTransform: 'uppercase',
    color: colors.borderStrong,
  },
  levelTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
    marginTop: spacing.sm,
    marginBottom: 6,
  },
  levelFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  levelPercent: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
  heading: {
    ...type.sectionHeading,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  headingNote: {
    ...type.small,
    fontSize: 12,
    color: colors.borderStrong,
    marginTop: -spacing.sm,
    marginBottom: 14,
  },
  weakList: {
    gap: 10,
  },
  weakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weakRowPressed: {
    borderColor: colors.primary,
  },
  weakBody: {
    flex: 1,
    minWidth: 0,
  },
  weakName: {
    ...type.rowTitle,
    color: colors.text,
  },
  weakWhy: {
    ...type.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  weakScore: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.error,
  },
  emptyNote: {
    ...type.small,
    color: colors.textMuted,
  },
  footnote: {
    ...type.small,
    fontSize: 12,
    color: colors.borderStrong,
    marginTop: spacing.md,
  },
  // Three equal columns at any screen width. A percentage width plus a fixed
  // `gap` only adds up on some widths (narrow phones wrapped to two per row),
  // so instead each cell is exactly a third wide and the 10px gutter comes
  // from 5px of padding on every side of every cell. The grid's -5px margin
  // cancels the outer padding so the badges still line up with the cards above.
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -5,
  },
  badgeCell: {
    width: '33.333%',
    padding: 5,
  },
  badge: {
    // Fill the cell's height too, so badges in a row match even when one
    // title wraps to two lines.
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeEarned: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  badgeIconEarned: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  badgeTitle: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.3,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 10,
  },
  badgeTitleEarned: {
    color: colors.primaryDark,
  },
  badgeSub: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    lineHeight: 9.5 * 1.3,
    textAlign: 'center',
    color: colors.borderStrong,
    marginTop: spacing.xs,
  },
});
