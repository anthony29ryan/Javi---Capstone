import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthBackButton from '../components/auth/AuthBackButton';
import AuthButton from '../components/auth/AuthButton';
import AuthTextField from '../components/auth/AuthTextField';
import ScreenState from '../components/ScreenState';
import { useAuth } from '../context/AuthContext';
import { getPreferences, savePreferences } from '../services/preferences';
import { authColors, authRadius, authSpacing, authType, authFonts, centeredColumn, contentWidth } from '../theme/authTheme';

/** Frame 46, with frame 91's "Discard your changes?" sheet on leaving with edits. */
export default function ProfileDetailsScreen({ navigation }) {
  const { user, updateDisplayName, nickname, updateNickname } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.displayName ?? '');
  // Lives only on the profile document, so it arrives after a read.
  const [lastName, setLastName] = useState('');
  const [nick, setNick] = useState(nickname || user?.displayName || '');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  // One message per empty field, shown all at once under each.
  const [fieldErrors, setFieldErrors] = useState({});
  // A save that Firebase refused.
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  // What the fields held on arrival, so edits can be told apart from no change.
  const initial = useRef(null);

  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((preferences) => {
        if (cancelled) return;
        const last = preferences.lastName ?? '';
        setLastName(last);
        initial.current = { name: name.trim(), lastName: last.trim(), nick: nick.trim() };
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
    // Runs once: the starting values are what the fields hold on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty =
    loaded &&
    (name.trim() !== initial.current.name ||
      lastName.trim() !== initial.current.lastName ||
      nick.trim() !== initial.current.nick);

  const leave = useCallback(() => {
    if (!dirty) {
      navigation.goBack();
      return;
    }
    navigation.navigate('LeaveSheet', {
      kicker: 'Unsaved changes',
      title: 'Discard your changes?',
      body: 'You edited your profile but did not save. Leaving now puts it back the way it was.',
      confirmLabel: 'Discard changes',
      keepLabel: 'Keep editing',
    });
  }, [dirty, navigation]);

  // Android back asks first too, but only while there is something to lose.
  useFocusEffect(
    useCallback(() => {
      if (!dirty) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leave();
        return true;
      });
      return () => sub.remove();
    }, [dirty, leave])
  );

  function edit(setter, field) {
    return (value) => {
      setter(value);
      setSaveError('');
      if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
    };
  }

  async function handleSave() {
    setSaveError('');
    const trimmed = name.trim();
    // Accounts made before last names were asked for fill it in here.
    const trimmedLast = lastName.trim();
    const trimmedNick = nick.trim();

    const errors = {
      name: trimmed ? undefined : 'Enter your first name.',
      lastName: trimmedLast ? undefined : 'Enter your last name.',
      nick: trimmedNick ? undefined : 'Enter your nickname.',
    };
    setFieldErrors(errors);
    if (errors.name || errors.lastName || errors.nick) return;

    setSaving(true);
    try {
      if (trimmed !== user?.displayName) await updateDisplayName(trimmed);
      if (trimmedLast !== initial.current.lastName) await savePreferences({ lastName: trimmedLast });
      // Through the context, so greetings pick up the new nickname at once.
      if (trimmedNick !== nickname) await updateNickname(trimmedNick);
      // Frame 78: back to Settings, which shows the confirmation.
      navigation.popTo('MainTabs', {
        screen: 'Settings',
        params: { toast: 'Profile updated', toastAt: Date.now() },
      });
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return loadError ? <ScreenState error={loadError} /> : <ScreenState loading />;

  const top = insets.top + authSpacing.screenTop;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AuthAnimatedScreen>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: top, paddingBottom: insets.bottom + authSpacing.screenBottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Indented to clear the floating back button, which reserves no space. */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile details</Text>
          </View>

          <Text style={styles.label}>Your name</Text>
          <AuthTextField
            placeholder="First name"
            value={name}
            onChangeText={edit(setName, 'name')}
            error={fieldErrors.name}
          />
          <AuthTextField
            placeholder="Last name"
            value={lastName}
            onChangeText={edit(setLastName, 'lastName')}
            error={fieldErrors.lastName}
            style={styles.lastName}
          />

          <Text style={styles.label}>What should we call you?</Text>
          <AuthTextField
            placeholder="Nickname"
            value={nick}
            onChangeText={edit(setNick, 'nick')}
            error={fieldErrors.nick}
          />

          <Text style={styles.label}>Email</Text>
          <View style={styles.readOnly}>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
          <Text style={styles.hint}>
            Your email is what you sign in with and cannot be changed here.
          </Text>

          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}

          <AuthButton
            label="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={!dirty}
            style={styles.submit}
          />
        </ScrollView>
      </AuthAnimatedScreen>

      <AuthBackButton onPress={leave} style={[styles.back, { top }]} />
    </KeyboardAvoidingView>
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
  back: {
    position: 'absolute',
    left: authSpacing.screenH,
    zIndex: 2,
    shadowColor: authColors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 3,
  },
  header: {
    // Clears the floating back button: 40px plus the design's 12px gap.
    marginLeft: 52,
    minHeight: 40,
    justifyContent: 'center',
  },
  title: {
    fontFamily: authFonts.bold,
    fontSize: 22,
    lineHeight: 22 * 1.2,
    letterSpacing: -0.22,
    color: authColors.ink,
  },
  label: {
    ...authType.eyebrow,
    color: authColors.muted,
    marginBottom: 8,
    marginTop: 22,
  },
  lastName: {
    marginTop: 12,
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
  error: {
    ...authType.helper,
    color: authColors.error,
    marginTop: 14,
    marginHorizontal: 4,
  },
  submit: {
    marginTop: 24,
  },
});
