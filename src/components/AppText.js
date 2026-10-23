import { Text, TextInput } from 'react-native';

// Text follows the phone's font size up to 1.5x. Past that, stickers, chips
// and the tab bar stop fitting; every screen is checked to fit at 1.5x.
export const MAX_FONT_SCALE = 1.5;

/**
 * React Native's Text with the app-wide font size cap. Screens import it as
 * `Text`, so their JSX is unchanged; a caller's own maxFontSizeMultiplier or
 * allowFontScaling still wins.
 */
export default function AppText(props) {
  return <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}

/** TextInput with the same cap. */
export function AppTextInput(props) {
  return <TextInput maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} />;
}
