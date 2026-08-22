import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { getAllLessonsCount, getAllModules } from '../services/content';
import { getProgress } from '../services/progress';

/**
 * Loads the progress figures the dashboard and the Progress screen both need,
 * so the two screens don't each reimplement the same fetch/loading/error code.
 *
 * Reloads on focus: finishing a quiz updates progress, and the user lands back
 * on a screen showing these numbers, so stale values would be visible.
 *
 * `includeModules` is opt-in because only the Progress screen lists per-module
 * scores; the dashboard would otherwise pay for a read it never displays.
 */
export function useProgressSummary({ includeModules = false } = {}) {
  const [progress, setProgress] = useState(null);
  const [modules, setModules] = useState([]);
  const [totalLessons, setTotalLessons] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const requests = [getProgress(), getAllLessonsCount()];
      if (includeModules) requests.push(getAllModules());

      Promise.all(requests)
        .then(([progressData, lessonsCount, moduleData]) => {
          if (!active) return;
          setProgress(progressData);
          setTotalLessons(lessonsCount);
          if (moduleData) setModules(moduleData);
          setError('');
        })
        .catch((err) => {
          if (active) setError(err.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      // Guards against a state update after the screen has been left.
      return () => {
        active = false;
      };
    }, [includeModules])
  );

  const completed = progress?.completedLessons?.length ?? 0;
  const percent = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

  return { progress, modules, totalLessons, completed, percent, loading, error };
}
