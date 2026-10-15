import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import AuthBackButton from '../components/auth/AuthBackButton';
import Button from '../components/Button';
import Collapsible, { useKeepInPlace } from '../components/Collapsible';
import ScreenState from '../components/ScreenState';
import { useProgress } from '../context/ProgressContext';
import { getTraces } from '../services/content';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function TraceCard({ trace, topic, level, traced, open, onToggle, onHeight, onStart }) {
  const characters = trace.lines.reduce((sum, line) => sum + line.trim().length, 0);

  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.cardHead}
      >
        <View style={[styles.radio, open && styles.radioOpen]}>
          {open ? <View style={styles.radioDot} /> : null}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardEyebrow} numberOfLines={1}>
            {level ? `${topic} · ${level}` : topic}
          </Text>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{trace.title}</Text>
            {traced ? (
              <View style={styles.tracedTag}>
                <Text style={styles.tracedLabel}>Traced</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardMeta}>
            {trace.lines.length} lines · {characters} characters
          </Text>
        </View>
      </Pressable>

      <Collapsible open={open} onHeight={onHeight}>
        {/* The gap lives inside, so a closed card adds no space below its head. */}
        <View style={styles.openBody}>
          <View style={styles.preview}>
            {trace.lines.map((line, i) => (
              <View key={i} style={styles.previewRow}>
                <Text style={styles.previewNumber}>{i + 1}</Text>
                <Text style={styles.previewCode}>{line}</Text>
              </View>
            ))}
          </View>
          <Button label="Start typing" onPress={onStart} />
        </View>
      </Collapsible>
    </View>
  );
}

export default function TracerListScreen({ navigation }) {
  const { courses, modules, isTraceComplete } = useProgress();
  const insets = useSafeAreaInsets();
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState(null);
  const [openId, setOpenId] = useState(null);
  const anchor = useKeepInPlace();

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
  const courseTitles = new Map(courses.map((course) => [course.id, course.title]));
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const rank = (trace) => {
    const module = moduleById.get(trace.moduleId);
    return module ? (courseIndex.get(module.courseId) ?? 0) * 1000 + module.order : Infinity;
  };
  const sorted = [...traces]
    .filter((trace) => !courseFilter || moduleById.get(trace.moduleId)?.courseId === courseFilter)
    .sort((a, b) => rank(a) - rank(b));

  return (
    <View style={styles.container}>
      <Animated.FlatList
        {...anchor.scrollProps}
        style={styles.container}
        contentContainerStyle={[
          styles.list,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        data={sorted}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Indented to clear the floating back button below the list. */}
            <View style={styles.backRow}>
              <Text style={styles.eyebrow}>Practice</Text>
            </View>
            <Text style={styles.title}>Code Tracer</Text>
            <Text style={styles.intro}>
              Pick a short program to type. Lines appear one at a time, and any wrong character
              turns red.
            </Text>
            {/* Level chips rather than the design's topic chips: with one program
                per module there would be 21 topic chips. */}
            <View style={styles.chips}>
              <Chip label="All" selected={!courseFilter} onPress={() => setCourseFilter(null)} />
              {courses.map((course) => (
                <Chip
                  key={course.id}
                  label={course.title}
                  selected={courseFilter === course.id}
                  onPress={() => setCourseFilter(course.id)}
                />
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const module = moduleById.get(item.moduleId);
          return (
            <TraceCard
              trace={item}
              topic={module?.title ?? 'Java'}
              level={courseTitles.get(module?.courseId)}
              traced={isTraceComplete(item.id)}
              open={openId === item.id}
              onToggle={() => {
                anchor.beforeToggle(openId, item.id, sorted.map((trace) => trace.id));
                setOpenId(openId === item.id ? null : item.id);
              }}
              onHeight={anchor.onHeight(item.id)}
              onStart={() =>
                navigation.navigate('Tracer', {
                  trace: item,
                  topic: module?.title,
                  level: courseTitles.get(module?.courseId),
                })
              }
            />
          );
        }}
      />
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
  list: {
    ...centeredColumn(contentWidth.content),
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.xs,
  },
  backRow: {
    // The button's 40px plus the gap that used to sit beside it.
    marginLeft: 40 + spacing.lg,
    minHeight: 40,
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: spacing.xl,
    // Above the cards that scroll underneath it.
    zIndex: 2,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
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
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  chipLabelSelected: {
    color: colors.white,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardOpen: {
    borderColor: colors.primary,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOpen: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardEyebrow: {
    ...type.sectionLabel,
    color: colors.borderStrong,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 16 * 1.25,
    color: colors.text,
  },
  tracedTag: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
  },
  tracedLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 9,
    letterSpacing: 9 * 0.1,
    textTransform: 'uppercase',
    color: colors.primaryDark,
  },
  cardMeta: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  openBody: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  preview: {
    paddingVertical: spacing.lg,
    paddingRight: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.codeBg,
  },
  previewRow: {
    flexDirection: 'row',
  },
  previewNumber: {
    width: 34,
    paddingRight: spacing.md,
    textAlign: 'right',
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 12 * 1.75,
    color: 'rgba(231,233,245,.35)',
  },
  previewCode: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 12 * 1.75,
    color: colors.codeText,
  },
});
