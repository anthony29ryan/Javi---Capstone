import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { colors, fonts, radius, spacing, type } from '../theme/colors';
import { PRESS_DURATION, PRESS_EASING } from './Button';

/**
 * Row card shared by the Modules and Lessons lists.
 *
 * `leading` takes whatever indicator the list needs on the left: a progress
 * ring for modules, a completion mark for lessons. `index` is the plain
 * fallback when a list only needs to show sequence.
 *
 * Pressing highlights the card and shrinks it slightly, animated by a
 * Reanimated CSS transition (same timing as Button). The scale is smaller
 * than Button's because the card is wider, so the same percentage would
 * move its edges further.
 */
export default function ListCard({ title, description, index, meta, leading, onPress }) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();
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
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      pressRetentionOffset={16}
    >
      <Animated.View
        style={[
          styles.card,
          pressed && styles.cardPressed,
          pressed && !reduceMotion && styles.cardPressedScale,
        ]}
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
      </Animated.View>
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
    transform: [{ scale: 1 }],
    transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
    transitionDuration: PRESS_DURATION,
    transitionTimingFunction: PRESS_EASING,
  },
  cardPressed: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.borderStrong,
  },
  cardPressedScale: {
    transform: [{ scale: 0.98 }],
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  chevron: {
    fontSize: 26,
    color: colors.borderStrong,
    marginTop: -3,
  },
});
