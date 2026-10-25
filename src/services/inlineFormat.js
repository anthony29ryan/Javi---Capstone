// Kept free of React Native imports so tests/inlineFormat.test.js can run it under plain Node.

// `code` first so its contents stay literal; **bold** is lazy and may hold *italic*; an italic
// must start and end on a non-space, so a lone * as in `a * b` stays plain text.
const PATTERN = /(`[^`]+`|\*\*.+?\*\*|\*[^*\s](?:[^*]*[^*\s])?\*)/g;

/**
 * Lesson text's inline formatting as runs: { kind: 'text' | 'code', value } or
 * { kind: 'bold' | 'italic', children }, where children are runs again. Covers only
 * the three marks the lessons use, which saves a markdown library.
 */
export function parseInline(text) {
  return String(text ?? '')
    .split(PATTERN)
    .filter(Boolean)
    .map((run) => {
      if (run.length > 2 && run.startsWith('`') && run.endsWith('`')) return { kind: 'code', value: run.slice(1, -1) };
      if (run.length > 4 && run.startsWith('**') && run.endsWith('**')) {
        return { kind: 'bold', children: parseInline(run.slice(2, -2)) };
      }
      if (run.length > 2 && /^\*[^*\s]/.test(run) && /[^*\s]\*$/.test(run)) {
        return { kind: 'italic', children: parseInline(run.slice(1, -1)) };
      }
      return { kind: 'text', value: run };
    });
}
