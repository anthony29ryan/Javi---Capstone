import { collection, doc, getDoc, getDocs, getDocsFromServer, query, where } from 'firebase/firestore';

import { db } from './firebase';
import { getDownloadedLesson } from './offline';

function byOrder(a, b) {
  return a.order - b.order;
}

export async function getCourses() {
  const snapshot = await getDocs(collection(db, 'courses'));
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
  } catch {
    const downloaded = await getDownloadedLesson(lessonId);
    if (downloaded) return downloaded;
    throw new Error('Download this module while online to read it offline.');
  }
}

/**
 * A module's full lessons, for saving it to read offline. From the server
 * only: plain getDocs answers from the (empty) cache when offline instead of
 * failing, which would save a "downloaded" module with no lessons in it.
 */
export async function getModuleLessons(moduleId) {
  const snapshot = await getDocsFromServer(
    query(collection(db, 'lessons'), where('moduleId', '==', moduleId))
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Every Code Tracer drill. Online only: traces are not in offline downloads. */
export async function getTraces() {
  const snapshot = await getDocs(collection(db, 'traces'));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
 * Every lesson, both in full and reduced to the fields needed to work out
 * progress and to describe a lesson in a list.
 *
 * `refs` drops the `blocks` array because it is the bulk of a lesson document
 * and no summary screen renders it — but the reading estimate is computed
 * first, while the blocks are in hand. Firestore has already sent the whole
 * document by this point, so measuring it costs nothing extra. `full` keeps
 * the blocks only so downloaded modules can be refreshed from this same read.
 */
export async function getAllLessons() {
  const snapshot = await getDocs(collection(db, 'lessons'));
  const full = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  const refs = full
    .map(({ id, moduleId, title, order, blocks }) => ({
      id,
      moduleId,
      title,
      order,
      minutes: estimateMinutes(blocks),
    }))
    .sort(byOrder);
  return { full, refs };
}
