// Publishes content/ (courses.json, modules.json, lessons/*.json,
// questions/*.json) to Firestore.
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

async function main() {
  const { db } = connectAsAdmin();
  console.log('Connected as admin to', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID);

  const courses = readJson(path.join(CONTENT_DIR, 'courses.json'));
  for (const course of courses) {
    const { id, ...data } = course;
    await db.collection('courses').doc(id).set(data);
    console.log('Wrote course:', id);
  }

  const modules = readJson(path.join(CONTENT_DIR, 'modules.json'));
  for (const module of modules) {
    const { id, ...data } = module;
    await db.collection('modules').doc(id).set(data);
    console.log('Wrote module:', id);
  }

  const lessonsDir = path.join(CONTENT_DIR, 'lessons');
  const lessonFiles = fs.existsSync(lessonsDir)
    ? fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.json'))
    : [];

  const publishedLessonIds = new Set();
  for (const file of lessonFiles) {
    const lesson = readJson(path.join(lessonsDir, file));
    const { id, ...data } = lesson;
    await db.collection('lessons').doc(id).set({ ...data, blocks: encodeBlocks(data.blocks) });
    publishedLessonIds.add(id);
    console.log('Wrote lesson:', id);
  }

  // set() only ever adds or overwrites, so a lesson that was renamed or removed
  // locally would linger in Firestore and still show up in the app. Delete
  // anything that is no longer in content/lessons so the two stay in step.
  let removed = 0;
  if (lessonFiles.length > 0) {
    const existing = await db.collection('lessons').get();
    for (const found of existing.docs) {
      if (publishedLessonIds.has(found.id)) continue;
      await found.ref.delete();
      console.log('Removed stale lesson:', found.id);
      removed++;
    }
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

  // Same reasoning as lessons: remove questions (and their keys) that no
  // longer exist locally. Skipped when content/questions is absent entirely,
  // so running this from a checkout without it cannot wipe every quiz.
  let removedQuestions = 0;
  if (fs.existsSync(questionsDir)) {
    for (const collectionName of ['questions', 'answerKeys']) {
      const existing = await db.collection(collectionName).get();
      for (const found of existing.docs) {
        if (publishedQuestionIds.has(found.id)) continue;
        await found.ref.delete();
        if (collectionName === 'questions') {
          console.log('Removed stale question:', found.id);
          removedQuestions++;
        }
      }
    }
  }

  console.log(
    `Done. Published ${courses.length} courses, ${modules.length} modules, ` +
      `${lessonFiles.length} lessons${removed ? `, removed ${removed} stale` : ''}, ` +
      `${publishedQuestionIds.size} questions` +
      `${removedQuestions ? `, removed ${removedQuestions} stale` : ''}.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
