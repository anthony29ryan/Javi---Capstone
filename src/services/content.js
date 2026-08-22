import { collection, doc, getDoc, getDocs } from 'firebase/firestore';

import { db } from './firebase';

function byOrder(a, b) {
  return a.order - b.order;
}

export async function getCourses() {
  const snapshot = await getDocs(collection(db, 'courses'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

export async function getModules(courseId) {
  const snapshot = await getDocs(collection(db, 'modules'));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((module) => module.courseId === courseId)
    .sort(byOrder);
}

export async function getLessons(moduleId) {
  const snapshot = await getDocs(collection(db, 'lessons'));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((lesson) => lesson.moduleId === moduleId)
    .sort(byOrder);
}

export async function getLesson(lessonId) {
  const snapshot = await getDoc(doc(db, 'lessons', lessonId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getAllModules() {
  const snapshot = await getDocs(collection(db, 'modules'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byOrder);
}

/**
 * Every lesson, reduced to the fields needed to work out progress. The `blocks`
 * array is dropped here because it is the bulk of a lesson document and nothing
 * that counts progress ever reads it.
 */
export async function getAllLessonProgressRefs() {
  const snapshot = await getDocs(collection(db, 'lessons'));
  return snapshot.docs.map((d) => ({ id: d.id, moduleId: d.data().moduleId }));
}
