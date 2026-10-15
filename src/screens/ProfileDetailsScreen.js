import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import AuthToast from '../components/auth/AuthToast';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../context/AuthContext';
import { getPreferences, savePreferences } from '../services/preferences';
import { authColors, authRadius, authSpacing, authType, authFonts, centeredColumn, contentWidth } from '../theme/authTheme';

// The handoff removed these from the setup screen and left them here, so this
// editor is the only place the value is set.
const GOALS = ['Exam prep', 'Class requirement', 'Build an app', 'Internship', 'Curiosity'];

export default function ProfileDetailsScreen({ navigation }) {
  const { user, updateDisplayName, nickname, updateNickname } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.displayName ?? '');
  // Lives only on the profile document, so it arrives with the goals below.
  const [lastName, setLastName] = useState('');
  const [nick, setNick] = useState(nickname || user?.displayName || '');
  const [goals, setGoals] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((preferences) => {
        if (cancelled) return;
        setGoals(preferences.goals ?? []);
        setLastName(preferences.lastName ?? '');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleGoal(goal) {
    setGoals((current) =>
      current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]
    );
  }

  async function handleSave() {
    setError('');

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Enter your first name.');
      return;
    }
    // Accounts made before last names were asked for fill it in here.
    const trimmedLast = lastName.trim();
    if (!trimmedLast) {
      setError('Enter your last name.');
      return;
    }
    const trimmedNick = nick.trim();
    if (!trimmedNick) {
      setError('Enter your nickname.');
      return;
    }

    setSaving(true);
    try {
      if (trimmed !== user?.displayName) await updateDisplayName(trimmed);
      await savePreferences({ goals, lastName: trimmedLast });
      // Through the context, so greetings pick up the new nickname at once.
      if (trimmedNick !== nickname) await updateNickname(trimmedNick);
      setToast('Profile saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (goals === null) return error ? <ScreenState error={error} /> : <ScreenState loading />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthAnimatedScreen>
        <ScrollView contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + authSpacing.screenTop, paddingBottom: insets.bottom + authSpacing.screenBottom },
          ]} keyboardShouldPersistTaps="handled">
          <AuthBackButton onPress={() => navigation.goBack()} />

          <Text style={styles.title}>Profile details</Text>

          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnly}>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <Text style={styles.hint}>
            Your email is what you sign in with and cannot be changed here.
          </Text>

          <Text style={styles.label}>Your name</Text>
          <AuthTextField
            placeholder="First name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setError('');
            }}
          />
          <AuthTextField
            placeholder="Last name"
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              setError('');
            }}
            style={styles.lastName}
          />

          <Text style={styles.label}>What should we call you?</Text>
          <AuthTextField
            placeholder="Nickname"
            value={nick}
            onChangeText={(value) => {
              setNick(value);
              setError('');
            }}
          />

          <Text style={styles.label}>Why you are learning Java</Text>
          <View style={styles.chips}>
            {GOALS.map((goal) => {
              const selected = goals.includes(goal);
              return (
                <Pressable
                  key={goal}
                  onPress={() => toggleGoal(goal)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {goal}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <AuthButton label="Save Changes" onPress={handleSave} loading={saving} style={styles.submit} />
        </ScrollView>
      </AuthAnimatedScreen>

      <AuthToast message={toast} onHide={() => setToast('')} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  lastName: {
    marginTop: 12,
  },
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
    ...authType.screenTitle,
    color: authColors.ink,
    marginTop: 26,
    marginBottom: 22,
  },
  label: {
    ...authType.eyebrow,
    color: authColors.muted,
    marginBottom: 10,
    marginTop: 22,
  },
  readOnly: {
    height: 56,
    borderRadius: authRadius.field,
    backgroundColor: authColors.surface2,
    borderWidth: 1,
    borderColor: authColors.line,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  email: {
    ...authType.mono,
    color: authColors.ink2,
  },
  hint: {
    ...authType.helper,
    color: authColors.muted,
    marginTop: 8,
    marginHorizontal: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: authColors.line,
    backgroundColor: authColors.surface,
  },
  chipSelected: {
    borderColor: authColors.accent,
    backgroundColor: authColors.accentSoft,
  },
  chipLabel: {
    fontFamily: authFonts.semiBold,
    fontSize: 13,
    color: authColors.ink,
  },
  chipLabelSelected: {
    color: authColors.accentDeep,
  },
  error: {
    ...authType.helper,
    color: authColors.error,
    marginTop: 14,
    marginHorizontal: 4,
  },
  submit: {
    marginTop: 22,
  },
});
