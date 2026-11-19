import { authColors, lightColors } from '../theme/authTheme';
import { colors } from '../theme/colors';

// The cards are fixed-colour stickers, so their inks come from the light
// palette and stay readable in Night study mode.
const INK = lightColors.ink;
const CREAM = lightColors.bg;

/**
 * Per-tier presentation, in course order.
 *
 * The tag words and the three grounds are the design's own copy and palette
 * for the three tiers — not data derived from Firestore, which only knows a
 * course's title and description. Shared here because the Courses list and a
 * course's module list both label the same tier and must agree.
 */
export const LEVEL_TAGS = ['Foundations', 'Objects', 'Systems'];

// Beginner is terracotta in both themes, like Home's Continue sticker: page-coloured
// text (cream by day, navy at night). `bar` is the tier's colour as a progress
// fill on the page (Profile), which follows the theme accent.
export const LEVEL_THEMES = [
  {
    background: lightColors.accent,
    bar: colors.primary,
    ink: colors.background,
    subtleInk: colors.background,
    eyebrowInk: colors.background,
    track: authColors.onAccentTrack,
    fill: authColors.onAccentFill,
    chipBackground: INK,
    chipInk: colors.white,
  },
  {
    background: '#FFC97E',
    bar: '#FFC97E',
    ink: INK,
    subtleInk: 'rgba(46,49,65,.78)',
    eyebrowInk: INK,
    track: 'rgba(46,49,65,.2)',
    fill: INK,
    chipBackground: INK,
    chipInk: colors.white,
  },
  {
    background: '#333242',
    bar: authColors.advancedBar,
    ink: colors.white,
    subtleInk: 'rgba(255,255,255,.7)',
    eyebrowInk: 'rgba(255,255,255,.6)',
    track: 'rgba(255,255,255,.16)',
    fill: colors.white,
    chipBackground: CREAM,
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
