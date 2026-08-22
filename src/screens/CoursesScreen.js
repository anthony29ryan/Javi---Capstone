import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import ListCard from '../components/ListCard';
import ScreenState from '../components/ScreenState';
import { getCourses } from '../services/content';
import { colors, spacing, type } from '../theme/colors';

export default function CoursesScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} />;
  if (courses.length === 0) {
    return <ScreenState message="No courses yet." hint="Content has not been published." />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={courses}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.headerText}>
            Each tier builds on the one before it. Start at Beginner if you are new to Java.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <ListCard
          title={item.title}
          description={item.description}
          onPress={() =>
            navigation.navigate('Modules', { courseId: item.id, courseTitle: item.title })
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
  header: {
    marginBottom: spacing.xs,
  },
  headerText: {
    ...type.small,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
