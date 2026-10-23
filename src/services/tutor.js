import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { auth, db, functions } from './firebase';

const askTutorFunction = httpsCallable(functions, 'askTutor');

/**
 * Asks the tutor a question about a module. The function holds the AI key and
 * keeps the answer on that module's lessons; it also saves both sides of the
 * exchange, so the app only has to show them. Resolves to the reply text.
 */
export async function askTutor(moduleId, question) {
  const { data } = await askTutorFunction({ moduleId, question });
  return data.reply;
}

/** The learner's saved conversation for a module, oldest first. [] if none yet. */
export async function getTutorThread(moduleId) {
  const snapshot = await getDoc(doc(db, 'chats', `${auth.currentUser.uid}_${moduleId}`));
  return snapshot.exists() ? snapshot.data().messages : [];
}
