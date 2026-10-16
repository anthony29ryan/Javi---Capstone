import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import Text from './AppText';
import Button from './Button';
import { colors, fonts, radius, spacing, type } from '../theme/colors';

/**
 * Javi is the app's learning companion. The card reads as Javi talking to the
 * learner, and the message reacts to their actual progress so it stays useful
 * instead of being the same greeting forever.
 */
function messageFor({ completed, percent, streak }) {
  if (completed === 0) {
    return "Java is a big language, but you don't have to take it all at once. Start with the Beginner tier and I'll keep track of where you are.";
  }

  if (percent >= 100) {
    return "That's every module finished. Worth circling back to anything that felt shaky, and the quizzes are still here when you want them.";
  }

  if (streak > 1) {
    return `${streak} days in a row now. You're ${percent}% through the course. Want to keep it going?`;
  }

  return `You're ${percent}% through the course. Pick up where you left off whenever you're ready.`;
}

export default function JaviCard({ completed = 0, percent = 0, streak = 0, onStart }) {
  const isNew = completed === 0;

  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Ionicons name="cafe" size={24} color={colors.white} />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.name}>Javi</Text>
          <Text style={styles.role}>Your Java learning companion</Text>
        </View>
      </View>

      <View style={styles.bubbleWrapper}>
        <View style={styles.bubbleTail} />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>
            {messageFor({ completed, percent, streak })}
          </Text>
        </View>
      </View>

      <Button
        label={isNew ? 'Start Learning' : 'Continue Learning'}
        onPress={onStart}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: -0.2,
  },
  role: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 1,
  },
  bubbleWrapper: {
    marginTop: spacing.lg,
  },
  // A small rotated square under the bubble's top edge reads as a speech
  // pointer, so the text is clearly Javi talking rather than page copy.
  bubbleTail: {
    position: 'absolute',
    top: -4,
    left: spacing.lg,
    width: 12,
    height: 12,
    backgroundColor: colors.primarySoft,
    transform: [{ rotate: '45deg' }],
  },
  bubble: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: colors.text,
  },
  button: {
    marginTop: spacing.lg,
  },
});
