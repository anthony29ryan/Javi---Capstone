import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { httpsCallable } from 'firebase/functions';

import { auth, functions } from './firebase';

const getWeakTopicsFunction = httpsCallable(functions, 'getWeakTopics');

// The function reads every saved answer, so it is asked once and then only
// again after a new answer (forgetWeakTopics), not on every Home or Profile visit.
let cached = null;
let cachedFor = null; // the uid it belongs to, so a new sign-in never sees the last user's

/**
 * The trained model's verdict per topic for the signed-in learner, most likely
 * weak first: [{ topic (module id), probability, weak, attempts, accuracy,
 * avgTimeSec, longestWrongStreak }]. Topics with under 10 attempts are left out.
 */
export function getWeakTopics() {
  const uid = auth.currentUser?.uid;
  if (cachedFor !== uid) cached = null;
  cachedFor = uid;
  cached ??= getWeakTopicsFunction()
    .then(({ data }) => data.topics)
    .catch((err) => {
      cached = null; // let the next visit try again
      throw err;
    });
  return cached;
}

/** Called after an answer is graded, so the next visit asks the model again. */
export function forgetWeakTopics() {
  cached = null;
}

/**
 * The weak topics for a screen, re-read on focus (from the cache unless a quiz
 * answer came in since). null while the first answer is on its way. Any failure
 * just means course-order picks, so it is never reported.
 */
export function useWeakTopics(offline) {
  const [weakTopics, setWeakTopics] = useState(null);
  useFocusEffect(
    useCallback(() => {
      if (offline) {
        setWeakTopics([]);
        return undefined;
      }
      let cancelled = false;
      getWeakTopics()
        .then((topics) => !cancelled && setWeakTopics(topics))
        .catch(() => !cancelled && setWeakTopics([]));
      return () => {
        cancelled = true;
      };
    }, [offline])
  );
  return weakTopics;
}
