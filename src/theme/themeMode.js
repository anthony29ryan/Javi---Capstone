// Whether Night study mode is on. index.js sets it from the saved setting
// before any screen file is imported, because every StyleSheet reads its
// colours once, at import. Kept free of React Native imports so tests can load it.

export const NIGHT_MODE_KEY = 'nightMode';

let night = false;

export function setNightMode(on) {
  night = on;
}

export function isNightMode() {
  return night;
}
