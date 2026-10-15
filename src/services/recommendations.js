// Turns the weak-topic model's verdict into lessons for Home's "Recommended
// for you". Kept free of Firebase imports so tests/recommendations.test.js can
// run it under plain Node.

/**
 * Up to `count` lessons from the modules the model marks weak, most likely
 * weak first. Within a module, unfinished lessons come before finished ones
 * (worth reviewing), each in lesson order. `skipId` is left out, so the list
 * never repeats the "Continue learning" lesson.
 *
 * Returns { lessons, topic }: topic is the model entry for the first pick's
 * module, for the "Picked because" note, or null when there are no picks.
 */
export function pickWeakLessons({ topics, orderedLessons, isComplete, count, skipId }) {
  const lessons = [];
  for (const topic of topics.filter((t) => t.weak)) {
    const inModule = orderedLessons.filter((l) => l.moduleId === topic.topic && l.id !== skipId);
    const byNeed = [
      ...inModule.filter((l) => !isComplete(l.id)),
      ...inModule.filter((l) => isComplete(l.id)),
    ];
    lessons.push(...byNeed.slice(0, count - lessons.length));
    if (lessons.length >= count) break;
  }
  const topic = lessons.length ? topics.find((t) => t.topic === lessons[0].moduleId) : null;
  return { lessons, topic };
}
