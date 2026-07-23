import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';

import { auth, db } from './firebase';

function byOrder(a, b) {
  return a.order - b.order;
}

export async function getLessonQuestions(lessonId) {
  const snapshot = await getDocs(
    query(collection(db, 'questions'), where('lessonId', '==', lessonId))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

export async function getModuleQuestions(moduleId) {
  const snapshot = await getDocs(
    query(
      collection(db, 'questions'),
      where('moduleId', '==', moduleId),
      where('lessonId', '==', null)
    )
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
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
