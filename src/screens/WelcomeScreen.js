import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthButton from '../components/auth/AuthButton';
import { authColors, authType } from '../theme/authTheme';

const MASCOT_SIZE = 210;

// Diagonal stripe placeholder for the not-yet-supplied mascot art. Built with
// react-native-svg (already a dependency elsewhere in the app) since plain
// StyleSheet has no way to draw a repeating diagonal pattern.
function MascotPlaceholder() {
  return (
    <View style={styles.mascotWrap}>
      <Svg width={MASCOT_SIZE} height={MASCOT_SIZE}>
        <Defs>
          <Pattern id="mascotStripes" patternUnits="userSpaceOnUse" width={18} height={18} patternTransform="rotate(135)">
            <Rect width={9} height={18} fill={authColors.surface2} />
          </Pattern>
        </Defs>
        <Circle
          cx={MASCOT_SIZE / 2}
          cy={MASCOT_SIZE / 2}
          r={MASCOT_SIZE / 2 - 1}
          fill="url(#mascotStripes)"
          stroke={authColors.line}
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </Svg>
      <View style={styles.mascotCaptionWrap} pointerEvents="none">
        <Text style={styles.mascotCaption}>APP MASCOT{'\n'}DROP ART HERE</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <AuthAnimatedScreen style={styles.animated}>
        <Text style={styles.wordmark}>JAVI</Text>

        <View style={styles.mascotArea}>
          <MascotPlaceholder />
        </View>

        <Text style={styles.headline}>Learn Java at your own pace</Text>
        <Text style={styles.body}>Ten minutes a day is enough. Start with one lesson today.</Text>

        <AuthButton label="Sign Up" onPress={() => navigation.navigate('Signup')} />

        <Pressable
          onPress={() => navigation.navigate('Login')}
          hitSlop={6}
          style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
        >
          <Text style={styles.footerText}>
            ALREADY HAVE AN ACCOUNT? <Text style={styles.footerAccent}>LOG IN</Text>
          </Text>
        </Pressable>
      </AuthAnimatedScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.bg,
  },
  animated: {
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 32,
    // Only the wordmark, mascot, and footer are centered per the design —
    // the headline/body/button are a left-aligned, full-width block, so this
    // wrapper stays at the default stretch alignment rather than centering
    // everything.
  },
  wordmark: {
    ...authType.wordmark,
    color: authColors.ink,
    textAlign: 'center',
    paddingTop: 8,
  },
  mascotArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotWrap: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotCaptionWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  mascotCaption: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    letterSpacing: 10 * 0.08,
    textTransform: 'uppercase',
    color: authColors.muted,
    textAlign: 'center',
    lineHeight: 15,
  },
  headline: {
    ...authType.welcomeHeadline,
    color: authColors.ink,
    maxWidth: 300,
  },
  body: {
    ...authType.welcomeBody,
    color: authColors.ink2,
    maxWidth: 300,
    marginTop: 8,
    marginBottom: 26,
  },
  footer: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 10,
  },
  footerPressed: {
    opacity: 0.6,
  },
  footerText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    letterSpacing: 12 * 0.08,
    textTransform: 'uppercase',
    color: authColors.muted,
  },
  footerAccent: {
    color: authColors.accentDeep,
  },
});
