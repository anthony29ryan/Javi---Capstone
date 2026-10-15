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

export const LEVEL_THEMES = [
  {
    background: colors.primary,
    ink: colors.white,
    subtleInk: 'rgba(255,255,255,.85)',
    eyebrowInk: 'rgba(255,255,255,.82)',
    track: 'rgba(255,255,255,.28)',
    fill: colors.white,
    elevated: true,
  },
  {
    background: '#FFC97E',
    ink: '#3F414E',
    subtleInk: 'rgba(63,65,78,.78)',
    eyebrowInk: 'rgba(63,65,78,.7)',
    track: 'rgba(63,65,78,.16)',
    fill: '#3F414E',
  },
  {
    background: '#333242',
    ink: colors.white,
    subtleInk: 'rgba(255,255,255,.7)',
    eyebrowInk: 'rgba(255,255,255,.6)',
    track: 'rgba(255,255,255,.16)',
    fill: colors.white,
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
