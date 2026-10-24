/**
 * How long a deleted account waits before it is removed for good. Logging in
 * at any point inside the window offers to restore it untouched.
 *
 * scripts/purgeDeletedAccounts.js does the actual removal and keeps its own
 * copy of this number, because it runs in Node outside the app bundle. Change
 * the two together.
 */
export const DELETION_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The date an account whose deletion was requested at `requestedAt` is purged. */
export function permanentDeletionDate(requestedAt) {
  return new Date(requestedAt.getTime() + DELETION_WINDOW_DAYS * DAY_MS);
}

/** True once the window has ended: the account counts as gone even if the purge has not run yet. */
export function isPastDeletionWindow(requestedAt, now = new Date()) {
  return permanentDeletionDate(requestedAt) <= now;
}

/** Formats a purge date for the screens that tell the user about it. */
export function formatDeletionDate(date) {
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}
