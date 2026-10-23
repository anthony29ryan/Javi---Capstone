import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import Collapsible, { Chevron } from '../components/Collapsible';
import FloatingBackButton from '../components/FloatingBackButton';
import Mascot from '../components/Mascot';
import { LEGAL_CONTACT } from '../constants/legal';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

// Rewritten from the design's list to match what the app actually does: no
// mini-projects, dark mode or link expiry, and the last quiz score, not the best.
const FAQS = [
  {
    question: 'What can I ask Javi?',
    answer:
      'Questions about the module you are studying. Javi stays on that module and on Java, and politely turns down anything else.',
  },
  {
    question: 'How many questions can I ask Javi?',
    answer:
      'Up to 30 a day. The count resets at midnight Philippine time. Lessons, quizzes and the code tracer still work after the limit.',
  },
  {
    question: 'What score do I need to pass a quiz?',
    answer:
      '75% or higher. Your last score is the one shown, so retaking a quiz replaces it. Below 75%, Javi suggests lessons to review first.',
  },
  {
    question: 'Why is Mark lesson complete greyed out?',
    answer: 'It unlocks once you scroll to the end of the lesson, so it is not tapped by accident.',
  },
  {
    question: 'How does my streak work?',
    answer:
      'Finish a lesson, quiz, trace or code challenge each day to keep it going. Missing a day starts it again. Playground runs do not count.',
  },
  {
    question: 'How many times can I run code?',
    answer:
      '20 challenge checks and 10 playground runs a day. Both reset at midnight Philippine time.',
  },
  {
    question: 'Can I study offline?',
    answer:
      'Only the modules you download, from a module page. Quizzes, Javi and the code runner need a connection.',
  },
  {
    question: 'How do I change the text size?',
    answer: 'Open Settings and pick a size under Reading. It changes lessons and quizzes.',
  },
  {
    question: 'I did not get the verification email',
    answer: 'Check your spam folder first, then send a new link from the Check your email screen.',
  },
];

/** Design frame 53, without its feedback form: replay the tour, FAQs, and a contact address. */
export default function HelpScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Help & feedback
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.popTo('MainTabs', { screen: 'Home', tour: true })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.replay, pressed && styles.pressed]}
        >
          <Mascot variant="greeting" px={36} decorative animate={false} />
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Replay the app tour</Text>
            <Text style={styles.rowSubtitle}>A 5-stop walk through the tabs</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Common questions</Text>
        <View style={styles.group}>
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <View key={faq.question} style={index < FAQS.length - 1 && styles.divider}>
                <Pressable
                  onPress={() => setOpenIndex(open ? -1 : index)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  style={({ pressed }) => [styles.question, pressed && styles.pressed]}
                >
                  <Text style={[styles.rowTitle, styles.rowBody]}>{faq.question}</Text>
                  <Chevron open={open} />
                </Pressable>
                <Collapsible open={open}>
                  <Text style={styles.answer}>{faq.answer}</Text>
                </Collapsible>
              </View>
            );
          })}
        </View>

        <Text style={styles.contact}>
          Questions or feedback? Write to{' '}
          <Text
            style={styles.link}
            accessibilityRole="link"
            onPress={() => Linking.openURL(`mailto:${LEGAL_CONTACT}`).catch(() => {})}
          >
            {LEGAL_CONTACT}
          </Text>
        </Text>
      </ScrollView>
      {/* Outside the scroll view so it stays put while the page scrolls. */}
      <FloatingBackButton onPress={() => navigation.goBack()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.form),
    paddingHorizontal: spacing.xl,
  },
  header: {
    // Room for the floating back button on the left.
    marginLeft: 40 + spacing.md,
    minHeight: 40,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 22 * 1.2,
    letterSpacing: -0.22,
    color: colors.text,
  },
  replay: {
    marginTop: spacing.xl,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: colors.text,
  },
  rowSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.textMuted,
    marginTop: 3,
  },
  chevron: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.borderStrong,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.borderStrong,
    marginTop: 22,
    marginBottom: 10,
  },
  group: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  question: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  answer: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.6,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  contact: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.6,
    color: colors.textMuted,
    marginTop: 14,
    marginHorizontal: spacing.xs,
  },
  link: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
});
