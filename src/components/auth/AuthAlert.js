import { Pressable, StyleSheet, Text, View } from 'react-native';

import { authColors, authFonts } from '../../theme/authTheme';

const TONES = {
  danger: { bg: authColors.errorSoft, border: authColors.errorLine, fg: authColors.error, dot: authColors.error },
  warn: { bg: authColors.warnSoft, border: authColors.warnLine, fg: authColors.warnInk, dot: authColors.warn },
};

/**
 * The design's banner for problems that are not about one field: an account
 * that already exists, no connection, a server failure. `tone` is 'danger'
 * (red) or 'warn' (amber); `action` + `onAction` add a button under the text.
 */
export default function AuthAlert({ tone = 'danger', title, body, action, onAction, style }) {
  const colors = TONES[tone];

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors.bg, borderColor: colors.border }, style]}
    >
      <View style={[styles.dot, { backgroundColor: colors.dot }]}>
        <Text style={styles.dotMark}>!</Text>
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.fg }]}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {action ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            style={({ pressed }) => [styles.action, { borderColor: colors.border }, pressed && styles.actionPressed]}
          >
            <Text style={[styles.actionLabel, { color: colors.fg }]}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMark: {
    fontFamily: authFonts.extraBold,
    fontSize: 12,
    color: authColors.bg,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontFamily: authFonts.bold,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.35,
  },
  body: {
    fontFamily: authFonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.55,
    color: authColors.ink,
  },
  action: {
    alignSelf: 'flex-start',
    marginTop: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    backgroundColor: authColors.surface,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionLabel: {
    fontFamily: authFonts.bold,
    fontSize: 11.5,
    letterSpacing: 11.5 * 0.06,
    textTransform: 'uppercase',
  },
});
