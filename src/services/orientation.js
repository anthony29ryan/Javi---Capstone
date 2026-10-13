import { Dimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

// Android's own cutoff between phone and tablet layouts ("sw600dp"): a screen
// whose shorter side is at least 600dp counts as a tablet.
const TABLET_MIN_SHORT_SIDE = 600;

/**
 * app.json allows every orientation, because a single config value cannot
 * tell a phone from a tablet. This narrows it back down on phones: tablets
 * keep rotating freely, phones stay upright.
 *
 * It measures the physical screen rather than the app window, since the
 * window shrinks in split-screen and would make a tablet look like a phone.
 * The shorter side is used so the answer is the same whichever way the
 * device happens to be held when the app starts.
 */
export function lockPhonesToPortrait() {
  const { width, height } = Dimensions.get('screen');
  if (Math.min(width, height) >= TABLET_MIN_SHORT_SIDE) return;

  // Not every platform can lock (a desktop browser on web, for one). Failing
  // to lock just leaves the phone free to rotate, which the scrolling and
  // width-capped layouts already cope with, so there is nothing to surface.
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
}
