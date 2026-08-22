import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import Button from '../components/Button';
import ListCard from '../components/ListCard';
import ProgressRing from '../components/ProgressRing';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { getLessons } from '../services/content';
import { colors, radius, spacing, type } from '../theme/colors';

export default function LessonsScreen({ route, navigation }) {
  const { moduleId, moduleTitle } = route.params;
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isLessonComplete, moduleProgress, loading: progressLoading } = useProgress();

  useEffect(() => {
    navigation.setOptions({ title: moduleTitle });
  }, [moduleTitle]);

  useEffect(() => {
    getLessons(moduleId)
      .then(setLessons)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [moduleId]);

  if (loading || progressLoading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (lessons.length === 0) {
    return <ScreenState message="No lessons yet." hint="This module has no published lessons." />;
  }

  const stats = moduleProgress[moduleId] ?? { completed: 0, total: lessons.length, percent: 0 };

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={lessons}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <ProgressRing percent={stats.percent} size={44} strokeWidth={4}>
            <Text style={styles.headerRingText}>{stats.percent}%</Text>
          </ProgressRing>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {stats.completed} of {stats.total} lessons done
            </Text>
            <Text style={styles.headerHint}>
              A lesson counts as done once you finish its quiz.
            </Text>
          </View>
        </View>
      }
      renderItem={({ item }) => {
        const done = isLessonComplete(item.id);

        return (
          <ListCard
            leading={
              <ProgressRing
                percent={done ? 100 : 0}
                size={34}
                strokeWidth={3}
                color={colors.success}
              >
                {done ? (
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                ) : (
                  <Text style={styles.lessonIndex}>{item.order}</Text>
                )}
              </ProgressRing>
            }
            title={item.title}
            onPress={() =>
              navigation.navigate('LessonDetail', { lessonId: item.id, lessonTitle: item.title })
            }
          />
        );
      }}
      ListFooterComponent={
        <View style={styles.quizCard}>
          <Text style={styles.quizLabel}>When you are ready</Text>
          <Text style={styles.quizTitle}>Module quiz</Text>
          <Text style={styles.quizBody}>Covers everything across the lessons above.</Text>
          <Button
            label="Take Module Quiz"
            variant="secondary"
            onPress={() =>
              navigation.navigate('Quiz', {
                mode: 'module',
                refId: moduleId,
                title: `${moduleTitle} Quiz`,
              })
            }
            style={styles.quizButton}
          />
        </View>
      }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  headerRingText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  headerHint: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  lessonIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  quizCard: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceSunken,
  },
  quizLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  quizBody: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  quizButton: {
    marginTop: spacing.lg,
  },
});
