import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import FloatingBackButton from '../components/FloatingBackButton';
import { useProgress } from '../context/ProgressContext';
import { dayString, studiedDays } from '../services/streak';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

const WEEKS = 5;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The last five weeks as rows of seven days, Monday first, ending with the
 * week that holds today. Each day is 'studied', 'missed' or 'future'.
 * String comparison works because YYYY-MM-DD sorts the same as the dates.
 */
function buildWeeks(studied, now = new Date()) {
  const today = dayString(now);
  const sinceMonday = (now.getDay() + 6) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday - 7 * (WEEKS - 1));
  return Array.from({ length: WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + week * 7 + weekday);
      const key = dayString(date);
      const state = studied.has(key) ? 'studied' : key > today ? 'future' : 'missed';
      return { key, date, state, isToday: key === today };
    })
  );
}

/** Frame 41, from Home's streak line and the Lesson complete streak tile. */
export default function StreakScreen({ navigation }) {
  // The live streak: current is already 0 after a missed day.
  const { streak } = useProgress();
  const insets = useSafeAreaInsets();
  const weeks = buildWeeks(new Set(studiedDays(streak)));
  const days = (n) => `day${n === 1 ? '' : 's'}`;

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
          <Text style={styles.title} accessibilityRole="header">
            Your streak
          </Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroMain}>
            <Text style={styles.label}>Current streak</Text>
            <View style={styles.currentRow}>
              <Text style={styles.currentNumber}>{streak.current}</Text>
              <Text style={styles.currentUnit}>{days(streak.current)}</Text>
            </View>
          </View>
          <View style={styles.best}>
            <Text style={styles.label}>Best</Text>
            <Text style={styles.bestValue}>
              {streak.longest} {days(streak.longest)}
            </Text>
          </View>
        </View>

        <View>
          <Text style={[styles.label, styles.sectionLabel]}>Last five weeks</Text>
          <View style={styles.calendar}>
            <View style={styles.row}>
              {WEEKDAYS.map((letter, index) => (
                <Text key={index} style={styles.weekday} importantForAccessibility="no">
                  {letter}
                </Text>
              ))}
            </View>
            {weeks.map((week) => (
              <View key={week[0].key} style={styles.row}>
                {week.map(({ key, date, state, isToday }) => (
                  <View
                    key={key}
                    accessible
                    accessibilityLabel={`${MONTHS[date.getMonth()]} ${date.getDate()}${
                      isToday ? ', today' : ''
                    }${state === 'future' ? '' : `, ${state}`}`}
                    style={[styles.cell, styles[state], isToday && styles.today]}
                  >
                    <Text
                      style={[
                        styles.cellNumber,
                        state === 'studied' && styles.cellNumberStudied,
                        state === 'missed' && styles.cellNumberMissed,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.legend} importantForAccessibility="no-hide-descendants">
              <View style={styles.legendItem}>
                <View style={[styles.swatch, styles.studied]} />
                <Text style={styles.legendText}>Studied</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.swatch, styles.today]} />
                <Text style={styles.legendText}>Today</Text>
              </View>
            </View>
          </View>
        </View>

        {/* The design says "lesson, quiz or trace"; solving a challenge counts too. */}
        <Text style={styles.footer}>Finish a lesson, quiz, trace or challenge on a day to count it.</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Where the floating back button sits.
  backSpace: {
    width: 40,
    height: 40,
  },
  title: {
    ...type.screenTitle,
    color: colors.text,
    flex: 1,
  },
  label: {
    ...type.sectionLabel,
    fontSize: 12,
    letterSpacing: 12 * 0.12,
    color: colors.textMuted,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  heroMain: {
    flex: 1,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  currentNumber: {
    fontFamily: fonts.bold,
    fontSize: 44,
    lineHeight: 44 * 1.1,
    color: colors.text,
  },
  currentUnit: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textMuted,
  },
  best: {
    alignItems: 'flex-end',
  },
  bestValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    marginTop: spacing.xs,
  },
  calendar: {
    gap: 6,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The deeper terracotta: white numbers on the lighter accent are under 3:1.
  studied: {
    backgroundColor: colors.button,
  },
  missed: {
    backgroundColor: colors.surfaceSunken,
  },
  future: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  today: {
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
  },
  cellNumber: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  cellNumberStudied: {
    color: colors.white,
  },
  // Muted text on the sunken fill is 4.3:1, just short, so missed days use ink.
  cellNumberMissed: {
    color: colors.text,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  footer: {
    ...type.body,
    color: colors.textMuted,
  },
});
