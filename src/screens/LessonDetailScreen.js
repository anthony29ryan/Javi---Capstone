import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import Button from '../components/Button';
import ScreenState from '../components/ScreenState';
import { getLesson } from '../services/content';
import { colors, radius, spacing, type } from '../theme/colors';

function CodeBlock({ value, language }) {
  return (
    <View style={styles.codeBlock}>
      <View style={styles.codeHeader}>
        <Text style={styles.codeLanguage}>{language || 'code'}</Text>
      </View>
      {/* Java lines run long, so the block scrolls sideways instead of wrapping
          mid-statement and breaking the indentation. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText}>{value}</Text>
      </ScrollView>
    </View>
  );
}

function Block({ block }) {
  if (block.type === 'code') {
    return <CodeBlock value={block.value} language={block.language} />;
  }

  if (block.type === 'image') {
    return (
      <View style={styles.mediaBlock}>
        <Image source={{ uri: block.url }} style={styles.image} resizeMode="contain" />
        {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
      </View>
    );
  }

  if (block.type === 'video') {
    return (
      <View style={styles.mediaBlock}>
        <View style={styles.videoContainer}>
          <WebView
            source={{ uri: `https://www.youtube.com/embed/${block.videoId}` }}
            allowsFullscreenVideo
          />
        </View>
        {block.caption ? <Text style={styles.caption}>{block.caption}</Text> : null}
      </View>
    );
  }

  return <Text style={styles.paragraph}>{block.value}</Text>;
}

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

      <View style={styles.blocks}>
        {(lesson.blocks || []).map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </View>

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
  blocks: {
    gap: spacing.lg,
  },
  paragraph: {
    ...type.body,
    color: colors.text,
  },
  codeBlock: {
    backgroundColor: colors.codeBg,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  codeHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#3D3029',
  },
  codeLanguage: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.primaryLight,
  },
  codeText: {
    color: colors.codeText,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 21,
    padding: spacing.md,
  },
  mediaBlock: {
    gap: spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.codeBg,
  },
  caption: {
    ...type.small,
    color: colors.textMuted,
    textAlign: 'center',
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
