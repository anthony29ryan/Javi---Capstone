// Picks and orders the questions for one quiz attempt. Kept free of Firebase
// and React imports so tests/quizOrder.test.js can run it under plain Node.

/**
 * Up to `length` questions drawn at random from a module's bank, then put in
 * lesson order. A module quiz is every lesson's questions put together, so
 * they are ordered by which lesson they came from first; a question's own
 * `order` only ranks it within its own lesson. Anything written at module
 * level rather than against a lesson (no lessonId) sits at the end.
 *
 * `lessons` are the module's lessons ({ id, order }). `random` is injectable
 * so tests can make the draw repeatable; the app uses Math.random.
 */
export function pickQuizQuestions(questions, lessons, { length, random = Math.random }) {
  const lessonOrder = new Map(lessons.map((lesson) => [lesson.id, lesson.order ?? 0]));
  const rankOf = (question) =>
    question.lessonId ? (lessonOrder.get(question.lessonId) ?? 0) : Number.MAX_SAFE_INTEGER;

  return questions
    .map((question) => ({ question, key: random() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, length)
    .map(({ question }) => question)
    .sort((a, b) => {
      const lessonDelta = rankOf(a) - rankOf(b);
      return lessonDelta !== 0 ? lessonDelta : (a.order ?? 0) - (b.order ?? 0);
    });
}
