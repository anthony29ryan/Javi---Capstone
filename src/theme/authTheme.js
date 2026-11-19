// Design tokens from the Javi design handoff.
//
// This is the app's one palette. `theme/colors.js` imports `authColors` from
// here and re-exports it under the names the post-sign-in screens already
// use, so there is a single source of truth for colour rather than two
// themes drifting apart. Edit a colour here and it changes everywhere.
//
// The type scale and radii below are still specific to the auth flow, whose
// screens were built directly against the handoff's specs. The rest of the
// app has its own (coarser) scale in `theme/colors.js`; those two have not
// been reconciled yet.
//
// Text on a fixed pastel ground (stickers, level cards) uses
// `lightColors.ink` directly, so it stays dark in both themes.
//
// Two palettes with the same keys: light, and the handoff's "Night study mode".
// `authColors` is whichever one is on, picked once at launch (see themeMode.js).
//
// shortcut: the theme applies on the next launch, not live, because every
// StyleSheet reads these at import. A live switch means moving all of them
// into a hook.
// With the extension so tests/theme.test.js can load this file under Node.
import { isNightMode } from './themeMode.js';

export const lightColors = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  surface2: '#EFEDE7',

  ink: '#2E3141',
  ink2: '#6B6E7F',
  muted: '#A1A4B2',

  // Terracotta: links, active states, progress, tiles.
  accent: '#C88B7A',
  accentDeep: '#A8563F',
  accentSoft: '#F7ECE7',

  // Filled buttons: deeper at rest, lighter while pressed, so a press reads
  // as the button lighting up.
  button: '#A8563F',
  buttonPressed: '#C88B7A',

  line: 'rgba(46,49,65,.09)',
  lineStrong: 'rgba(46,49,65,.25)', // unticked checkbox outline

  error: '#B4483E',
  errorSoft: '#FBE9E5',
  errorLine: 'rgba(180,72,62,.32)',
  // Amber, for problems that are not the student's fault (e.g. no connection).
  warn: '#B07220',
  warnSoft: '#FFF3DF',
  warnLine: 'rgba(214,150,60,.4)',
  warnInk: '#6B4A1A',
  success: '#5EB78D',
  successSoft: '#E6F4EC',
  successInk: '#2F7F5E', // small success text, darker than `success` to read on white

  // Progress fills between the track and the full accent. The handoff has no
  // token for this; a lightened accent keeps the hierarchy without a new hue.
  accentLight: '#DCA08E',
  // The "vi" in the wordmark.
  wordmark: '#A8563F',
  // Advanced's progress bars on Profile; its card ground is too dark for them at night.
  advancedBar: '#333242',
  // Sticker outline and hard drop edge (Sticker Edge Options board, 1d for night).
  stickerLine: '#2E3141',
  // Progress bars on a terracotta sticker: filled and empty segments.
  onAccentFill: '#F7F5F0',
  onAccentTrack: 'rgba(247,245,240,.3)',
  // The design gives code its own ground, slightly bluer and deeper than the
  // near-black used for the tutor card and toast.
  codeBg: '#262B45',

  white: '#FFFFFF',
  toastBg: '#333242',
};

// From the handoff's dark set. successSoft, accentLight and toastBg have no
// dark value in the design, so they follow its patterns (soft = colour at .14).
export const nightColors = {
  bg: '#0C1338',
  surface: '#17204A',
  surface2: '#1E2857',

  ink: '#F4F5FB',
  ink2: '#B6BCDC',
  muted: '#8890B8',

  accent: '#8E97FD',
  accentDeep: '#B7BDFF',
  accentSoft: '#253066',

  button: '#5C66DB',
  buttonPressed: '#8E97FD',

  line: 'rgba(255,255,255,.1)',
  lineStrong: 'rgba(255,255,255,.25)',

  error: '#FF9C8F',
  errorSoft: 'rgba(255,120,105,.14)',
  errorLine: 'rgba(255,156,143,.35)',
  warn: '#F0B65E',
  warnSoft: 'rgba(240,182,94,.14)',
  warnLine: 'rgba(240,182,94,.35)',
  warnInk: '#F5D7A6',
  success: '#5EB78D',
  successSoft: 'rgba(94,183,141,.14)',
  successInk: '#5EB78D',

  accentLight: '#5C66DB',
  wordmark: '#F2B440',
  advancedBar: '#B6BCDC',
  stickerLine: '#3B4580',
  onAccentFill: '#2E3141',
  onAccentTrack: 'rgba(46,49,65,.25)',
  codeBg: '#080E2A',

  white: '#FFFFFF',
  toastBg: '#253066',
};

export const authColors = isNightMode() ? nightColors : lightColors;

export const authRadius = {
  field: 16,
  primaryButton: 28,
  secondaryButton: 26,
  card: 18,
  backButton: 20,
  checkbox: 8,
  toast: 22,
};

export const authSpacing = {
  screenH: 24,
  screenTop: 16,
  screenBottom: 32,
  fieldGap: 12,
};

// The widest a screen's column of content is allowed to get. Phones are
// narrower than both, so nothing changes there; on a tablet, or any screen in
// landscape, the column stops growing and sits in the middle instead of
// stretching text fields and cards from edge to edge.
export const contentWidth = {
  form: 480, // sign-in, sign-up, account and settings screens
  content: 720, // home, lists, lessons, quizzes
};

// Spread into a screen's content style: `...centeredColumn(contentWidth.form)`.
// Full width until the cap, then centered.
export function centeredColumn(width) {
  return { width: '100%', maxWidth: width, alignSelf: 'center' };
}

// Font family keys, once loaded via useFonts() in the auth navigator.
export const authFonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semiBold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  extraBold: 'Outfit_800ExtraBold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
};

export const authType = {
  screenTitle: {
    fontFamily: authFonts.bold,
    fontSize: 27,
    lineHeight: 27 * 1.25,
    letterSpacing: -27 * 0.02,
  },
  welcomeHeadline: {
    fontFamily: authFonts.bold,
    fontSize: 31,
    lineHeight: 31 * 1.2,
    letterSpacing: -31 * 0.02,
  },
  body: {
    fontFamily: authFonts.regular,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.6,
  },
  welcomeBody: {
    fontFamily: authFonts.regular,
    fontSize: 15,
    lineHeight: 15 * 1.6,
  },
  input: {
    fontFamily: authFonts.medium,
    fontSize: 15,
  },
  mono: {
    fontFamily: authFonts.monoMedium,
    fontSize: 13,
  },
  primaryButtonLabel: {
    fontFamily: authFonts.bold,
    fontSize: 14,
    letterSpacing: 14 * 0.06,
    textTransform: 'uppercase',
  },
  secondaryButtonLabel: {
    fontFamily: authFonts.bold,
    fontSize: 12.5,
    letterSpacing: 12.5 * 0.06,
    textTransform: 'uppercase',
  },
  eyebrow: {
    fontFamily: authFonts.semiBold,
    fontSize: 10,
    letterSpacing: 10 * 0.12,
    textTransform: 'uppercase',
  },
  helper: {
    fontFamily: authFonts.medium,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.4,
  },
  ruleLabel: {
    fontFamily: authFonts.medium,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.3,
  },
};

// Fonts to hand to useFonts(). Import and spread this in the one place that
// loads them so every screen stays in sync with what's actually bundled.
export { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
export { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
export { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
