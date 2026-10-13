import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import Button from '../components/Button';
import TextField from '../components/TextField';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, type, centeredColumn, contentWidth } from '../theme/colors';

export default function EditProfileScreen({ navigation }) {
  const { user, updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const unchanged = displayName.trim() === (user?.displayName || '').trim();

  async function handleSave() {
    setError('');
    setSubmitting(true);
    try {
      await updateDisplayName(displayName.trim());
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <TextField
          label="Display name"
          placeholder="What should we call you?"
          hint="This is the name shown on your home screen."
          value={displayName}
          onChangeText={setDisplayName}
          autoFocus
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Save changes"
          onPress={handleSave}
          loading={submitting}
          disabled={unchanged || displayName.trim().length === 0}
          style={styles.submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...centeredColumn(contentWidth.form),
    padding: spacing.lg,
    gap: spacing.lg,
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorText: {
    ...type.small,
    color: colors.error,
    lineHeight: 19,
  },
  submit: {
    marginTop: spacing.xs,
  },
});
