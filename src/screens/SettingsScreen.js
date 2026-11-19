import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import { displayReminderTime } from '../components/ReminderTimePicker';
import AuthToast from '../components/auth/AuthToast';
import TermsSheet from '../components/auth/TermsSheet';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useTextSize } from '../context/TextSizeContext';
import { syncDailyReminder } from '../services/notifications';
import { downloadsSize } from '../services/offline';
import { getPreferences, savePreferences } from '../services/preferences';
import { colors, fonts, spacing, type, centeredColumn, contentWidth } from '../theme/colors';
import { TEXT_SIZES } from '../theme/textScale';

// The "A" in each text size button, smallest to largest, as in the design.
const SIZE_GLYPHS = [13, 16, 19, 22];

function Toggle({ on, disabled }) {
  return (
    <View style={[styles.track, on && styles.trackOn, disabled && styles.trackDisabled]}>
      <View style={[styles.knob, on && styles.knobOn]} />
    </View>
  );
}

function Row({ title, subtitle, onPress, right, isLast, destructive, disabled }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowDivider,
        pressed && !disabled && styles.rowPressed,
      ]}
    >
      <View style={styles.rowBody}>
        <Text
          style={[
            styles.rowTitle,
            destructive && styles.rowTitleDestructive,
            disabled && styles.rowTitleDisabled,
          ]}
        >
          {title}
        </Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

function SkeletonRow({ toggle, isLast }) {
  return (
    <View style={[styles.row, !isLast && styles.rowDivider]}>
      <View style={[styles.rowBody, styles.skelLines]}>
        <Skeleton style={styles.skelTitle} />
        <Skeleton style={styles.skelSubtitle} />
      </View>
      {toggle ? <Skeleton style={styles.skelToggle} /> : null}
    </View>
  );
}

// The first three sections in grey while preferences load.
function SettingsSkeleton({ top }) {
  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: top }]}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.group}>
          <SkeletonRow toggle />
          <SkeletonRow isLast />
        </View>
        <Text style={styles.sectionLabel}>Reading</Text>
        <View style={[styles.sizeCard, styles.skelLines]}>
          <Skeleton style={styles.skelTitle} />
          <Skeleton style={styles.skelSegments} />
        </View>
        <Text style={styles.sectionLabel}>Offline</Text>
        <View style={styles.group}>
          <SkeletonRow />
          <SkeletonRow isLast />
        </View>
      </View>
    </View>
  );
}

/** Frame 43: the design's Reading section, for lesson and quiz text only. */
function TextSizePicker() {
  const { sizeId, setSizeId } = useTextSize();
  const current = TEXT_SIZES.find((size) => size.id === sizeId) ?? TEXT_SIZES[1];

  return (
    <View style={styles.sizeCard}>
      <View style={styles.sizeHead}>
        <Text style={styles.rowTitle}>Text size</Text>
        <Text style={styles.sizeLabel}>{current.label}</Text>
      </View>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {TEXT_SIZES.map((size, i) => {
          const on = size.id === sizeId;
          return (
            <Pressable
              key={size.id}
              onPress={() => setSizeId(size.id)}
              accessibilityRole="radio"
              accessibilityLabel={size.label}
              accessibilityState={{ selected: on }}
              style={[styles.segment, on && styles.segmentOn]}
            >
              {/* Fixed sizes: each button shows its own size, whatever is picked. */}
              <Text
                allowFontScaling={false}
                style={[styles.segmentGlyph, { fontSize: SIZE_GLYPHS[i] }, on && styles.segmentGlyphOn]}
              >
                A
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.sizeNote}>Lessons and quizzes use this size.</Text>
    </View>
  );
}

export default function SettingsScreen({ navigation, route }) {
  const { user, hasPassword } = useAuth();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);

  // Screens that send you back here say what changed: frame 78's Profile
  // details and Change password pass a toast, the reminder sheet its result.
  useEffect(() => {
    const reminder = route.params?.reminder;
    if (reminder) {
      setPreferences((current) => (current ? { ...current, ...reminder } : current));
      setToast(
        reminder.reminderEnabled
          ? `Reminder set for ${displayReminderTime(reminder.reminderTime)}`
          : "Time saved. The reminder is off: notifications aren't allowed for Javi."
      );
    } else if (route.params?.toast) {
      setToast(route.params.toast);
    }
  }, [route.params?.toastAt]);

  const [preferences, setPreferences] = useState(null);
  const [error, setError] = useState('');
  const { downloadedIds, removeAllDownloads } = useProgress();
  const [downloadBytes, setDownloadBytes] = useState(0);

  // Re-measured whenever the set of downloaded modules changes.
  useEffect(() => {
    downloadsSize()
      .then(setDownloadBytes)
      .catch(() => {});
  }, [downloadedIds]);

  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((loaded) => {
        if (!cancelled) setPreferences(loaded);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleReminder() {
    const next = !preferences.reminderEnabled;
    // Update on screen first so the switch does not lag behind the tap, then
    // reconcile: a refused permission prompt flips it back rather than
    // leaving the app claiming a reminder it cannot post.
    setPreferences((current) => ({ ...current, reminderEnabled: next }));

    const scheduled = await syncDailyReminder({
      reminderEnabled: next,
      reminderTime: preferences.reminderTime,
    });

    setPreferences((current) => ({ ...current, reminderEnabled: scheduled }));
    // The switch already shows the new value; offline the write stays queued and lands later.
    await savePreferences({ reminderEnabled: scheduled }).catch(() => {});
  }

  function confirmDeleteDownloads() {
    Alert.alert('Delete all downloads?', 'Lessons will need a connection until you download them again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeAllDownloads().catch(() => {}) },
    ]);
  }

  const downloadCount = downloadedIds.size;

  // A failed preferences read (usually offline) only disables the reminder row,
  // so downloads and log-out stay reachable without a connection.
  const top = insets.top + spacing.lg;
  if (!preferences && !error) return <SettingsSkeleton top={top} />;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: top, paddingBottom: spacing.xxl },
        ]}
      >
        {/* A tab now, so no back button: the title sits flush. */}
        <Text style={styles.title}>Settings</Text>
  
        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.group}>
          <Row
            title="Daily study reminder"
            subtitle={
              !preferences
                ? 'Connect to change your reminder'
                : preferences.reminderEnabled
                  ? `Daily nudge at ${displayReminderTime(preferences.reminderTime)}`
                  : 'Off — no reminder scheduled'
            }
            onPress={toggleReminder}
            right={<Toggle on={Boolean(preferences?.reminderEnabled)} disabled={!preferences} />}
            disabled={!preferences}
          />
          <Row
            title="Reminder time"
            subtitle={preferences ? `Daily at ${displayReminderTime(preferences.reminderTime)}` : 'Connect to change your reminder'}
            onPress={() =>
              navigation.navigate('ReminderSheet', { reminderTime: preferences.reminderTime })
            }
            right={<Text style={styles.chevron}>›</Text>}
            disabled={!preferences}
            isLast
          />
        </View>
  
        <Text style={styles.sectionLabel}>Reading</Text>
        <TextSizePicker />
  
        <Text style={styles.sectionLabel}>Offline</Text>
        <View style={styles.group}>
          <Row
            title="Downloaded modules"
            subtitle={
              downloadCount
                ? `${downloadCount} module${downloadCount === 1 ? '' : 's'} · ${Math.max(1, Math.round(downloadBytes / 1024))} KB`
                : 'None yet. Download a module from its course page.'
            }
            disabled={!downloadCount}
          />
          <Row
            title="Delete all downloads"
            onPress={confirmDeleteDownloads}
            destructive
            disabled={!downloadCount}
            isLast
          />
        </View>
  
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.group}>
          <Row
            title="Help & feedback"
            subtitle="Common questions and the app tour"
            onPress={() => navigation.navigate('Help')}
            right={<Text style={styles.chevron}>›</Text>}
          />
          <Row
            title="Terms & privacy"
            subtitle="Read the terms and privacy policy"
            onPress={() => setTermsOpen(true)}
            right={<Text style={styles.chevron}>›</Text>}
            isLast
          />
        </View>
  
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.group}>
          <Row
            title="Night study mode"
            // The handoff defines a full dark palette, but applying it means
            // re-checking every screen in a second theme, so it is deliberately
            // not wired up rather than half-applied.
            subtitle="Coming later — the app is light-only for now"
            right={<Toggle on={false} disabled />}
            disabled
          />
          <Row
            title="Profile details"
            subtitle={user?.email}
            onPress={() => navigation.navigate('ProfileDetails')}
            right={<Text style={styles.chevron}>›</Text>}
          />
          {/* A Google-only account has no password to change. */}
          {hasPassword ? (
            <Row
              title="Change password"
              subtitle="Set a new password for this account"
              onPress={() => navigation.navigate('ChangePassword')}
              right={<Text style={styles.chevron}>›</Text>}
            />
          ) : null}
          <Row title="Log out" onPress={() => navigation.navigate('LogOutSheet')} />
          <Row
            title="Delete account"
            subtitle="Removes your progress and quiz history"
            onPress={() => navigation.navigate('DeleteAccount')}
            right={<Text style={styles.chevronDestructive}>›</Text>}
            destructive
            isLast
          />
        </View>
      </ScrollView>

      <TermsSheet visible={termsOpen} onClose={() => setTermsOpen(false)} />
      <AuthToast message={toast} onHide={() => setToast('')} />
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
  title: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 22 * 1.2,
    letterSpacing: -0.22,
    color: colors.text,
  },
  sectionLabel: {
    ...type.sectionLabel,
    color: colors.textMuted,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPressed: {
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
  rowTitleDestructive: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: colors.error,
  },
  rowTitleDisabled: {
    color: colors.borderStrong,
  },
  rowSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11.5,
    lineHeight: 11.5 * 1.4,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chevron: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.borderStrong,
  },
  chevronDestructive: {
    fontFamily: fonts.mono,
    fontSize: 15,
    color: colors.error,
  },
  skelLines: {
    gap: 8,
  },
  skelTitle: {
    height: 14,
    width: '55%',
    borderRadius: 6,
  },
  skelSubtitle: {
    height: 10,
    width: '75%',
    borderRadius: 5,
  },
  skelToggle: {
    width: 46,
    height: 27,
    borderRadius: 14,
  },
  skelSegments: {
    height: 52,
    borderRadius: 14,
  },
  sizeCard: {
    padding: spacing.lg,
    gap: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizeHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  sizeLabel: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surfaceSunken,
  },
  segment: {
    flex: 1,
    height: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentGlyph: {
    fontFamily: fonts.bold,
    lineHeight: 26,
    color: colors.textMuted,
  },
  segmentGlyphOn: {
    color: colors.primaryDark,
  },
  sizeNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.textMuted,
  },
  track: {
    width: 46,
    height: 27,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  trackDisabled: {
    opacity: 0.5,
  },
  knob: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
});
