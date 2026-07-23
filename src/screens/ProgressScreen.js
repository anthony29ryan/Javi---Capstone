import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { getAllLessonsCount, getAllModules } from '../services/content';
import { getProgress } from '../services/progress';

export default function ProgressScreen() {
  const [progress, setProgress] = useState(null);
  const [modules, setModules] = useState([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getProgress(), getAllModules(), getAllLessonsCount()])
      .then(([progressData, moduleData, lessonsCount]) => {
        setProgress(progressData);
        setModules(moduleData);
        setTotalLessons(lessonsCount);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={modules}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.summary}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{progress.streak.current}</Text>
            <Text style={styles.statLabel}>Day streak (best {progress.streak.longest})</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {progress.completedLessons.length} / {totalLessons}
            </Text>
            <Text style={styles.statLabel}>Lessons completed</Text>
          </View>
          <Text style={styles.sectionTitle}>Module Quiz Scores</Text>
        </View>
      }
      renderItem={({ item }) => {
        const moduleScore = progress.moduleScores[item.id];
        return (
          <View style={styles.moduleRow}>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            <Text style={styles.moduleScore}>
              {moduleScore ? `${moduleScore.correct} / ${moduleScore.total}` : 'Not attempted'}
            </Text>
          </View>
        );
      }}
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
  content: {
    padding: 16,
    gap: 8,
  },
  summary: {
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: '#555',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  moduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
  },
  moduleTitle: {
    fontWeight: '500',
  },
  moduleScore: {
    color: '#555',
  },
});
