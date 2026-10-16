import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/auth/AuthButton';
import Mascot from '../components/Mascot';
import PopIn from '../components/PopIn';
import ScreenState from '../components/ScreenState';
import Skeleton from '../components/Skeleton';
import { scorePercent, useProgress } from '../context/ProgressContext';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';
import { quizCount } from './QuizzesScreen';

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

/** One "way to practice": glyph tile, name, blurb, and a footer line. */
function WayCard({ glyph, name, blurb, count, action, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.wayCard, pressed && styles.wayCardPressed]}
    >
      <View style={styles.wayTop}>
        <View style={styles.wayTile}>
          <Text style={styles.wayTileGlyph}>{glyph}</Text>
        </View>
        <View style={styles.wayBody}>
          <Text style={styles.wayName}>{name}</Text>
          <Text style={styles.wayBlurb}>{blurb}</Text>
        </View>
        <Text style={styles.wayChevron}>›</Text>
      </View>
      <View style={styles.wayFooter}>
        <Text style={styles.wayCount}>{count}</Text>
        <Text style={styles.wayAction}>{action}</Text>
      </View>
    </Pressable>
  );
}

// Frame 67: the page's shape in grey while progress loads.
function PracticeSkeleton({ top }) {
  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: top }]}>
        <Text style={styles.title}>Practice</Text>
        <View style={styles.stats}>
          {[0, 1].map((key) => (
            <View key={key} style={[styles.statCard, styles.skelStat]}>
              <Skeleton style={styles.skelStatLabel} />
              <Skeleton style={styles.skelStatValue} />
            </View>
          ))}
        </View>
        <Skeleton style={styles.skelLabel} />
        <View style={styles.ways}>
          {[0, 1, 2, 3].map((key) => (
            <View key={key} style={styles.skelRow}>
              <Skeleton style={styles.skelTile} />
              <View style={styles.skelLines}>
                <Skeleton style={styles.skelName} />
                <Skeleton style={styles.skelBlurb} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function PracticeScreen({ navigation }) {
  const { modules, courses, moduleScores, progress, loading, error, refresh } = useProgress();
  // Tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();
  const top = insets.top + spacing.lg;

  if (loading) return <PracticeSkeleton top={top} />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;
  if (modules.length === 0) {
    return <ScreenState message="No quizzes yet." hint="Content has not been published." />;
  }

  // Both stats come from progress data the context already holds, so opening
  // this screen costs no extra Firestore reads. Retakes overwrite a module's
  // score, so the count is quizzes taken, not attempts.
  const taken = Object.entries(moduleScores);
  const average =
    taken.length > 0
      ? Math.round(taken.reduce((sum, [, score]) => sum + scorePercent(score), 0) / taken.length)
      : null;

  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));
  const lowest = taken.reduce(
    (worst, entry) => (!worst || scorePercent(entry[1]) < scorePercent(worst[1]) ? entry : worst),
    null
  );
  const lowestTitle = lowest ? modulesById[lowest[0]]?.title : null;

  // Courses are sorted by order, so this is the first Beginner module.
  const firstModule = modules.find((module) => module.courseId === courses[0]?.id) ?? modules[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: top }]}
    >
      <PopIn index={0}>
        <Text style={styles.title}>Practice</Text>
      </PopIn>
      <PopIn index={1} style={styles.stats}>
        <StatCard label="Average" value={average === null ? '—' : `${average}%`} />
        <StatCard label="Quizzes taken" value={String(taken.length)} />
      </PopIn>

      {/* Frame 74, kept inside the page so Code Tracer stays in reach. */}
      {taken.length === 0 ? (
        <PopIn index={2} style={styles.empty}>
          <Mascot variant="curious" px={96} decorative animate={false} />
          <Text style={styles.emptyTitle}>No quiz attempts yet</Text>
          <Text style={styles.emptyBody}>
            Every module ends with a short quiz. Your scores will show up here.
          </Text>
          <AuthButton
            label={`Try the ${firstModule.title} quiz`}
            onPress={() =>
              navigation.navigate('Quiz', { moduleId: firstModule.id, title: firstModule.title })
            }
            style={styles.emptyButton}
          />
        </PopIn>
      ) : null}

      <PopIn index={3}>
        <Text style={styles.sectionLabel}>Ways to practice</Text>
      </PopIn>
      <View style={styles.ways}>
        <PopIn index={4}>
          <WayCard
            glyph="?"
            name="Quiz"
            blurb="Multiple choice and fill-in questions for each module."
            count={quizCount(modules.length)}
            action={lowestTitle ? `Retry ${lowestTitle}` : 'Pick a quiz'}
            onPress={() => navigation.navigate('Quizzes')}
          />
        </PopIn>
        <PopIn index={5}>
          <WayCard
            glyph="i++"
            name="Code Tracer"
            blurb="Type short programs line by line. Mistakes show in red."
            // shortcut: one drill per module, so the module count is the drill
            // count; ids of renamed drills stay in completedTraces and would
            // overcount. Count against the traces list if that ever happens.
            count={`${progress?.completedTraces?.length ?? 0} of ${modules.length} done`}
            action="Pick a program"
            onPress={() => navigation.navigate('TracerList')}
          />
        </PopIn>

        {/* The design's challenge, playground and project cards need a cloud
            Java runner that does not exist yet, so one card says so. */}
        <PopIn index={6} style={[styles.wayCard, styles.wayTop]}>
          <View style={[styles.wayTile, styles.laterTile]}>
            <Text style={[styles.wayTileGlyph, styles.laterGlyph]}>{'{ }'}</Text>
          </View>
          <View style={styles.wayBody}>
            <View style={styles.laterHead}>
              <Text style={styles.wayName}>Coding challenges & playground</Text>
              <Text style={styles.laterPill}>Coming later</Text>
            </View>
            <Text style={styles.wayBlurb}>
              Write and run your own Java once the cloud runner is ready.
            </Text>
          </View>
        </PopIn>
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
    paddingHorizontal: 20,
    paddingBottom: spacing.xl,
  },
  title: {
    ...type.pageTitle,
    color: colors.text,
    marginBottom: 18,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
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
  empty: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 20 * 1.3,
    color: colors.text,
    marginTop: 14,
  },
  emptyBody: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: spacing.sm,
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
    marginBottom: 10,
  },
  ways: {
    gap: 12,
  },
  wayCard: {
    padding: spacing.lg,
    gap: 14,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wayCardPressed: {
    borderColor: colors.primary,
  },
  wayTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  wayTile: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  wayTileGlyph: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.primaryDark,
  },
  wayBody: {
    flex: 1,
    minWidth: 0,
  },
  wayName: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 17 * 1.25,
    color: colors.text,
  },
  wayBlurb: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  wayChevron: {
    fontSize: 16,
    color: colors.borderStrong,
  },
  wayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  wayCount: {
    ...type.sectionLabel,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.08,
    color: colors.borderStrong,
  },
  wayAction: {
    flexShrink: 1,
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.primaryDark,
  },
  laterTile: {
    backgroundColor: colors.surfaceSunken,
  },
  laterGlyph: {
    color: colors.textMuted,
  },
  laterHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  laterPill: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
    fontFamily: fonts.semiBold,
    fontSize: 9.5,
    letterSpacing: 9.5 * 0.08,
    textTransform: 'uppercase',
    color: colors.borderStrong,
  },
  skelStat: {
    gap: 10,
  },
  skelStatLabel: {
    height: 9,
    width: '50%',
    borderRadius: 4,
  },
  skelStatValue: {
    height: 22,
    width: '40%',
    borderRadius: 7,
  },
  skelLabel: {
    height: 10,
    width: '34%',
    borderRadius: 5,
    marginBottom: 12,
  },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skelTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  skelLines: {
    flex: 1,
    gap: 8,
  },
  skelName: {
    height: 14,
    width: '58%',
    borderRadius: 6,
  },
  skelBlurb: {
    height: 10,
    width: '84%',
    borderRadius: 5,
  },
});
