import { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Pressable, StyleSheet, View } from 'react-native';

import Text from '../components/AppText';
import AuthToast from '../components/auth/AuthToast';
import Collapsible, { Chevron, useKeepInPlace } from '../components/Collapsible';
import LessonRow from '../components/LessonRow';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';
import Skeleton from '../components/Skeleton';
import { levelLabel } from '../constants/levels';
import { scorePercent, useProgress } from '../context/ProgressContext';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';


const modulesLabel = (n) => `${n} module${n === 1 ? '' : 's'}`;
const FINISHED_HOLD_MS = 1200;

// Frame 66: the page's shape in grey while progress loads.
function ModuleSkeleton({ top, onBack }) {
  return (
    <View style={styles.screen}>
      <View style={[styles.list, { paddingTop: top }]}>
        <View style={styles.tagRow}>
          <Skeleton style={styles.skelTag} />
        </View>
        <Skeleton style={styles.skelTitle} />
        <Skeleton style={styles.skelBlurb} />
        <Skeleton style={styles.skelProgress} />
        {[0, 1, 2, 3].map((key) => (
          <View key={key} style={styles.skelCard}>
            <View style={styles.skelLines}>
              <Skeleton style={styles.skelLabel} />
              <Skeleton style={styles.skelName} />
              <Skeleton style={styles.skelSummary} />
            </View>
            <Skeleton style={styles.skelBadge} />
          </View>
        ))}
      </View>
      <BackButton top={top} onPress={onBack} />
    </View>
  );
}

function BackButton({ top, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={({ pressed }) => [styles.back, { top }, pressed && styles.backPressed]}
    >
      <Text style={styles.backGlyph}>←</Text>
    </Pressable>
  );
}

// The design's download arrow.
function DownloadGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M10 3.5v9M6 8.5l4 4 4-4M4 16h12"
        stroke={colors.text}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function scoreNote(score) {
  if (!score || !score.total) return 'Not taken';
  return `Last ${scorePercent(score)}%`;
}

/**
 * A course's modules, each card carrying its own lessons and quiz.
 *
 * The handoff folds what used to be two screens into one: previously a module
 * was a row you tapped to reach a separate lesson list. Nesting them means the
 * whole course is legible without drilling in and back out again — but a tier
 * runs to several modules of several lessons each, so the cards collapse.
 */
export default function ModulesScreen({ route, navigation }) {
  const { courseId, courseTitle } = route.params;
  // The design puts a back button and the level tag in the page itself rather
  // than in a nav bar, so this screen hides the header and owns its top inset.
  const insets = useSafeAreaInsets();
  const {
    courses,
    modules,
    lessons,
    moduleProgress,
    courseProgress,
    moduleScores,
    isLessonComplete,
    loading,
    error,
    refresh,
    offline,
    downloadedIds,
    downloadQueue,
    downloadTotal,
    downloadDone,
    downloadFailed,
    cancelDownloads,
  } = useProgress();

  // null until the first render with data, then the id of whichever module the
  // learner is partway through. Kept as "which one is open" rather than a set
  // of open ids so the list cannot end up fully expanded again, which is the
  // thing that made it unwieldy.
  const [openModuleId, setOpenModuleId] = useState(null);
  const [touched, setTouched] = useState(false);
  const anchor = useKeepInPlace();
  const [toast, setToast] = useState('');
  // A batch that just ended, held on screen briefly so its 100% is seen.
  const [finished, setFinished] = useState(null);

  // Frame 56: once a batch for this course empties, say how many were saved.
  const courseModuleIds = modules.filter((m) => m.courseId === courseId).map((m) => m.id);
  const downloadingHere = downloadQueue.some((id) => courseModuleIds.includes(id));
  const wasDownloading = useRef(false);
  useEffect(() => {
    if (downloadingHere) {
      wasDownloading.current = true;
      return;
    }
    if (!wasDownloading.current) return;
    wasDownloading.current = false;
    if (downloadDone > 0) setFinished({ count: downloadDone });
  }, [downloadingHere, downloadDone]);

  useEffect(() => {
    if (!finished) return undefined;
    const timer = setTimeout(() => {
      setFinished(null);
      setToast(`${modulesLabel(finished.count)} saved for offline`);
    }, FINISHED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [finished]);

  // Each module is one quick read, so the bar glides between steps rather
  // than jumping, which made real progress look fake.
  const downloadPercent = downloadTotal ? Math.round((downloadDone / downloadTotal) * 100) : 0;
  const fill = useSharedValue(0);
  useEffect(() => {
    // A new batch starts empty at once instead of gliding back from 100%.
    fill.value = downloadPercent === 0 ? 0 : withTiming(downloadPercent, { duration: 400 });
  }, [downloadPercent, fill]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  const top = insets.top + spacing.lg;
  if (loading) return <ModuleSkeleton top={top} onBack={() => navigation.goBack()} />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;

  const courseIndex = courses.findIndex((item) => item.id === courseId);
  const course = courses[courseIndex];
  const courseModules = modules.filter((module) => module.courseId === courseId);
  const stats = courseProgress[courseId] ?? { completed: 0, total: 0, percent: 0 };

  if (courseModules.length === 0) {
    return <ScreenState message="No modules yet." hint="This tier has no published modules." />;
  }

  const lessonsByModule = {};
  for (const lesson of lessons) {
    if (!lessonsByModule[lesson.moduleId]) lessonsByModule[lesson.moduleId] = [];
    lessonsByModule[lesson.moduleId].push(lesson);
  }

  // Before the learner touches anything, open the module they are partway
  // through — or the first unfinished one — so the screen lands on the place
  // they are most likely headed. Once they tap, their choice stands.
  const suggestedOpenId =
    courseModules.find((module) => {
      const progress = moduleProgress[module.id];
      return progress && progress.completed > 0 && progress.completed < progress.total;
    })?.id ??
    courseModules.find((module) => (moduleProgress[module.id]?.percent ?? 0) < 100)?.id ??
    null;

  const expandedId = touched ? openModuleId : suggestedOpenId;

  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));
  const savedHere = courseModules.filter((module) => downloadedIds.has(module.id)).length;
  const firstQueued = modulesById[downloadQueue[0]]?.title ?? '';
  const failedModule = downloadFailed ? modulesById[downloadFailed] : null;

  function openDownloads() {
    if (offline) setToast('Connect to the internet to download');
    else navigation.navigate('DownloadSheet', { courseId });
  }

  function toggleModule(moduleId) {
    anchor.beforeToggle(expandedId, moduleId, courseModuleIds);
    setTouched(true);
    setOpenModuleId((current) => {
      const effective = touched ? current : suggestedOpenId;
      return effective === moduleId ? null : moduleId;
    });
  }

  return (
    <View style={styles.screen}>
      <Animated.FlatList
      {...anchor.scrollProps}
      style={styles.container}
      contentContainerStyle={[
        styles.list,
        { paddingTop: top, paddingBottom: insets.bottom + spacing.xl },
      ]}
      data={courseModules}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          {/* Indented to clear the floating back button, which is not in the
              list and so does not reserve space here. */}
          <View style={[styles.tagRow, styles.tagRowWithButton]}>
            <Text style={styles.levelTag}>{levelLabel(courseIndex)}</Text>
            <Pressable
              onPress={openDownloads}
              accessibilityRole="button"
              accessibilityLabel="Download for offline"
              style={({ pressed }) => [styles.downloadButton, pressed && styles.backPressed]}
            >
              <DownloadGlyph />
            </Pressable>
          </View>

          <OfflineBanner />

          <Text style={styles.courseTitle}>{course?.title ?? courseTitle}</Text>
          {course?.description ? (
            <Text style={styles.courseBlurb}>{course.description}</Text>
          ) : null}
          <Text style={styles.courseProgress}>{stats.percent}% complete</Text>

          {/* Frame 55. The percentage counts finished modules: each one is a
              single read with no progress of its own. */}
          {downloadingHere || finished ? (
            <View style={styles.progressCard} accessibilityRole="progressbar">
              <View style={styles.progressTop}>
                <View style={styles.flex}>
                  {finished ? (
                    <>
                      <Text style={styles.progressTitle}>Saved {modulesLabel(finished.count)}</Text>
                      <Text style={styles.progressSub}>Ready to read offline · {downloadPercent}%</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.progressTitle}>Downloading {modulesLabel(downloadTotal)}</Text>
                      <Text style={styles.progressSub}>
                        {firstQueued}
                        {downloadQueue.length > 1 ? ` and ${downloadQueue.length - 1} more` : ''} ·{' '}
                        {downloadPercent}%
                      </Text>
                    </>
                  )}
                </View>
                {finished ? null : (
                  <Pressable
                    onPress={cancelDownloads}
                    style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
                  >
                    <Text style={styles.cancelLabel}>Cancel</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, fillStyle]} />
              </View>
            </View>
          ) : null}

          {failedModule && courseModuleIds.includes(failedModule.id) ? (
            <Text style={styles.downloadError}>
              Could not download {failedModule.title}. Check your connection and try again.
            </Text>
          ) : null}

          {/* Frame 58: which modules still open without a connection. */}
          {offline ? (
            <View style={styles.offlineLine}>
              <Text style={styles.offlineTick}>✓</Text>
              <Text style={styles.offlineText}>
                {savedHere
                  ? `${modulesLabel(savedHere)} ${savedHere === 1 ? 'still opens' : 'still open'}. The rest need internet.`
                  : 'Nothing in this course is saved on this phone. Lessons need internet until you download them.'}
              </Text>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        const moduleLessons = (lessonsByModule[item.id] ?? []).sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        const moduleStats = moduleProgress[item.id] ?? { completed: 0, total: 0 };
        const expanded = expandedId === item.id;

        return (
          <View style={styles.card}>
            <Pressable
              onPress={() => toggleModule(item.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${item.title}, ${expanded ? 'collapse' : 'expand'}`}
              style={({ pressed }) => [styles.cardHead, pressed && styles.cardHeadPressed]}
            >
              <View style={styles.cardHeadText}>
                <Text style={styles.moduleLabel}>Module {item.order}</Text>
                <Text style={styles.moduleTitle}>{item.title}</Text>
                {item.description ? (
                  <Text style={styles.moduleSummary}>{item.description}</Text>
                ) : null}
                {downloadedIds.has(item.id) ? (
                  <Text style={styles.savedLine}>✓ Saved offline</Text>
                ) : downloadQueue.includes(item.id) ? (
                  <Text style={styles.statusLine}>Downloading…</Text>
                ) : offline ? (
                  <Text style={styles.statusLine}>Needs internet</Text>
                ) : null}
              </View>
              <View style={styles.cardHeadRight}>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>
                    {moduleStats.completed}/{moduleStats.total}
                  </Text>
                </View>
                {/* One chevron, turned: down when closed, up when open. A
                    rotated glyph keeps the two states visually identical apart
                    from direction, which two different characters would not. */}
                <Chevron open={expanded} />
              </View>
            </Pressable>

            <Collapsible open={expanded} onHeight={anchor.onHeight(item.id)}>
              {moduleLessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  done={isLessonComplete(lesson.id)}
                  onPress={() =>
                    navigation.navigate('LessonDetail', {
                      lessonId: lesson.id,
                      lessonTitle: lesson.title,
                    })
                  }
                />
              ))}

              <Pressable
                onPress={() =>
                  navigation.navigate('Quiz', { moduleId: item.id, title: item.title })
                }
                style={({ pressed }) => [styles.quizRow, pressed && styles.quizRowPressed]}
              >
                <Text style={styles.quizLabel}>Module quiz</Text>
                <Text style={styles.quizNote}>{scoreNote(moduleScores[item.id])}</Text>
              </Pressable>
            </Collapsible>
          </View>
        );
      }}
      />

      {/* Outside the list so it stays put while the modules scroll past. */}
      <BackButton top={top} onPress={() => navigation.goBack()} />
      <AuthToast message={toast} onHide={() => setToast('')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: 20,
    gap: 14,
  },
  header: {
    marginBottom: 6,
  },
  tagRow: {
    // Clears the floating back button: 40px wide at a 20px gutter, plus the
    // 12px gap the design puts between them.
    marginLeft: 52,
    minHeight: 40,
    justifyContent: 'center',
    marginBottom: 18,
  },
  back: {
    position: 'absolute',
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    // Above the module cards that scroll underneath it.
    zIndex: 2,
    elevation: 2,
  },
  backPressed: {
    backgroundColor: colors.primarySoft,
  },
  backGlyph: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.text,
  },
  levelTag: {
    flexShrink: 1,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  courseTitle: {
    ...type.screenTitle,
    color: colors.text,
    marginBottom: 6,
  },
  courseBlurb: {
    ...type.body,
    color: colors.textMuted,
  },
  courseProgress: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    letterSpacing: 11.5 * 0.06,
    textTransform: 'uppercase',
    color: colors.primaryDark,
    marginTop: 12,
  },
  card: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cardHeadPressed: {
    backgroundColor: colors.primarySoft,
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
  },
  cardHeadRight: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  moduleLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  moduleTitle: {
    fontFamily: fonts.bold,
    fontSize: 16.5,
    lineHeight: 16.5 * 1.3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  moduleSummary: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.textMuted,
    marginTop: 5,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  tagRowWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    gap: 10,
    marginTop: 18,
    paddingTop: 12,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: colors.text,
  },
  progressSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.35,
    color: colors.textMuted,
    marginTop: 4,
  },
  cancel: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    justifyContent: 'center',
  },
  cancelPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  cancelLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  progressTrack: {
    height: 6,
    marginRight: 8,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  downloadError: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.error,
    marginTop: 12,
  },
  offlineLine: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  offlineTick: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  offlineText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.textMuted,
  },
  savedLine: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.primaryDark,
    marginTop: 10,
  },
  statusLine: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 10,
  },
  skelTag: {
    height: 11,
    width: '38%',
    borderRadius: 5,
  },
  skelTitle: {
    height: 26,
    width: '52%',
    borderRadius: 8,
    marginBottom: 10,
  },
  skelBlurb: {
    height: 13,
    width: '88%',
    borderRadius: 6,
  },
  skelProgress: {
    height: 11,
    width: '28%',
    borderRadius: 5,
    marginTop: 8,
    marginBottom: 8,
  },
  skelCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skelLines: {
    flex: 1,
    gap: 9,
  },
  skelLabel: {
    height: 9,
    width: '26%',
    borderRadius: 4,
  },
  skelName: {
    height: 16,
    width: '66%',
    borderRadius: 6,
  },
  skelSummary: {
    height: 11,
    width: '88%',
    borderRadius: 5,
  },
  skelBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
  },
  countBadge: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.primaryDark,
  },
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  quizRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  quizLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    letterSpacing: 11.5 * 0.07,
    textTransform: 'uppercase',
    color: colors.text,
  },
  quizNote: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
});
