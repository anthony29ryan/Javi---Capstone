import { StyleSheet, View } from 'react-native';

import { authColors } from '../theme/authTheme';

/**
 * The design's sticker: ink outline, a slight tilt and a hard drop shadow.
 * Android has no blur-free shadow, so the shadow is an ink copy drawn `drop`
 * px lower, with that much space kept below. Pressed, the face sinks onto it,
 * leaving a 1px edge, as the design's stickers do.
 */
export default function Sticker({ background, tilt, drop, corner, pressed, style, faceStyle, children }) {
  return (
    <View style={[{ marginBottom: drop, transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={[styles.shadow, { top: drop, bottom: -drop, borderRadius: corner }]} />
      <View
        style={[
          styles.face,
          { backgroundColor: background, borderRadius: corner },
          pressed && { transform: [{ translateY: drop - 1 }] },
          faceStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: authColors.stickerLine,
  },
  face: {
    borderWidth: 2,
    borderColor: authColors.stickerLine,
  },
});
