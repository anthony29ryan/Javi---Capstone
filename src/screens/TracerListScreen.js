import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import ListCard from '../components/ListCard';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { getTraces } from '../services/content';
import { colors, spacing, centeredColumn, contentWidth } from '../theme/colors';

// shortcut: plain list until the Code Tracer design from Claude Design is
// brought in; restyle this screen then.
export default function TracerListScreen({ navigation }) {
  const { courses, modules, isTraceComplete } = useProgress();
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getTraces()
      .then(setTraces)
      .catch(() => setError('Code Tracer needs a connection. Check it and try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} onRetry={load} />;
  if (traces.length === 0) {
    return <ScreenState message="No drills yet." hint="Content has not been published." />;
  }

  // Course first, then module: `modules` is sorted by `order` alone, which
  // interleaves the three courses since each one restarts at 1.
  const courseIndex = new Map(courses.map((course, i) => [course.id, i]));
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const rank = (trace) => {
    const module = moduleById.get(trace.moduleId);
    return module ? (courseIndex.get(module.courseId) ?? 0) * 1000 + module.order : Infinity;
  };
  const sorted = [...traces].sort((a, b) => rank(a) - rank(b));

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={sorted}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <ListCard
          index={index + 1}
          title={item.title}
          description={moduleById.get(item.moduleId)?.title}
          meta={isTraceComplete(item.id) ? '✓ Done' : `${item.lines.length} lines`}
          onPress={() => navigation.navigate('Tracer', { trace: item })}
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
    padding: spacing.xl,
    gap: spacing.md,
  },
});
