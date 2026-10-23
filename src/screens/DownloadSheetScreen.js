import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import AuthButton from '../components/auth/AuthButton';
import BottomSheet from '../components/BottomSheet';
import { useProgress } from '../context/ProgressContext';
import { colors, fonts, type } from '../theme/colors';

const modulesLabel = (n) => `${n} module${n === 1 ? '' : 's'}`;

/**
 * Frame 54: tick a course's modules to save for offline reading. A see-through
 * root-stack screen, like AvatarSheetScreen. Rows show lesson counts rather
 * than the design's sizes: a module's size is unknown until it is fetched.
 * Saved modules are removed from Settings, all at once.
 */
export default function DownloadSheetScreen({ navigation, route }) {
  const { courseId } = route.params;
  const { modules, lessons, downloadedIds, downloadQueue, downloadModules } = useProgress();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(() => new Set());

  const courseModules = modules.filter((module) => module.courseId === courseId);
  const lessonCount = (moduleId) => lessons.filter((lesson) => lesson.moduleId === moduleId).length;
  const ids = courseModules.map((module) => module.id).filter((id) => selected.has(id));

  function toggle(id) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start(close) {
    // Not awaited: the Module screen shows the progress once the sheet closes.
    downloadModules(ids);
    close();
  }

  return (
    <BottomSheet onClosed={navigation.goBack} style={{ paddingBottom: insets.bottom + 20 }}>
      {(close) => (
        <>
          <Text style={styles.title}>Download for offline</Text>
          <Text style={styles.body}>Pick the modules you want to read without internet.</Text>

          {courseModules.map((module) => {
            const saved = downloadedIds.has(module.id);
            const queued = downloadQueue.includes(module.id);
            const locked = saved || queued;
            const on = !locked && selected.has(module.id);
            return (
              <Pressable
                key={module.id}
                onPress={() => toggle(module.id)}
                disabled={locked}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: locked }}
                style={styles.row}
              >
                {saved ? (
                  <View style={styles.savedMark}>
                    <Text style={styles.savedTick}>✓</Text>
                  </View>
                ) : (
                  <View style={[styles.box, on && styles.boxOn]}>
                    {on ? <Text style={styles.boxTick}>✓</Text> : null}
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={[styles.rowName, locked && styles.rowNameLocked]}>{module.title}</Text>
                  <Text style={styles.rowNote}>
                    Module {module.order} ·{' '}
                    {saved ? 'Already saved' : queued ? 'Downloading' : `${lessonCount(module.id)} lessons`}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          <Text style={styles.selectedLine}>
            {ids.length ? `${modulesLabel(ids.length)} selected` : 'Nothing selected'}
          </Text>
          <AuthButton
            label={ids.length ? `Download ${modulesLabel(ids.length)}` : 'Select modules'}
            onPress={() => start(close)}
            disabled={!ids.length}
          />
          <Text
            style={styles.link}
            suppressHighlighting
            accessibilityRole="link"
            onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' })}
          >
            Remove all downloads in Settings
          </Text>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.bold,
    fontSize: 21,
    lineHeight: 21 * 1.3,
    color: colors.text,
    marginHorizontal: 4,
  },
  body: {
    ...type.body,
    color: colors.textMuted,
    marginHorizontal: 4,
    marginTop: 6,
    marginBottom: 8,
  },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  savedMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTick: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textMuted,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  boxTick: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.white,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
    paddingVertical: 10,
  },
  rowName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 14 * 1.3,
    color: colors.text,
  },
  rowNameLocked: {
    color: colors.textMuted,
  },
  rowNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  selectedLine: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
    marginVertical: 14,
    marginHorizontal: 4,
  },
  link: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    padding: 12,
    marginTop: 8,
  },
});
