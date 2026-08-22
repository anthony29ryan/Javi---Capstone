import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import ListCard from '../components/ListCard';
import ScreenState from '../components/ScreenState';
import { getLessons } from '../services/content';
import { colors, radius, spacing, type } from '../theme/colors';

export default function LessonsScreen({ route, navigation }) {
  const { moduleId, moduleTitle } = route.params;
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: moduleTitle });
  }, [moduleTitle]);

  useEffect(() => {
    getLessons(moduleId)
      .then(setLessons)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [moduleId]);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (lessons.length === 0) {
    return <ScreenState message="No lessons yet." hint="This module has no published lessons." />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={lessons}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={styles.headerText}>
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} in this module.
        </Text>
      }
      renderItem={({ item }) => (
        <ListCard
          index={item.order}
          title={item.title}
          onPress={() =>
            navigation.navigate('LessonDetail', { lessonId: item.id, lessonTitle: item.title })
          }
        />
      )}
      ListFooterComponent={
        <View style={styles.quizCard}>
          <Text style={styles.quizLabel}>When you are ready</Text>
          <Text style={styles.quizTitle}>Module quiz</Text>
          <Text style={styles.quizBody}>
            Covers everything across the lessons above.
          </Text>
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
  headerText: {
    ...type.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
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
