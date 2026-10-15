import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '../components/Avatar';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const PRACTICE_TILE_BG = '#FFC97E';
const PRACTICE_TILE_INK = '#3F414E';
const TUTOR_TILE_BG = '#333242';
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

function Tile({ eyebrow, title, meta, background, ink, subtleInk, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: background },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.tileEyebrow, { color: subtleInk }]}>{eyebrow}</Text>
      <Text style={[styles.tileTitle, { color: ink }]}>{title}</Text>
      <Text style={[styles.tileMeta, { color: subtleInk }]}>{meta}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, callName } = useAuth();
  const insets = useSafeAreaInsets();
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
    refresh,
  } = useProgress();

  if (loading) return <ScreenState loading />;
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

  const recommendations = remaining
    .filter((lesson) => lesson.id !== next?.id)
    .slice(0, RECOMMENDATION_COUNT);

  function openLesson(lesson) {
    navigation.navigate('LessonDetail', { lessonId: lesson.id, lessonTitle: lesson.title });
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting()}, {name}
          </Text>
          <Text style={styles.streakLine}>
            {completedCount} lesson{completedCount === 1 ? '' : 's'} done · {streak.current} day
            streak
          </Text>
        </View>
        <Avatar user={user} name={callName} size={44} onPress={() => navigation.navigate('Settings')} />
      </View>

      <OfflineBanner />

      {next ? (
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Continue learning</Text>
          <Text style={styles.heroTitle}>{next.title}</Text>
          <Text style={styles.heroCrumb}>
            {[nextCourse?.title, nextModule?.title].filter(Boolean).join(' · ')}
          </Text>

          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${nextModuleStats?.percent ?? 0}%` }]} />
          </View>

          <View style={styles.heroFooter}>
            <Text style={styles.heroProgress}>
              {nextModuleStats?.completed ?? 0} of {nextModuleStats?.total ?? 0} lessons in this
              module
            </Text>
            <Pressable
              onPress={() => openLesson(next)}
              style={({ pressed }) => [styles.resume, pressed && styles.pressed]}
            >
              <Text style={styles.resumeLabel}>Resume</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>All caught up</Text>
          <Text style={styles.heroTitle}>Every lesson done</Text>
          <Text style={styles.heroCrumb}>Revisit a module quiz to keep your scores sharp.</Text>
        </View>
      )}

      <View style={styles.tiles}>
        <Tile
          eyebrow="Practice"
          title={nextModule ? `${nextModule.title} quiz` : 'Module quiz'}
          meta="Test what you have read"
          background={PRACTICE_TILE_BG}
          ink={PRACTICE_TILE_INK}
          subtleInk="rgba(63,65,78,.72)"
          onPress={() => navigation.navigate('Practice')}
        />
        <Tile
          eyebrow="Tutor"
          title="Ask about code"
          // Honest rather than a question count: the tutor has no backing
          // service in this build, so there is nothing to count.
          meta="Not set up yet"
          background={TUTOR_TILE_BG}
          ink={colors.white}
          subtleInk="rgba(255,255,255,.62)"
          onPress={() => navigation.navigate('Tutor')}
        />
      </View>

      {recommendations.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for you</Text>
            <Text
              style={styles.sectionAll}
              suppressHighlighting
              onPress={() => navigation.navigate('Courses')}
            >
              All
            </Text>
          </View>

          <View style={styles.recommendations}>
            {recommendations.map((lesson) => (
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

          {/* The design intends this list to come from the trained model. Until
              that runs, it is simply what comes next in the course order. */}
          <Text style={styles.recWhy}>
            Next in your course order. Personalised picks need the trained model, which is not
            running in this build.
          </Text>
        </>
      ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
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
  hero: {
    marginTop: 20,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    shadowColor: '#2E3141',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 6,
  },
  heroEyebrow: {
    ...type.sectionLabel,
    letterSpacing: 1.4,
    color: 'rgba(255,255,255,.82)',
  },
  heroTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 20 * 1.3,
    color: colors.white,
    marginTop: 12,
    marginBottom: 4,
  },
  heroCrumb: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.4,
    color: 'rgba(255,255,255,.85)',
  },
  heroTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,.28)',
    overflow: 'hidden',
    marginTop: spacing.lg,
    marginBottom: 14,
  },
  heroFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroProgress: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: 'rgba(255,255,255,.85)',
  },
  resume: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: colors.white,
  },
  resumeLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 12 * 0.07,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  pressed: {
    opacity: 0.85,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 14,
  },
  tile: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 20,
  },
  tileEyebrow: {
    ...type.sectionLabel,
  },
  tileTitle: {
    ...type.cardTitle,
    marginTop: 10,
  },
  tileMeta: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.3,
    marginTop: spacing.xs,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recGlyph: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.primaryDark,
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
});
