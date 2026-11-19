// Unit tests for the light and night palettes in src/theme/authTheme.js.
//
//   npm test

import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

// authTheme re-exports the bundled fonts, which only load inside the app.
const fonts = (...names) => ({ namedExports: Object.fromEntries(names.map((name) => [name, name])) });
mock.module(
  '@expo-google-fonts/outfit',
  fonts('Outfit_400Regular', 'Outfit_500Medium', 'Outfit_600SemiBold', 'Outfit_700Bold', 'Outfit_800ExtraBold')
);
mock.module('@expo-google-fonts/jetbrains-mono', fonts('JetBrainsMono_400Regular', 'JetBrainsMono_500Medium'));
mock.module('@expo-google-fonts/baloo-2', fonts('Baloo2_800ExtraBold'));

const { setNightMode } = await import('../src/theme/themeMode.js');
// As index.js does: the saved setting is applied before the palette is imported.
setNightMode(true);
const { authColors, lightColors, nightColors } = await import('../src/theme/authTheme.js');

test('both palettes define the same colours', () => {
  // A key missing from one palette is undefined there, so a style using it
  // would silently lose its colour in that theme.
  assert.deepEqual(Object.keys(nightColors).sort(), Object.keys(lightColors).sort());
});

test('night mode set before import picks the night palette', () => {
  assert.equal(authColors, nightColors);
});
