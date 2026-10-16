import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import AuthToast from '../components/auth/AuthToast';
import LessonBlocks from '../components/LessonBlocks';
import Mascot from '../components/Mascot';
import ScreenState from '../components/ScreenState';
import Skeleton from '../components/Skeleton';
import { useProgress } from '../context/ProgressContext';
import { getLesson } from '../services/content';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

// How close to the bottom counts as having read to the end.
const END_SLACK = 24;

// Floats above the content so it stays put; lessons are long, and without
// this, getting back to the module means scrolling all the way up first.
function BackButton({ top, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.back, { top }, pressed && styles.backPressed]}
    >
      <Text style={styles.backGlyph}>←</Text>
    </Pressable>
  );
}

// Indented to clear the floating back button, which reserves no space.
function Crumb({ crumb, position }) {
  return (
    <View style={styles.crumbText}>
      <Text style={styles.crumb} numberOfLines={1}>
        {crumb}
      </Text>
      {position ? <Text style={styles.position}>{position}</Text> : null}
    </View>
  );
}

/** Frame 64. */
function LessonSkeleton({ top, onBack }) {
  return (
    <View style={styles.screen}>
      <View style={[styles.content, { paddingTop: top }]}>
        <View style={[styles.crumbText, styles.skelCrumb]}>
          <Skeleton style={styles.skelCrumbTop} />
          <Skeleton style={styles.skelCrumbBottom} />
        </View>
        <View style={styles.skelTitleBlock}>
          <Skeleton style={[styles.skelTitle, { width: '90%' }]} />
          <Skeleton style={[styles.skelTitle, { width: '55%' }]} />
          <Skeleton style={styles.skelMeta} />
        </View>
        <View style={styles.skelLines}>
          {['100%', '96%', '88%', '64%'].map((width) => (
            <Skeleton key={width} style={[styles.skelLine, { width }]} />
          ))}
        </View>
        <Skeleton style={styles.skelCode} />
        <Skeleton style={styles.skelCard} />
      </View>
      <BackButton top={top} onPress={onBack} />
    </View>
  );
}

/**
 * Frames 71 and 97. Offline means the lesson's module was never downloaded;
 * online, the server failed, and Firebase's own error code is shown rather
 * than the design's made-up reference.
 */
function LessonError({ top, bottom, crumb, position, title, offline, code, onRetry, onBackToModule, onBack }) {
  return (
    <View style={styles.screen}>
      <View style={[styles.content, styles.errorPage, { paddingTop: top, paddingBottom: bottom + spacing.xl }]}>
        <Crumb crumb={crumb} position={position} />
        <View style={styles.errorCentre}>
          <Mascot variant={offline ? 'sleepy' : 'confused'} px={120} decorative animate={false} />
          <Text style={styles.errorTitle}>
            {offline ? 'This lesson is not on your phone yet' : 'Something went wrong on our side'}
          </Text>
          <Text style={styles.errorBody}>
            {offline
              ? `Only downloaded modules can be read offline. Connect to the internet to load ${title}.`
              : `Javi could not load “${title}”. Your progress is safe. Try again in a minute.`}
          </Text>
          {!offline && code ? <Text style={styles.errorCode}>Error · {code}</Text> : null}
        </View>
        <AuthButton label="Try again" onPress={onRetry} />
        <AuthButton
          label="Back to module"
          variant="secondary"
          onPress={onBackToModule}
          style={styles.errorBack}
        />
      </View>
      <BackButton top={top} onPress={onBack} />
    </View>
  );
}

export default function LessonDetailScreen({ route, navigation }) {
  const { lessonId, lessonTitle } = route.params;
  const insets = useSafeAreaInsets();
  const {
    lessons,
    modules,
    courses,
    moduleProgress,
    isLessonComplete,
    markLessonOpened,
    markLessonComplete,
    offline,
  } = useProgress();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  // { code } when the lesson failed to load.
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  // The complete button unlocks once the learner has scrolled to the end.
  const [reachedEnd, setReachedEnd] = useState(false);
  const sizes = useRef({ view: 0, content: 0 });

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    getLesson(lessonId)
      .then(setLesson)
      .catch((err) => setLoadError({ code: err?.code ?? '' }))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(load, [load]);

  // Opening a lesson is what "Continue learning" resumes to, whether or not
  // it ends up being marked complete.
  useEffect(() => {
    markLessonOpened(lessonId);
  }, [lessonId, markLessonOpened]);

  // The lesson summary from context, so the crumb shows while loading or failed.
  const summary = lessons.find((item) => item.id === lessonId);
  const moduleId = lesson?.moduleId ?? summary?.moduleId;
  const module = modules.find((item) => item.id === moduleId);
  const course = courses.find((item) => item.id === module?.courseId);
  const stats = moduleProgress[moduleId] ?? { completed: 0, total: 0 };
  const crumb = [course?.title, module?.title].filter(Boolean).join(' · ');

  // Siblings in reading order, so "Lesson 3 of 5" and the prev/next pair agree
  // with the order the module list presents.
  const siblings = lessons
    .filter((item) => item.moduleId === moduleId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const index = siblings.findIndex((item) => item.id === lessonId);
  const previous = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  const position = index >= 0 ? `Lesson ${index + 1} of ${siblings.length} · ${stats.completed} done` : '';

  const top = insets.top + spacing.lg;
  const goBack = () => navigation.goBack();

  if (loading) return <LessonSkeleton top={top} onBack={goBack} />;
  if (loadError) {
    return (
      <LessonError
        top={top}
        bottom={insets.bottom}
        crumb={crumb}
        position={position}
        title={summary?.title ?? lessonTitle ?? 'this lesson'}
        offline={offline}
        code={loadError.code}
        onRetry={load}
        onBackToModule={() =>
          course
            ? navigation.navigate('Modules', { courseId: course.id, courseTitle: course.title })
            : goBack()
        }
        onBack={goBack}
      />
    );
  }
  if (!lesson) return <ScreenState message="Lesson not found." />;

  const done = isLessonComplete(lesson.id);
  const locked = !done && !reachedEnd;

  // A lesson short enough to fit on screen has nothing to scroll to.
  function checkFits() {
    const { view, content } = sizes.current;
    if (view && content && content <= view + END_SLACK) setReachedEnd(true);
  }

  function onScroll({ nativeEvent: { layoutMeasurement, contentOffset, contentSize } }) {
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - END_SLACK) {
      setReachedEnd(true);
    }
  }

  async function toggleComplete() {
    setSaving(true);
    try {
      await markLessonComplete(lesson.id, !done);
    } catch {
      setToast('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function goToLesson(target) {
    navigation.replace('LessonDetail', { lessonId: target.id, lessonTitle: target.title });
  }

  const completeLabel = offline
    ? 'Connect to save progress'
    : done
      ? 'Completed · undo'
      : locked
        ? 'Read to the end to finish'
        : 'Mark lesson complete';
  // Saving reads progress first, which fails offline; disabled says so up front.
  const completeDisabled = saving || offline || locked;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: top, paddingBottom: insets.bottom + BAR_HEIGHT + spacing.xl },
        ]}
        onScroll={onScroll}
        // A fast fling can stop between scroll events, so the resting place is checked too.
        onMomentumScrollEnd={onScroll}
        onScrollEndDrag={onScroll}
        scrollEventThrottle={16}
        onLayout={(event) => {
          sizes.current.view = event.nativeEvent.layout.height;
          checkFits();
        }}
        onContentSizeChange={(width, height) => {
          sizes.current.content = height;
          checkFits();
        }}
      >
        <Crumb crumb={crumb} position={position} />

        <Text style={styles.title}>{lesson.title}</Text>
        <Text style={styles.meta}>
          {summary?.minutes ?? 1} min read{course ? ` · ${course.title}` : ''}
        </Text>

        <View style={styles.body}>
          <LessonBlocks
            blocks={lesson.blocks}
            codeLabel={module ? `Example · ${module.title}` : 'Example'}
          />
        </View>

        <View style={styles.pager}>
          <Pressable
            onPress={() => previous && goToLesson(previous)}
            disabled={!previous}
            style={({ pressed }) => [
              styles.pagerButton,
              !previous && styles.pagerButtonOff,
              pressed && previous && styles.pagerButtonPressed,
            ]}
          >
            <Text style={[styles.pagerLabel, !previous && styles.pagerLabelOff]}>← Previous</Text>
          </Pressable>
          <Pressable
            onPress={() => next && goToLesson(next)}
            disabled={!next}
            style={({ pressed }) => [
              styles.pagerButton,
              !next && styles.pagerButtonOff,
              pressed && next && styles.pagerButtonPressed,
            ]}
          >
            <Text style={[styles.pagerLabel, !next && styles.pagerLabelOff]}>Next →</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Frame 26's pinned bar: Javi and the complete button, with nothing behind them. */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <Pressable
          onPress={() =>
            navigation.navigate('AskJaviSheet', {
              moduleId: lesson.moduleId,
              moduleTitle: module?.title ?? 'this module',
              topic: lesson.title,
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Ask Javi about this lesson"
          style={({ pressed }) => [styles.javi, pressed && styles.javiPressed]}
        >
          <View style={styles.javiFace}>
            <Mascot variant="thinking" px={40} decorative animate={false} />
          </View>
        </Pressable>
        <Pressable
          onPress={toggleComplete}
          disabled={completeDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: completeDisabled }}
          style={({ pressed }) => [
            styles.complete,
            locked && styles.completeLocked,
            done && styles.completeDone,
            offline && styles.completeOffline,
            pressed && styles.completePressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator
              color={done ? colors.primaryDark : colors.white}
              accessibilityLabel="Saving"
            />
          ) : (
            <Text
              style={[
                styles.completeLabel,
                locked && styles.completeLabelLocked,
                done && styles.completeLabelDone,
              ]}
            >
              {completeLabel}
            </Text>
          )}
        </Pressable>
      </View>

      <BackButton top={top} onPress={goBack} />
      <AuthToast message={toast} onHide={() => setToast('')} />
    </View>
  );
}

const BAR_HEIGHT = 54 + 24;

const styles = StyleSheet.create({
  screen: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    // Above the lesson content that scrolls underneath it.
    zIndex: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  backPressed: {
    backgroundColor: colors.primarySoft,
  },
  backGlyph: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.text,
  },
  crumbText: {
    // Clears the floating back button: 40px wide at a 20px gutter, plus the
    // 12px gap the design puts between them.
    marginLeft: 52,
    minHeight: 40,
    justifyContent: 'center',
  },
  crumb: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  position: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 5,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 26 * 1.25,
    letterSpacing: -0.52,
    color: colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.08,
    textTransform: 'uppercase',
    color: colors.borderStrong,
  },
  body: {
    marginTop: 18,
  },
  pager: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  pagerButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerButtonOff: {
    opacity: 0.4,
  },
  pagerButtonPressed: {
    borderColor: colors.primary,
  },
  pagerLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 12 * 0.06,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  pagerLabelOff: {
    color: colors.borderStrong,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  javi: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
  javiPressed: {
    borderColor: colors.primary,
  },
  javiFace: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  complete: {
    flex: 1,
    minWidth: 0,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.button,
    borderWidth: 1,
    borderColor: colors.button,
  },
  completeLocked: {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.surfaceSunken,
  },
  completeDone: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  completeOffline: {
    opacity: 0.5,
  },
  completePressed: {
    opacity: 0.85,
  },
  completeLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 13 * 0.07,
    textTransform: 'uppercase',
    color: colors.white,
  },
  completeLabelLocked: {
    color: colors.textMuted,
  },
  completeLabelDone: {
    color: colors.primaryDark,
  },
  skelCrumb: {
    gap: 7,
  },
  skelCrumbTop: {
    height: 10,
    width: '60%',
    borderRadius: 5,
  },
  skelCrumbBottom: {
    height: 12,
    width: '40%',
    borderRadius: 5,
  },
  skelTitleBlock: {
    gap: 10,
    marginTop: 22,
  },
  skelTitle: {
    height: 26,
    borderRadius: 8,
  },
  skelMeta: {
    height: 11,
    width: '38%',
    borderRadius: 5,
    marginTop: 4,
  },
  skelLines: {
    gap: 10,
    marginTop: 24,
  },
  skelLine: {
    height: 13,
    borderRadius: 6,
  },
  skelCode: {
    height: 150,
    borderRadius: 18,
    marginTop: 24,
    backgroundColor: colors.codeBg,
  },
  skelCard: {
    height: 104,
    borderRadius: 18,
    marginTop: 14,
  },
  errorPage: {
    flex: 1,
  },
  errorCentre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  errorTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 20 * 1.3,
    letterSpacing: -0.2,
    color: colors.text,
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 8,
  },
  errorBody: {
    ...type.body,
    maxWidth: 290,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorCode: {
    fontFamily: fonts.mono,
    fontSize: 11.5,
    color: colors.textMuted,
    backgroundColor: colors.surfaceSunken,
    borderRadius: 10,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  errorBack: {
    marginTop: 12,
  },
});
