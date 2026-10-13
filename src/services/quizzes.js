import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';

import { auth, db } from './firebase';

/**
 * Every question belonging to a module, including the ones attached to its
 * individual lessons.
 *
 * The module quiz is the only quiz in the app: a lesson is finished by reading
 * it, and the module quiz then tests the whole module at once. So this
 * deliberately does not filter on `lessonId` — an earlier version required it
 * to be null, which limited the quiz to questions written at module level and
 * left every lesson's questions unused.
 *
 * Ordering is left to the caller, which knows what order the lessons run in;
 * a question's own `order` is only meaningful within its lesson.
 */
export async function getModuleQuestions(moduleId) {
  const snapshot = await getDocs(
    query(collection(db, 'questions'), where('moduleId', '==', moduleId))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getAttemptNumber(questionId) {
  const snapshot = await getDocs(
    query(
      collection(db, 'attempts'),
      where('userId', '==', auth.currentUser.uid),
      where('questionId', '==', questionId)
    )
  );
  return snapshot.size + 1;
}

export async function recordAttempt({ questionId, topic, correct, timeTakenMs }) {
  const attemptNumber = await getAttemptNumber(questionId);
  await addDoc(collection(db, 'attempts'), {
    userId: auth.currentUser.uid,
    questionId,
    topic,
    correct,
    timeTakenMs,
    attemptNumber,
    createdAt: serverTimestamp(),
  });
}
