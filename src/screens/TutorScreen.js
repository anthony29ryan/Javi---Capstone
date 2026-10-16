import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import Collapsible, { Chevron, useKeepInPlace } from '../components/Collapsible';
import Mascot from '../components/Mascot';
import PopIn from '../components/PopIn';
import ScreenState from '../components/ScreenState';
import TutorChat from '../components/TutorChat';
import { levelLabel } from '../constants/levels';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';


/**
 * The Java tutor tab. The tutor only answers on one module at a time, so the
 * tab first asks which one, then shows that module's saved conversation: the
 * same thread as the tutor box at the bottom of the module's lessons.
 *
 * The picked module lives in this screen's state. Tab screens stay mounted, so
 * it is kept while switching tabs and asked again only after the app restarts.
 */
export default function TutorScreen({ route }) {
  // Tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();
  const { courses, modules, lessons, lastLessonId, loading, error, refresh } = useProgress();
  const [moduleId, setModuleId] = useState(null);
  // null until the learner taps a tier; until then the tier they are studying is open.
  const [openCourseId, setOpenCourseId] = useState(null);
  const anchor = useKeepInPlace();

  // A lesson's "See the whole chat in Javi" opens this module. openedAt makes
  // a second visit work even after Change cleared it.
  useEffect(() => {
    if (route.params?.moduleId) setModuleId(route.params.moduleId);
  }, [route.params?.moduleId, route.params?.openedAt]);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;
  if (modules.length === 0) {
    return <ScreenState message="No modules yet." hint="Content has not been published." />;
  }

  const module = modules.find((item) => item.id === moduleId);

  if (module) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, styles.chat, { paddingTop: insets.top + spacing.lg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TutorChat
          moduleId={module.id}
          topic={module.title}
          shownMessages={Infinity}
          emptyState
          header={
            <PopIn index={0} style={styles.chatHead}>
              <View style={styles.chatAvatar}>
                <Mascot variant="thinking" px={40} decorative animate={false} style={styles.chatAvatarImage} />
              </View>
              <View style={styles.chatHeadText}>
                <Text style={styles.chatTitle}>Javi</Text>
                <Text style={styles.chatSubtitle} numberOfLines={1}>
                  Answers on {module.title}
                </Text>
              </View>
              <Text
                style={styles.change}
                suppressHighlighting
                accessibilityRole="button"
                onPress={() => setModuleId(null)}
              >
                Change
              </Text>
            </PopIn>
          }
        />
      </KeyboardAvoidingView>
    );
  }

  const lastModuleId = lessons.find((lesson) => lesson.id === lastLessonId)?.moduleId;
  const studyingCourseId =
    modules.find((item) => item.id === lastModuleId)?.courseId ?? courses[0]?.id;
  const expandedCourseId = openCourseId ?? studyingCourseId;

  function toggleCourse(courseId) {
    anchor.beforeToggle(
      expandedCourseId,
      courseId,
      courses.map((course) => course.id)
    );
    setOpenCourseId(expandedCourseId === courseId ? '' : courseId);
  }

  return (
    <Animated.ScrollView
      {...anchor.scrollProps}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <PopIn index={0}>
        <Text style={styles.title}>Ask Javi</Text>
      </PopIn>
      <PopIn index={1} style={styles.intro}>
        <Mascot variant="greeting" px={48} decorative animate={false} />
        <Text style={styles.introText}>
          Which module do you want help with? Javi answers on that module's lessons only.
        </Text>
      </PopIn>

      {courses.map((course, courseIndex) => {
        const expanded = expandedCourseId === course.id;
        return (
          <PopIn key={course.id} index={2 + courseIndex} style={styles.card}>
            <Pressable
              onPress={() => toggleCourse(course.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${course.title}, ${expanded ? 'collapse' : 'expand'}`}
              style={({ pressed }) => [styles.cardHead, pressed && styles.rowPressed]}
            >
              <View style={styles.cardHeadText}>
                <Text style={styles.levelLabel}>{levelLabel(courseIndex)}</Text>
                <Text style={styles.courseTitle}>{course.title}</Text>
              </View>
              <Chevron open={expanded} />
            </Pressable>

            <Collapsible open={expanded} onHeight={anchor.onHeight(course.id)}>
              {modules
                .filter((item) => item.courseId === course.id)
                .map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setModuleId(item.id)}
                    style={({ pressed }) => [styles.moduleRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.dot}>
                      <Text style={styles.dotMark}>{item.order}</Text>
                    </View>
                    <Text style={styles.moduleTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowChevron}>›</Text>
                  </Pressable>
                ))}
            </Collapsible>
          </PopIn>
        );
      })}
    </Animated.ScrollView>
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
    gap: spacing.md,
  },
  chat: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: 20,
    paddingBottom: spacing.lg,
  },
  title: {
    ...type.pageTitle,
    color: colors.text,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.sm,
  },
  introText: {
    ...type.body,
    flex: 1,
    color: colors.textMuted,
  },
  // Card, head and chevron match ModulesScreen's accordion.
  card: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
  },
  levelLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  courseTitle: {
    ...type.cardTitle,
    color: colors.text,
    marginTop: spacing.xs,
  },
  rowPressed: {
    backgroundColor: colors.primarySoft,
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dotMark: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.borderStrong,
  },
  moduleTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.semiBold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.35,
    color: colors.text,
  },
  rowChevron: {
    fontSize: 16,
    color: colors.borderStrong,
  },
  chatHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chatAvatarImage: {
    marginBottom: -2,
  },
  chatHeadText: {
    flex: 1,
    minWidth: 0,
  },
  chatTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 16 * 1.2,
    color: colors.text,
  },
  chatSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.2,
    color: colors.borderStrong,
    marginTop: 3,
  },
  change: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 11 * 0.08,
    textTransform: 'uppercase',
    color: colors.primaryDark,
    padding: spacing.sm,
  },
});
