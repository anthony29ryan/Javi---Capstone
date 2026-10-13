import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LessonBlocks from '../components/LessonBlocks';
import ScreenState from '../components/ScreenState';
import TutorChat from '../components/TutorChat';
import { levelLabel } from '../constants/levels';
import { useProgress } from '../context/ProgressContext';
import { getLesson } from '../services/content';
import { setLessonComplete } from '../services/progress';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

export default function LessonDetailScreen({ route, navigation }) {
  const { lessonId } = route.params;
  const insets = useSafeAreaInsets();
  const {
    lessons,
    modules,
    courses,
    moduleProgress,
    isLessonComplete,
    markLessonOpened,
    reloadProgress,
  } = useProgress();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLesson(lessonId)
      .then(setLesson)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  // Opening a lesson is what "Continue learning" resumes to, whether or not
  // it ends up being marked complete.
  useEffect(() => {
    markLessonOpened(lessonId);
  }, [lessonId, markLessonOpened]);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (!lesson) return <ScreenState message="Lesson not found." />;

  const module = modules.find((item) => item.id === lesson.moduleId);
  const courseIndex = courses.findIndex((item) => item.id === module?.courseId);
  const course = courses[courseIndex];
  const stats = moduleProgress[lesson.moduleId] ?? { completed: 0, total: 0 };

  // Siblings in reading order, so "Lesson 3 of 5" and the prev/next pair agree
  // with the order the module list presents.
  const siblings = lessons
    .filter((item) => item.moduleId === lesson.moduleId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const position = siblings.findIndex((item) => item.id === lesson.id);
  const previous = position > 0 ? siblings[position - 1] : null;
  const next = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : null;

  const summary = lessons.find((item) => item.id === lesson.id);
  const done = isLessonComplete(lesson.id);

  async function toggleComplete() {
    setSaving(true);
    try {
      await setLessonComplete(lesson.id, !done);
      await reloadProgress();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function goToLesson(target) {
    navigation.replace('LessonDetail', { lessonId: target.id, lessonTitle: target.title });
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        // So tapping Send or a suggestion works while the keyboard is open.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* Indented to clear the floating back button, which is not in the
            scroll view and so does not reserve space here. */}
        <View style={styles.crumbText}>
          <Text style={styles.crumb} numberOfLines={1}>
            {[course?.title, module?.title].filter(Boolean).join(' · ')}
          </Text>
          <Text style={styles.position}>
            Lesson {position + 1} of {siblings.length} · {stats.completed} done
          </Text>
        </View>

        <View>
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

        <TutorChat moduleId={lesson.moduleId} lessonTitle={lesson.title} />

        <Pressable
          onPress={toggleComplete}
          disabled={saving}
          style={({ pressed }) => [
            styles.complete,
            done && styles.completeDone,
            pressed && styles.completePressed,
          ]}
        >
          <Text style={[styles.completeLabel, done && styles.completeLabelDone]}>
            {done ? '✓ Completed' : 'Mark as complete'}
          </Text>
        </Pressable>

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
        </View>
      </ScrollView>

      {/* Outside the scroll view so it stays put. Lessons are long, and
          without this, getting back to the module list means scrolling all
          the way up first. */}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  complete: {
    marginTop: 22,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  completeDone: {
    backgroundColor: colors.primarySoft,
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
  completeLabelDone: {
    color: colors.primaryDark,
  },
  pager: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
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
});
