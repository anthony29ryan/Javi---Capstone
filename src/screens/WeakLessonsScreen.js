import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackButton from '../components/auth/AuthBackButton';
import Mascot from '../components/Mascot';
import { useProgress } from '../context/ProgressContext';
import { colors, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

/**
 * Every lesson in the modules the weak-topic model flagged, opened from Home's
 * "All". The topics come in from Home (already loaded there), most likely
 * weak first, so this screen makes no call of its own.
 */
export default function WeakLessonsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { lessons, modules, isLessonComplete } = useProgress();
  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));

  const sections = (route.params?.topics ?? [])
    .map((topic) => ({
      topic,
      module: modulesById[topic.topic],
      lessons: lessons
        .filter((lesson) => lesson.moduleId === topic.topic)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .filter((section) => section.module && section.lessons.length);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <AuthBackButton onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Recommended for you</Text>

      <View style={styles.intro}>
        <Mascot variant="greeting" px={48} decorative animate={false} />
        <Text style={styles.introText}>
          Javi picked these modules because your recent quiz answers there were low. Review the
          lessons, then retake the quiz.
        </Text>
      </View>

      {sections.map(({ topic, module, lessons: moduleLessons }) => (
        <View key={topic.topic} style={styles.section}>
          <Text style={styles.sectionTitle}>{module.title}</Text>
          <Text style={styles.sectionMeta}>
            {Math.round(topic.accuracy * 100)}% of recent answers right
          </Text>

          <View style={styles.rows}>
            {moduleLessons.map((lesson) => {
              const done = isLessonComplete(lesson.id);
              return (
                <Pressable
                  key={lesson.id}
                  onPress={() =>
                    navigation.navigate('LessonDetail', { lessonId: lesson.id, lessonTitle: lesson.title })
                  }
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{lesson.title}</Text>
                    <Text style={styles.rowMeta}>
                      {lesson.minutes} min{done ? ' · Done' : ''}
                    </Text>
                  </View>
                  {done ? (
                    <Ionicons name="checkmark" size={16} color={colors.success} />
                  ) : (
                    <Text style={styles.chevron}>›</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
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
  title: {
    ...type.screenTitle,
    color: colors.text,
    marginTop: 26,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  introText: {
    ...type.body,
    flex: 1,
    color: colors.textMuted,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    ...type.sectionHeading,
    color: colors.text,
  },
  sectionMeta: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    borderColor: colors.primary,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...type.rowTitle,
    color: colors.text,
  },
  rowMeta: {
    ...type.meta,
    letterSpacing: 11.5 * 0.06,
    textTransform: 'uppercase',
    color: colors.borderStrong,
    marginTop: spacing.xs,
  },
  chevron: {
    fontSize: 16,
    color: colors.borderStrong,
  },
});
