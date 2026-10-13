// Permanently deletes accounts whose 30-day deletion window has ended.
//
// The app never deletes an account itself. "Delete my account" only stamps
// users/{uid}.deletionRequestedAt, and logging in within 30 days removes the
// stamp again (src/context/AuthContext.js). This script does the part the app
// cannot: on a day the user is not signed in, only admin credentials can
// remove their sign-in and their data.
//
//   npm run accounts:purge               list who is due, delete nothing
//   npm run accounts:purge -- --confirm  actually delete them
//
// Run it regularly, e.g. weekly. An account past its window cannot log in
// (the app refuses it), but its email stays taken until this runs.
//
// Once the project is on the Blaze plan, main() can move into a scheduled
// Cloud Function unchanged, apart from how it connects.

const { connectAsAdmin } = require('./adminApp');

// Keep in step with src/constants/accountDeletion.js.
const DELETION_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Firestore caps a batch at 500 writes.
const BATCH_LIMIT = 500;

async function deleteInBatches(db, refs) {
  for (let start = 0; start < refs.length; start += BATCH_LIMIT) {
    const batch = db.batch();
    refs.slice(start, start + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
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

  await db.collection('progress').doc(userId).delete();
  await db.collection('users').doc(userId).delete();

  return attempts.size;
}

async function main() {
  const confirmed = process.argv.includes('--confirm');
  const admin = connectAsAdmin();
  const cutoff = new Date(Date.now() - DELETION_WINDOW_DAYS * DAY_MS);

  const due = await admin.db.collection('users').where('deletionRequestedAt', '<=', cutoff).get();

  if (due.empty) {
    console.log('No accounts are past their deletion window.');
    return;
  }

  console.log(`${due.size} account(s) past the ${DELETION_WINDOW_DAYS}-day window:`);
  for (const profile of due.docs) {
    const { email, deletionRequestedAt } = profile.data();
    const requested = deletionRequestedAt.toDate().toISOString().slice(0, 10);
    console.log(`  ${profile.id}  ${email ?? '(no email)'}  requested ${requested}`);
  }

  if (!confirmed) {
    console.log('\nDry run, nothing deleted. Re-run with --confirm to delete these accounts.');
    return;
  }

  let failed = 0;
  for (const profile of due.docs) {
    try {
      const attemptCount = await purgeAccount(admin, profile.id);
      console.log(`Deleted ${profile.id} (${attemptCount} quiz attempts).`);
    } catch (err) {
      // Carry on with the others. This one keeps its marker and is retried
      // on the next run.
      failed++;
      console.error(`Could not delete ${profile.id}:`, err.message);
    }
  }

  console.log(`Done. Deleted ${due.size - failed} of ${due.size}.`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
