import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import Mascot from '../components/Mascot';
import ScreenState from '../components/ScreenState';
import Skeleton, { SkeletonSticker } from '../components/Skeleton';
import Sticker from '../components/Sticker';
import { scorePercent, useProgress } from '../context/ProgressContext';
import { getChallenges } from '../services/challenges';
import { authFonts, lightColors } from '../theme/authTheme';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';
import { quizCount } from './QuizzesScreen';

// Mode sticker colours from the Practice options board (1c). Quiz takes the
// app's terracotta in place of the board's periwinkle, the night accent.
const TRACER_STICKER = '#FFC97E';
const CHALLENGE_STICKER = '#EBC2B3';
const PLAYGROUND_STICKER = '#BFE6CF';
// Text on the pastel stickers stays dark in Night study mode.
const INK = lightColors.ink;
const CREAM = colors.background;

function StatSticker({ label, background, tilt }) {
  return (
    <Sticker background={background} tilt={tilt} drop={2} corner={12} faceStyle={styles.statFace}>
      <Text style={styles.statLabel}>{label}</Text>
    </Sticker>
  );
}

function ModeSticker({ glyph, name, line, background, ink = INK, tilt, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} style={styles.mode}>
      {({ pressed }) => (
        <Sticker background={background} tilt={tilt} drop={4} corner={22} pressed={pressed} faceStyle={styles.modeFace}>
          <Text style={[styles.modeGlyph, { color: ink }]}>{glyph}</Text>
          <View style={styles.modeText}>
            <Text style={[styles.modeName, { color: ink }]}>{name}</Text>
            <Text style={[styles.modeLine, { color: ink }]}>{line}</Text>
          </View>
        </Sticker>
      )}
    </Pressable>
  );
}

// Frame 67: the page's shape in grey while progress loads.
function PracticeSkeleton({ top }) {
  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, styles.headerTitle]}>Practice</Text>
          <View style={styles.stats}>
            <SkeletonSticker tilt={-3} style={[styles.skelStat, { width: 64 }]} />
            <SkeletonSticker tilt={3} style={[styles.skelStat, { width: 100 }]} />
          </View>
        </View>
        {[0, 1].map((row) => (
          <View key={row} style={styles.modeRow}>
            {[-1.5, 1.5].map((tilt) => (
              <SkeletonSticker key={tilt} tilt={tilt} style={[styles.mode, styles.skelTile]}>
                <Skeleton style={styles.skelGlyph} />
                <View style={styles.modeText}>
                  <Skeleton style={styles.skelName} />
                  <Skeleton style={styles.skelLine} />
                </View>
              </SkeletonSticker>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PracticeScreen({ navigation }) {
  const { modules, courses, moduleScores, progress, loading, error, refresh, isChallengeSolved } = useProgress();
  // Tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();
  const top = insets.top + spacing.lg;
  const [challengeIds, setChallengeIds] = useState([]);

  // Cached for the session, so this is one read however often Practice opens.
  useEffect(() => {
    if (!courses.length) return;
    getChallenges(courses)
      .then((list) => setChallengeIds(list.map((challenge) => challenge.id)))
      .catch(() => {}); // offline: the tile just doesn't show a count
  }, [courses]);

  if (loading) return <PracticeSkeleton top={top} />;
  if (error) return <ScreenState error={error} onRetry={refresh} />;
  if (modules.length === 0) {
    return <ScreenState message="No quizzes yet." hint="Content has not been published." />;
  }

  // Both stats come from progress data the context already holds, so opening
  // this screen costs no extra Firestore reads. Retakes overwrite a module's
  // score, so the count is quizzes taken, not attempts.
  const taken = Object.entries(moduleScores);
  const average =
    taken.length > 0
      ? Math.round(taken.reduce((sum, [, score]) => sum + scorePercent(score), 0) / taken.length)
      : null;

  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));
  const lowest = taken.reduce(
    (worst, entry) => (!worst || scorePercent(entry[1]) < scorePercent(worst[1]) ? entry : worst),
    null
  );
  const lowestTitle = lowest ? modulesById[lowest[0]]?.title : null;

  const challengeTotal = challengeIds.length;
  const solvedChallenges = challengeIds.filter(isChallengeSolved).length;

  // Courses are sorted by order, so this is the first Beginner module.
  const firstModule = modules.find((module) => module.courseId === courses[0]?.id) ?? modules[0];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: top }]}
      >
        <View style={styles.header}>
          <Text style={[styles.title, styles.headerTitle]}>Practice</Text>
          <View style={styles.stats}>
            <StatSticker
              label={average === null ? '— avg' : `${average}% avg`}
              background={TRACER_STICKER}
              tilt={-3}
            />
            <StatSticker
              label={`${taken.length} ${taken.length === 1 ? 'quiz' : 'quizzes'} taken`}
              background={lightColors.accentSoft}
              tilt={3}
            />
          </View>
        </View>

        {/* Frame 74, kept inside the page so the modes stay in reach. */}
        {taken.length === 0 ? (
          <View style={styles.empty}>
            <Mascot variant="curious" px={96} decorative animate={false} />
            <Text style={styles.emptyTitle}>No quiz attempts yet</Text>
            <Text style={styles.emptyBody}>
              Every module ends with a short quiz. Your scores will show up here.
            </Text>
            <AuthButton
              label={`Try the ${firstModule.title} quiz`}
              onPress={() =>
                navigation.navigate('Quiz', { moduleId: firstModule.id, title: firstModule.title })
              }
              style={styles.emptyButton}
            />
          </View>
        ) : null}

        <View style={styles.modeRow}>
          <ModeSticker
            glyph="?"
            name="Quiz"
            line={lowestTitle ? `Retry ${lowestTitle}` : quizCount(modules.length)}
            background={lightColors.accent}
            ink={CREAM}
            tilt={-1.5}
            onPress={() => navigation.navigate('Quizzes')}
          />
          <ModeSticker
            glyph="i++"
            name="Code Tracer"
            // shortcut: one drill per module, so the module count is the drill
            // count; ids of renamed drills stay in completedTraces and would
            // overcount. Count against the traces list if that ever happens.
            line={`${progress?.completedTraces?.length ?? 0} of ${modules.length} done`}
            background={TRACER_STICKER}
            tilt={1.5}
            onPress={() => navigation.navigate('TracerList')}
          />
        </View>
        <View style={styles.modeRow}>
          <ModeSticker
            glyph="{ }"
            name="Code Challenges"
            line={challengeTotal ? `${solvedChallenges} of ${challengeTotal} solved` : 'Write and run Java'}
            background={CHALLENGE_STICKER}
            tilt={-1.5}
            onPress={() => navigation.navigate('Challenges')}
          />
          <ModeSticker
            glyph="main"
            name="Playground"
            line="Write any Java"
            background={PLAYGROUND_STICKER}
            tilt={1.5}
            onPress={() => navigation.navigate('Playground')}
          />
        </View>
      </ScrollView>
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
    paddingBottom: spacing.xl,
    gap: 14,
  },
  title: {
    ...type.pageTitle,
    color: colors.text,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitle: {
    marginBottom: 0,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  statFace: {
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: INK,
  },
  empty: {
    alignItems: 'center',
    padding: 22,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 20 * 1.3,
    color: colors.text,
    marginTop: 14,
  },
  emptyBody: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: spacing.sm,
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: 20,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 14,
  },
  mode: {
    flex: 1,
    minWidth: 0,
  },
  modeFace: {
    minHeight: 150,
    padding: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  modeGlyph: {
    fontFamily: fonts.mono,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -1.3,
  },
  modeText: {
    gap: 5,
  },
  modeName: {
    fontFamily: authFonts.extraBold,
    fontSize: 16,
    lineHeight: 16 * 1.15,
  },
  modeLine: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.35,
  },
  skelStat: {
    height: 28,
    borderRadius: 12,
  },
  skelTile: {
    minHeight: 150,
    padding: 16,
    borderRadius: 22,
    justifyContent: 'space-between',
  },
  skelGlyph: {
    height: 24,
    width: 40,
    borderRadius: 7,
  },
  skelName: {
    height: 14,
    width: '70%',
    borderRadius: 6,
  },
  skelLine: {
    height: 10,
    width: '50%',
    borderRadius: 5,
  },
});
