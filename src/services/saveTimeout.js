// Firestore resolves a write only once the server has it, which never happens
// offline, so screens would spin until reconnect. Give up after this long so
// they can say so; the write stays queued and lands on reconnect if the app is
// still open (Firestore's cache here is memory-only), so it is not "not saved".
// Kept free of Firebase imports so tests/saveTimeout.test.js runs under plain Node.
export const SAVE_TIMEOUT_MS = 10000;

/** Resolves or rejects like `write`, but rejects with code 'unavailable' if it has not settled in `ms`. */
export function withSaveTimeout(write, ms = SAVE_TIMEOUT_MS) {
  let timer;
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Saving timed out. Check your connection.');
      // The code Firestore itself uses offline, so screens that check for it say "offline".
      err.code = 'unavailable';
      reject(err);
    }, ms);
  });
  return Promise.race([write, timedOut]).finally(() => clearTimeout(timer));
}

// What a screen says when a save timed out offline. Checked on the emulator:
// a change shown as "Could not save" did land later, so the old wording was wrong.
export const OFFLINE_SAVE_MESSAGE = "You're offline. This will save when you reconnect, as long as Javi stays open.";

/** True for a save that is still queued (timed out offline), false for one that was refused. */
export function savesWhenOnline(err) {
  return err?.code === 'unavailable';
}
