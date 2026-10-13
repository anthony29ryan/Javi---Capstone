import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

/**
 * The Java tutor, built to the handoff's layout but not yet wired to anything.
 *
 * The tutor has to run from a Cloud Function: it needs an AI API key, and this
 * project's rule is that keys never reach the client. No function exists yet,
 * so rather than fake a conversation this screen shows the real chrome with an
 * honest unavailable state — the composer is visibly inert instead of
 * accepting text that would go nowhere.
 *
 * To finish it: send { question, moduleId } to a callable function, have that
 * function inject the current module's content as context (scoping the tutor
 * to Java and to the module being studied, per the project's rules), and
 * render the reply into the message list below.
 */
export default function TutorScreen() {
  // Tab screen with no nav header, so it owns its top inset.
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* One capped column, so the thread and the composer line up on tablets. */}
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.avatar} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Java tutor</Text>
            <Text style={styles.headerSubtitle}>Answers on the module you are studying</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.thread}>
          <View style={styles.notice}>
            <Text style={styles.noticeLabel}>Not available yet</Text>
            <Text style={styles.noticeBody}>
              The tutor answers from a cloud service that has not been set up on this project yet.
              The screen is built and waiting — once the service is running, questions asked here
              will be scoped to whichever module you are working through.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.chips}>
          {['Explain this module', 'Give me an example'].map((label) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.composer}>
          <View style={styles.input}>
            <Text style={styles.inputPlaceholder}>Ask about this module…</Text>
          </View>
          <View style={styles.send}>
            <Text style={styles.sendGlyph}>↑</Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  column: {
    ...centeredColumn(contentWidth.content),
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...type.cardTitle,
    color: colors.text,
  },
  headerSubtitle: {
    ...type.small,
    color: colors.borderStrong,
    marginTop: 3,
  },
  thread: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  notice: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  noticeLabel: {
    ...type.sectionLabel,
    color: colors.primaryDark,
    marginBottom: 6,
  },
  noticeBody: {
    ...type.body,
    color: colors.textMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingBottom: 10,
    opacity: 0.4,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    opacity: 0.4,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  inputPlaceholder: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.borderStrong,
  },
  send: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendGlyph: {
    fontFamily: fonts.mono,
    fontSize: 17,
    color: colors.white,
  },
});
