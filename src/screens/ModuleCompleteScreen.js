import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import Button from '../components/Button';
import FloatingBackButton from '../components/FloatingBackButton';
import LessonRow from '../components/LessonRow';
import Mascot from '../components/Mascot';
import { useProgress } from '../context/ProgressContext';
import { authColors } from '../theme/authTheme';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

/**
 * Shown in place of the lesson when finishing it completes the module, i.e.
 * every lesson in it is done (frame 29). The quiz is suggested, not required.
 */
export default function ModuleCompleteScreen({ route, navigation }) {
  const { moduleId } = route.params;
  const { lessons, modules, courses, isLessonComplete } = useProgress();
  const insets = useSafeAreaInsets();

  const module = modules.find((item) => item.id === moduleId);
  const course = courses.find((item) => item.id === module?.courseId);
  const moduleLessons = lessons
    .filter((item) => item.moduleId === moduleId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const moduleTitle = module?.title ?? 'this module';

  const crumb = [
    course?.title,
    `${moduleLessons.length} lesson${moduleLessons.length === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');

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
          <Text style={styles.heroCrumb}>{crumb}</Text>
          <Mascot variant="proud" px={128} />
          <Text style={styles.heroTitle}>Module complete</Text>
          <Text style={styles.heroSubtitle}>{moduleTitle}</Text>
        </View>

        <View>
          <Text style={styles.label}>What you finished</Text>
          <View style={styles.listCard}>
            {/* Shifted up 1px so the card's clip hides the first row's top border. */}
            <View style={styles.hideFirstBorder}>
              {moduleLessons.map((lesson) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  done={isLessonComplete(lesson.id)}
                  onPress={() =>
                    navigation.navigate('LessonDetail', { lessonId: lesson.id, lessonTitle: lesson.title })
                  }
                />
              ))}
            </View>
          </View>
        </View>

        {/* The design adds "Your best score counts"; only the latest attempt is saved, so it is left out. */}
        <View style={styles.quizCard}>
          <Text style={styles.quizLabel}>Lock it in</Text>
          <Text style={styles.quizText}>A short quiz on {moduleTitle} shows what stuck.</Text>
        </View>

        <View style={styles.actions}>
          {module ? (
            <Button
              label={`Take the ${module.title} quiz`}
              onPress={() => navigation.replace('Quiz', { moduleId: module.id, title: module.title })}
            />
          ) : null}
          <Button
            label="Back to courses"
            variant="secondary"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Courses' })}
          />
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
  // A fixed near-black in the design, the same as the toast.
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: authColors.toastBg,
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
  label: {
    ...type.sectionLabel,
    fontSize: 12,
    letterSpacing: 12 * 0.12,
    color: colors.textMuted,
    marginBottom: 10,
  },
  listCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  hideFirstBorder: {
    marginTop: -1,
  },
  quizCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  quizLabel: {
    ...type.sectionLabel,
    fontSize: 12,
    letterSpacing: 12 * 0.12,
    // Not primaryDark: on primarySoft that is 4.45:1, just under the 4.5 small text needs.
    color: colors.text,
  },
  quizText: {
    ...type.body,
    color: colors.text,
  },
  actions: {
    gap: 10,
  },
});
