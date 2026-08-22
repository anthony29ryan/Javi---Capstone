import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import ProgressRing from '../components/ProgressRing';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { colors, radius, spacing, type } from '../theme/colors';

function CourseCard({ course, stats, onPress }) {
  const { completed = 0, total = 0, percent = 0 } = stats ?? {};

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <ProgressRing percent={percent} size={48} strokeWidth={4}>
        <Text style={styles.ringText}>{percent}%</Text>
      </ProgressRing>

      <View style={styles.body}>
        <Text style={styles.title}>{course.title}</Text>
        {course.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {course.description}
          </Text>
        ) : null}
        <Text style={styles.meta}>
          {completed} of {total} lessons done
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export default function CoursesScreen({ navigation }) {
  const { courses, courseProgress, loading, error } = useProgress();

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (courses.length === 0) {
    return <ScreenState message="No courses yet." hint="Content has not been published." />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={courses}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={styles.headerText}>
          Each tier builds on the one before it. Start at Beginner if you are new to Java.
        </Text>
      }
      renderItem={({ item }) => (
        <CourseCard
          course={item}
          stats={courseProgress[item.id]}
          onPress={() =>
            navigation.navigate('Modules', { courseId: item.id, courseTitle: item.title })
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    ...type.small,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  ringText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...type.cardTitle,
    color: colors.text,
  },
  description: {
    ...type.small,
    color: colors.textMuted,
    lineHeight: 19,
  },
  meta: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  chevron: {
    fontSize: 26,
    color: colors.borderStrong,
    marginTop: -3,
  },
});
