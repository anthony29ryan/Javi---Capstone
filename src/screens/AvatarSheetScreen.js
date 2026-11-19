import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import BottomSheet from '../components/BottomSheet';
import { AVATAR_IDS, AVATARS } from '../constants/art';
import { useAuth } from '../context/AuthContext';
import { OFFLINE_SAVE_MESSAGE, savesWhenOnline } from '../services/saveTimeout';
import { colors, fonts, type } from '../theme/colors';

// A see-through screen in the root stack (presentation 'transparentModal')
// rather than a React Native Modal: on Android the Modal's own window stopped
// above the navigation bar, leaving a strip under the sheet. As a screen it
// lays out edge to edge like every other one, so the bottom inset is right.

/** Frame 24: pick one of the design's 12 avatars. */
export default function AvatarSheetScreen({ navigation }) {
  const { avatar, updateAvatar } = useAuth();
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState(avatar);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(close) {
    if (!picked || picked === avatar) {
      close();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateAvatar(picked);
      close();
    } catch (err) {
      setError(savesWhenOnline(err) ? OFFLINE_SAVE_MESSAGE : 'Could not save your avatar. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet onClosed={navigation.goBack} style={{ paddingBottom: insets.bottom + 24 }}>
      {(close) => (
        <>
          <Text style={styles.sheetTitle}>Choose your avatar</Text>
          <Text style={styles.sheetBody}>You can change this any time from your profile.</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_IDS.map((id) => (
              <View key={id} style={styles.avatarCell}>
                <Pressable
                  onPress={() => setPicked(id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Avatar ${id}`}
                  accessibilityState={{ selected: picked === id }}
                  style={[styles.avatarOption, picked === id && styles.avatarOptionOn]}
                >
                  <View style={styles.avatarClip}>
                    <SvgXml xml={AVATARS[id]} width="100%" height="100%" />
                  </View>
                </Pressable>
              </View>
            ))}
          </View>
          {error ? <Text style={styles.sheetError}>{error}</Text> : null}
          <View style={styles.sheetButtons}>
            <AuthButton label="Cancel" variant="secondary" onPress={close} style={styles.flex} />
            <AuthButton
              label="Save"
              loadingLabel="Saving…"
              onPress={() => save(close)}
              loading={saving}
              style={styles.flex}
            />
          </View>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 21 * 1.3,
    color: colors.text,
    marginHorizontal: 4,
  },
  sheetBody: {
    ...type.body,
    color: colors.textMuted,
    marginHorizontal: 4,
    marginTop: 6,
    marginBottom: 18,
  },
  // Four columns from quarter-width cells; the -6 margin cancels their padding.
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -6,
  },
  avatarCell: {
    width: '25%',
    padding: 6,
  },
  avatarOption: {
    aspectRatio: 1,
    borderRadius: 999,
    padding: 3,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarOptionOn: {
    borderColor: colors.primary,
  },
  avatarClip: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sheetError: {
    ...type.small,
    color: colors.error,
    marginTop: 14,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
});
