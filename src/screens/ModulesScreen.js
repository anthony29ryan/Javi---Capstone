import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';

import ListCard from '../components/ListCard';
import ProgressRing from '../components/ProgressRing';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { getModules } from '../services/content';
import { colors, spacing, type } from '../theme/colors';

export default function ModulesScreen({ route, navigation }) {
  const { courseId, courseTitle } = route.params;
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { moduleProgress, loading: progressLoading } = useProgress();

  useEffect(() => {
    navigation.setOptions({ title: courseTitle });
  }, [courseTitle]);

  useEffect(() => {
    getModules(courseId)
      .then(setModules)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading || progressLoading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (modules.length === 0) {
    return <ScreenState message="No modules yet." hint="This tier has no published modules." />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={modules}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Text style={styles.headerText}>
          {modules.length} modules, in the order they are meant to be taken.
        </Text>
      }
      renderItem={({ item }) => {
        const stats = moduleProgress[item.id] ?? { completed: 0, total: 0, percent: 0 };

        return (
          <ListCard
            // The ring carries the module's progress; its number sits inside so
            // the card shows sequence and completion in one element.
            leading={
              <ProgressRing percent={stats.percent} size={38} strokeWidth={3}>
                <Text style={styles.ringIndex}>{item.order}</Text>
              </ProgressRing>
            }
            title={item.title}
            description={item.description}
            meta={stats.total > 0 ? `${stats.completed}/${stats.total} lessons` : null}
            onPress={() =>
              navigation.navigate('Lessons', { moduleId: item.id, moduleTitle: item.title })
            }
          />
        );
      }}
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
  ringIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
