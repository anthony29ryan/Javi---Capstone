// Checks content/ before it is published to Firestore.
//
//   node scripts/verifyContent.js
//
// Exits non-zero if anything is wrong, so it can gate the publish step.
// Touches no network and no Firebase credentials.

const fs = require('fs');
const path = require('path');

// The same marker swap the runChallenge function grades with.
const { givenKey, withGiven } = require('../functions/codeRunner');

const CONTENT_DIR = path.join(__dirname, '..', 'content');
const LESSONS_DIR = path.join(CONTENT_DIR, 'lessons');

// Every block type LessonBlocks.js knows how to render. Adding a type here
// without adding a case there means blank space in the app.
const RENDERABLE = new Set(['text', 'code', 'heading', 'list', 'note', 'table', 'image', 'video']);

// Keep in step with CONTENT_ID in functions/index.js: the functions refuse any
// other module or question id, so a quiz using one could never be answered.
const CONTENT_ID = /^[a-z0-9-]{1,100}$/;

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
  if (!CONTENT_ID.test(m.id)) problems.push(`module ${m.id}: id must be lowercase letters, digits and hyphens`);
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
const QUIZ_LENGTH = 20; // keep in step with src/screens/QuizScreen.js

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
    else if (!CONTENT_ID.test(q.id)) problems.push(`${at}: id must be lowercase letters, digits and hyphens`);
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

/* -------------------------------------------------------------------- traces */

// content/traces.json: the Code Tracer drills, one array of
// { id, moduleId, title, lines }. Limits keep each line typeable on a phone
// and each drill short enough to finish in one sitting.

const TRACES_FILE = path.join(CONTENT_DIR, 'traces.json');
const TRACE_MIN_LINES = 6;
const TRACE_MAX_LINES = 15;
const TRACE_MAX_LINE_LENGTH = 45;

const traces = fs.existsSync(TRACES_FILE) ? readJson(TRACES_FILE) : [];
const traceIds = new Set();
const modulesWithTrace = new Set();

if (!Array.isArray(traces)) {
  problems.push('traces.json: must be an array of traces');
} else {
  for (const t of traces) {
    const at = `traces.json ${t.id || '(no id)'}`;

    if (!t.id?.trim()) problems.push(`${at}: missing id`);
    else if (traceIds.has(t.id)) problems.push(`${at}: duplicate id`);
    traceIds.add(t.id);

    if (!moduleIds.has(t.moduleId)) problems.push(`${at}: unknown moduleId "${t.moduleId}"`);
    modulesWithTrace.add(t.moduleId);
    if (!String(t.title || '').trim()) problems.push(`${at}: missing title`);
    // Shown in the result screen's console; record it by running the program.
    if (typeof t.output !== 'string' || !t.output.trim()) problems.push(`${at}: missing output`);

    const lines = Array.isArray(t.lines) ? t.lines : [];
    if (lines.length < TRACE_MIN_LINES || lines.length > TRACE_MAX_LINES) {
      problems.push(`${at}: needs ${TRACE_MIN_LINES}-${TRACE_MAX_LINES} lines, has ${lines.length}`);
    }
    lines.forEach((line, i) => {
      // A blank line would be a step with nothing to type.
      if (typeof line !== 'string' || !line.trim()) problems.push(`${at}: line ${i + 1} is blank`);
      else if (line.length > TRACE_MAX_LINE_LENGTH) {
        problems.push(`${at}: line ${i + 1} is ${line.length} chars, max ${TRACE_MAX_LINE_LENGTH}`);
      }
    });
  }
}

const modulesWithoutTrace = modules.filter((m) => !modulesWithTrace.has(m.id)).length;
if (modulesWithoutTrace) warnings.push(`${modulesWithoutTrace} modules have no Code Tracer drill`);

/* ---------------------------------------------------------------- challenges */

// content/challenges.json: the Code Challenges, one array of
// { id, level, order, moduleId, title, description, kind, minutes,
//   starterCode, example: { input, output }, hidden: [{ input, output }], solution, stub?,
//   practices: [lessonId], hint }.
// Every output is recorded by running `solution` on JDK 17, not typed by hand.
// publishContent.js moves `hidden` and `solution` into challengeTests, which the app cannot read.

const CHALLENGES_FILE = path.join(CONTENT_DIR, 'challenges.json');
const CHALLENGES_PER_LEVEL = 5;
const HIDDEN_TESTS = 2; // every run costs a runner credit, so Submit uses at most 2

const challenges = fs.existsSync(CHALLENGES_FILE) ? readJson(CHALLENGES_FILE) : [];
const challengeIds = new Set();
const challengesPerLevel = {};
const isTest = (t) => t && typeof t.input === 'string' && typeof t.output === 'string';

if (!Array.isArray(challenges)) {
  problems.push('challenges.json: must be an array of challenges');
} else {
  for (const c of challenges) {
    const at = `challenges.json ${c.id || '(no id)'}`;

    if (!c.id?.trim()) problems.push(`${at}: missing id`);
    else if (challengeIds.has(c.id)) problems.push(`${at}: duplicate id`);
    challengeIds.add(c.id);

    if (!courseIds.has(c.level)) problems.push(`${at}: unknown level "${c.level}"`);
    challengesPerLevel[c.level] = (challengesPerLevel[c.level] || 0) + 1;
    if (!moduleIds.has(c.moduleId)) problems.push(`${at}: unknown moduleId "${c.moduleId}"`);
    // A challenge practices its own module, so every lesson it points to must be in that module.
    const practices = Array.isArray(c.practices) ? c.practices : [];
    if (practices.length < 1 || practices.length > 3) problems.push(`${at}: practices needs 1-3 lesson ids`);
    for (const lessonId of practices) {
      if (!lessonModule.has(lessonId)) problems.push(`${at}: practices unknown lesson "${lessonId}"`);
      else if (lessonModule.get(lessonId) !== c.moduleId) {
        problems.push(`${at}: practices "${lessonId}", which is not in its module ${c.moduleId}`);
      }
    }
    for (const field of ['title', 'description', 'starterCode', 'solution', 'hint']) {
      if (typeof c[field] !== 'string' || !c[field].trim()) problems.push(`${at}: missing ${field}`);
    }
    if (!Number.isInteger(c.order)) problems.push(`${at}: order must be an integer`);
    if (!Number.isInteger(c.minutes) || c.minutes < 1) problems.push(`${at}: minutes must be a positive integer`);
    if (!isTest(c.example) || !c.example.output.trim()) problems.push(`${at}: example needs an input and an output`);

    const hidden = Array.isArray(c.hidden) ? c.hidden : [];
    if (!hidden.every(isTest)) problems.push(`${at}: every hidden test needs an input and an output`);
    if (c.kind === 'output') {
      // Printing the text is the whole task, so there is nothing more to test.
      if (hidden.length) problems.push(`${at}: an output challenge has no hidden tests`);
      if (c.example?.input) problems.push(`${at}: an output challenge takes no input`);
    } else if (c.kind === 'io' || c.kind === 'given') {
      if (hidden.length !== HIDDEN_TESTS) problems.push(`${at}: needs ${HIDDEN_TESTS} hidden tests, has ${hidden.length}`);
      // A program that prints the example's answer without reading the input must fail.
      if (hidden.length && hidden.every((t) => t.output === c.example?.output)) {
        problems.push(`${at}: every hidden test expects the example's output, so hard-coding it would pass`);
      }
      // 'given' tests are declarations (int n = 9;) the grader swaps in by variable name,
      // so each test must declare the same variables as the example, in the same order.
      if (c.kind === 'given' && typeof c.example?.input === 'string') {
        const keys = (given) => given.split('\n').map(givenKey).join('\n');
        if (!c.example.input.trim()) problems.push(`${at}: a given challenge needs example values`);
        if (typeof c.starterCode === 'string' && withGiven(c.starterCode, c.example.input, c.example.input) === null) {
          problems.push(`${at}: starterCode must declare each given line exactly once`);
        }
        hidden.forEach((t, i) => {
          if (isTest(t) && keys(t.input) !== keys(c.example.input)) {
            problems.push(`${at}: hidden test ${i + 1} declares different variables from the example`);
          }
        });
      }
    } else {
      problems.push(`${at}: kind must be "output", "io" or "given"`);
    }
    // A stub starter has main written already and the student fills in a method.
    if (c.stub !== undefined && typeof c.stub !== 'boolean') problems.push(`${at}: stub must be true or false`);
    if (c.stub && c.kind === 'output') problems.push(`${at}: an output challenge cannot have a stub starter`);
  }
}

for (const course of courses) {
  if ((challengesPerLevel[course.id] || 0) !== CHALLENGES_PER_LEVEL) {
    problems.push(`challenges.json: ${course.id} needs ${CHALLENGES_PER_LEVEL} challenges, has ${challengesPerLevel[course.id] || 0}`);
  }
}

/* -------------------------------------------------------------------- report */

console.log(`courses  ${courses.length}`);
console.log(`modules  ${modules.length}`);
console.log(`lessons  ${files.length}`);
console.log(`blocks   ${blockCount}  ${JSON.stringify(typeCount)}`);
console.log(`lessons per module: min ${Math.min(...Object.values(perModule).map((a) => a.length))}, ` +
            `max ${Math.max(...Object.values(perModule).map((a) => a.length))}`);
console.log(`questions ${questionIds.size} across ${Object.keys(questionCounts).length} modules` +
            (modulesWithoutQuestions ? ` (${modulesWithoutQuestions} modules have none yet)` : ''));
console.log(`traces   ${traceIds.size}`);
console.log(`challenges ${challengeIds.size}`);

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
