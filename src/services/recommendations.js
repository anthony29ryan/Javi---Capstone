// Turns the weak-topic model's verdict into lessons for Home's "Recommended
// for you". Kept free of Firebase imports so tests/recommendations.test.js can
// run it under plain Node.

/**
 * Up to `count` lessons from the modules the model marks weak. The modules
 * take turns, most likely weak first, so a second weak module is not crowded
 * out by the first. Within a module, unfinished lessons come before finished
 * ones (worth reviewing), each in lesson order. `skipId` is left out, so the
 * list never repeats the "Continue learning" lesson.
 *
 * Returns { lessons, topics }: topics are the weak model entries that got at
 * least one pick, most likely weak first, for the "Javi thinks" note.
 */
export function pickWeakLessons({ topics, orderedLessons, isComplete, count, skipId }) {
  const queues = topics
    .filter((t) => t.weak)
    .map((topic) => {
      const inModule = orderedLessons.filter((l) => l.moduleId === topic.topic && l.id !== skipId);
      return {
        topic,
        lessons: [
          ...inModule.filter((l) => !isComplete(l.id)),
          ...inModule.filter((l) => isComplete(l.id)),
        ],
      };
    })
    .filter((q) => q.lessons.length);

  const lessons = [];
  for (let round = 0; lessons.length < count && queues.some((q) => q.lessons.length > round); round++) {
    for (const q of queues) {
      if (lessons.length < count && q.lessons[round]) lessons.push(q.lessons[round]);
    }
  }
  return { lessons, topics: queues.filter((q) => lessons.includes(q.lessons[0])).map((q) => q.topic) };
}
