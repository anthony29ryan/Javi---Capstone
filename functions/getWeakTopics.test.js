// Tests for getWeakTopics, run against the local Firestore emulator.
//
//   npm run test:rules
process.env.GCLOUD_PROJECT = 'demo-javi-functions';

const assert = require('node:assert');
const { before, test } = require('node:test');

const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getWeakTopics } = require('./index');

const db = getFirestore();

before(async () => {
  const batch = db.batch();
  const add = (userId, topic, pattern, seconds) =>
    [...pattern].forEach((mark, i) =>
      batch.set(db.collection('attempts').doc(), {
        userId,
        topic,
        questionId: `${topic}-q${i}`,
        correct: mark === 'C',
        timeTakenMs: seconds * 1000,
        attemptNumber: 1,
        createdAt: Timestamp.fromMillis(i * 1000),
      }),
    );
  for (const id of ['wt-loops', 'wt-arrays', 'wt-strings']) batch.set(db.doc(`modules/${id}`), { title: id });
  add('wendy', 'wt-loops', 'CWWWWCWWWWWCWWCWWWWC', 30);
  add('wendy', 'wt-arrays', 'C'.repeat(20), 8);
  add('wendy', 'wt-strings', 'WWW', 30);
  // Old app-written attempts stored the module title, not its id.
  add('wendy', 'Strings Quiz', 'W'.repeat(20), 30);
  add('someone-else', 'wt-arrays', 'W'.repeat(20), 30);
  await batch.commit();
});

test("returns the learner's own judged topics, most likely weak first", async () => {
  const { topics } = await getWeakTopics.run({ auth: { uid: 'wendy' }, data: {} });
  assert.deepStrictEqual(
    topics.map(({ topic, weak, attempts }) => ({ topic, weak, attempts })),
    [
      { topic: 'wt-loops', weak: true, attempts: 20 },
      { topic: 'wt-arrays', weak: false, attempts: 20 },
    ],
  );
});

test('a learner with no attempts gets an empty list, and signed-out callers are refused', async () => {
  assert.deepStrictEqual(await getWeakTopics.run({ auth: { uid: 'newcomer' }, data: {} }), { topics: [] });
  await assert.rejects(getWeakTopics.run({ data: {} }), (err) => err.code === 'unauthenticated');
});
