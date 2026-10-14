import { httpsCallable } from 'firebase/functions';

import { functions } from './firebase';

const getWeakTopicsFunction = httpsCallable(functions, 'getWeakTopics');

/**
 * The trained model's verdict per topic for the signed-in learner, most likely
 * weak first: [{ topic (module id), probability, weak, attempts, accuracy,
 * avgTimeSec, longestWrongStreak }]. Topics with under 10 attempts are left out.
 */
export async function getWeakTopics() {
  const { data } = await getWeakTopicsFunction();
  return data.topics;
}
