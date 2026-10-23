// The reading text size picked in Settings. Kept free of React Native imports
// so tests/textScale.test.js can run it under plain Node.

export const TEXT_SIZES = [
  { id: 's', label: 'Small', scale: 0.9 },
  { id: 'm', label: 'Default', scale: 1 },
  { id: 'l', label: 'Large', scale: 1.15 },
  { id: 'xl', label: 'Extra large', scale: 1.3 },
];

const SCALED_PROPS = ['fontSize', 'lineHeight', 'letterSpacing'];

/**
 * A copy of a StyleSheet with the text sizes in `keys` multiplied by `scale`.
 * Everything else (colours, padding, styles without text sizes) is untouched,
 * and at scale 1 the original object comes back as is.
 */
export function scaleStyles(styles, scale, keys = Object.keys(styles)) {
  if (scale === 1) return styles;
  const scaled = { ...styles };
  for (const key of keys) {
    const style = styles[key];
    if (!style) continue;
    const next = { ...style };
    for (const prop of SCALED_PROPS) {
      if (typeof style[prop] === 'number') next[prop] = style[prop] * scale;
    }
    scaled[key] = next;
  }
  return scaled;
}
