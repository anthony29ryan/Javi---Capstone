// Checks content/ before it is published to Firestore.
//
//   node scripts/verifyContent.js
//
// Exits non-zero if anything is wrong, so it can gate the publish step.
// Touches no network and no Firebase credentials.

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const LESSONS_DIR = path.join(CONTENT_DIR, 'lessons');

// Every block type LessonBlocks.js knows how to render. Adding a type here
// without adding a case there means blank space in the app.
const RENDERABLE = new Set(['text', 'code', 'heading', 'list', 'note', 'table', 'image', 'video']);

const problems = [];
const warnings = [];

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/* ------------------------------------------------------------ courses/modules */

const courses = readJson(path.join(CONTENT_DIR, 'courses.json'));
const modules = readJson(path.join(CONTENT_DIR, 'modules.json'));

const courseIds = new Set(courses.map((c) => c.id));
const moduleIds = new Set(modules.map((m) => m.id));

for (const m of modules) {
  if (!courseIds.has(m.courseId)) problems.push(`module ${m.id}: unknown courseId "${m.courseId}"`);
}

/* ------------------------------------------------------------------- lessons */

const files = fs.readdirSync(LESSONS_DIR).filter((f) => f.endsWith('.json'));
const perModule = {};
let blockCount = 0;
const typeCount = {};

function walkBlocks(blocks, file) {
  for (const b of blocks) {
    blockCount++;
    typeCount[b.type] = (typeCount[b.type] || 0) + 1;

    if (!RENDERABLE.has(b.type)) {
      problems.push(`${file}: block type "${b.type}" has no renderer`);
    }

    if (b.type === 'table') {
      const width = Math.max(b.headers?.length || 0, ...(b.rows || []).map((r) => r.length));
      if (!b.rows?.length) problems.push(`${file}: table with no rows`);
      if (b.headers?.length && b.headers.length !== width) {
        problems.push(`${file}: table header has ${b.headers.length} cells, widest row has ${width}`);
      }
      for (const row of b.rows || []) {
        if (row.length !== width) problems.push(`${file}: ragged table row`);
      }
    }

    if (b.type === 'list' && !b.items?.length) problems.push(`${file}: empty list`);
    if (b.type === 'code' && !String(b.value || '').trim()) problems.push(`${file}: empty code block`);
    if ((b.type === 'text' || b.type === 'heading') && !String(b.value || '').trim()) {
      problems.push(`${file}: empty ${b.type} block`);
    }

    // Unbalanced inline markers render as stray asterisks or backticks in the app.
    const value = typeof b.value === 'string' ? b.value : '';
    if (b.type !== 'code') {
      if ((value.match(/\*\*/g) || []).length % 2 !== 0) warnings.push(`${file}: odd number of ** markers`);
      if ((value.match(/`/g) || []).length % 2 !== 0) warnings.push(`${file}: odd number of backticks`);
    }

    if (b.blocks) walkBlocks(b.blocks, file);
  }
}

const seenIds = new Set();

for (const file of files) {
  const lesson = readJson(path.join(LESSONS_DIR, file));

  if (`${lesson.id}.json` !== file) problems.push(`${file}: id "${lesson.id}" does not match filename`);
  if (seenIds.has(lesson.id)) problems.push(`${file}: duplicate id`);
  seenIds.add(lesson.id);

  if (!moduleIds.has(lesson.moduleId)) problems.push(`${file}: unknown moduleId "${lesson.moduleId}"`);
  if (typeof lesson.order !== 'number') problems.push(`${file}: order is not a number`);
  if (!lesson.title?.trim()) problems.push(`${file}: missing title`);
  if (!lesson.blocks?.length) problems.push(`${file}: no blocks`);

  (perModule[lesson.moduleId] = perModule[lesson.moduleId] || []).push(lesson.order);
  walkBlocks(lesson.blocks || [], file);
}

/* every module needs lessons, numbered 1..n with no gaps or repeats */
for (const m of modules) {
  const orders = (perModule[m.id] || []).sort((a, b) => a - b);
  if (!orders.length) {
    problems.push(`module ${m.id}: has no lessons`);
    continue;
  }
  if (orders.some((v, i) => v !== i + 1)) {
    problems.push(`module ${m.id}: orders are not 1..${orders.length} (got ${orders.join(',')})`);
  }
}

/* ----------------------------------------------------------------- questions */

// One file per module, content/questions/<moduleId>.json, holding an array of
// questions. The quiz draws QUIZ_LENGTH of them at random per attempt, so a
// module needs at least that many before its quiz is complete. Aim for about
// 25, so retakes do not ask exactly the same set.
//
// The `answer` field is split off by publishContent.js into `answerKeys`,
// which the app cannot read; only the grading Cloud Function sees it.

const QUESTIONS_DIR = path.join(CONTENT_DIR, 'questions');
const QUESTION_TYPES = new Set(['mcq', 'output', 'truefalse']);
const MAX_CHOICES = 6; // QuizScreen letters them A-F
const QUIZ_LENGTH = 20; // keep in step with functions/index.js

const lessonModule = new Map();
for (const file of files) {
  const lesson = readJson(path.join(LESSONS_DIR, file));
  lessonModule.set(lesson.id, lesson.moduleId);
}

const questionFiles = fs.existsSync(QUESTIONS_DIR)
  ? fs.readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith('.json'))
  : [];
const questionCounts = {};
const questionIds = new Set();

for (const file of questionFiles) {
  const moduleId = path.basename(file, '.json');
  const where = `questions/${file}`;

  if (!moduleIds.has(moduleId)) {
    problems.push(`${where}: filename does not match any module id`);
    continue;
  }

  const questions = readJson(path.join(QUESTIONS_DIR, file));
  if (!Array.isArray(questions)) {
    problems.push(`${where}: must be an array of questions`);
    continue;
  }
  questionCounts[moduleId] = questions.length;

  for (const q of questions) {
    const at = `${where} ${q.id || '(no id)'}`;

    if (!q.id?.trim()) problems.push(`${at}: missing id`);
    else if (questionIds.has(q.id)) problems.push(`${at}: duplicate id`);
    questionIds.add(q.id);

    // Every question must trace back to a lesson in this module, so it only
    // tests what the app actually teaches.
    if (!lessonModule.has(q.lessonId)) problems.push(`${at}: unknown lessonId "${q.lessonId}"`);
    else if (lessonModule.get(q.lessonId) !== moduleId) {
      problems.push(`${at}: lesson "${q.lessonId}" belongs to another module`);
    }

    if (!QUESTION_TYPES.has(q.type)) problems.push(`${at}: unknown type "${q.type}"`);
    if (!String(q.prompt || '').trim()) problems.push(`${at}: missing prompt`);
    if (q.type === 'output' && !String(q.code || '').trim()) problems.push(`${at}: output question needs code`);

    const choices = Array.isArray(q.choices) ? q.choices : [];
    if (q.type === 'truefalse') {
      if (choices.length !== 2 || choices[0] !== 'True' || choices[1] !== 'False') {
        problems.push(`${at}: true/false choices must be exactly ["True", "False"]`);
      }
    } else if (choices.length < 2 || choices.length > MAX_CHOICES) {
      problems.push(`${at}: needs 2-${MAX_CHOICES} choices, has ${choices.length}`);
    }
    if (choices.some((c) => typeof c !== 'string' || !c.trim())) problems.push(`${at}: empty choice`);
    if (new Set(choices).size !== choices.length) problems.push(`${at}: duplicate choices`);

    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= choices.length) {
      problems.push(`${at}: answer must be an index into choices (0-${choices.length - 1})`);
    }
  }

  if (questions.length < QUIZ_LENGTH) {
    warnings.push(`${where}: ${questions.length} questions, fewer than the ${QUIZ_LENGTH} a quiz asks`);
  }
}

const modulesWithoutQuestions = modules.filter((m) => !questionCounts[m.id]).length;

/* -------------------------------------------------------------------- report */

console.log(`courses  ${courses.length}`);
console.log(`modules  ${modules.length}`);
console.log(`lessons  ${files.length}`);
console.log(`blocks   ${blockCount}  ${JSON.stringify(typeCount)}`);
console.log(`lessons per module: min ${Math.min(...Object.values(perModule).map((a) => a.length))}, ` +
            `max ${Math.max(...Object.values(perModule).map((a) => a.length))}`);
console.log(`questions ${questionIds.size} across ${Object.keys(questionCounts).length} modules` +
            (modulesWithoutQuestions ? ` (${modulesWithoutQuestions} modules have none yet)` : ''));

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 15)) console.log('  ? ' + w);
  if (warnings.length > 15) console.log(`  ... and ${warnings.length - 15} more`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 25)) console.error('  !! ' + p);
  if (problems.length > 25) console.error(`  ... and ${problems.length - 25} more`);
  console.error('\nFAILED. Do not publish.');
  process.exit(1);
}

console.log('\nOK. Safe to publish.');
