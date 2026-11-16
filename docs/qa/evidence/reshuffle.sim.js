// QA simulation for docs/qa/iso-25010-evaluation.md, not run by npm test: F-01. Replicates QuizScreen.js:177-192 (pick 20 at random, sort by
// lesson order then question order) and measures how often a mid-quiz reshuffle hands the learner a question
// they already answered, which finishQuiz then refuses ("Each question can be counted once").
const fs = require('fs'), path = require('path');
const root = process.argv[2];
const lessons = fs.readdirSync(path.join(root, 'content/lessons')).map((f) => JSON.parse(fs.readFileSync(path.join(root, 'content/lessons', f))));
const lessonOrder = new Map(lessons.map((l) => [l.id, l.order ?? 0]));
const QUIZ_LENGTH = 20;
function pick(qs) {
  const picked = qs.map((q) => ({ q, k: Math.random() })).sort((a, b) => a.k - b.k).slice(0, QUIZ_LENGTH).map(({ q }) => q);
  return picked.sort((a, b) => {
    const d = (a.lessonId ? (lessonOrder.get(a.lessonId) ?? 0) : Number.MAX_SAFE_INTEGER) - (b.lessonId ? (lessonOrder.get(b.lessonId) ?? 0) : Number.MAX_SAFE_INTEGER);
    return d !== 0 ? d : (a.order ?? 0) - (b.order ?? 0);
  });
}
const files = fs.readdirSync(path.join(root, 'content/questions'));
const sample = JSON.parse(fs.readFileSync(path.join(root, 'content/questions', files[0])));
const toArr = (j) => (Array.isArray(j) ? j : j.questions ?? Object.values(j).flat());
console.log('question fields:', Object.keys(toArr(sample)[0]).join(','));
for (const k of [3, 5, 10, 15]) {
  let dup = 0, mismatch = 0, trials = 0;
  for (const f of files) {
    const qs = toArr(JSON.parse(fs.readFileSync(path.join(root, 'content/questions', f)))).map((q, i) => ({ ...q, id: q.id ?? f + i }));
    for (let t = 0; t < 2000; t++) {
      const a = pick(qs), b = pick(qs);
      const answered = new Set(a.slice(0, k).map((q) => q.id));
      if (b.slice(k).some((q) => answered.has(q.id))) dup++;
      if (a.slice(0, k).some((q, i) => q.id !== b[i].id)) mismatch++;
      trials++;
    }
  }
  console.log(`reconnect after ${k} answers: repeat-question (score refused) ${(100 * dup / trials).toFixed(1)}% | review shows a mark against a different question ${(100 * mismatch / trials).toFixed(1)}%  (${trials} trials)`);
}
