import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme/colors';

/**
 * Row card shared by the Modules and Lessons lists.
 *
 * `leading` takes whatever indicator the list needs on the left: a progress
 * ring for modules, a completion mark for lessons. `index` is the plain
 * fallback when a list only needs to show sequence.
 */
export default function ListCard({ title, description, index, meta, leading, onPress }) {
  const leadingNode =
    leading ??
    (index != null ? (
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{index}</Text>
      </View>
    ) : null);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {leadingNode}

      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {description ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>

      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  cardPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  indexBadge: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...type.cardTitle,
    color: colors.text,
  },
  description: {
    ...type.small,
    color: colors.textMuted,
    lineHeight: 19,
  },
  meta: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  chevron: {
    fontSize: 26,
    color: colors.borderStrong,
    marginTop: -3,
  },
});
