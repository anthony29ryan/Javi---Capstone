import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getLessons } from '../services/content';

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

  if (lessons.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No lessons yet for this module.</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={lessons}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() =>
            navigation.navigate('LessonDetail', { lessonId: item.id, lessonTitle: item.title })
          }
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
        </Pressable>
      )}
      ListFooterComponent={
        <Pressable
          style={styles.quizButton}
          onPress={() =>
            navigation.navigate('Quiz', { mode: 'module', refId: moduleId, title: `${moduleTitle} Quiz` })
          }
        >
          <Text style={styles.quizButtonText}>Take Module Quiz</Text>
        </Pressable>
      }
    />
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
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  quizButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  quizButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
