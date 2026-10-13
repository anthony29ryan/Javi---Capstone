// App-wide styling tokens for every screen past sign-in.
//
// The values come from `authTheme.js`, which holds the palette from the Javi
// design handoff. That file used to be a separate island covering only the
// pre-auth screens, with this file carrying an unrelated coffee palette for
// everything else; the two are now one palette, imported here rather than
// copied, so they cannot drift apart.
//
// The token *names* here are deliberately unchanged from the coffee theme.
// Every screen already reads `colors.background`, `colors.primary` and so on,
// so remapping the values re-skins the whole app without touching a single
// screen — which is also what makes this easy to revert if the look is wrong.
//
// Only the light theme exists so far. The handoff also defines a dark "Night
// study mode", but an app-wide theme toggle (Settings screen, persisted
// preference, every screen re-checked) is its own feature.

import { authColors } from './authTheme';

// Shared with the auth screens so every screen caps its width the same way.
export { centeredColumn, contentWidth } from './authTheme';

export const colors = {
  background: authColors.bg, // warm off-white page background
  surface: authColors.surface, // cards, inputs, sheets sitting on the background
  surfaceSunken: authColors.surface2, // recessed areas, progress tracks

  primary: authColors.accent, // terracotta - main buttons, active elements
  primaryDark: authColors.accentDeep, // pressed states, accent text on light ground
  // The handoff has no token for this: it is the one place the old theme drew
  // a distinction the design does not, for progress-bar fills that need to sit
  // between the track and the full accent. A lightened accent keeps that
  // hierarchy without inventing a second hue.
  primaryLight: '#DCA08E',
  primarySoft: authColors.accentSoft, // tinted panel behind selected/secondary surfaces

  text: authColors.ink, // primary text
  textMuted: authColors.ink2, // secondary/help text

  border: authColors.line, // hairline borders and dividers
  borderStrong: authColors.muted, // chevrons, emphasized borders

  success: authColors.success,
  successBg: '#E6F4EC',
  error: authColors.error,
  errorBg: '#F7E9E7',

  // The design gives code its own ground, slightly bluer and deeper than the
  // near-black used for the tutor card and toast.
  codeBg: '#262B45',
  codeText: '#E7E9F5',
  codeLine: 'rgba(231,233,245,.14)',
  codeLabel: 'rgba(231,233,245,.5)',

  white: authColors.white,
};

// The design rounds much harder than the coffee theme did: list rows sit at
// 18, tiles at 20, and hero cards at 24.
export const radius = {
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

// One spacing scale keeps rhythm consistent across screens instead of each
// one inventing its own padding values.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// The design is set in Plus Jakarta Sans throughout, with JetBrains Mono for
// code, scores and other numeric marks. React Native picks a font file by
// family name rather than by weight, so weights are chosen by naming the
// right family here — a `fontWeight` alongside one of these is ignored.
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoRegular: 'JetBrainsMono_400Regular',
};

export const type = {
  // Courses and Practice only — the handoff enlarged those two titles and
  // dropped their subheadings, leaving every other screen on screenTitle.
  pageTitle: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 34 * 1.15, letterSpacing: -34 * 0.025 },
  screenTitle: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 25 * 1.25, letterSpacing: -25 * 0.02 },
  sectionHeading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 18 * 1.2, letterSpacing: -18 * 0.01 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 16 * 1.25 },
  rowTitle: { fontFamily: fonts.bold, fontSize: 14.5, lineHeight: 14.5 * 1.3 },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    letterSpacing: 10 * 0.12,
    textTransform: 'uppercase',
  },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 14 * 1.5 },
  small: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 12.5 * 1.4 },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.3,
    letterSpacing: 11.5 * 0.06,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: fonts.mono, fontSize: 13 },
};
