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

/* -------------------------------------------------------------------- report */

console.log(`courses  ${courses.length}`);
console.log(`modules  ${modules.length}`);
console.log(`lessons  ${files.length}`);
console.log(`blocks   ${blockCount}  ${JSON.stringify(typeCount)}`);
console.log(`lessons per module: min ${Math.min(...Object.values(perModule).map((a) => a.length))}, ` +
            `max ${Math.max(...Object.values(perModule).map((a) => a.length))}`);

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
