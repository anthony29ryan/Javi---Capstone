import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenState from '../components/ScreenState';
import { useAuth } from '../context/AuthContext';
import { syncDailyReminder } from '../services/notifications';
import { getPreferences, savePreferences } from '../services/preferences';
import { colors, fonts, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

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

export default function SettingsScreen({ navigation }) {
  const { user, logOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [preferences, setPreferences] = useState(null);
  const [error, setError] = useState('');

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
    await savePreferences({ reminderEnabled: scheduled });
  }

  if (error) return <ScreenState error={error} />;
  if (!preferences) return <ScreenState loading />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
        ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Text style={styles.backGlyph}>←</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Text style={styles.sectionLabel}>Notifications</Text>
      <View style={styles.group}>
        <Row
          title="Daily study reminder"
          subtitle={
            preferences.reminderEnabled
              ? `Daily nudge at ${preferences.reminderTime}`
              : 'Off — no reminder scheduled'
          }
          onPress={toggleReminder}
          right={<Toggle on={preferences.reminderEnabled} />}
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
        <Row
          title="Change password"
          subtitle="Set a new password for this account"
          onPress={() => navigation.navigate('ChangePassword')}
          right={<Text style={styles.chevron}>›</Text>}
        />
        <Row title="Log out" onPress={logOut} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    backgroundColor: colors.primarySoft,
  },
  backGlyph: {
    fontFamily: fonts.mono,
    fontSize: 18,
    color: colors.text,
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
