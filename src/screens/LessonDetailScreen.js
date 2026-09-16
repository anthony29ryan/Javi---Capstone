import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import LessonBlocks from '../components/LessonBlocks';
import ScreenState from '../components/ScreenState';
import { getLesson } from '../services/content';
import { colors, spacing, type } from '../theme/colors';

export default function LessonDetailScreen({ route, navigation }) {
  const { lessonId, lessonTitle } = route.params;
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: lessonTitle });
  }, [lessonTitle]);

  useEffect(() => {
    getLesson(lessonId)
      .then(setLesson)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [lessonId]);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (!lesson) return <ScreenState message="Lesson not found." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{lesson.title}</Text>

      <LessonBlocks blocks={lesson.blocks} />

      <View style={styles.quizCard}>
        <Text style={styles.quizTitle}>Check your understanding</Text>
        <Button
          label="Take Quiz"
          onPress={() =>
            navigation.navigate('Quiz', {
              mode: 'lesson',
              refId: lesson.id,
              title: `${lesson.title} Quiz`,
            })
          }
          style={styles.quizButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 33,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  quizCard: {
    marginTop: spacing.xxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quizTitle: {
    ...type.cardTitle,
    color: colors.text,
  },
  quizButton: {
    marginTop: spacing.md,
  },
});
