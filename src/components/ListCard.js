import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../theme/colors';

/**
 * Row card shared by the Courses, Modules, and Lessons lists.
 *
 * `index` is optional and shows the item's position. Modules and lessons are
 * an ordered sequence, so the number is real information, not decoration.
 */
export default function ListCard({ title, description, index, meta, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {index != null ? (
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index}</Text>
        </View>
      ) : null}

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
    ...type.small,
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
