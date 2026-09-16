// Design tokens for the pre-authentication flow (Welcome, Log in, Sign up,
// Check your email, Forgot password, Set a new password), taken from the
// "Javi — Authentication flow" design handoff.
//
// This is intentionally a SEPARATE palette from `theme/colors.js` (the coffee
// theme used everywhere past sign-in) rather than a replacement for it. The
// handoff only covers the pre-auth screens, so merging the two here would
// either overwrite the coffee theme the rest of the app already depends on,
// or silently blend two unrelated designs. Once the rest of the app is
// redesigned to match, these two files should be reconciled into one.
//
// Only the light theme is implemented for now — the handoff also defines a
// "Night study mode" dark theme, but wiring an app-wide theme toggle is a
// separate feature (Settings screen, persisted preference, everything else
// in the app re-themed too) and out of scope for just these three screens.
export const authColors = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  surface2: '#EFEDE7',

  ink: '#2E3141',
  ink2: '#6B6E7F',
  muted: '#A1A4B2',

  accent: '#C88B7A',
  accentDeep: '#A8563F',
  accentSoft: '#F7ECE7',

  line: 'rgba(46,49,65,.09)',

  error: '#D3736A',
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

// Font family keys, once loaded via useFonts() in the auth navigator.
export const authFonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
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
export { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
export { JetBrainsMono_400Regular, JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
