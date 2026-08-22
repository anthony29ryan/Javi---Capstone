import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import ListCard from '../components/ListCard';
import ScreenState from '../components/ScreenState';
import { getModules } from '../services/content';
import { colors, spacing, type } from '../theme/colors';

export default function ModulesScreen({ route, navigation }) {
  const { courseId, courseTitle } = route.params;
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    navigation.setOptions({ title: courseTitle });
  }, [courseTitle]);

  useEffect(() => {
    getModules(courseId)
      .then(setModules)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <ScreenState loading />;
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
      renderItem={({ item }) => (
        <ListCard
          index={item.order}
          title={item.title}
          description={item.description}
          onPress={() =>
            navigation.navigate('Lessons', { moduleId: item.id, moduleTitle: item.title })
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerText: {
    ...type.small,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
});
