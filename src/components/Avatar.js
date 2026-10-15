import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '../theme/colors';

function initialFor(user, name) {
  const source = name || user?.displayName || user?.email || '?';
  return source.trim().charAt(0).toUpperCase();
}

/**
 * Circular profile button. Falls back to the email's first letter when no
 * display name is set, so it never renders blank.
 */
export default function Avatar({ user, name, onPress, size = 38 }) {
  const dimensions = {
    width: size,
    height: size,
    borderRadius: radius.pill,
  };

  const content = (
    <View style={[styles.circle, dimensions]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initialFor(user, name)}</Text>
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
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: colors.primaryDark,
    fontFamily: fonts.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
