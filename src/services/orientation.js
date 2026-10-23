import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * Keeps every device upright, tablets included: the layouts are designed and
 * checked in portrait only. app.json says portrait too; this also covers
 * Expo Go, which runs under its own settings.
 */
export function lockToPortrait() {
  // Not every platform can lock (a desktop browser on web, for one). Failing
  // to lock just leaves the device free to rotate, which the scrolling and
  // width-capped layouts already cope with, so there is nothing to surface.
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
}
