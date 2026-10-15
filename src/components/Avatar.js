import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { AVATARS } from '../constants/art';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, radius } from '../theme/colors';

function initialFor(user, name) {
  const source = name || user?.displayName || user?.email || '?';
  return source.trim().charAt(0).toUpperCase();
}

/**
 * Circular profile button: the avatar the user picked on Profile, or until
 * then their initial. Falls back to the email's first letter when no display
 * name is set, so it never renders blank.
 */
export default function Avatar({ user, name, onPress, size = 38 }) {
  const { avatar } = useAuth();
  const art = avatar ? AVATARS[avatar] : null;
  const dimensions = {
    width: size,
    height: size,
    borderRadius: radius.pill,
  };

  const content = art ? (
    <View style={[styles.picked, dimensions]}>
      <SvgXml xml={art} width={size} height={size} />
    </View>
  ) : (
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
  picked: {
    overflow: 'hidden',
  },
  initial: {
    color: colors.primaryDark,
    fontFamily: fonts.bold,
  },
  pressed: {
    opacity: 0.7,
  },
});
