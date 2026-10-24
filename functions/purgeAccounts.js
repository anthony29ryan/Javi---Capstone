// Permanently deletes accounts whose 30-day deletion window has ended.
//
// The app never deletes an account itself. "Delete my account" only stamps
// users/{uid}.deletionRequestedAt, and logging in within 30 days removes the
// stamp again (src/context/AuthContext.js). Only admin credentials can remove
// a user's sign-in and data on a day they are not signed in, so this runs
// daily as the purgeDeletedAccounts function (index.js), and by hand through
// scripts/purgeDeletedAccounts.js. No imports: each caller passes its own
// { db, auth }, since the script and the function connect differently.

// Keep in step with src/constants/accountDeletion.js.
const DELETION_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 500;

// If a bug ever stamped many accounts by mistake, one run cannot remove them
// all; the rest wait for the next day's run.
const MAX_PER_RUN = 50;

async function deleteInBatches(db, refs) {
  for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
    const batch = db.batch();
    refs.slice(start, start + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/** The profile documents of accounts past their window, at most MAX_PER_RUN. */
async function dueAccounts(db, now = Date.now()) {
  const cutoff = new Date(now - DELETION_WINDOW_DAYS * DAY_MS);
  const due = await db
    .collection('users')
    .where('deletionRequestedAt', '<=', cutoff)
    .limit(MAX_PER_RUN)
    .get();
  return due.docs;
}

/**
 * Removes one account completely.
 *
 * The profile document goes last, because its deletionRequestedAt is what
 * marks the account as due. If anything fails part-way, the marker is still
 * there, and the next run picks the account up and finishes the job. Every
 * step is safe to repeat.
 */
async function purgeAccount({ db, auth }, userId) {
  try {
    await auth.deleteUser(userId);
  } catch (err) {
    // Already gone from a previous run that stopped part-way.
    if (err.code !== 'auth/user-not-found') throw err;
  }

  const attempts = await db.collection('attempts').where('userId', '==', userId).get();
  await deleteInBatches(db, attempts.docs.map((attempt) => attempt.ref));

  // Tutor conversations are personal, so they go with the account.
  const chats = await db.collection('chats').where('userId', '==', userId).get();
  await deleteInBatches(db, chats.docs.map((chat) => chat.ref));
  await db.collection('tutorUsage').doc(userId).delete();
  await db.collection('runUsage').doc(userId).delete();
  await db.collection('quizUsage').doc(userId).delete();

  await db.collection('progress').doc(userId).delete();
  await db.collection('users').doc(userId).delete();

  return { attempts: attempts.size, chats: chats.size };
}

/**
 * Ids of Google sign-ins older than a day that never got a profile: the person
 * closed the app on the sign-up Terms popup, so they never consented and
 * nothing of theirs should be kept. Google-only, because an email account
 * can be in use before its profile exists. At most MAX_PER_RUN.
 */
async function abandonedGoogleAccounts({ db, auth }, now = Date.now()) {
  const found = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    const candidates = page.users.filter((account) => {
      const providers = account.providerData.map((provider) => provider.providerId);
      return (
        providers.includes('google.com') &&
        !providers.includes('password') &&
        Date.parse(account.metadata.creationTime) <= now - DAY_MS
      );
    });
    if (candidates.length) {
      const profiles = await db.getAll(...candidates.map((account) => db.doc(`users/${account.uid}`)));
      profiles.forEach((profile, i) => {
        if (!profile.exists) found.push(candidates[i].uid);
      });
    }
    pageToken = page.pageToken;
  } while (pageToken && found.length < MAX_PER_RUN);
  return found.slice(0, MAX_PER_RUN);
}

module.exports = { DELETION_WINDOW_DAYS, MAX_PER_RUN, abandonedGoogleAccounts, dueAccounts, purgeAccount };
