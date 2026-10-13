import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenState from '../components/ScreenState';
import { levelLabel, levelTheme } from '../constants/levels';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

function LevelCard({ course, index, moduleCount, stats, onPress }) {
  const theme = levelTheme(index);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.background },
        theme.elevated && styles.cardElevated,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.eyebrow, { color: theme.eyebrowInk }]}>{levelLabel(index)}</Text>
        <Text style={[styles.percent, { color: theme.subtleInk }]}>{stats.percent}%</Text>
      </View>

      <Text style={[styles.title, { color: theme.ink }]}>{course.title}</Text>
      {course.description ? (
        <Text style={[styles.description, { color: theme.subtleInk }]}>{course.description}</Text>
      ) : null}

      <Text style={[styles.meta, { color: theme.subtleInk }]}>
        {moduleCount} module{moduleCount === 1 ? '' : 's'} · {stats.total} lesson
        {stats.total === 1 ? '' : 's'}
      </Text>
    </Pressable>
  );
}

export default function CoursesScreen({ navigation }) {
  const { courses, modules, courseProgress, loading, error } = useProgress();
  // This is a tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (courses.length === 0) {
    return <ScreenState message="No courses yet." hint="Content has not been published." />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.lg }]}
      data={courses}
      keyExtractor={(item) => item.id}
      // The handoff dropped this screen's subheading and enlarged the title;
      // the paragraph that used to sit here is gone deliberately.
      ListHeaderComponent={<Text style={styles.pageTitle}>Courses</Text>}
      renderItem={({ item, index }) => (
        <LevelCard
          course={item}
          index={index}
          moduleCount={modules.filter((module) => module.courseId === item.id).length}
          stats={courseProgress[item.id] ?? { completed: 0, total: 0, percent: 0 }}
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
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: 20,
    paddingBottom: spacing.xl,
    gap: 14,
  },
  pageTitle: {
    ...type.pageTitle,
    color: colors.text,
    marginBottom: 18,
  },
  card: {
    padding: 20,
    borderRadius: radius.xl,
  },
  cardElevated: {
    shadowColor: '#2E3141',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...type.sectionLabel,
    letterSpacing: 1.4,
  },
  percent: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 22 * 1.2,
    marginTop: 12,
    marginBottom: 6,
  },
  description: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    maxWidth: 250,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    letterSpacing: 11.5 * 0.06,
    textTransform: 'uppercase',
    marginTop: 14,
  },
});
