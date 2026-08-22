import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '../theme/colors';

function initialFor(user) {
  const source = user?.displayName || user?.email || '?';
  return source.trim().charAt(0).toUpperCase();
}

/**
 * Circular profile button. Falls back to the email's first letter when no
 * display name is set, so it never renders blank.
 */
export default function Avatar({ user, onPress, size = 38 }) {
  const dimensions = {
    width: size,
    height: size,
    borderRadius: radius.pill,
  };

  const content = (
    <View style={[styles.circle, dimensions]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initialFor(user)}</Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.white,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
