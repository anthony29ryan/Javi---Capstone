import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import Text from '../components/AppText';
import AuthBackButton from '../components/auth/AuthBackButton';
import Collapsible, { Chevron, useKeepInPlace } from '../components/Collapsible';
import LessonRow from '../components/LessonRow';
import Mascot from '../components/Mascot';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';


/**
 * Every lesson in the modules the weak-topic model flagged, opened from Home's
 * "All". The topics come in from Home (already loaded there), most likely
 * weak first, so this screen makes no call of its own. One module is open at
 * a time, like the Module screen, so the list stays short.
 */
export default function WeakLessonsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { lessons, modules, isLessonComplete } = useProgress();
  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));

  const sections = (route.params?.topics ?? [])
    .map((topic) => ({
      topic,
      module: modulesById[topic.topic],
      lessons: lessons
        .filter((lesson) => lesson.moduleId === topic.topic)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    }))
    .filter((section) => section.module && section.lessons.length);

  // The weakest module starts open.
  const [openId, setOpenId] = useState(sections[0]?.topic.topic ?? null);
  const anchor = useKeepInPlace();

  function toggle(moduleId) {
    anchor.beforeToggle(
      openId,
      moduleId,
      sections.map((section) => section.module.id)
    );
    setOpenId((current) => (current === moduleId ? null : moduleId));
  }

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        {...anchor.scrollProps}
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        {/* Holds the floating back button's place, so the title stays put. */}
        <View style={styles.backSpace} />
        <Text style={styles.title}>Recommended for you</Text>
  
        <View style={styles.intro}>
          <Mascot variant="greeting" px={48} decorative animate={false} />
          <Text style={styles.introText}>
            Javi picked these modules because your recent quiz answers there were low. Review the
            lessons, then retake the quiz.
          </Text>
        </View>
  
        <View style={styles.cards}>
          {sections.map(({ topic, module, lessons: moduleLessons }) => {
            const expanded = openId === module.id;
            return (
              <View key={module.id} style={styles.card}>
                <Pressable
                  onPress={() => toggle(module.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`${module.title}, ${expanded ? 'collapse' : 'expand'}`}
                  style={({ pressed }) => [styles.cardHead, pressed && styles.cardHeadPressed]}
                >
                  <View style={styles.cardHeadText}>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleMeta}>
                      {Math.round(topic.accuracy * 100)}% of recent answers right
                    </Text>
                  </View>
                  <Chevron open={expanded} />
                </Pressable>
  
                <Collapsible open={expanded} onHeight={anchor.onHeight(module.id)}>
                  {moduleLessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      done={isLessonComplete(lesson.id)}
                      onPress={() =>
                        navigation.navigate('LessonDetail', {
                          lessonId: lesson.id,
                          lessonTitle: lesson.title,
                        })
                      }
                    />
                  ))}
                  <Pressable
                    onPress={() =>
                      navigation.navigate('Quiz', { moduleId: module.id, title: module.title })
                    }
                    style={({ pressed }) => [styles.quizRow, pressed && styles.quizRowPressed]}
                  >
                    <Text style={styles.quizLabel}>Retake quiz</Text>
                    <Text style={styles.quizChevron}>›</Text>
                  </Pressable>
                </Collapsible>
              </View>
            );
          })}
        </View>
      </Animated.ScrollView>
      {/* Outside the list so it stays put while the page scrolls. */}
      <AuthBackButton
        onPress={() => navigation.goBack()}
        style={[styles.back, { top: insets.top + spacing.lg }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: 20,
  },
  backSpace: {
    height: 40,
  },
  back: {
    position: 'absolute',
    left: 20,
    // Above the cards that scroll underneath it.
    zIndex: 2,
    elevation: 2,
  },
  title: {
    ...type.screenTitle,
    color: colors.text,
    marginTop: 26,
  },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  introText: {
    ...type.body,
    flex: 1,
    color: colors.textMuted,
  },
  cards: {
    gap: spacing.md,
    marginTop: 22,
  },
  // Card, head and chevron match ModulesScreen's accordion.
  card: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
  },
  cardHeadPressed: {
    backgroundColor: colors.primarySoft,
  },
  cardHeadText: {
    flex: 1,
    minWidth: 0,
  },
  moduleTitle: {
    ...type.cardTitle,
    color: colors.text,
  },
  moduleMeta: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  quizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  quizRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  quizLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    letterSpacing: 11.5 * 0.07,
    textTransform: 'uppercase',
    color: colors.text,
  },
  quizChevron: {
    fontFamily: fonts.mono,
    fontSize: 16,
    color: colors.borderStrong,
  },
});
