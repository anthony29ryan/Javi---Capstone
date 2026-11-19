import { doc, getDoc, setDoc } from 'firebase/firestore';

import { auth, db } from './firebase';
import { withSaveTimeout } from './saveTimeout';

export const DEFAULT_REMINDER_TIME = '20:00';

const DEFAULTS = {
  reminderTime: DEFAULT_REMINDER_TIME,
  reminderEnabled: true,
  // Why the learner is studying Java. Set on Profile details, not at sign-up:
  // the handoff moved these off the setup screen so the profile editor is the
  // single owner of the value.
  goals: [],
  setupComplete: false,
};

/**
 * Preferences live on the user's own `users` document rather than in a
 * collection of their own, because they are a handful of fields read together
 * with the profile and never queried across users.
 */
export async function getPreferences() {
  const snapshot = await getDoc(doc(db, 'users', auth.currentUser.uid));
  return snapshot.exists() ? { ...DEFAULTS, ...snapshot.data() } : DEFAULTS;
}

export async function savePreferences(updates) {
  await withSaveTimeout(setDoc(doc(db, 'users', auth.currentUser.uid), updates, { merge: true }));
}
