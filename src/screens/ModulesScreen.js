import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

import LessonRow from '../components/LessonRow';
import OfflineBanner from '../components/OfflineBanner';
import ScreenState from '../components/ScreenState';
import { levelLabel } from '../constants/levels';
import { scorePercent, useProgress } from '../context/ProgressContext';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

// Old-architecture Android needs this switched on before LayoutAnimation does
// anything. It is a no-op (and the method is absent) under the new renderer,
// hence the guard rather than a bare call.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function scoreNote(score) {
  if (!score || !score.total) return 'Not taken';
  return `Last ${scorePercent(score)}%`;
}

/** Download / downloading / downloaded toggle for one module's offline copy. */
function DownloadButton({ downloaded, busy, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={downloaded ? 'Remove download' : 'Download module'}
      style={({ pressed }) => [styles.download, pressed && styles.downloadPressed]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.primaryDark} />
      ) : (
        <Ionicons
          name={downloaded ? 'checkmark-circle' : 'cloud-download-outline'}
          size={22}
          color={downloaded ? colors.success : colors.borderStrong}
        />
      )}
    </Pressable>
  );
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
    downloadedIds,
    downloadModule,
    removeDownload,
  } = useProgress();

  // null until the first render with data, then the id of whichever module the
  // learner is partway through. Kept as "which one is open" rather than a set
  // of open ids so the list cannot end up fully expanded again, which is the
  // thing that made it unwieldy.
  const [openModuleId, setOpenModuleId] = useState(null);
  const [touched, setTouched] = useState(false);
  const [busyModuleId, setBusyModuleId] = useState(null);
  const [downloadErrors, setDownloadErrors] = useState({});

  if (loading) return <ScreenState loading />;
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

  async function toggleDownload(moduleId) {
    setBusyModuleId(moduleId);
    setDownloadErrors((current) => ({ ...current, [moduleId]: '' }));
    const removing = downloadedIds.has(moduleId);
    try {
      if (removing) await removeDownload(moduleId);
      else await downloadModule(moduleId);
    } catch {
      setDownloadErrors((current) => ({
        ...current,
        [moduleId]: removing
          ? 'Could not remove the download. Try again.'
          : 'Could not download. Check your connection and try again.',
      }));
    } finally {
      setBusyModuleId(null);
    }
  }

  function toggleModule(moduleId) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTouched(true);
    setOpenModuleId((current) => {
      const effective = touched ? current : suggestedOpenId;
      return effective === moduleId ? null : moduleId;
    });
  }

  return (
    <View style={styles.screen}>
      <FlatList
      style={styles.container}
      contentContainerStyle={[
        styles.list,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      data={courseModules}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          {/* Indented to clear the floating back button, which is not in the
              list and so does not reserve space here. */}
          <View style={styles.tagRow}>
            <Text style={styles.levelTag}>{levelLabel(courseIndex)}</Text>
          </View>

          <OfflineBanner />

          <Text style={styles.courseTitle}>{course?.title ?? courseTitle}</Text>
          {course?.description ? (
            <Text style={styles.courseBlurb}>{course.description}</Text>
          ) : null}
          <Text style={styles.courseProgress}>{stats.percent}% complete</Text>
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
            {/* The download button sits beside the head, not inside it: a
                labelled Pressable hides its children from screen readers. */}
            <View style={styles.cardHeadRow}>
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
                  <Text style={[styles.chevron, expanded && styles.chevronOpen]}>›</Text>
                </View>
              </Pressable>
              <DownloadButton
                downloaded={downloadedIds.has(item.id)}
                busy={busyModuleId === item.id}
                onPress={() => toggleDownload(item.id)}
              />
            </View>

            {downloadErrors[item.id] ? (
              <Text style={styles.downloadError}>{downloadErrors[item.id]}</Text>
            ) : null}

            {expanded ? (
              <>
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
              </>
            ) : null}
          </View>
        );
      }}
      />

      {/* Outside the list so it stays put while the modules scroll past. */}
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [
          styles.back,
          { top: insets.top + spacing.lg },
          pressed && styles.backPressed,
        ]}
      >
        <Text style={styles.backGlyph}>←</Text>
      </Pressable>
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
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    textTransform: 'uppercase',
    color: colors.borderStrong,
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
  cardHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardHead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
  chevron: {
    fontFamily: fonts.mono,
    fontSize: 16,
    lineHeight: 16,
    color: colors.borderStrong,
    transform: [{ rotate: '90deg' }],
  },
  chevronOpen: {
    color: colors.primaryDark,
    transform: [{ rotate: '-90deg' }],
  },
  moduleLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
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
  download: {
    width: 44,
    height: 44,
    marginTop: spacing.lg,
    marginRight: spacing.sm,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadPressed: {
    backgroundColor: colors.primarySoft,
  },
  downloadError: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.error,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  countBadge: {
    width: 44,
    height: 44,
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
