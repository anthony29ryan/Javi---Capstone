import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import Avatar from '../components/Avatar';
import JaviCard from '../components/JaviCard';
import { useAuth } from '../context/AuthContext';
import { useProgressSummary } from '../hooks/useProgressSummary';
import { colors, radius, spacing, type } from '../theme/colors';

function ProgressCard({ navigation, summary }) {
  const { progress, totalLessons, completed, percent, loading, error } = summary;

  return (
    <Pressable
      onPress={() => navigation.navigate('Progress')}
      style={({ pressed }) => [styles.progressCard, pressed && styles.progressCardPressed]}
    >
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Your progress</Text>
        <Text style={styles.progressChevron}>›</Text>
      </View>

      {loading ? (
        <View style={styles.progressLoading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.progressError}>Could not load your progress.</Text>
      ) : (
        <>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <View style={styles.streakValue}>
                <Ionicons name="flame" size={22} color={colors.primaryLight} />
                <Text style={styles.statNumber}>{progress.streak.current}</Text>
              </View>
              <Text style={styles.statLabel}>
                day streak{progress.streak.longest > 0 ? ` (best ${progress.streak.longest})` : ''}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.stat}>
              <Text style={styles.statNumber}>
                {completed}
                <Text style={styles.statNumberMuted}>/{totalLessons}</Text>
              </Text>
              <Text style={styles.statLabel}>lessons done</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%` }]} />
          </View>
          <Text style={styles.progressCaption}>{percent}% of the course complete</Text>
        </>
      )}
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const summary = useProgressSummary();

  const name = user?.displayName || user?.email?.split('@')[0] || 'there';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <Avatar user={user} onPress={() => navigation.navigate('Profile')} />
      </View>

      <ProgressCard navigation={navigation} summary={summary} />

      <JaviCard
        completed={summary.completed}
        percent={summary.percent}
        streak={summary.progress?.streak?.current ?? 0}
        onStart={() => navigation.navigate('Learn')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    ...type.body,
    color: colors.textMuted,
  },
  name: {
    ...type.screenTitle,
    color: colors.text,
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  progressCardPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  progressLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
  },
  progressChevron: {
    fontSize: 24,
    color: colors.borderStrong,
    marginTop: -6,
  },
  progressLoading: {
    paddingVertical: spacing.xl,
  },
  progressError: {
    ...type.small,
    color: colors.error,
    paddingVertical: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stat: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  statNumberMuted: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '600',
  },
  statLabel: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  progressCaption: {
    ...type.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
