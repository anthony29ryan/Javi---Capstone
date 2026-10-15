import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline copies of course content, kept on the device in AsyncStorage.
 *
 * Two kinds of entry:
 * - one snapshot of the lists the app needs to start (progress, courses,
 *   modules, lesson summaries), saved automatically after every online load
 *   so the app can still open with no connection;
 * - one entry per module the learner chose to download, holding that
 *   module's full lessons.
 *
 * Firestore's JS SDK only caches in memory on React Native, so without this
 * nothing survives an app restart offline. The whole course is under 1 MB of
 * text, well inside what AsyncStorage handles.
 */

const SNAPSHOT_KEY = 'offline:snapshot';
const MODULE_PREFIX = 'offline:module:';

export async function saveSnapshot(data) {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(data));
}

export async function loadSnapshot() {
  return JSON.parse((await AsyncStorage.getItem(SNAPSHOT_KEY)) ?? 'null');
}

async function moduleKeys() {
  return (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(MODULE_PREFIX));
}

export async function getDownloadedModuleIds() {
  return (await moduleKeys()).map((key) => key.slice(MODULE_PREFIX.length));
}

export async function saveModule(moduleId, lessons) {
  await AsyncStorage.setItem(MODULE_PREFIX + moduleId, JSON.stringify(lessons));
}

export async function removeAllModules() {
  await AsyncStorage.multiRemove(await moduleKeys());
}

/** A downloaded lesson by id, or null when its module is not downloaded. */
export async function getDownloadedLesson(lessonId) {
  const entries = await AsyncStorage.multiGet(await moduleKeys());
  for (const [, value] of entries) {
    const found = JSON.parse(value ?? '[]').find((lesson) => lesson.id === lessonId);
    if (found) return found;
  }
  return null;
}

/** Rough size of the downloads in bytes: the stored text, one byte a character. */
export async function downloadsSize() {
  const entries = await AsyncStorage.multiGet(await moduleKeys());
  return entries.reduce((sum, [, value]) => sum + (value?.length ?? 0), 0);
}

/**
 * Rewrites every downloaded module from a fresh full lesson list, so a
 * content publish reaches downloads the next time the app loads online —
 * including lessons the publish removed, which simply drop out.
 */
export async function refreshDownloads(allLessons) {
  for (const moduleId of await getDownloadedModuleIds()) {
    // Checked per module so one removed while this runs is not written back.
    if ((await AsyncStorage.getItem(MODULE_PREFIX + moduleId)) === null) continue;
    await saveModule(
      moduleId,
      allLessons.filter((lesson) => lesson.moduleId === moduleId)
    );
  }
}

/** Everything offline, for sign-out: the snapshot holds this user's progress. */
export async function clearOfflineData() {
  const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith('offline:'));
  await AsyncStorage.multiRemove(keys);
}
