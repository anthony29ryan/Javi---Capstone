import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import Button from '../components/Button';
import FloatingBackButton from '../components/FloatingBackButton';
import LessonRow from '../components/LessonRow';
import Mascot from '../components/Mascot';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';
import { Stat } from './ChallengeSolvedScreen';

/**
 * Shown in place of the lesson once "Mark lesson complete" saves (frame 28).
 * Only the id comes in; everything else is read from progress, which the save
 * has already updated, so the counts and streak include this lesson.
 */
export default function LessonCompleteScreen({ route, navigation }) {
  const { lessonId } = route.params;
  const { lessons, modules, courses, moduleProgress, isLessonComplete, streak } = useProgress();
  const insets = useSafeAreaInsets();

  const lesson = lessons.find((item) => item.id === lessonId);
  const module = modules.find((item) => item.id === lesson?.moduleId);
  const course = courses.find((item) => item.id === module?.courseId);
  const stats = moduleProgress[module?.id] ?? { completed: 0, total: 0 };

  // The same "next" as the lesson's own Next button: the one after it in order.
  const siblings = lessons
    .filter((item) => item.moduleId === lesson?.moduleId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const index = siblings.findIndex((item) => item.id === lessonId);
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  const openNext = () => navigation.replace('LessonDetail', { lessonId: next.id, lessonTitle: next.title });
  // navigate (not goBack) so it lands on the module even when the lesson was opened from Home.
  const backToModule = () =>
    course
      ? navigation.navigate('Modules', { courseId: course.id, courseTitle: course.title })
      : navigation.goBack();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.backSpace} />

        <View style={styles.hero}>
          <Text style={styles.heroCrumb}>
            {[course?.title, module?.title].filter(Boolean).join(' · ')}
          </Text>
          <Mascot variant="celebrate" px={120} />
          <Text style={styles.heroTitle}>Lesson complete</Text>
          <Text style={styles.heroSubtitle}>{lesson?.title}</Text>
        </View>

        <View style={styles.stats}>
          <Stat label="This module" value={`${stats.completed} of ${stats.total}`} />
          <Stat
            label="Streak ›"
            value={`${streak.current} day${streak.current === 1 ? '' : 's'}`}
            onPress={() => navigation.navigate('Streak')}
          />
        </View>

        {next ? (
          <View>
            <Text style={styles.label}>Up next</Text>
            <View style={styles.nextCard}>
              <View style={styles.hideRowTopBorder}>
                <LessonRow lesson={next} done={isLessonComplete(next.id)} onPress={openNext} />
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button label={next ? 'Start next lesson' : 'Back to module'} onPress={next ? openNext : backToModule} />
          {next ? <Button label="Back to module" variant="secondary" onPress={backToModule} /> : null}
        </View>
      </ScrollView>
      <FloatingBackButton onPress={() => navigation.goBack()} />
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
    paddingHorizontal: spacing.xl,
    gap: 18,
  },
  // Where the floating back button sits.
  backSpace: {
    width: 40,
    height: 40,
  },
  // The deeper terracotta rather than the design's lighter accent: white text
  // on the lighter one is under 3:1, on this one it is over 5:1.
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.button,
  },
  heroCrumb: {
    ...type.sectionLabel,
    fontSize: 12,
    letterSpacing: 12 * 0.12,
    color: colors.white,
    textAlign: 'center',
  },
  heroTitle: {
    ...type.screenTitle,
    fontSize: 27,
    lineHeight: 27 * 1.25,
    color: colors.white,
    marginTop: spacing.sm,
  },
  heroSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.white,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  label: {
    ...type.sectionLabel,
    fontSize: 12,
    letterSpacing: 12 * 0.12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  nextCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  // LessonRow draws a top border for use inside a list; shifting it up 1px lets the card's clip hide it.
  hideRowTopBorder: {
    marginTop: -1,
  },
  actions: {
    gap: 10,
  },
});
