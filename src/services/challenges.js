import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocsFromServer } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from './firebase';

// Grading lives in the runChallenge Cloud Function, which holds the Judge0
// key and the hidden tests; the app only ever sees the example.
const runChallengeFunction = httpsCallable(functions, 'runChallenge', { timeout: 120000 });
const runCodeFunction = httpsCallable(functions, 'runCode', { timeout: 120000 });

const DRAFT_PREFIX = 'challengeDraft:';
export const PLAYGROUND_DRAFT_KEY = 'playgroundDraft';

const byLevelThenOrder = (courseOrder) => (a, b) =>
  (courseOrder.get(a.level) ?? 99) - (courseOrder.get(b.level) ?? 99) || a.order - b.order;

let cachedChallenges = null;

/**
 * All challenges, Beginner first then by order. Read once per app session:
 * the list only changes on a content publish, and Practice, Profile and the
 * list screen all need it.
 */
export function getChallenges(courses) {
  // From the server, as in content.js: offline, getDocs answers with an empty
  // cache, which would then be kept as "no challenges" for the whole session.
  cachedChallenges ??= getDocsFromServer(collection(db, 'challenges'))
    .then((snapshot) => snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    .catch((err) => {
      cachedChallenges = null; // let the next visit try again
      throw err;
    });
  const courseOrder = new Map(courses.map((course, i) => [course.id, i]));
  return cachedChallenges.then((list) => [...list].sort(byLevelThenOrder(courseOrder)));
}

/** Runs the code against the example ('run') or every test ('submit'). See functions/index.js. */
export async function runChallenge(challengeId, code, mode) {
  const { data } = await runChallengeFunction({ challengeId, code, mode });
  return data;
}

export async function runCode(code, stdin) {
  const { data } = await runCodeFunction({ code, stdin });
  return data;
}

// A dropped connection reaches the app as 'internal' (the SDK's status 0), not only 'unavailable'.
const CONNECTION_CODES = ['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal'];

/** What a failed runChallenge or runCode call means for the screen. */
export function describeRunError(err) {
  // One code covers several refusals; the server's message says which.
  if (err.code === 'functions/resource-exhausted') {
    const label = /high traffic/.test(err.message)
      ? 'Server busy' // the app-wide daily or monthly budget
      : /Slow down/.test(err.message)
        ? 'Too fast'
        : /reset at midnight/.test(err.message)
          ? 'Daily limit'
          : 'Runner busy';
    return { status: 'refused', label, message: err.message };
  }
  if (CONNECTION_CODES.includes(err.code)) return { status: 'offline' };
  return { status: 'refused', label: 'Could not run', message: err.message };
}

// Drafts stay on this phone only. A draft is what makes a challenge "In progress".

export function loadDraft(challengeId) {
  return AsyncStorage.getItem(DRAFT_PREFIX + challengeId);
}

export function saveDraft(challengeId, code) {
  return AsyncStorage.setItem(DRAFT_PREFIX + challengeId, code);
}

export function clearDraft(challengeId) {
  return AsyncStorage.removeItem(DRAFT_PREFIX + challengeId);
}

/** Ids of the challenges with a saved draft. */
export async function getDraftIds() {
  const keys = await AsyncStorage.getAllKeys();
  return new Set(keys.filter((key) => key.startsWith(DRAFT_PREFIX)).map((key) => key.slice(DRAFT_PREFIX.length)));
}
