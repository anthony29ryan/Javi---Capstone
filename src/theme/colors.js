// Coffee/Java-inspired palette. Everything screen-level styling reads from
// here, so swapping the whole app's look later is a one-file edit instead of
// hunting through every screen.

export const colors = {
  background: '#F7F0E6', // warm cream page background
  surface: '#FFFFFF', // cards, inputs, sheets sitting on the background
  surfaceSunken: '#F0E6D8', // subtly recessed areas, progress track

  primary: '#8C4A2F', // roasted coffee - main buttons, active elements
  primaryDark: '#6B3620', // espresso - pressed states, headers
  primaryLight: '#D9A066', // caramel - softer accents, secondary highlights
  primarySoft: '#F0E2D2', // tinted fill for selected/secondary surfaces

  text: '#3B2A20', // dark coffee brown, replaces pure black
  textMuted: '#8A7568', // warm taupe, secondary/help text

  border: '#E5D6C3', // light tan borders and dividers
  borderStrong: '#D6C1A8', // emphasized borders, input focus

  success: '#6B8E5A', // muted sage, correct answers
  successBg: '#E4EEDF',
  error: '#B5533C', // muted rust, errors and wrong answers
  errorBg: '#F5E1DA',

  codeBg: '#2B211B', // warm near-black for code blocks
  codeText: '#EDE3D9',

  white: '#FFFFFF',
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
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

export const type = {
  screenTitle: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 23 },
  small: { fontSize: 13 },
};
