// Publishes content/ (courses.json, modules.json, lessons/*.json,
// questions/*.json, traces.json, challenges.json) to Firestore, plus meta/lessonIndex.
// Safe to re-run any time after editing a content file — it's an upsert.
//
// Run with:
//   node --env-file=.env scripts/publishContent.js
//
// Writes as admin (see adminApp.js): firestore.rules makes content read-only
// for the app, so a normal user account can no longer publish.

const fs = require('fs');
const path = require('path');

const { connectAsAdmin } = require('./adminApp');

const CONTENT_DIR = path.join(__dirname, '..', 'content');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Firestore cannot store an array directly inside another array, and a table
// block authors its rows as an array of cell arrays. Wrap each row in an object
// on the way out so the authored JSON stays readable; LessonBlocks unwraps it.
function encodeBlocks(blocks) {
  return (blocks || []).map((block) => {
    // A note block holds its own blocks, and one of them is a table.
    const encoded = Array.isArray(block.blocks)
      ? { ...block, blocks: encodeBlocks(block.blocks) }
      : block;

    if (encoded.type !== 'table' || !Array.isArray(encoded.rows)) return encoded;
    return { ...encoded, rows: encoded.rows.map((cells) => ({ cells })) };
  });
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

// Measured on the authored blocks, before encodeBlocks, so table rows are
// still plain arrays of cells.
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
 * Deletes every document in the collection whose id is not in keepIds, so
 * something renamed or removed locally does not linger in the app. Returns
 * how many were deleted.
 */
async function removeStale(db, collectionName, keepIds) {
  const existing = await db.collection(collectionName).select().get();
  let removed = 0;
  for (const found of existing.docs) {
    if (keepIds.has(found.id)) continue;
    await found.ref.delete();
    console.log(`Removed stale ${collectionName}:`, found.id);
    removed++;
  }
  return removed;
}

async function main() {
  const { db } = connectAsAdmin();
  console.log('Connected as admin to', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);

  // Every removal below is skipped when its local source is empty or absent,
  // so running this from a checkout missing a file cannot wipe a collection.
  const removed = {};

  const courses = readJson(path.join(CONTENT_DIR, 'courses.json'));
  for (const course of courses) {
    const { id, ...data } = course;
    await db.collection('courses').doc(id).set(data);
    console.log('Wrote course:', id);
  }
  if (courses.length > 0) {
    removed.courses = await removeStale(db, 'courses', new Set(courses.map((c) => c.id)));
  }

  const modules = readJson(path.join(CONTENT_DIR, 'modules.json'));
  for (const module of modules) {
    const { id, ...data } = module;
    await db.collection('modules').doc(id).set(data);
    console.log('Wrote module:', id);
  }
  if (modules.length > 0) {
    removed.modules = await removeStale(db, 'modules', new Set(modules.map((m) => m.id)));
  }

  const lessonsDir = path.join(CONTENT_DIR, 'lessons');
  const lessonFiles = fs.existsSync(lessonsDir)
    ? fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.json'))
    : [];

  const lessonIndex = [];
  for (const file of lessonFiles) {
    const lesson = readJson(path.join(lessonsDir, file));
    const { id, ...data } = lesson;
    await db.collection('lessons').doc(id).set({ ...data, blocks: encodeBlocks(data.blocks) });
    lessonIndex.push({
      id,
      moduleId: data.moduleId,
      title: data.title,
      order: data.order,
      minutes: estimateMinutes(data.blocks),
    });
    console.log('Wrote lesson:', id);
  }

  if (lessonFiles.length > 0) {
    removed.lessons = await removeStale(db, 'lessons', new Set(lessonIndex.map((l) => l.id)));
    // What the app reads on launch instead of every lesson document (see
    // src/services/content.js). publishedAt tells it when downloaded modules
    // need fetching again. About 100 bytes a lesson, far below Firestore's 1 MB cap.
    await db.doc('meta/lessonIndex').set({ lessons: lessonIndex, publishedAt: Date.now() });
    console.log(`Wrote lesson index: ${lessonIndex.length} lessons`);
  }

  // Each question is split in two. `questions` holds what the app shows and is
  // readable by any signed-in user; `answerKeys` holds only the correct answer
  // and no security rule allows reading it, so only the grading Cloud Function
  // (which uses admin access, like this script) ever sees it.
  const questionsDir = path.join(CONTENT_DIR, 'questions');
  const questionFiles = fs.existsSync(questionsDir)
    ? fs.readdirSync(questionsDir).filter((f) => f.endsWith('.json'))
    : [];

  const publishedQuestionIds = new Set();
  for (const file of questionFiles) {
    const moduleId = path.basename(file, '.json');
    for (const question of readJson(path.join(questionsDir, file))) {
      const { id, answer, ...shown } = question;
      const batch = db.batch();
      batch.set(db.collection('questions').doc(id), { ...shown, moduleId });
      batch.set(db.collection('answerKeys').doc(id), { moduleId, answer });
      await batch.commit();
      publishedQuestionIds.add(id);
    }
    console.log('Wrote questions for module:', moduleId);
  }

  if (publishedQuestionIds.size > 0) {
    removed.questions = await removeStale(db, 'questions', publishedQuestionIds);
    await removeStale(db, 'answerKeys', publishedQuestionIds);
  }

  // Code Tracer drills.
  const tracesFile = path.join(CONTENT_DIR, 'traces.json');
  const publishedTraceIds = new Set();
  if (fs.existsSync(tracesFile)) {
    for (const { id, ...data } of readJson(tracesFile)) {
      await db.collection('traces').doc(id).set(data);
      publishedTraceIds.add(id);
    }
    if (publishedTraceIds.size > 0) removed.traces = await removeStale(db, 'traces', publishedTraceIds);
  }

  // Code Challenges, split like questions: `challenges` is what the app shows,
  // `challengeTests` holds the hidden tests, which only the runChallenge
  // function can read. `solution` stays in the repo; nothing needs it at runtime.
  const challengesFile = path.join(CONTENT_DIR, 'challenges.json');
  const publishedChallengeIds = new Set();
  if (fs.existsSync(challengesFile)) {
    for (const { id, hidden, solution, ...shown } of readJson(challengesFile)) {
      const batch = db.batch();
      batch.set(db.collection('challenges').doc(id), shown);
      batch.set(db.collection('challengeTests').doc(id), { hidden });
      await batch.commit();
      publishedChallengeIds.add(id);
    }
    if (publishedChallengeIds.size > 0) {
      removed.challenges = await removeStale(db, 'challenges', publishedChallengeIds);
      await removeStale(db, 'challengeTests', publishedChallengeIds);
    }
  }

  const removedSummary = Object.entries(removed)
    .filter(([, count]) => count > 0)
    .map(([collectionName, count]) => `${count} ${collectionName}`)
    .join(', ');
  console.log(
    `Done. Published ${courses.length} courses, ${modules.length} modules, ` +
      `${lessonFiles.length} lessons, ${publishedQuestionIds.size} questions, ` +
      `${publishedTraceIds.size} traces, ${publishedChallengeIds.size} challenges. ` +
      `Removed stale: ${removedSummary || 'none'}.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
