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
// Only the light theme is implemented for now — the handoff also defines a
// "Night study mode" dark theme, but wiring an app-wide theme toggle is a
// separate feature (Settings screen, persisted preference, everything else
// in the app re-themed too).
export const authColors = {
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

  error: '#B4483E',
  errorSoft: '#FBE9E5',
  success: '#5EB78D',

  white: '#FFFFFF',
  toastBg: '#333242',
};

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
  wordmark: {
    fontFamily: authFonts.bold,
    fontSize: 26,
    letterSpacing: 26 * 0.16,
    textTransform: 'uppercase',
  },
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
