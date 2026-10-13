import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getAllLessonProgressRefs, getAllModules, getCourses } from '../services/content';
import { getProgress, recordLessonOpened } from '../services/progress';

const ProgressContext = createContext(undefined);

function emptyBucket() {
  return { completed: 0, total: 0, percent: 0 };
}

function toPercent(completed, total) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/** A saved quiz score ({ correct, total }) as a whole percentage. */
export function scorePercent(score) {
  return toPercent(score.correct, score.total);
}

/**
 * Holds the learner's progress plus the module and lesson lists needed to break
 * it down per course and per module.
 *
 * This lives in one provider rather than in each screen because the course,
 * module, lesson, and dashboard screens all need the same three collections.
 * Fetching per screen would re-read every module and lesson document on each
 * navigation step; here it is read once and refreshed only when a quiz changes
 * something.
 */
export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(null);
  const [courses, setCourses] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessonRefs, setLessonRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    // Screens show the spinner, not the old error, while a retry is in flight.
    setLoading(true);
    try {
      const [progressData, courseData, moduleData, lessonData] = await Promise.all([
        getProgress(),
        getCourses(),
        getAllModules(),
        getAllLessonProgressRefs(),
      ]);
      setProgress(progressData);
      setCourses(courseData);
      setModules(moduleData);
      setLessonRefs(lessonData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // For after a write that only touched the progress document: one read,
  // where refresh() would re-read every course, module and lesson too.
  const reloadProgress = useCallback(async () => {
    setProgress(await getProgress());
  }, []);

  /**
   * Records the lesson being opened and moves the local pointer straight away.
   *
   * This updates state itself instead of calling `refresh()` afterwards
   * because a refresh re-reads courses, modules and every lesson — far too
   * much for something that happens on each lesson open, when the only thing
   * that changed is one id.
   */
  const markLessonOpened = useCallback(async (lessonId) => {
    setProgress((current) => (current ? { ...current, lastLessonId: lessonId } : current));
    try {
      await recordLessonOpened(lessonId);
    } catch {
      // Losing the bookmark is not worth interrupting a lesson over; the
      // pointer falls back to the first unfinished lesson.
    }
  }, []);

  const value = useMemo(() => {
    const completedSet = new Set(progress?.completedLessons ?? []);

    const lessonsByModule = {};
    for (const lesson of lessonRefs) {
      if (!lessonsByModule[lesson.moduleId]) lessonsByModule[lesson.moduleId] = [];
      lessonsByModule[lesson.moduleId].push(lesson.id);
    }

    const moduleProgress = {};
    const courseProgress = {};

    for (const module of modules) {
      const ids = lessonsByModule[module.id] ?? [];
      const done = ids.reduce((count, id) => count + (completedSet.has(id) ? 1 : 0), 0);
      moduleProgress[module.id] = {
        completed: done,
        total: ids.length,
        percent: toPercent(done, ids.length),
      };

      if (!courseProgress[module.courseId]) courseProgress[module.courseId] = emptyBucket();
      courseProgress[module.courseId].completed += done;
      courseProgress[module.courseId].total += ids.length;
    }

    for (const bucket of Object.values(courseProgress)) {
      bucket.percent = toPercent(bucket.completed, bucket.total);
    }

    const totalLessons = lessonRefs.length;
    // Counted against the lessons that exist now: completedLessons keeps the
    // ids of lessons a content publish has since renamed or removed.
    const completedCount = lessonRefs.filter((lesson) => completedSet.has(lesson.id)).length;

    return {
      loading,
      error,
      refresh,
      reloadProgress,
      markLessonOpened,
      lastLessonId: progress?.lastLessonId ?? null,
      progress,
      courses,
      modules,
      lessons: lessonRefs,
      totalLessons,
      completedCount,
      percent: toPercent(completedCount, totalLessons),
      streak: progress?.streak ?? { current: 0, longest: 0 },
      moduleScores: progress?.moduleScores ?? {},
      moduleProgress,
      courseProgress,
      isLessonComplete: (lessonId) => completedSet.has(lessonId),
    };
  }, [progress, courses, modules, lessonRefs, loading, error, refresh, reloadProgress, markLessonOpened]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
