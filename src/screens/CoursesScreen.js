import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/auth/AuthButton';
import Mascot from '../components/Mascot';
import ScreenState from '../components/ScreenState';
import Skeleton from '../components/Skeleton';
import { levelLabel, levelTheme } from '../constants/levels';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const NO_STATS = { completed: 0, total: 0, percent: 0 };

/** Where the learner is in a tier, the design's left caption. */
function whereNext(courseModules, moduleProgress, completed) {
  if (completed === 0 && courseModules.length) return `Starts with ${courseModules[0].title}`;
  const current = courseModules.find((module) => {
    const stats = moduleProgress[module.id] ?? NO_STATS;
    return stats.completed < stats.total;
  });
  return current ? `Module ${current.order} · ${current.title}` : 'All modules done';
}

function LevelCard({ course, index, courseModules, moduleProgress, stats, onPress }) {
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

      {/* One segment per module, each filled to that module's progress. */}
      <View style={styles.segments}>
        {courseModules.map((module) => (
          <View key={module.id} style={[styles.segment, { backgroundColor: theme.track }]}>
            <View
              style={[
                styles.segment,
                { width: `${moduleProgress[module.id]?.percent ?? 0}%`, backgroundColor: theme.fill },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.caption}>
        <Text style={[styles.captionText, styles.captionWhere, { color: theme.subtleInk }]} numberOfLines={1}>
          {whereNext(courseModules, moduleProgress, stats.completed)}
        </Text>
        <Text style={[styles.captionText, { color: theme.subtleInk }]}>
          {stats.completed} of {stats.total} lessons
        </Text>
      </View>
    </Pressable>
  );
}

// Frame 65: three card outlines under the real title while content loads.
function CoursesSkeleton({ top }) {
  return (
    <View style={styles.container}>
      <View style={[styles.list, { paddingTop: top }]}>
        <Text style={styles.pageTitle}>Courses</Text>
        {[0, 1, 2].map((key) => (
          <View key={key} style={styles.skelCard}>
            <Skeleton style={styles.skelEyebrow} />
            <Skeleton style={styles.skelTitle} />
            <Skeleton style={styles.skelLine} />
            <View style={[styles.segments, styles.skelSegments]}>
              {[0, 1, 2, 3, 4].map((segment) => (
                <Skeleton key={segment} style={styles.segment} />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function CoursesScreen({ navigation }) {
  const { courses, modules, moduleProgress, courseProgress, loading, error, refresh } = useProgress();
  // This is a tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();
  const top = insets.top + spacing.lg;

  if (loading) return <CoursesSkeleton top={top} />;

  // Frame 70. Only reached when no copy was ever saved (a saved copy loads
  // as offline instead), so there is no saved-modules list to offer, and the
  // cause may be the server rather than the connection.
  if (error) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.list, { paddingTop: top }]}>
        <Text style={styles.pageTitle}>Courses</Text>
        <View style={styles.errorCard}>
          <Mascot variant="sleepy" px={80} decorative animate={false} style={styles.errorMascot} />
          <Text style={styles.errorTitle}>Courses did not load</Text>
          <Text style={styles.errorBody}>Check Wi-Fi or mobile data, then try again.</Text>
          <AuthButton
            label="Try again"
            variant="secondary"
            onPress={refresh}
            style={styles.retry}
            labelStyle={styles.retryLabel}
          />
        </View>
      </ScrollView>
    );
  }

  if (courses.length === 0) {
    return <ScreenState message="No courses yet." hint="Content has not been published." />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.list, { paddingTop: top }]}
      data={courses}
      keyExtractor={(item) => item.id}
      // The handoff dropped this screen's subheading and enlarged the title;
      // the paragraph that used to sit here is gone deliberately.
      ListHeaderComponent={<Text style={styles.pageTitle}>Courses</Text>}
      renderItem={({ item, index }) => (
        <LevelCard
          course={item}
          index={index}
          courseModules={modules.filter((module) => module.courseId === item.id)}
          moduleProgress={moduleProgress}
          stats={courseProgress[item.id] ?? NO_STATS}
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
    fontFamily: fonts.semiBold,
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
  segments: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 18,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  caption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  captionText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 12 * 1.3,
  },
  captionWhere: {
    flex: 1,
  },
  skelCard: {
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  skelEyebrow: {
    height: 10,
    width: '36%',
    borderRadius: 5,
  },
  skelTitle: {
    height: 22,
    width: '48%',
    borderRadius: 8,
    marginTop: 4,
  },
  skelLine: {
    height: 12,
    width: '82%',
    borderRadius: 6,
  },
  skelSegments: {
    marginTop: 10,
  },
  errorCard: {
    padding: 22,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorMascot: {
    margin: -6,
  },
  errorTitle: {
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 19 * 1.3,
    color: colors.text,
    marginTop: 18,
  },
  errorBody: {
    fontFamily: fonts.regular,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.6,
    color: colors.textMuted,
    marginTop: 8,
  },
  retry: {
    marginTop: 20,
    borderColor: colors.primary,
  },
  retryLabel: {
    color: colors.primaryDark,
  },
});
