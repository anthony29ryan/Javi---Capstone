import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getLesson } from '../services/content';

function Block({ block }) {
  if (block.type === 'code') {
    return (
      <View style={styles.codeBlock}>
        <Text style={styles.codeText}>{block.value}</Text>
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.center}>
        <Text>Lesson not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>{lesson.title}</Text>
      {(lesson.blocks || []).map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#c00',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    padding: 12,
  },
  codeText: {
    color: '#e6e6e6',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});
