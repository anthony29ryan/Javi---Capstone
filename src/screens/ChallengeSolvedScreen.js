import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import FloatingBackButton from '../components/FloatingBackButton';
import Button from '../components/Button';
import CodeEditor from '../components/CodeEditor';
import Mascot from '../components/Mascot';
import { useProgress } from '../context/ProgressContext';
import { getChallenges } from '../services/challenges';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';
import { formatDuration } from './TracerScreen';

// Also used by Lesson complete, whose streak tile passes onPress to open the Streak screen.
export function Stat({ label, value, color = colors.text, onPress }) {
  const content = (
    <>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={styles.stat}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}
    >
      {content}
    </Pressable>
  );
}

export default function ChallengeSolvedScreen({ route, navigation }) {
  const { challenge, code, result, submits, elapsedMs } = route.params;
  const { courses, modules, isChallengeSolved } = useProgress();
  const insets = useSafeAreaInsets();
  const [levelChallenges, setLevelChallenges] = useState([]);

  // Cached since the list screen loaded it, so no extra read.
  useEffect(() => {
    getChallenges(courses)
      .then((list) => setLevelChallenges(list.filter((c) => c.level === challenge.level)))
      .catch(() => {});
  }, [courses, challenge.level]);

  const levelTitle = courses.find((course) => course.id === challenge.level)?.title ?? '';
  const solvedInLevel = levelChallenges.filter((c) => isChallengeSolved(c.id)).length;
  const unsolved = levelChallenges.filter((c) => !isChallengeSolved(c.id));
  // The next unsolved one after this, else the first unsolved one before it.
  const next = unsolved.find((c) => c.order > challenge.order) ?? unsolved[0];
  const nextTopic = modules.find((module) => module.id === next?.moduleId)?.title ?? 'Java';
  const passed = result.tests.filter((t) => t.passed).length;
  const openNext = () => navigation.replace('Challenge', { challenge: next });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.backSpace} />
          <Text style={styles.eyebrow}>Code Challenges · {levelTitle}</Text>
        </View>

        <View>
          <Mascot variant="celebrate" px={112} />
          <Text style={styles.kicker}>Challenge solved</Text>
          <Text style={styles.title}>{challenge.title}</Text>
          <Text style={styles.verdict}>
            {submits <= 1
              ? 'Solved on your first submit. Every test passed.'
              : `Solved after ${submits} submits. Every test passed.`}
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat label="Tests passed" value={`${passed}/${result.tests.length}`} color={colors.success} />
          <Stat label="Runtime" value={`${result.timeSeconds}s`} />
          <Stat label="Submits" value={String(submits)} />
          <Stat label="Time spent" value={formatDuration(elapsedMs)} />
        </View>

        {levelChallenges.length ? (
          <View style={styles.levelCard}>
            <Text style={styles.label}>
              {levelTitle} · {solvedInLevel} of {levelChallenges.length} solved
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(solvedInLevel / levelChallenges.length) * 100}%` }]} />
            </View>
          </View>
        ) : null}

        <View>
          <View style={styles.sectionRow}>
            <Text style={styles.label}>Your solution</Text>
            <Pressable
              onPress={() => navigation.replace('Challenge', { challenge })}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Open in editor</Text>
            </Pressable>
          </View>
          <CodeEditor value={code} accessibilityLabel="Your solution" />
        </View>

        {next ? (
          <Pressable
            onPress={openNext}
            accessibilityRole="button"
            style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
          >
            <View style={styles.nextBody}>
              <Text style={styles.nextKicker}>Up next · {levelTitle}</Text>
              <Text style={styles.nextTitle}>{next.title}</Text>
              <Text style={styles.nextDesc}>{next.description}</Text>
              <Text style={styles.nextMeta}>
                {nextTopic} · ~{next.minutes} min
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Button
            label={next ? 'Next challenge' : 'Back to challenges'}
            onPress={next ? openNext : () => navigation.goBack()}
          />
          {next ? <Button label="All challenges" variant="secondary" onPress={() => navigation.goBack()} /> : null}
        </View>
      </ScrollView>
      <FloatingBackButton onPress={() => navigation.goBack()} />
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
    paddingHorizontal: spacing.xl,
    gap: 18,
  },
  // Where the floating back button sits, so the header keeps its layout.
  backSpace: {
    width: 40,
    height: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eyebrow: {
    ...type.sectionLabel,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    color: colors.textMuted,
    flex: 1,
  },
  kicker: {
    ...type.sectionLabel,
    color: colors.success,
    marginTop: 18,
  },
  title: {
    ...type.screenTitle,
    color: colors.text,
    marginTop: 10,
  },
  verdict: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flexBasis: '45%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statPressed: {
    backgroundColor: colors.primarySoft,
  },
  statValue: {
    fontFamily: fonts.mono,
    fontSize: 22,
  },
  statLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
    marginTop: 7,
  },
  levelCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 10,
  },
  label: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: 10,
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
    paddingVertical: spacing.xs,
  },
  next: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  nextPressed: {
    opacity: 0.8,
  },
  nextBody: {
    flex: 1,
    minWidth: 0,
  },
  nextKicker: {
    ...type.sectionLabel,
    color: colors.primaryDark,
  },
  nextTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
    marginTop: spacing.sm,
  },
  nextDesc: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  nextMeta: {
    ...type.sectionLabel,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.08,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  chevron: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.primaryDark,
  },
  actions: {
    gap: 10,
  },
});
