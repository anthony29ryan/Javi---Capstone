// QA measurement for docs/qa/iso-25010-evaluation.md, not run by npm test: WCAG 2.x contrast ratios for theme colour pairs in use.
const L = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = [
  ['muted #A1A4B2 on bg #F7F5F0 (auth labels, placeholders)', '#A1A4B2', '#F7F5F0'],
  ['muted #A1A4B2 on white', '#A1A4B2', '#FFFFFF'],
  ['success #5EB78D on white ("Correct")', '#5EB78D', '#FFFFFF'],
  ['accent #C88B7A on bg (header tint)', '#C88B7A', '#F7F5F0'],
  ['white on accent/primary #C88B7A (quiz hero)', '#FFFFFF', '#C88B7A'],
  ['ink2 #6B6E7F on bg', '#6B6E7F', '#F7F5F0'],
  ['white on button #A8563F', '#FFFFFF', '#A8563F'],
  ['error #B4483E on white', '#B4483E', '#FFFFFF'],
  ['ink #2E3141 on bg', '#2E3141', '#F7F5F0'],
];
for (const [label, fg, bg] of pairs) { const r = ratio(fg, bg); console.log(r.toFixed(2).padStart(5) + ':1', r >= 4.5 ? 'PASS AA' : r >= 3 ? 'large-text only' : 'FAIL', '-', label); }
