import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import FloatingBackButton from '../components/FloatingBackButton';
import ScreenState from '../components/ScreenState';
import Skeleton from '../components/Skeleton';
import { useProgress } from '../context/ProgressContext';
import { getChallenges, getDraftIds } from '../services/challenges';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const STATUS = {
  solved: { label: 'Solved', cta: 'Solve again', background: colors.successBg, color: colors.success },
  started: { label: 'In progress', cta: 'Continue', background: colors.primarySoft, color: colors.primaryDark },
  new: { label: 'New', cta: 'Start', background: colors.surfaceSunken, color: colors.textMuted },
};

/** Solved beats a leftover draft; a draft without a solve is in progress. */
function challengeStatus(challenge, isSolved, draftIds) {
  if (isSolved(challenge.id)) return 'solved';
  return draftIds.has(challenge.id) ? 'started' : 'new';
}

/** One line for the grey box: line breaks in the input or output become slashes. */
function exampleLine(challenge) {
  const flat = (text) => text.split('\n').join(' / ');
  return challenge.kind === 'output'
    ? flat(challenge.example.output)
    : `${flat(challenge.example.input)} → ${flat(challenge.example.output)}`;
}

export function StatusPill({ status }) {
  const { label, background, color } = STATUS[status];
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

function ChallengeCard({ challenge, status, topic, onPress }) {
  const solved = status === 'solved';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${challenge.title}, ${STATUS[status].label}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.number, solved && styles.numberSolved]}>
          <Text style={[styles.numberLabel, solved && styles.numberLabelSolved]}>
            {solved ? '✓' : String(challenge.order).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{challenge.title}</Text>
          <Text style={styles.cardDesc}>{challenge.description}</Text>
        </View>
        <StatusPill status={status} />
      </View>
      <View style={styles.io}>
        <Text style={styles.ioLabel}>{challenge.kind === 'output' ? 'Output' : 'In → Out'}</Text>
        <Text style={styles.ioValue}>{exampleLine(challenge)}</Text>
      </View>
      <View style={styles.cardFoot}>
        <Text style={styles.meta}>
          {topic} · ~{challenge.minutes} min
        </Text>
        <Text style={styles.cta}>{STATUS[status].cta}</Text>
      </View>
    </Pressable>
  );
}

function CardSkeletons() {
  return (
    <View style={styles.skelList}>
      {[0, 1, 2].map((key) => (
        <View key={key} style={[styles.card, styles.skelCard]}>
          <Skeleton style={styles.skelTitle} />
          <Skeleton style={styles.skelDesc} />
          <Skeleton style={styles.skelIo} />
        </View>
      ))}
    </View>
  );
}

export default function ChallengesScreen({ navigation }) {
  const { courses, modules, isChallengeSolved } = useProgress();
  const insets = useSafeAreaInsets();
  const [challenges, setChallenges] = useState([]);
  const [draftIds, setDraftIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [level, setLevel] = useState(courses[0]?.id);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getChallenges(courses)
      .then(setChallenges)
      .catch(() => setError('Code Challenges need a connection. Check it and try again.'))
      .finally(() => setLoading(false));
  }, [courses]);

  // On every visit, so a challenge left half-done shows as In progress on the way back.
  useFocusEffect(
    useCallback(() => {
      load();
      getDraftIds().then(setDraftIds).catch(() => {});
    }, [load])
  );

  if (!loading && error) return <ScreenState error={error} onRetry={load} />;
  if (!loading && challenges.length === 0) {
    return <ScreenState message="No challenges yet." hint="Content has not been published." />;
  }

  const moduleTitles = new Map(modules.map((module) => [module.id, module.title]));
  const solvedIn = (list) => list.filter((c) => isChallengeSolved(c.id)).length;
  const levelChallenges = challenges.filter((c) => c.level === level);
  const levelSolved = solvedIn(levelChallenges);
  const levelTitle = courses.find((course) => course.id === level)?.title ?? '';

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.container}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        data={levelChallenges}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={loading ? <CardSkeletons /> : null}
        ListHeaderComponent={
          <View>
            <View style={styles.backRow}>
              <Text style={styles.eyebrow}>Practice</Text>
            </View>
            <Text style={styles.title}>Code Challenges</Text>
            <Text style={styles.intro}>
              Write a small program, then run it against test cases. Start with Beginner and work up.
            </Text>
            <View style={styles.tabs} accessibilityRole="tablist">
              {courses.map((course) => {
                const inLevel = challenges.filter((c) => c.level === course.id);
                const selected = course.id === level;
                return (
                  <Pressable
                    key={course.id}
                    onPress={() => setLevel(course.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    style={[styles.tab, selected && styles.tabSelected]}
                  >
                    <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{course.title}</Text>
                    <Text style={styles.tabCount}>
                      {solvedIn(inLevel)}/{inLevel.length}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.levelRow}>
              <Text style={styles.levelLabel}>{levelTitle}</Text>
              <Text style={styles.levelLabel}>
                {levelSolved} of {levelChallenges.length} solved
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${levelChallenges.length ? (levelSolved / levelChallenges.length) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ChallengeCard
            challenge={item}
            status={challengeStatus(item, isChallengeSolved, draftIds)}
            topic={moduleTitles.get(item.moduleId) ?? 'Java'}
            onPress={() => navigation.navigate('Challenge', { challenge: item })}
          />
        )}
      />
      {/* Outside the list so it stays put while the page scrolls. */}
      <FloatingBackButton onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  backRow: {
    // The button's 40px plus the gap that used to sit beside it.
    marginLeft: 40 + spacing.lg,
    minHeight: 40,
    justifyContent: 'center',
  },
  eyebrow: {
    ...type.sectionLabel,
    fontSize: 11,
    letterSpacing: 11 * 0.12,
    color: colors.borderStrong,
  },
  title: {
    ...type.screenTitle,
    color: colors.text,
    marginTop: 18,
    marginBottom: 6,
  },
  intro: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.textMuted,
    marginBottom: 18,
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 20,
    backgroundColor: colors.surfaceSunken,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    alignItems: 'center',
    gap: 5,
  },
  tabSelected: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 1,
  },
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabLabelSelected: {
    color: colors.text,
  },
  tabCount: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: colors.borderStrong,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: spacing.sm,
  },
  levelLabel: {
    ...type.sectionLabel,
    fontSize: 11,
    letterSpacing: 11 * 0.08,
    color: colors.borderStrong,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  cardPressed: {
    borderColor: colors.primary,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  number: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  numberSolved: {
    backgroundColor: colors.successBg,
  },
  numberLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  numberLabelSolved: {
    color: colors.success,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
  cardDesc: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  pillLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    letterSpacing: 9 * 0.1,
    textTransform: 'uppercase',
  },
  io: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceSunken,
  },
  ioLabel: {
    ...type.sectionLabel,
    fontSize: 9.5,
    color: colors.borderStrong,
  },
  ioValue: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 12 * 1.45,
    color: colors.text,
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  meta: {
    ...type.sectionLabel,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.08,
    color: colors.borderStrong,
    flexShrink: 1,
  },
  cta: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.primaryDark,
  },
  skelList: {
    gap: spacing.md,
  },
  skelCard: {
    gap: 10,
  },
  skelTitle: {
    height: 16,
    width: '55%',
    borderRadius: 6,
  },
  skelDesc: {
    height: 10,
    width: '85%',
    borderRadius: 5,
  },
  skelIo: {
    height: 34,
    borderRadius: 12,
  },
});
