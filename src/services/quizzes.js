import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { db, functions } from './firebase';

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
  // From the server: offline, the cache answers with no questions, which
  // looked like a module with no quiz rather than a missing connection.
  const snapshot = await getDocsFromServer(
    query(collection(db, 'questions'), where('moduleId', '==', moduleId))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const gradeAnswerFunction = httpsCallable(functions, 'gradeAnswer');

/**
 * Grades one answer on the server, which also records the attempt.
 *
 * The app cannot grade by itself: the correct answers live in `answerKeys`,
 * which it is not allowed to read. Resolves to { correct, answer }, where
 * `answer` is the index of the correct choice.
 */
export async function gradeAnswer({ questionId, choice, timeTakenMs }) {
  const { data } = await gradeAnswerFunction({ questionId, choice, timeTakenMs });
  return data;
}
