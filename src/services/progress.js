import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from './firebase';

const EMPTY_PROGRESS = {
  completedLessons: [],
  moduleScores: {},
  streak: { current: 0, longest: 0, lastActiveDate: null },
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

export async function recordLessonQuizCompletion(lessonId) {
  const userId = auth.currentUser.uid;
  const existing = await readProgress(userId);

  const completedLessons = existing.completedLessons.includes(lessonId)
    ? existing.completedLessons
    : [...existing.completedLessons, lessonId];

  await setDoc(
    doc(db, 'progress', userId),
    {
      completedLessons,
      streak: advanceStreak(existing.streak),
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
