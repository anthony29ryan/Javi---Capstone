import { authColors } from '../theme/authTheme';
import { colors } from '../theme/colors';

/**
 * Per-tier presentation, in course order.
 *
 * The tag words and the three grounds are the design's own copy and palette
 * for the three tiers — not data derived from Firestore, which only knows a
 * course's title and description. Shared here because the Courses list and a
 * course's module list both label the same tier and must agree.
 */
export const LEVEL_TAGS = ['Foundations', 'Objects', 'Systems'];

// Beginner's text is the page cream, as on Home's terracotta Continue sticker.
export const LEVEL_THEMES = [
  {
    background: colors.primary,
    ink: colors.background,
    subtleInk: colors.background,
    eyebrowInk: colors.background,
    track: 'rgba(247,245,240,.3)',
    fill: colors.background,
    chipBackground: authColors.ink,
    chipInk: colors.white,
  },
  {
    background: '#FFC97E',
    ink: authColors.ink,
    subtleInk: 'rgba(46,49,65,.78)',
    eyebrowInk: authColors.ink,
    track: 'rgba(46,49,65,.2)',
    fill: authColors.ink,
    chipBackground: authColors.ink,
    chipInk: colors.white,
  },
  {
    background: '#333242',
    ink: colors.white,
    subtleInk: 'rgba(255,255,255,.7)',
    eyebrowInk: 'rgba(255,255,255,.6)',
    track: 'rgba(255,255,255,.16)',
    fill: colors.white,
    chipBackground: colors.background,
    chipInk: '#333242',
  },
];

/** "Level 2 · Objects", falling back to just the level when there is no tag. */
export function levelLabel(index) {
  const tag = LEVEL_TAGS[index];
  return tag ? `Level ${index + 1} · ${tag}` : `Level ${index + 1}`;
}

export function levelTheme(index) {
  return LEVEL_THEMES[index % LEVEL_THEMES.length];
}
