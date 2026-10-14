import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getAllLessons, getAllModules, getCourses, getModuleLessons } from '../services/content';
import {
  getDownloadedModuleIds,
  loadSnapshot,
  refreshDownloads,
  removeAllModules,
  removeModule,
  saveModule,
  saveSnapshot,
} from '../services/offline';
import { getProgress, recordLessonOpened } from '../services/progress';
import { liveStreak } from '../services/streak';

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
  // True while showing the last saved snapshot because Firestore could not be reached.
  const [offline, setOffline] = useState(false);
  const [downloadedIds, setDownloadedIds] = useState(() => new Set());

  const refresh = useCallback(async () => {
    // Screens show the spinner, not the old error, while a retry is in flight.
    setLoading(true);
    try {
      const [progressData, courseData, moduleData, lessonData] = await Promise.all([
        getProgress(),
        getCourses(),
        getAllModules(),
        getAllLessons(),
      ]);
      setProgress(progressData);
      setCourses(courseData);
      setModules(moduleData);
      setLessonRefs(lessonData.refs);
      setError('');
      setOffline(false);
      // Keep the offline copies current from the read just made. Failing to
      // save only means a staler copy next time, so it never blocks the app.
      saveSnapshot({
        progress: progressData,
        courses: courseData,
        modules: moduleData,
        lessonRefs: lessonData.refs,
      }).catch(() => {});
      refreshDownloads(lessonData.full).catch(() => {});
    } catch (err) {
      const snapshot = await loadSnapshot().catch(() => null);
      if (snapshot) {
        setProgress(snapshot.progress);
        setCourses(snapshot.courses);
        setModules(snapshot.modules);
        setLessonRefs(snapshot.lessonRefs);
        setError('');
        setOffline(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    getDownloadedModuleIds()
      .then((ids) => setDownloadedIds(new Set(ids)))
      .catch(() => {});
  }, [refresh]);

  const downloadModule = useCallback(async (moduleId) => {
    await saveModule(moduleId, await getModuleLessons(moduleId));
    setDownloadedIds((current) => new Set(current).add(moduleId));
  }, []);

  const removeDownload = useCallback(async (moduleId) => {
    await removeModule(moduleId);
    setDownloadedIds((current) => {
      const next = new Set(current);
      next.delete(moduleId);
      return next;
    });
  }, []);

  const removeAllDownloads = useCallback(async () => {
    await removeAllModules();
    setDownloadedIds(new Set());
  }, []);

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
      offline,
      downloadedIds,
      downloadModule,
      removeDownload,
      removeAllDownloads,
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
      streak: progress?.streak ? liveStreak(progress.streak) : { current: 0, longest: 0 },
      moduleScores: progress?.moduleScores ?? {},
      moduleProgress,
      courseProgress,
      isLessonComplete: (lessonId) => completedSet.has(lessonId),
    };
  }, [
    progress,
    courses,
    modules,
    lessonRefs,
    loading,
    error,
    refresh,
    reloadProgress,
    markLessonOpened,
    offline,
    downloadedIds,
    downloadModule,
    removeDownload,
    removeAllDownloads,
  ]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
