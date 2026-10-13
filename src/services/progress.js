import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from './firebase';

const EMPTY_PROGRESS = {
  completedLessons: [],
  moduleScores: {},
  streak: { current: 0, longest: 0, lastActiveDate: null },
  lastLessonId: null,
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayString() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function advanceStreak(streak) {
  const today = todayString();
  if (streak.lastActiveDate === today) return streak;

  const current = streak.lastActiveDate === yesterdayString() ? streak.current + 1 : 1;
  return {
    current,
    longest: Math.max(streak.longest || 0, current),
    lastActiveDate: today,
  };
}

async function readProgress(userId) {
  const snapshot = await getDoc(doc(db, 'progress', userId));
  return snapshot.exists() ? { ...EMPTY_PROGRESS, ...snapshot.data() } : EMPTY_PROGRESS;
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
  await setDoc(
    doc(db, 'progress', auth.currentUser.uid),
    { lastLessonId: lessonId, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Marks a lesson done, or undoes that.
 *
 * Lessons are completed by the learner saying so on the lesson screen; there
 * are no per-lesson quizzes, so nothing else decides this. Only completing
 * counts as activity — un-marking must not extend a streak, or the streak
 * becomes something you can farm by toggling a checkbox.
 */
export async function setLessonComplete(lessonId, complete) {
  const userId = auth.currentUser.uid;
  const existing = await readProgress(userId);

  if (existing.completedLessons.includes(lessonId) === complete) return;

  const completedLessons = complete
    ? [...existing.completedLessons, lessonId]
    : existing.completedLessons.filter((id) => id !== lessonId);

  await setDoc(
    doc(db, 'progress', userId),
    {
      completedLessons,
      ...(complete ? { streak: advanceStreak(existing.streak) } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recordModuleQuizCompletion(moduleId, correct, total) {
  const userId = auth.currentUser.uid;
  const existing = await readProgress(userId);

  const moduleScores = {
    ...existing.moduleScores,
    [moduleId]: { correct, total, lastAttemptAt: Date.now() },
  };

  await setDoc(
    doc(db, 'progress', userId),
    {
      moduleScores,
      streak: advanceStreak(existing.streak),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
