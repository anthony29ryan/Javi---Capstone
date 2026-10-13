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

// Comprehension speed for technical material, not the ~200wpm figure quoted
// for skimming prose. At 200 nearly every lesson here rounded to "1 MIN",
// which is both useless on screen and an undersell of the actual work.
const WORDS_PER_MINUTE = 130;
// A line of code is read far slower than a line of prose, so it is weighted
// as several words rather than counted by its actual word count.
const WORDS_PER_CODE_LINE = 12;

function countWords(value) {
  return typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0;
}

function blockWords(block) {
  switch (block?.type) {
    case 'text':
    case 'heading':
      return countWords(block.value);
    case 'code':
      return (block.value?.split('\n').length ?? 0) * WORDS_PER_CODE_LINE;
    case 'list':
      return (block.items ?? []).reduce((sum, item) => sum + countWords(item), 0);
    case 'table':
      return (block.rows ?? [])
        .flat()
        .reduce((sum, cell) => sum + countWords(cell), countWords(block.headers?.join(' ')));
    case 'note':
      // Notes wrap their own blocks, so this has to recurse rather than read a
      // value that is not there.
      return (block.blocks ?? []).reduce((sum, inner) => sum + blockWords(inner), 0);
    default:
      return 0;
  }
}

/** Rough reading time for a lesson, never less than a minute. */
function estimateMinutes(blocks = []) {
  const words = blocks.reduce((sum, block) => sum + blockWords(block), 0);
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Every lesson, reduced to the fields needed to work out progress and to
 * describe a lesson in a list.
 *
 * The `blocks` array is dropped from the result because it is the bulk of a
 * lesson document and no summary screen renders it — but the reading estimate
 * is computed here first, while the blocks are in hand. Firestore has already
 * sent the whole document by this point, so measuring it costs nothing extra;
 * storing a duration on each lesson would be the same number for more work.
 */
export async function getAllLessonProgressRefs() {
  const snapshot = await getDocs(collection(db, 'lessons'));
  return snapshot.docs
    .map((d) => {
      const { moduleId, title, order, blocks } = d.data();
      return { id: d.id, moduleId, title, order, minutes: estimateMinutes(blocks) };
    })
    .sort(byOrder);
}
