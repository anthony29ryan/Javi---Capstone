// Converts the authored Markdown lessons into content/lessons/*.json in this
// project's block format, then you publish them with scripts/publishContent.js.
//
//   node scripts/importLessons.js                 # uses the default source path
//   node scripts/importLessons.js "D:/path/to/lessons"
//
// Source is the folder containing beginner/ intermediate/ advanced/ and dist/.
// Module ids and tier assignments come from content/modules.json, which this
// script never modifies — the authored tiers are ignored in favour of yours.

const fs = require('fs');
const path = require('path');

const SOURCE = process.argv[2] || 'H:/Modules Java/lessons';
const CONTENT_DIR = path.join(__dirname, '..', 'content');
const OUT_DIR = path.join(CONTENT_DIR, 'lessons');

/* The authored lessons are numbered 1-21 and modules.json is in the same order,
   so position is the mapping. Verified below before anything is written. */
const modules = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'modules.json'), 'utf8'));

/* Screen kinds that become lessons. Exercises and quizzes belong in `questions`. */
const LESSON_KINDS = new Set(['intro', 'concept', 'pitfalls', 'summary']);

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/* ---------------------------------------------------------------- markdown -> blocks */

/**
 * Splits a markdown table row into trimmed cells.
 * Pipes escaped as `\|` are content (the `||` operator appears in these lessons),
 * so only unescaped pipes separate cells.
 */
const cells = (row) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));

/**
 * Converts one screen's markdown into this project's block array.
 * Emits: text, code, heading, note, table, list. Notes nest their own blocks.
 */
function toBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    if (value) blocks.push({ type: 'text', value });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // fenced code
    if (/^\s*```/.test(line)) {
      flushParagraph();
      const language = line.replace(/^\s*```/, '').trim() || 'text';
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      blocks.push({ type: 'code', language, value: body.join('\n') });
      continue;
    }

    // sub-heading
    if (/^#{3,6}\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'heading', value: line.replace(/^#{3,6}\s+/, '').trim() });
      continue;
    }

    // blockquote callout: gather the whole quote, then convert it recursively
    if (/^\s*>/.test(line)) {
      flushParagraph();
      const quoted = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      i--;
      const inner = quoted.join('\n').trim();
      // "**Correction:** the rest..." gives the callout its title
      const titled = inner.match(/^\*\*([^*]+?)[:.]?\*\*\s*/);
      const title = titled ? titled[1].trim() : null;
      const rest = titled ? inner.slice(titled[0].length) : inner;
      blocks.push({
        type: 'note',
        variant: /correction/i.test(title || '') ? 'correction' : 'note',
        title,
        blocks: toBlocks(rest),
      });
      continue;
    }

    // table
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      flushParagraph();
      let headers = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      i--;
      // Some tables are laid out as a plain grid with a decorative empty header row.
      if (headers.every((h) => !h)) headers = [];
      // Pad short rows so every row lines up with the widest one.
      const width = Math.max(headers.length, ...rows.map((r) => r.length));
      const pad = (r) => (r.length === width ? r : [...r, ...Array(width - r.length).fill('')]);
      blocks.push({
        type: 'table',
        headers: headers.length ? pad(headers) : [],
        rows: rows.map(pad),
      });
      continue;
    }

    // list
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      flushParagraph();
      const ordered = /^\s*\d+\.\s/.test(line);
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        let item = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '').trim();
        i++;
        // fold continuation lines into the item
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.)\s/.test(lines[i])) {
          item += ' ' + lines[i++].trim();
        }
        items.push(item);
      }
      i--;
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // horizontal rule and the trailing pointer to the next lesson are dropped
    if (/^\s*---\s*$/.test(line)) { flushParagraph(); continue; }
    if (/^\*\*Next lesson:/.test(line)) { flushParagraph(); break; }

    if (!line.trim()) { flushParagraph(); continue; }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

/* ---------------------------------------------------------------------- build */

const lessonsJson = JSON.parse(fs.readFileSync(path.join(SOURCE, 'dist', 'lessons.json'), 'utf8'));

if (lessonsJson.length !== modules.length) {
  throw new Error(
    `Source has ${lessonsJson.length} lessons but modules.json has ${modules.length}. ` +
    `They must correspond 1:1 by position.`
  );
}

// Sanity-check the positional mapping before writing anything over existing content.
console.log('Module mapping:');
lessonsJson.forEach((l, i) => {
  console.log(`  ${String(l.module).padStart(2)}  ${l.title.padEnd(42)} -> ${modules[i].id}`);
});
console.log();

const out = [];
let skipped = 0;

lessonsJson.forEach((source, i) => {
  const moduleId = modules[i].id;
  let order = 0;

  // "Why this matters" and "Learning objectives" read better as one opening lesson
  const intro = source.screens.find((s) => s.kind === 'intro');
  const objectives = source.screens.find((s) => s.kind === 'objectives');
  if (intro) {
    const blocks = toBlocks(intro.text.replace(/^#\s+.*$/m, '').trim());
    if (objectives) {
      blocks.push({ type: 'heading', value: 'What you will be able to do' });
      blocks.push(...toBlocks(objectives.text));
    }
    out.push({
      id: `${moduleId}-overview`,
      moduleId,
      title: 'Why This Matters',
      order: ++order,
      blocks,
    });
  }

  for (const screen of source.screens) {
    if (!LESSON_KINDS.has(screen.kind) || screen.kind === 'intro') {
      if (!LESSON_KINDS.has(screen.kind)) skipped++;
      continue;
    }
    const title = screen.heading.replace(/^\d+\.\s*/, '').trim();
    out.push({
      id: `${moduleId}-${slug(screen.heading)}`,
      moduleId,
      title,
      order: ++order,
      blocks: toBlocks(screen.text),
    });
  }
});

/* --------------------------------------------------------------------- write */

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const ids = new Set();
for (const lesson of out) {
  if (ids.has(lesson.id)) throw new Error('duplicate lesson id: ' + lesson.id);
  ids.add(lesson.id);
  fs.writeFileSync(path.join(OUT_DIR, lesson.id + '.json'), JSON.stringify(lesson, null, 2) + '\n');
}

const blockTypes = {};
for (const l of out) {
  const walk = (bs) => bs.forEach((b) => {
    blockTypes[b.type] = (blockTypes[b.type] || 0) + 1;
    if (b.blocks) walk(b.blocks);
  });
  walk(l.blocks);
}

console.log(`Wrote ${out.length} lessons to content/lessons/`);
console.log(`Skipped ${skipped} exercise and quiz screens (those belong in \`questions\`).`);
console.log('Blocks by type:', JSON.stringify(blockTypes));
console.log('\nNext: node --env-file=.env scripts/publishContent.js');
