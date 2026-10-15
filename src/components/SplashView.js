import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import Mascot from './Mascot';
import { colors, fonts } from '../theme/colors';

const HOP_MS = 900;
const HOP_STAGGER_MS = 144;
const ease = Easing.inOut(Easing.ease);

// One dot of the loader: up and bright in the first half of each 900ms
// cycle, resting dim for the second half, offset from its neighbours.
function HopDot({ index, still }) {
  const lift = useSharedValue(0);

  useEffect(() => {
    if (still) return;
    lift.value = withDelay(
      index * HOP_STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: HOP_MS / 4, easing: ease }),
          withTiming(0, { duration: HOP_MS / 4, easing: ease }),
          withTiming(0, { duration: HOP_MS / 2 })
        ),
        -1
      )
    );
  }, [still]);

  const animated = useAnimatedStyle(() => ({
    opacity: still ? 1 : 0.45 + lift.value * 0.55,
    transform: [{ translateY: lift.value * -8 }],
  }));

  return <Animated.View style={[styles.dot, animated]} />;
}

/** Shown while the app works out who is signed in: mascot, wordmark, loader. */
export default function SplashView() {
  const still = useReducedMotion();

  return (
    <View style={styles.screen}>
      <Mascot variant="greeting" px={168} />
      <Text style={styles.wordmark} accessibilityLabel="Javi">
        Ja<Text style={styles.wordmarkVi}>vi</Text>
      </Text>
      <View style={styles.loader} accessibilityRole="progressbar" accessibilityLabel="Loading">
        <Text style={styles.brace}>{'{'}</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <HopDot key={i} index={i} still={still} />
          ))}
        </View>
        <Text style={styles.brace}>{'}'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    padding: 24,
    backgroundColor: colors.background,
  },
  wordmark: {
    fontFamily: fonts.wordmark,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -48 * 0.01,
    paddingTop: 6,
    color: colors.text,
  },
  wordmarkVi: {
    color: colors.button,
  },
  loader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 32,
  },
  brace: {
    fontFamily: fonts.mono,
    fontSize: 26,
    color: colors.borderStrong,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
