import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../components/Button';
import ListCard from '../components/ListCard';
import ScreenState from '../components/ScreenState';
import TutorChat from '../components/TutorChat';
import { levelLabel } from '../constants/levels';
import { useProgress } from '../context/ProgressContext';
import { colors, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

/**
 * The Java tutor tab. The tutor only answers on one module at a time, so the
 * tab first asks which one, then shows that module's saved conversation: the
 * same thread as the tutor box at the bottom of the module's lessons.
 *
 * The picked module lives in this screen's state. Tab screens stay mounted, so
 * it is kept while switching tabs and asked again only after the app restarts.
 *
 * The module picker is deliberately plain; its final design is still to come.
 */
export default function TutorScreen() {
  // Tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();
  const { courses, modules, loading, error, refresh } = useProgress();
  const [moduleId, setModuleId] = useState(null);

  if (loading) return <ScreenState loading />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;
  if (modules.length === 0) {
    return <ScreenState message="No modules yet." hint="Content has not been published." />;
  }

  const module = modules.find((item) => item.id === moduleId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        // So tapping Send or a suggestion works while the keyboard is open.
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Java tutor</Text>

        {module ? (
          <>
            <Text style={styles.subtitle}>{module.title}</Text>
            <Button label="Change module" variant="secondary" onPress={() => setModuleId(null)} />
            <TutorChat
              moduleId={module.id}
              topic={module.title}
              heading="Ask about this module"
              shownMessages={Infinity}
            />
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Which module do you want help with?</Text>
            {courses.map((course, courseIndex) => (
              <View key={course.id} style={styles.group}>
                <Text style={styles.groupLabel}>
                  {levelLabel(courseIndex)} · {course.title}
                </Text>
                {modules
                  .filter((item) => item.courseId === course.id)
                  .map((item, index) => (
                    <ListCard
                      key={item.id}
                      index={index + 1}
                      title={item.title}
                      onPress={() => setModuleId(item.id)}
                    />
                  ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...type.pageTitle,
    color: colors.text,
  },
  subtitle: {
    ...type.small,
    color: colors.textMuted,
  },
  group: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  groupLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
});
