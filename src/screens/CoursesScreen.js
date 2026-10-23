import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import Mascot from '../components/Mascot';
import ScreenState from '../components/ScreenState';
import Skeleton, { SkeletonSticker } from '../components/Skeleton';
import Sticker from '../components/Sticker';
import { levelLabel, levelTheme } from '../constants/levels';
import { useProgress } from '../context/ProgressContext';
import { authFonts } from '../theme/authTheme';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const NO_STATS = { completed: 0, total: 0, percent: 0 };

// The board's alternating tilt for the level stickers.
const TILTS = [-1, 1, -1];

function LevelCard({ course, index, courseModules, moduleProgress, stats, onPress }) {
  const theme = levelTheme(index);
  const modulesDone = courseModules.filter((module) => {
    const moduleStats = moduleProgress[module.id] ?? NO_STATS;
    return moduleStats.total > 0 && moduleStats.completed === moduleStats.total;
  }).length;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={course.title}>
      {({ pressed }) => (
        <Sticker
          background={theme.background}
          tilt={TILTS[index % TILTS.length]}
          drop={5}
          corner={24}
          pressed={pressed}
          faceStyle={styles.cardFace}
        >
          <View style={styles.cardTop}>
            <Text style={[styles.eyebrow, { color: theme.eyebrowInk }]}>{levelLabel(index)}</Text>
            <View style={[styles.chip, { backgroundColor: theme.chipBackground }]}>
              <Text style={[styles.chipLabel, { color: theme.chipInk }]}>{stats.percent}%</Text>
            </View>
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
            <Text style={[styles.captionText, { color: theme.ink }]}>
              {modulesDone} of {courseModules.length} modules
            </Text>
            <Text style={[styles.captionText, { color: theme.subtleInk }]}>
              {stats.completed} of {stats.total} lessons
            </Text>
          </View>
        </Sticker>
      )}
    </Pressable>
  );
}

// Frame 65: three card outlines under the real title while content loads.
function CoursesSkeleton({ top }) {
  return (
    <View style={styles.container}>
      <View style={[styles.list, { paddingTop: top }]}>
        <Text style={styles.pageTitle}>Courses</Text>
        {TILTS.map((tilt, key) => (
          <SkeletonSticker key={key} tilt={tilt} style={styles.skelCard}>
            <View style={styles.cardTop}>
              <Skeleton style={[styles.skelBar, { height: 10, width: '38%' }]} />
              <Skeleton style={styles.skelChip} />
            </View>
            <Skeleton style={[styles.skelBar, { height: 24, width: '48%', borderRadius: 8 }]} />
            <Skeleton style={[styles.skelBar, { height: 12, width: '84%' }]} />
            <View style={styles.segments}>
              {[0, 1, 2, 3, 4].map((segment) => (
                <Skeleton key={segment} style={styles.segment} />
              ))}
            </View>
            <View style={styles.caption}>
              <Skeleton style={[styles.skelBar, { height: 10, width: '32%' }]} />
              <Skeleton style={[styles.skelBar, { height: 10, width: '30%' }]} />
            </View>
          </SkeletonSticker>
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
    gap: 18,
  },
  pageTitle: {
    ...type.pageTitle,
    color: colors.text,
    marginBottom: 18,
  },
  cardFace: {
    padding: 18,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    ...type.sectionLabel,
    fontFamily: fonts.bold,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.12,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  chipLabel: {
    fontFamily: authFonts.extraBold,
    fontSize: 12,
  },
  title: {
    fontFamily: authFonts.extraBold,
    fontSize: 24,
    lineHeight: 24 * 1.15,
  },
  description: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.45,
  },
  segments: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  caption: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  captionText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 12 * 1.3,
  },
  // Frame 65's outlined sticker shapes.
  skelCard: {
    padding: 18,
    borderRadius: 24,
    gap: 10,
  },
  skelBar: {
    borderRadius: 5,
  },
  skelChip: {
    width: 44,
    height: 20,
    borderRadius: 10,
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
