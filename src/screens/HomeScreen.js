import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthToast from '../components/auth/AuthToast';
import Avatar from '../components/Avatar';
import Mascot from '../components/Mascot';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';
import Skeleton, { SkeletonSticker } from '../components/Skeleton';
import Sticker from '../components/Sticker';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { pickWeakLessons } from '../services/recommendations';
import { useWeakTopics } from '../services/weakTopics';
import { authColors, authFonts } from '../theme/authTheme';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

// Shortcut sticker colours from the Home options board (1a).
const QUIZ_STICKER = '#FFC97E';
const JAVI_STICKER = '#EBC2B3';
const INK = authColors.ink;
// The Flow's Continue card sets its text in the page cream.
const CREAM = colors.background;
const RECOMMENDATION_COUNT = 3;

// Code-voice glyphs, the same register as the tab bar. Matched on the module
// id so a module with no entry still gets a sensible brace rather than a gap.
const MODULE_GLYPHS = [
  [/loop|iterat/, 'for'],
  [/array|collection/, '[ ]'],
  [/method|function/, '( )'],
  [/object|class|oop|inherit/, 'new'],
  [/condition|if|branch|decision/, 'if'],
  [/variable|data.?type|primitive/, 'var'],
  [/string|text/, '" "'],
  [/exception|error|try/, '!'],
];

function glyphFor(moduleId = '') {
  const match = MODULE_GLYPHS.find(([pattern]) => pattern.test(moduleId.toLowerCase()));
  return match ? match[1] : '{ }';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function Tile({ glyph, title, meta, background, tilt, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={styles.tile}>
      {({ pressed }) => (
        <Sticker background={background} tilt={tilt} drop={4} corner={20} pressed={pressed} faceStyle={styles.tileFace}>
          {children}
          <Text style={styles.tileGlyph}>{glyph}</Text>
          <Text style={styles.tileTitle}>{title}</Text>
          <Text style={styles.tileMeta}>{meta}</Text>
        </Sticker>
      )}
    </Pressable>
  );
}

function RecSkeleton() {
  return (
    <View style={styles.recRow}>
      <Skeleton style={styles.skelGlyph} />
      <View style={styles.skelLines}>
        <Skeleton style={styles.skelRecTitle} />
        <Skeleton style={styles.skelRecMeta} />
      </View>
    </View>
  );
}

// Frame 63: the screen's shape in grey while progress loads.
function HomeSkeleton({ top }) {
  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: top }]}>
        <View style={styles.header}>
          <Skeleton style={styles.skelAvatar} />
          <View style={styles.skelLines}>
            <Skeleton style={styles.skelGreeting} />
            <Skeleton style={styles.skelStreak} />
          </View>
          <Skeleton style={styles.skelAvatar} />
        </View>
        <SkeletonSticker tilt={-1} style={[styles.hero, styles.skelHero]}>
          <Skeleton style={[styles.skelBar, { height: 10, width: '34%' }]} />
          <Skeleton style={[styles.skelBar, { height: 24, width: '62%', borderRadius: 8 }]} />
          <Skeleton style={[styles.skelBar, { height: 12, width: '40%' }]} />
          <View style={[styles.segments, styles.skelSegments]}>
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} style={styles.segment} />
            ))}
          </View>
          <View style={styles.heroFooter}>
            <Skeleton style={[styles.skelBar, { height: 12, width: '46%' }]} />
            <Skeleton style={styles.skelResume} />
          </View>
        </SkeletonSticker>
        <View style={styles.tiles}>
          <SkeletonSticker tilt={1.5} style={styles.skelTile}>
            <Skeleton style={[styles.skelBar, { height: 14, width: '70%' }]} />
            <Skeleton style={[styles.skelBar, { height: 10, width: '84%' }]} />
          </SkeletonSticker>
          <SkeletonSticker tilt={-1.5} style={styles.skelTile}>
            <Skeleton style={[styles.skelBar, { height: 14, width: '62%' }]} />
            <Skeleton style={[styles.skelBar, { height: 10, width: '76%' }]} />
          </SkeletonSticker>
        </View>
        <Skeleton style={styles.skelHeading} />
        <View style={styles.recommendations}>
          <RecSkeleton />
          <RecSkeleton />
          <RecSkeleton />
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, callName, restoredNotice, clearRestoredNotice } = useAuth();
  const insets = useSafeAreaInsets();

  // Straight after the Welcome back screen restored the account. Kept in
  // state, so it still shows if the skeleton is up when it arrives.
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!restoredNotice) return;
    setToast('Account restored. Welcome back.');
    clearRestoredNotice();
  }, [restoredNotice]);
  const {
    lessons,
    modules,
    courses,
    moduleProgress,
    completedCount,
    streak,
    isLessonComplete,
    lastLessonId,
    loading,
    error,
    offline,
    refresh,
  } = useProgress();

  // The model's weak topics; null while the first answer is on its way.
  const weakTopics = useWeakTopics(offline);
  // Lessons kept out of Recommended until something real changes; see below.
  const recHidden = useRef({ key: null, hidden: new Set() });

  if (loading) return <HomeSkeleton top={insets.top + spacing.lg} />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;

  const name = callName;

  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));
  const coursesById = Object.fromEntries(courses.map((course) => [course.id, course]));

  const courseOrderOf = (moduleId) =>
    coursesById[modulesById[moduleId]?.courseId]?.order ?? 0;

  // Lessons in the order a learner actually walks them: course, then module,
  // then the lesson's own position.
  //
  // Course has to come first. A module's `order` restarts at 1 in every
  // course, so without it Beginner's module 1 ties with Advanced's module 1
  // and the winner is whatever Firestore happened to return first — which is
  // how "Continue learning" ended up pointing at an Advanced module.
  const ordered = [...lessons].sort((a, b) => {
    const courseDelta = courseOrderOf(a.moduleId) - courseOrderOf(b.moduleId);
    if (courseDelta !== 0) return courseDelta;

    const moduleDelta =
      (modulesById[a.moduleId]?.order ?? 0) - (modulesById[b.moduleId]?.order ?? 0);
    return moduleDelta !== 0 ? moduleDelta : (a.order ?? 0) - (b.order ?? 0);
  });

  const remaining = ordered.filter((lesson) => !isLessonComplete(lesson.id));

  // Resume the lesson last opened, so long as it is still unfinished —
  // otherwise this card would keep sending the learner back to something they
  // have already ticked off. Falling back to the first unfinished lesson
  // covers a fresh account and the moment a lesson is marked complete.
  const resumable = lastLessonId
    ? remaining.find((lesson) => lesson.id === lastLessonId)
    : null;
  const next = resumable ?? remaining[0] ?? null;

  const nextModule = next ? modulesById[next.moduleId] : null;
  const nextCourse = nextModule ? coursesById[nextModule.courseId] : null;
  const nextModuleStats = next ? moduleProgress[next.moduleId] : null;
  // One progress segment per lesson in the Continue module.
  const nextModuleLessons = next ? ordered.filter((lesson) => lesson.moduleId === next.moduleId) : [];

  // Every pick in refill order. The list only changes when a quiz changes the
  // weak modules or a lesson is finished (the key). Until then, every lesson
  // that reaches the Continue card stays out, so tapping through the rows
  // never brings one back or shifts the others; the next one fills the gap.
  const weakPicks = pickWeakLessons({
    topics: weakTopics ?? [],
    orderedLessons: ordered,
    isComplete: isLessonComplete,
    count: Infinity,
  });
  const recKey = `${weakTopics === null}|${weakPicks.topics.map((t) => t.topic)}|${completedCount}`;
  if (recHidden.current.key !== recKey) recHidden.current = { key: recKey, hidden: new Set() };
  if (next) recHidden.current.hidden.add(next.id);
  const recommendations = (weakPicks.lessons.length ? weakPicks.lessons : remaining)
    .filter((lesson) => !recHidden.current.hidden.has(lesson.id))
    .slice(0, RECOMMENDATION_COUNT);
  const shownTopics = weakPicks.topics.filter((t) =>
    recommendations.some((lesson) => lesson.moduleId === t.topic)
  );
  const weakNames = shownTopics.map((t) => modulesById[t.topic]?.title ?? 'this module');
  // The model's accuracy covers recent answers, so it is not called a quiz score.
  const recWhy =
    weakNames.length === 1
      ? `Javi thinks you should review ${weakNames[0]} (${Math.round(shownTopics[0].accuracy * 100)}% right recently).`
      : weakNames.length > 1
        ? `Javi thinks you should review ${weakNames.slice(0, -1).join(', ')} and ${weakNames.at(-1)}.`
        : 'Next in your course order.';
  const recsLoading = weakTopics === null;

  function openLesson(lesson) {
    navigation.navigate('LessonDetail', { lessonId: lesson.id, lessonTitle: lesson.title });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      >
        <View style={styles.header}>
          <Mascot variant="greeting" px={48} decorative animate={false} style={styles.mascot} />
          <View style={styles.headerText}>
            <Text style={styles.greeting} numberOfLines={2}>
              {greeting()}, {name}
            </Text>
            <Text style={styles.streakLine}>
              {completedCount} lesson{completedCount === 1 ? '' : 's'} done · {streak.current} day
              streak
            </Text>
          </View>
          <View style={styles.avatarRing}>
            <Avatar user={user} name={callName} size={40} onPress={() => navigation.navigate('Profile')} />
          </View>
        </View>

        <OfflineBanner message="Showing lessons and progress saved on this phone." />

        {/* The whole card opens the lesson, like its Resume pill. */}
        <Pressable
          onPress={next ? () => openLesson(next) : undefined}
          disabled={!next}
          accessibilityRole={next ? 'button' : undefined}
          accessibilityLabel={next ? `Resume ${next.title}` : undefined}
          style={styles.hero}
        >
          {({ pressed }) => (
            <Sticker background={colors.primary} tilt={-1} drop={5} corner={24} pressed={pressed} faceStyle={styles.heroFace}>
              <Text style={styles.heroEyebrow}>{next ? 'Continue learning' : 'All caught up'}</Text>
              <Text style={styles.heroTitle}>{next ? next.title : 'Every lesson done'}</Text>
              <Text style={styles.heroCrumb}>
                {next
                  ? [nextCourse?.title, nextModule?.title].filter(Boolean).join(' · ')
                  : 'Revisit a module quiz to keep your scores sharp.'}
              </Text>
              {next ? (
                <>
                  <View style={styles.segments}>
                    {nextModuleLessons.map((lesson) => (
                      <View
                        key={lesson.id}
                        style={[styles.segment, isLessonComplete(lesson.id) && styles.segmentDone]}
                      />
                    ))}
                  </View>
                  <View style={styles.heroFooter}>
                    <Text style={styles.heroProgress}>
                      {nextModuleStats?.completed ?? 0} of {nextModuleStats?.total ?? 0} lessons in this
                      module
                    </Text>
                    <View style={styles.resume}>
                      <Text style={styles.resumeLabel}>Resume</Text>
                    </View>
                  </View>
                </>
              ) : null}
            </Sticker>
          )}
        </Pressable>

        <View style={styles.tiles}>
          <Tile
            glyph="?"
            title={nextModule ? `${nextModule.title} quiz` : 'Module quiz'}
            // QUIZ_LENGTH in QuizScreen; smaller banks give fewer.
            meta="Up to 20 questions"
            background={QUIZ_STICKER}
            tilt={1.5}
            onPress={() =>
              nextModule
                ? navigation.navigate('Quiz', { moduleId: nextModule.id, title: nextModule.title })
                : navigation.navigate('Practice')
            }
          />
          <Tile
            glyph=">_"
            title="Ask Javi"
            // askTutor's real limit (DAILY_QUESTIONS in functions/index.js).
            meta="30 questions a day"
            background={JAVI_STICKER}
            tilt={-1.5}
            onPress={() => navigation.navigate('Tutor')}
          >
            <Mascot variant="thinking" px={46} decorative animate={false} style={styles.tileJavi} />
          </Tile>
        </View>

        {recsLoading || recommendations.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended for you</Text>
              <Text
                style={styles.sectionAll}
                suppressHighlighting
                onPress={() =>
                  weakPicks.lessons.length
                    ? navigation.navigate('WeakLessons', { topics: weakTopics.filter((t) => t.weak) })
                    : navigation.navigate('Courses')
                }
              >
                All
              </Text>
            </View>

            <View style={styles.recommendations}>
              {recsLoading ? (
                <>
                  <RecSkeleton />
                  <RecSkeleton />
                  <RecSkeleton />
                </>
              ) : null}
              {recsLoading ? null : recommendations.map((lesson) => (
                <Pressable
                  key={lesson.id}
                  onPress={() => openLesson(lesson)}
                  style={({ pressed }) => [styles.recRow, pressed && styles.recRowPressed]}
                >
                  <View style={styles.recGlyphTile}>
                    <Text style={styles.recGlyph}>{glyphFor(lesson.moduleId)}</Text>
                  </View>
                  <View style={styles.recBody}>
                    <Text style={styles.recTitle}>{lesson.title}</Text>
                    <Text style={styles.recMeta} numberOfLines={1}>
                      {modulesById[lesson.moduleId]?.title ?? 'Module'} · {lesson.minutes} min
                    </Text>
                  </View>
                  <Text style={styles.recChevron}>›</Text>
                </Pressable>
              ))}
            </View>

            {recsLoading ? null : <Text style={styles.recWhy}>{recWhy}</Text>}
          </>
        ) : null}
      </ScrollView>
      <AuthToast message={toast} onHide={() => setToast('')} />
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
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  mascot: {
    marginTop: -4,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    ...type.screenTitle,
    color: colors.text,
  },
  streakLine: {
    ...type.body,
    color: colors.textMuted,
    marginTop: 6,
  },
  avatarRing: {
    borderWidth: 2,
    borderColor: INK,
    borderRadius: radius.pill,
  },
  hero: {
    marginTop: 20,
  },
  heroFace: {
    padding: 18,
  },
  heroEyebrow: {
    ...type.sectionLabel,
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.12,
    color: CREAM,
  },
  heroTitle: {
    fontFamily: authFonts.extraBold,
    fontSize: 23,
    lineHeight: 23 * 1.2,
    letterSpacing: -0.23,
    color: CREAM,
    marginTop: 10,
  },
  heroCrumb: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: CREAM,
    marginTop: 8,
  },
  segments: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 14,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(247,245,240,.3)',
  },
  segmentDone: {
    backgroundColor: CREAM,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: 14,
  },
  heroProgress: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: CREAM,
  },
  resume: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: INK,
  },
  resumeLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 12 * 0.06,
    textTransform: 'uppercase',
    color: colors.white,
  },
  tiles: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 18,
  },
  tile: {
    flex: 1,
    minWidth: 0,
  },
  tileFace: {
    padding: 14,
    gap: 6,
    overflow: 'hidden',
  },
  tileJavi: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  tileGlyph: {
    fontFamily: fonts.mono,
    fontSize: 18,
    lineHeight: 22,
    color: INK,
  },
  tileTitle: {
    fontFamily: authFonts.extraBold,
    fontSize: 15,
    lineHeight: 15 * 1.2,
    color: INK,
  },
  tileMeta: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.3,
    color: INK,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...type.sectionHeading,
    color: colors.text,
  },
  sectionAll: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 11 * 0.08,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  recommendations: {
    gap: 10,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recRowPressed: {
    borderColor: colors.primary,
  },
  recGlyphTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recGlyph: {
    fontFamily: fonts.mono,
    fontSize: 12.5,
    color: INK,
  },
  recBody: {
    flex: 1,
    minWidth: 0,
  },
  recTitle: {
    ...type.rowTitle,
    color: colors.text,
  },
  recMeta: {
    ...type.meta,
    letterSpacing: 11.5 * 0.06,
    textTransform: 'uppercase',
    color: colors.borderStrong,
    marginTop: spacing.xs,
  },
  recChevron: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.borderStrong,
  },
  recWhy: {
    ...type.small,
    fontSize: 12,
    color: colors.borderStrong,
    marginTop: 14,
    marginHorizontal: spacing.xs,
  },
  skelLines: {
    flex: 1,
    gap: 10,
  },
  skelGreeting: {
    height: 26,
    width: '78%',
    borderRadius: 8,
  },
  skelStreak: {
    height: 14,
    width: '52%',
    borderRadius: 6,
  },
  skelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  // Frame 63's outlined sticker shapes.
  skelHero: {
    padding: 18,
    gap: 12,
    borderRadius: 24,
  },
  skelBar: {
    borderRadius: 6,
  },
  skelSegments: {
    marginTop: 4,
  },
  skelResume: {
    width: 104,
    height: 44,
    borderRadius: 22,
  },
  skelTile: {
    flex: 1,
    height: 96,
    padding: 14,
    gap: 8,
    borderRadius: 20,
    justifyContent: 'flex-end',
  },
  skelHeading: {
    marginTop: 26,
    marginBottom: spacing.md,
    height: 18,
    width: '56%',
    borderRadius: 6,
  },
  skelGlyph: {
    width: 42,
    height: 42,
    borderRadius: 13,
  },
  skelRecTitle: {
    height: 14,
    width: '70%',
    borderRadius: 6,
  },
  skelRecMeta: {
    height: 10,
    width: '44%',
    borderRadius: 5,
  },
});
