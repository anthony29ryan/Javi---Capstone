import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authColors } from '../theme/authTheme';
import { colors, fonts, type } from '../theme/colors';
import Text from './AppText';
import AuthButton from './auth/AuthButton';
import Mascot from './Mascot';

// Design frames 14–18, one per tab in the bar's order. Javi has no glyph in
// the bar, so its chip borrows the design's old Tutor glyph.
const STOPS = [
  {
    glyph: '~/',
    title: 'Home',
    body: 'Your next lesson, your streak, and lessons picked from your quiz scores. Open the app and carry on from here.',
  },
  {
    glyph: '[ ]',
    title: 'Courses',
    body: 'Beginner, Intermediate and Advanced, built from your lecture modules. Nothing is locked, so study in any order.',
  },
  {
    glyph: '>_',
    title: 'Javi',
    body: 'Ask Javi about the module you are studying. Up to 30 questions a day.',
  },
  {
    glyph: '?',
    title: 'Practice',
    body: 'Quizzes, code challenges, the code tracer and a playground. Your quiz scores decide what Home recommends next.',
  },
  {
    glyph: '.cfg',
    title: 'Settings',
    body: 'Reminders, text size and your account. Replay this tour from Help & feedback any time.',
  },
];

const DIM = 'rgba(20,22,34,0.62)';

// Keep in step with StickerBar in navigation/MainTabs.js: 8px side padding,
// five equal cells, 62px buttons with 6px under them, a 2px top border, and
// Javi's 52px face raised 24px above the bar.
const BAR_HEIGHT = 8 + 62 + 6 + 2;
const JAVI_RISE = 24;

/** Where a stop's ring goes, measured from the left and bottom edges. */
function ringFor(index, width, bottomInset) {
  const cell = (width - 16) / 5;
  const centreX = 8 + cell * (index + 0.5);
  return index === 2
    ? { centreX, centreY: bottomInset + 6 + 62 + JAVI_RISE - 26, size: 64 }
    : { centreX, centreY: bottomInset + 6 + 31, size: 76 };
}

/**
 * The first-time tour (design frames 13–18): a welcome card, then one coach
 * mark per tab with the rest of the screen dimmed. It is a plain view over the
 * tabs rather than a Modal, whose Android window stops short of the bottom
 * edge and would leave the tab bar undimmed. `onClose(sawAStop)` runs on
 * finishing, skipping or Back.
 */
export default function TourOverlay({ name, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // 0 is the welcome card; 1–5 are the stops.
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose(step > 0);
      return true;
    });
    return () => sub.remove();
  }, [step, onClose]);

  if (step === 0) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.dim]}>
        <ScrollView
          contentContainerStyle={[
            styles.welcomeScroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <View style={styles.welcome} accessibilityViewIsModal>
            <Mascot variant="greeting" px={132} decorative animate={false} />
            <Text style={styles.eyebrow}>Quick tour · 5 stops</Text>
            <Text style={styles.welcomeTitle} accessibilityRole="header">
              Welcome to Javi, {name}
            </Text>
            <Text style={styles.welcomeBody}>
              Your path is ready. Here is where everything lives, one tab at a time. It takes about
              20 seconds.
            </Text>
            <AuthButton label="Show me around" onPress={() => setStep(1)} style={styles.welcomeButton} />
            <Pressable
              onPress={() => onClose(false)}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>Skip, I will explore</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const stop = STOPS[step - 1];
  const last = step === STOPS.length;
  const ring = ringFor(step - 1, width, insets.bottom);
  const radius = ring.size / 2;
  // Wider than any distance from the hole to a screen edge, so the dim
  // reaches every corner.
  const spread = Math.max(width, height);
  const cardBottom = insets.bottom + BAR_HEIGHT + JAVI_RISE + 20;
  const arrowLeft = Math.min(Math.max(ring.centreX - 16 - 9, 24), width - 32 - 24 - 18);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* A circle with a border thick enough to cover the screen: the dim, with
          a see-through hole over the tab. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: ring.centreX - radius - spread,
          bottom: ring.centreY - radius - spread,
          width: 2 * (radius + spread),
          height: 2 * (radius + spread),
          borderRadius: radius + spread,
          borderWidth: spread,
          borderColor: DIM,
        }}
      />
      <View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            left: ring.centreX - radius,
            bottom: ring.centreY - radius,
            width: ring.size,
            height: ring.size,
            borderRadius: radius,
          },
        ]}
      />

      <View style={[styles.card, { bottom: cardBottom }]} accessibilityViewIsModal>
        <View style={[styles.arrow, { left: arrowLeft }]} />
        <View style={styles.cardHead}>
          <Mascot variant="thinking" px={52} decorative animate={false} />
          <View style={styles.chip}>
            <Text style={styles.chipGlyph}>{stop.glyph}</Text>
          </View>
          <Text style={styles.cardTitle} accessibilityRole="header">
            {stop.title}
          </Text>
        </View>
        <Text style={styles.cardBody}>{stop.body}</Text>

        <View style={styles.footer}>
          <View style={styles.dots} accessible accessibilityLabel={`Step ${step} of ${STOPS.length}`}>
            {STOPS.map((_, index) => (
              <View key={index} style={[styles.dot, index === step - 1 && styles.dotOn]} />
            ))}
          </View>
          {last ? null : (
            <Pressable
              onPress={() => onClose(true)}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.textButton}
            >
              <Text style={styles.textButtonLabel}>Skip</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => (last ? onClose(true) : setStep(step + 1))}
            accessibilityRole="button"
            style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
          >
            <Text style={styles.nextLabel}>{last ? 'Start learning' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: {
    backgroundColor: DIM,
  },
  welcomeScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  welcome: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  eyebrow: {
    ...type.sectionLabel,
    marginTop: 12,
    color: colors.primaryDark,
  },
  welcomeTitle: {
    ...type.screenTitle,
    marginTop: 8,
    textAlign: 'center',
    color: colors.text,
  },
  welcomeBody: {
    ...type.body,
    marginTop: 8,
    textAlign: 'center',
    color: colors.textMuted,
  },
  welcomeButton: {
    marginTop: 20,
  },
  textButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  textButtonLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.textMuted,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  arrow: {
    position: 'absolute',
    bottom: -9,
    width: 18,
    height: 18,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: authColors.ink,
    backgroundColor: colors.primary,
  },
  chipGlyph: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: authColors.ink,
  },
  cardTitle: {
    ...type.cardTitle,
    flexShrink: 1,
    color: colors.text,
  },
  cardBody: {
    ...type.body,
    marginTop: 10,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  dots: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  dotOn: {
    width: 18,
    backgroundColor: colors.primary,
  },
  next: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: colors.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPressed: {
    backgroundColor: colors.buttonPressed,
  },
  nextLabel: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    letterSpacing: 12.5 * 0.06,
    textTransform: 'uppercase',
    color: colors.white,
  },
});
