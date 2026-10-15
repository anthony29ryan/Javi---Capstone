import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/auth/AuthButton';
import Mascot from '../components/Mascot';
import { formatDeletionDate } from '../constants/accountDeletion';
import { useAuth } from '../context/AuthContext';
import { authColors, authFonts, authSpacing, centeredColumn, contentWidth } from '../theme/authTheme';

/**
 * Frame 52, Welcome back · Restore: shown when someone logs in inside the
 * 30-day deletion window. Firebase is signed in but the app stays closed until
 * they choose. The design's third choice, "Start fresh", is left out: wiping
 * the data straight away needs a Cloud Function the app does not have.
 */
export default function RestoreAccountScreen({ navigation, route }) {
  const { restoreAccount, keepDeleted } = useAuth();
  const insets = useSafeAreaInsets();
  const { name, removalDate } = route.params;
  const date = formatDeletionDate(new Date(removalDate));

  const [choice, setChoice] = useState('restore');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // True once a choice has gone through, so leaving does not undo it.
  const settled = useRef(false);

  // Leaving any other way (the back gesture) counts as keeping it deleted,
  // so no half-open session outlives this screen.
  useEffect(
    () => () => {
      if (!settled.current) keepDeleted().catch(() => {});
    },
    []
  );

  const choices = [
    { id: 'restore', title: 'Restore my account', body: 'Everything comes back as you left it.' },
    { id: 'keep', title: 'Keep it deleted', body: `Log out. Your data is removed on ${date}.` },
  ];

  async function confirm() {
    setError('');
    setBusy(true);
    try {
      if (choice === 'restore') {
        // On success the navigator swaps to the app, unmounting this screen.
        settled.current = true;
        await restoreAccount();
      } else {
        settled.current = true;
        await keepDeleted();
        navigation.popToTop();
      }
    } catch {
      settled.current = false;
      setError(
        choice === 'restore'
          ? 'Could not restore your account. Check your connection and try again.'
          : 'Could not log out. Try again.'
      );
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + authSpacing.screenTop + 40,
          paddingBottom: insets.bottom + authSpacing.screenBottom,
        },
      ]}
    >
      <Mascot variant="greeting" px={88} animate={false} />
      <Text style={styles.title}>Welcome back{name ? `, ${name}` : ''}</Text>
      <Text style={styles.body}>
        Your account is set to be deleted on {date}. What would you like to do?
      </Text>

      <View style={styles.choices} accessibilityRole="radiogroup">
        {choices.map((option) => {
          const on = choice === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => setChoice(option.id)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[styles.card, on && styles.cardOn]}
            >
              <View style={[styles.ring, on && styles.ringOn]}>
                {on ? <View style={styles.dot} /> : null}
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardBody}>{option.body}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AuthButton
        label={choice === 'restore' ? 'Restore account' : 'Log out'}
        onPress={confirm}
        loading={busy}
        style={choice === 'keep' && styles.logOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.bg,
  },
  content: {
    ...centeredColumn(contentWidth.form),
    flexGrow: 1,
    paddingHorizontal: authSpacing.screenH,
  },
  title: {
    fontFamily: authFonts.bold,
    fontSize: 27,
    lineHeight: 27 * 1.2,
    letterSpacing: -0.54,
    color: authColors.ink,
    marginTop: 14,
  },
  body: {
    fontFamily: authFonts.regular,
    fontSize: 14.5,
    lineHeight: 14.5 * 1.6,
    color: authColors.ink2,
    marginTop: 8,
  },
  choices: {
    gap: 10,
    marginTop: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: authColors.surface,
    borderWidth: 2,
    borderColor: authColors.line,
  },
  cardOn: {
    borderColor: authColors.accent,
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: authColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  ringOn: {
    borderColor: authColors.accentDeep,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: authColors.accentDeep,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: authFonts.bold,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: authColors.ink,
  },
  cardBody: {
    fontFamily: authFonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: authColors.ink2,
    marginTop: 4,
  },
  spacer: {
    flex: 1,
    minHeight: 16,
  },
  error: {
    fontFamily: authFonts.medium,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: authColors.error,
    marginBottom: 12,
    marginHorizontal: 4,
  },
  logOut: {
    backgroundColor: authColors.ink,
  },
});
