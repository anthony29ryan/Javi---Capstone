// How far (dp) a sideways drag must travel to switch tabs (design 1a).
export const SWIPE_DISTANCE = 50;

/** Which tab a released drag lands on: a neighbour past the threshold, else the same one. */
export function swipeTarget(dx, index, count) {
  const to = dx < -SWIPE_DISTANCE ? index + 1 : dx > SWIPE_DISTANCE ? index - 1 : index;
  return Math.min(count - 1, Math.max(0, to));
}
