import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { auth, db, functions } from './firebase';
import { advanceStreak } from './streak';

const EMPTY_PROGRESS = {
  completedLessons: [],
  completedTraces: [],
  completedChallenges: [],
  moduleScores: {},
  streak: { current: 0, longest: 0, lastActiveDate: null },
  lastLessonId: null,
};

async function readProgress(userId) {
  const snapshot = await getDoc(doc(db, 'progress', userId));
  return snapshot.exists() ? { ...EMPTY_PROGRESS, ...snapshot.data() } : EMPTY_PROGRESS;
}

// Firestore resolves a write only once the server has it, which never happens
// offline, so screens would spin until reconnect. Give up after this long so
// they can say "not saved"; the write stays queued and lands on reconnect.
const SAVE_TIMEOUT_MS = 10000;

// Longer than a plain save: a function that has not run for a while can take most of 10 s just to start.
const finishQuizFunction = httpsCallable(functions, 'finishQuiz', { timeout: 30000 });

/** Merges `fields` into progress/{userId}, rejecting if the server has not confirmed it in time. */
function saveProgress(userId, fields) {
  let timer;
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Saving timed out. Check your connection.')), SAVE_TIMEOUT_MS);
  });
  return Promise.race([setDoc(doc(db, 'progress', userId), fields, { merge: true }), timedOut]).finally(() =>
    clearTimeout(timer)
  );
}

export async function getProgress() {
  return readProgress(auth.currentUser.uid);
}

/**
 * Remembers which lesson was opened last, so "Continue learning" can point at
 * where the learner actually was rather than at the first thing they have not
 * finished.
 *
 * Deliberately does not touch the streak: opening a lesson is not the same as
 * studying one, and a streak you can extend by tapping into a page and out
 * again is not measuring anything.
 */
export async function recordLessonOpened(lessonId) {
  await saveProgress(auth.currentUser.uid, { lastLessonId: lessonId, updatedAt: serverTimestamp() });
}

/**
 * Marks a lesson done, or undoes that.
 *
 * Lessons are completed by the learner saying so on the lesson screen; there
 * are no per-lesson quizzes, so nothing else decides this. Only completing
 * counts as activity — un-marking must not extend a streak, or the streak
 * becomes something you can farm by toggling a checkbox.
 */
/** Returns the fields it saved, so the app can update without re-reading. */
export async function setLessonComplete(lessonId, complete) {
  const userId = auth.currentUser.uid;
  const existing = await readProgress(userId);

  if (existing.completedLessons.includes(lessonId) === complete) {
    return { completedLessons: existing.completedLessons };
  }

  const changes = {
    completedLessons: complete
      ? [...existing.completedLessons, lessonId]
      : existing.completedLessons.filter((id) => id !== lessonId),
    ...(complete ? { streak: advanceStreak(existing.streak) } : {}),
  };

  // The server adds or removes the one id rather than taking this whole list,
  // so a second save still in flight (another lesson, another phone) is not overwritten.
  await saveProgress(userId, {
    ...changes,
    completedLessons: complete ? arrayUnion(lessonId) : arrayRemove(lessonId),
    updatedAt: serverTimestamp(),
  });
  return changes;
}

/**
 * Saves a finished quiz. The score is counted and saved by the finishQuiz
 * function from the graded attempts, since the rules do not let the app write
 * moduleScores; the streak follows the phone's own day, so it is saved here.
 * `answers` is one { questionId, attemptId } per question of the quiz.
 */
export async function recordModuleQuizCompletion(moduleId, answers) {
  await finishQuizFunction({ moduleId, answers });
  const userId = auth.currentUser.uid;
  try {
    const existing = await readProgress(userId);
    await saveProgress(userId, { streak: advanceStreak(existing.streak), updatedAt: serverTimestamp() });
  } catch {
    // The score is already saved, so a slow streak write is not a failed quiz: a timed-out
    // write stays queued and lands on reconnect, and the next study day advances it anyway.
  }
}

/**
 * Marks a Code Tracer program as done. Finishing one is real study, so it
 * advances the streak every time, the same as finishing a quiz. arrayUnion
 * adds the id on the server, so a repeat leaves the list as it is and two
 * saves at once cannot overwrite each other.
 */
export async function recordTraceCompletion(traceId) {
  const userId = auth.currentUser.uid;
  const existing = await readProgress(userId);

  await saveProgress(userId, {
    completedTraces: arrayUnion(traceId),
    streak: advanceStreak(existing.streak),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Advances the streak after a challenge is solved. The runChallenge function
 * has already added it to completedChallenges (the app cannot), but the
 * streak follows the learner's local day, which only the phone knows.
 */
export async function recordChallengeStreak() {
  const userId = auth.currentUser.uid;
  const existing = await readProgress(userId);

  await saveProgress(userId, { streak: advanceStreak(existing.streak), updatedAt: serverTimestamp() });
}
