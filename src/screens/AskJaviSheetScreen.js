import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import BottomSheet from '../components/BottomSheet';
import Mascot from '../components/Mascot';
import TutorChat from '../components/TutorChat';
import { colors, fonts, spacing } from '../theme/colors';

/**
 * Frame 26's Ask Javi sheet, opened from a lesson's Javi button. The same
 * module thread as the Javi tab, so the link at the top opens it there.
 * Dragged by its top strip only, so the chat can scroll.
 */
export default function AskJaviSheetScreen({ navigation, route }) {
  const { moduleId, moduleTitle, topic } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <BottomSheet
      onClosed={navigation.goBack}
      handleOnly
      // A share of the screen, so it shrinks when the keyboard resizes the window.
      style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
    >
      {(close) => (
        <TutorChat
          moduleId={moduleId}
          topic={topic}
          header={
            <View style={styles.head}>
              <View style={styles.headRow}>
                <View style={styles.avatar}>
                  <Mascot variant="thinking" px={34} decorative animate={false} />
                </View>
                <View style={styles.headText}>
                  <Text style={styles.title}>Ask Javi</Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    Answers on {moduleTitle}
                  </Text>
                </View>
                <Pressable
                  onPress={close}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
                >
                  <Text style={styles.closeGlyph}>×</Text>
                </Pressable>
              </View>
              <Text
                style={styles.link}
                suppressHighlighting
                accessibilityRole="link"
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Tutor',
                    params: { moduleId, openedAt: Date.now() },
                  })
                }
              >
                See the whole chat in Javi ›
              </Text>
            </View>
          }
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: '80%',
  },
  head: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 15 * 1.2,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.2,
    color: colors.borderStrong,
    marginTop: 3,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: 0.7,
  },
  closeGlyph: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.textMuted,
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: 10.5,
    letterSpacing: 10.5 * 0.08,
    textTransform: 'uppercase',
    color: colors.primaryDark,
    paddingTop: spacing.md,
    alignSelf: 'flex-start',
  },
});
