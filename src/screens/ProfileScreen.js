import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import Text from '../components/AppText';
import AuthBackButton from '../components/auth/AuthBackButton';
import Avatar from '../components/Avatar';
import ScreenState from '../components/ScreenState';
import Skeleton from '../components/Skeleton';
import { BADGE_ART } from '../constants/art';
import { levelTheme } from '../constants/levels';
import { useAuth } from '../context/AuthContext';
import { scorePercent, useProgress } from '../context/ProgressContext';
import { getChallenges, getDraftIds } from '../services/challenges';
import { useWeakTopics } from '../services/weakTopics';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const WEAK_SHOWN = 3;
const TRACES_FOR_BADGE = 3;
const STREAK_FOR_BADGE = 7;

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
 * First Compile reads progress.ranFirstProgram, which only the runCode function sets.
 */
function badgeList({ moduleScores, tracedCount, solvedChallengeCount, ranFirstProgram, streak, courses, courseProgress }) {
  const scores = Object.values(moduleScores);
  const best = scores.length > 0 ? Math.max(...scores.map(scorePercent)) : 0;
  const longest = streak.longest ?? 0;
  const tierDone = (index) => {
    const stats = courseProgress[courses[index]?.id];
    return Boolean(stats && stats.total > 0 && stats.completed === stats.total);
  };
  const tier = (index, key, title) => ({
    key,
    title,
    sub: `Finish ${courses[index]?.title ?? 'this tier'}`,
    earned: tierDone(index),
  });

  return [
    { key: 'compile', title: 'First Compile', sub: 'Run your first program', earned: ranFirstProgram || solvedChallengeCount > 0 },
    { key: 'bug', title: 'Bug Squasher', sub: 'Solve a Code Challenge', earned: solvedChallengeCount > 0 },
    { key: 'pass', title: 'Pass Mark', sub: '75% or more on a quiz', earned: best >= 75 },
    { key: 'perfect', title: 'Perfect Score', sub: '100% on any quiz', earned: best >= 100 },
    {
      key: 'tracer',
      title: 'Line by Line',
      sub:
        tracedCount >= TRACES_FOR_BADGE
          ? `Traced ${TRACES_FOR_BADGE} programs`
          : `${tracedCount} of ${TRACES_FOR_BADGE} traced`,
      earned: tracedCount >= TRACES_FOR_BADGE,
    },
    {
      key: 'streak',
      title: 'On a Roll',
      sub:
        longest >= STREAK_FOR_BADGE
          ? `A ${STREAK_FOR_BADGE}-day streak`
          : `${Math.min(streak.current ?? 0, STREAK_FOR_BADGE)} of ${STREAK_FOR_BADGE} days`,
      earned: longest >= STREAK_FOR_BADGE,
    },
    tier(0, 'beginner', 'Foundations'),
    tier(1, 'intermediate', 'Object Thinker'),
    tier(2, 'advanced', 'Systems Builder'),
  ];
}

// Frame 68: the page's shape in grey while progress loads.
function ProfileSkeleton({ top }) {
  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: top }]}>
        <View style={styles.identity}>
          <Skeleton style={styles.skelAvatar} />
          <View style={styles.skelLines}>
            <Skeleton style={styles.skelName} />
            <Skeleton style={styles.skelMastery} />
          </View>
          <Skeleton style={styles.skelGear} />
        </View>
        <View style={[styles.card, styles.skelCard]}>
          <Skeleton style={styles.skelLabel} />
          <Skeleton style={styles.skelBig} />
          <Skeleton style={styles.skelBar} />
        </View>
        <Skeleton style={styles.skelHeading} />
        <View style={styles.rows}>
          {[0, 1, 2].map((key) => (
            <SkeletonRow key={key} />
          ))}
        </View>
      </View>
    </View>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.skelRow}>
      <Skeleton style={styles.skelTile} />
      <View style={styles.skelRowLines}>
        <Skeleton style={styles.skelRowTitle} />
        <Skeleton style={styles.skelRowSub} />
      </View>
    </View>
  );
}

/**
 * The design's Practice panel. The design has Challenges and Tracer tabs;
 * Quizzes stays as a third so its summary is not lost.
 */
function PracticePanel({ courses, modules, moduleScores, tracedIds, isChallengeSolved, navigation }) {
  const [tab, setTab] = useState('challenges');
  const [challenges, setChallenges] = useState([]);
  const [draftIds, setDraftIds] = useState(new Set());

  // The list is cached for the session; drafts are re-read so a challenge
  // left half-done shows as in progress when the learner comes back.
  useFocusEffect(
    useCallback(() => {
      getChallenges(courses).then(setChallenges).catch(() => {});
      getDraftIds().then(setDraftIds).catch(() => {});
    }, [courses])
  );

  const taken = modules.filter((module) => moduleScores[module.id]);
  const traced = modules.filter((module) => tracedIds.has(`${module.id}-trace`));
  const average =
    taken.length > 0
      ? Math.round(taken.reduce((sum, module) => sum + scorePercent(moduleScores[module.id]), 0) / taken.length)
      : null;

  const solved = challenges.filter((challenge) => isChallengeSolved(challenge.id));
  const started = challenges.filter((challenge) => !isChallengeSolved(challenge.id) && draftIds.has(challenge.id));
  // Challenges group by their level; quizzes and drills by their module's course.
  const [items, done, levelOf] =
    tab === 'challenges'
      ? [challenges, solved, (challenge) => challenge.level]
      : [modules, tab === 'quizzes' ? taken : traced, (module) => module.courseId];
  const tiers = courses.map((course, index) => {
    const inTier = items.filter((item) => levelOf(item) === course.id);
    const doneInTier = done.filter((item) => levelOf(item) === course.id).length;
    return {
      id: course.id,
      label: course.title,
      color: levelTheme(index).background,
      count: `${doneInTier}/${inTier.length}`,
      percent: inTier.length ? Math.round((doneInTier / inTier.length) * 100) : 0,
      complete: inTier.length > 0 && doneInTier === inTier.length,
    };
  });

  const panel =
    tab === 'challenges'
      ? {
          kicker: 'Code Challenges',
          ofText: `of ${challenges.length} solved`,
          note: `${started.length} in progress · ${challenges.length - solved.length - started.length} not started`,
          cta: 'Continue',
          open: () => navigation.navigate('Challenges'),
        }
      : tab === 'quizzes'
      ? {
          kicker: 'Module quizzes',
          ofText: `of ${modules.length} taken`,
          note: average === null ? 'No quizzes yet' : `Average ${average}%`,
          cta: 'Open quizzes',
          open: () => navigation.navigate('Quizzes'),
        }
      : {
          kicker: 'Code Tracer',
          ofText: `of ${modules.length} traced`,
          note: `${tiers.filter((tier) => tier.complete).length} of ${tiers.length} tiers complete`,
          cta: 'Trace next',
          open: () => navigation.navigate('TracerList'),
        };
  const percent = items.length ? Math.round((done.length / items.length) * 100) : 0;

  return (
    <>
      <View style={styles.panelHead}>
        <Text style={styles.headingInline}>Practice</Text>
        <View style={styles.segments}>
          {[
            ['challenges', 'Challenges'],
            ['quizzes', 'Quizzes'],
            ['tracer', 'Tracer'],
          ].map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              style={[styles.segment, tab === id && styles.segmentOn]}
            >
              <Text style={[styles.segmentLabel, tab === id && styles.segmentLabelOn]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.panelTop}>
          <View style={styles.flex}>
            <Text style={styles.sectionLabel}>{panel.kicker}</Text>
            <View style={styles.countRow}>
              <Text style={styles.count}>{done.length}</Text>
              <Text style={styles.countOf}>{panel.ofText}</Text>
            </View>
          </View>
          <Pressable
            onPress={panel.open}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaLabel}>{panel.cta}</Text>
          </Pressable>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.panelNote}>{panel.note}</Text>
        <View style={styles.hairline} />
        <Text style={[styles.sectionLabel, styles.byLabel]}>By level</Text>
        <View style={styles.tierGrid}>
          {tiers.map((tier) => (
            <View key={tier.id} style={styles.tierCell}>
              <View style={styles.tierRow}>
                <View style={styles.tierTop}>
                  <Text style={styles.tierLabel} numberOfLines={1}>
                    {tier.label}
                  </Text>
                  <Text style={styles.tierCount}>{tier.count}</Text>
                </View>
                <View style={styles.tierTrack}>
                  <View style={[styles.tierFill, { width: `${tier.percent}%`, backgroundColor: tier.color }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

// Opened from Home's avatar, so it carries its own way back, floating so it
// stays put while the page scrolls.
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <ProfileBody navigation={navigation} />
      <AuthBackButton
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + spacing.lg }]}
      />
    </View>
  );
}

function ProfileBody({ navigation }) {
  const { user, callName } = useAuth();
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
    progress,
    offline,
    loading,
    error,
    refresh,
    isChallengeSolved,
  } = useProgress();

  // The model's weak topics, as on Home; null while the first answer is on its way.
  const weakTopics = useWeakTopics(offline);

  // Below the floating back button: 40px plus a 12px gap.
  const top = insets.top + spacing.lg + 52;
  if (loading) return <ProfileSkeleton top={top} />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;

  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));
  const coursesById = Object.fromEntries(courses.map((course) => [course.id, course]));
  const modulesDone = modules.filter((m) => (moduleProgress[m.id]?.percent ?? 0) === 100).length;
  const tracedIds = new Set(progress?.completedTraces ?? []);

  const weak = (weakTopics ?? [])
    .filter((topic) => topic.weak && modulesById[topic.topic])
    .slice(0, WEAK_SHOWN);

  const badges = badgeList({
    moduleScores,
    tracedCount: tracedIds.size,
    solvedChallengeCount: progress?.completedChallenges?.length ?? 0,
    ranFirstProgram: progress?.ranFirstProgram === true,
    streak,
    courses,
    courseProgress,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: top, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <View style={styles.identity}>
        <Pressable
          onPress={() => navigation.navigate('AvatarSheet')}
          accessibilityRole="button"
          accessibilityLabel="Choose your avatar"
        >
          <Avatar user={user} name={callName} size={64} />
          <View style={styles.pencil}>
            <Text style={styles.pencilGlyph}>✎</Text>
          </View>
        </Pressable>
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>
            {callName}
          </Text>
          <Text style={styles.mastery}>{masteryLabel(percent)}</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' })}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          hitSlop={8}
          style={({ pressed }) => [styles.gear, pressed && styles.gearPressed]}
        >
          <Text style={styles.gearGlyph}>⚙</Text>
        </Pressable>
      </View>

      <View style={[styles.card, styles.progressCard]}>
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
          {courses.map((course, index) => {
            const coursePercent = courseProgress[course.id]?.percent ?? 0;
            return (
              <View key={course.id} style={styles.flex}>
                <Text style={styles.levelLabel} numberOfLines={1}>
                  {course.title}
                </Text>
                <View style={styles.levelTrack}>
                  <View
                    style={[
                      styles.levelFill,
                      { width: `${coursePercent}%`, backgroundColor: levelTheme(index).background },
                    ]}
                  />
                </View>
                <Text style={styles.levelPercent}>{coursePercent}%</Text>
              </View>
            );
          })}
        </View>
      </View>

      <PracticePanel
        courses={courses}
        modules={modules}
        moduleScores={moduleScores}
        tracedIds={tracedIds}
        isChallengeSolved={isChallengeSolved}
        navigation={navigation}
      />

      <Text style={styles.heading}>Needs a second pass</Text>
      {weakTopics === null ? (
        <View style={styles.rows}>
          <SkeletonRow />
          <SkeletonRow />
        </View>
      ) : weak.length > 0 ? (
        <View style={styles.rows}>
          {weak.map((topic) => {
            const module = modulesById[topic.topic];
            const course = coursesById[module.courseId];
            const pct = Math.round(topic.accuracy * 100);
            return (
              <Pressable
                key={topic.topic}
                onPress={() =>
                  navigation.navigate('Modules', { courseId: module.courseId, courseTitle: course?.title })
                }
                style={({ pressed }) => [styles.weakRow, pressed && styles.weakRowPressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.weakName}>{module.title}</Text>
                  <Text style={styles.weakWhy}>{pct}% of recent answers right</Text>
                </View>
                <Text style={styles.weakScore}>{pct}%</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.emptyNote}>
          Nothing flagged yet. Take a few module quizzes and Javi will point out what to review.
        </Text>
      )}

      <Text style={styles.heading}>Badges</Text>
      <Text style={styles.headingNote}>In-app rewards, not academic certifications.</Text>
      <View style={styles.badgeGrid}>
        {badges.map((badge) => (
          <View key={badge.key} style={styles.badgeCell}>
            <View
              style={[styles.badge, badge.earned && styles.badgeEarned]}
              accessibilityLabel={`${badge.title}, ${badge.earned ? 'earned' : 'locked'}`}
            >
              <View style={!badge.earned && styles.badgeArtLocked}>
                <SvgXml
                  xml={badge.earned ? BADGE_ART[badge.key].color : BADGE_ART[badge.key].grey}
                  width={60}
                  height={60}
                />
              </View>
              <Text style={[styles.badgeTitle, badge.earned && styles.badgeTitleEarned]}>
                {badge.title}
              </Text>
              <Text style={styles.badgeSub}>{badge.sub}</Text>
              <Text style={[styles.badgeState, badge.earned && styles.badgeTitleEarned]}>
                {badge.earned ? 'Earned' : 'Locked'}
              </Text>
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
    paddingHorizontal: 20,
  },
  back: {
    position: 'absolute',
    left: 20,
    zIndex: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  flex: {
    flex: 1,
    minWidth: 0,
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
  pencil: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryDark,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pencilGlyph: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.white,
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
  card: {
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressCard: {
    marginTop: 20,
    padding: 20,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  bigPercent: {
    fontFamily: fonts.bold,
    fontSize: 38,
    letterSpacing: -0.76,
    color: colors.text,
    marginTop: 10,
  },
  progressMeta: {
    flexShrink: 1,
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
  levelLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9.5,
    letterSpacing: 0.95,
    textTransform: 'uppercase',
    color: colors.textMuted,
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
  },
  levelPercent: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  headingInline: {
    ...type.sectionHeading,
    color: colors.text,
  },
  segments: {
    flexDirection: 'row',
    gap: 2,
    padding: 3,
    borderRadius: 14,
    backgroundColor: colors.surfaceSunken,
  },
  segment: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  segmentOn: {
    backgroundColor: colors.surface,
    shadowColor: '#2E3141',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 1,
  },
  segmentLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  segmentLabelOn: {
    color: colors.text,
  },
  panelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 9,
  },
  count: {
    fontFamily: fonts.bold,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.text,
  },
  countOf: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  cta: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  ctaPressed: {
    opacity: 0.8,
  },
  ctaLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  panelNote: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  hairline: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: 14,
  },
  byLabel: {
    marginBottom: 10,
  },
  // Two columns from half-width cells; the -4 margin cancels their padding.
  tierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -4,
  },
  tierCell: {
    width: '50%',
    padding: 4,
  },
  tierRow: {
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.surfaceSunken,
  },
  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  tierLabel: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.text,
  },
  tierCount: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  tierTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  tierFill: {
    height: 4,
    borderRadius: 2,
  },
  heading: {
    ...type.sectionHeading,
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  headingNote: {
    ...type.small,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    marginBottom: 14,
  },
  rows: {
    gap: 10,
  },
  weakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weakRowPressed: {
    borderColor: colors.primary,
  },
  weakName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: colors.text,
  },
  weakWhy: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  weakScore: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.error,
  },
  emptyNote: {
    ...type.small,
    color: colors.textMuted,
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
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeEarned: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  badgeArtLocked: {
    opacity: 0.4,
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
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  badgeState: {
    fontFamily: fonts.semiBold,
    fontSize: 8.5,
    letterSpacing: 8.5 * 0.1,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: 6,
  },
  skelLines: {
    flex: 1,
    gap: 9,
  },
  skelAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  skelName: {
    height: 20,
    width: '46%',
    borderRadius: 7,
  },
  skelMastery: {
    height: 10,
    width: '62%',
    borderRadius: 5,
  },
  skelGear: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  skelCard: {
    marginTop: 20,
    padding: 20,
    gap: 12,
  },
  skelLabel: {
    height: 10,
    width: '34%',
    borderRadius: 5,
  },
  skelBig: {
    height: 34,
    width: '30%',
    borderRadius: 9,
  },
  skelBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  skelHeading: {
    height: 16,
    width: '30%',
    borderRadius: 6,
    marginTop: 26,
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
  skelRowLines: {
    flex: 1,
    gap: 8,
  },
  skelRowTitle: {
    height: 14,
    width: '58%',
    borderRadius: 6,
  },
  skelRowSub: {
    height: 10,
    width: '84%',
    borderRadius: 5,
  },
});
