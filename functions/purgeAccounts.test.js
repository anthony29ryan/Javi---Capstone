// Tests for purgeAccounts.js, run against the local Firestore emulator.
//
//   npm run test:rules
//
// Firebase Auth is replaced by a stand-in that records deleteUser calls, so no
// auth emulator is needed.
process.env.GCLOUD_PROJECT = 'demo-javi-functions';

const assert = require('node:assert');
const { test } = require('node:test');

const { initializeApp } = require('firebase-admin/app');
const { Timestamp, getFirestore } = require('firebase-admin/firestore');
const { abandonedGoogleAccounts, dueAccounts, purgeAccount } = require('./purgeAccounts');

initializeApp();
const db = getFirestore();
const DAY_MS = 24 * 60 * 60 * 1000;

async function seedAccount(userId, daysAgo) {
  await db.doc(`users/${userId}`).set({
    email: `${userId}@example.com`,
    deletionRequestedAt: Timestamp.fromMillis(Date.now() - daysAgo * DAY_MS),
  });
  await db.doc(`progress/${userId}`).set({ completedLessons: ['l1'] });
  await db.collection('attempts').add({ userId, correct: true });
  await db.collection('chats').add({ userId, title: 'Loops' });
  for (const usage of ['tutorUsage', 'runUsage', 'quizUsage']) {
    await db.doc(`${usage}/${userId}`).set({ count: 1 });
  }
}

async function leftovers(userId) {
  const docs = ['users', 'progress', 'tutorUsage', 'runUsage', 'quizUsage'].map((name) =>
    db.doc(`${name}/${userId}`).get()
  );
  const queries = ['attempts', 'chats'].map((name) =>
    db.collection(name).where('userId', '==', userId).get()
  );
  const found = await Promise.all([...docs, ...queries]);
  return found.filter((result) => (result.docs ? !result.empty : result.exists)).length;
}

test('an account past its 30 days is removed everywhere; one still inside them is left alone', async () => {
  await seedAccount('purge-due', 31);
  await seedAccount('purge-recent', 29);
  const deletedSignIns = [];
  const auth = { deleteUser: async (userId) => deletedSignIns.push(userId) };

  const due = await dueAccounts(db);
  assert.deepStrictEqual(due.map((profile) => profile.id), ['purge-due']);
  for (const profile of due) await purgeAccount({ db, auth }, profile.id);

  assert.deepStrictEqual(deletedSignIns, ['purge-due']);
  assert.strictEqual(await leftovers('purge-due'), 0);
  assert.strictEqual(await leftovers('purge-recent'), 7, 'all seven of its documents are kept');
});

test('an account whose sign-in is already gone still has its data removed', async () => {
  await seedAccount('purge-half-done', 40);
  const auth = {
    deleteUser: async () => {
      throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
    },
  };

  await purgeAccount({ db, auth }, 'purge-half-done');
  assert.strictEqual(await leftovers('purge-half-done'), 0);
});

test('only Google sign-ups over a day old with no profile count as abandoned', async () => {
  const daysAgo = (days) => new Date(Date.now() - days * DAY_MS).toUTCString();
  const account = (uid, providers, days) => ({
    uid,
    providerData: providers.map((providerId) => ({ providerId })),
    metadata: { creationTime: daysAgo(days) },
  });
  await db.doc('users/abandon-has-profile').set({ email: 'kept@example.com' });
  // Two pages, to check the listing is followed to the end.
  const pages = {
    first: {
      users: [
        account('abandon-old-google', ['google.com'], 2), // the one to remove
        account('abandon-new-google', ['google.com'], 0.5), // may still be on the popup
        account('abandon-has-profile', ['google.com'], 9), // accepted the Terms
      ],
      pageToken: 'second',
    },
    second: {
      users: [
        account('abandon-email', ['password'], 9), // email accounts can work without a profile
        account('abandon-linked', ['google.com', 'password'], 9),
      ],
    },
  };
  const auth = { listUsers: async (max, pageToken) => pages[pageToken ?? 'first'] };

  assert.deepStrictEqual(await abandonedGoogleAccounts({ db, auth }), ['abandon-old-google']);
});
