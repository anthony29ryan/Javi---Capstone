import { collection, doc, getDoc, getDocFromServer, getDocsFromServer, query, where } from 'firebase/firestore';

import { db } from './firebase';
import { getDownloadedLesson } from './offline';

// Collections are read from the server only. Plain getDocs answers from the
// (often empty) local cache when offline instead of failing, which would show
// "No courses yet" and overwrite the saved offline copy with empty lists.
// Failing lets ProgressContext fall back to that copy instead.

function byOrder(a, b) {
  return a.order - b.order;
}

export async function getCourses() {
  const snapshot = await getDocsFromServer(collection(db, 'courses'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

/**
 * One lesson, from Firestore when reachable. A failed read falls back to the
 * downloaded copy, so a module saved for offline still opens with no signal.
 */
export async function getLesson(lessonId) {
  try {
    const snapshot = await getDoc(doc(db, 'lessons', lessonId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  } catch (err) {
    const downloaded = await getDownloadedLesson(lessonId);
    if (downloaded) return downloaded;
    // The original error, so the screen can tell offline from a server fault by its code.
    throw err;
  }
}

/**
 * A module's full lessons, for saving it to read offline. From the server, as
 * above: a cache answer would save a "downloaded" module with no lessons.
 */
export async function getModuleLessons(moduleId) {
  const snapshot = await getDocsFromServer(
    query(collection(db, 'lessons'), where('moduleId', '==', moduleId))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Every Code Tracer drill. Online only: traces are not in offline downloads. */
export async function getTraces() {
  const snapshot = await getDocsFromServer(collection(db, 'traces'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllModules() {
  const snapshot = await getDocsFromServer(collection(db, 'modules'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

/**
 * Every lesson as { id, moduleId, title, order, minutes }, sorted by order,
 * plus `publishedAt`, the time of the content publish that wrote them.
 *
 * One document written by scripts/publishContent.js, rather than the whole
 * lessons collection: lesson bodies are most of the course's ~1 MB, and no
 * summary screen renders them. The reading minutes are worked out at publish.
 * There is no fallback when the document is missing: the app shows its load
 * error, and running `npm run content:publish` fixes it.
 */
export async function getLessonIndex() {
  const snapshot = await getDocFromServer(doc(db, 'meta', 'lessonIndex'));
  if (!snapshot.exists()) throw new Error('The lesson list has not been published yet.');
  const { lessons, publishedAt } = snapshot.data();
  return { lessons: [...lessons].sort(byOrder), publishedAt };
}
