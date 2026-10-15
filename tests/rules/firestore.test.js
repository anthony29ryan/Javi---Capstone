// Security-rules tests for firestore.rules, run against the local emulator.
//
//   npm run test:rules
//
// Rules that are too permissive still let the app work normally, so they fail
// silently. These tests are the only thing that notices. Each section has two
// halves: the writes the app really makes (copied from src/services and
// src/context, and they must keep passing or the app breaks), and the writes
// a tampered client could make (these must be denied).

const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, beforeEach, describe, test } = require('node:test');

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const {
  Timestamp,
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} = require('firebase/firestore');

let testEnv;

// A Firestore client signed in as `uid`, or signed out when `uid` is null.
function dbAs(uid) {
  const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
  return context.firestore();
}

// Writes test fixtures directly, the way the Admin SDK or the console would.
async function seed(write) {
  await testEnv.withSecurityRulesDisabled((context) => write(context.firestore()));
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-javi-rules',
    firestore: {
      rules: readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

describe('course content', () => {
  const contentPaths = ['courses/beginner', 'modules/oop', 'lessons/oop-1', 'questions/q1', 'traces/t1'];

  beforeEach(async () => {
    await seed(async (db) => {
      for (const contentPath of contentPaths) {
        await setDoc(doc(db, contentPath), { title: 'Seeded', order: 1 });
      }
    });
  });

  test('signed-in users can read every content collection', async () => {
    const db = dbAs('alice');
    for (const contentPath of contentPaths) {
      await assertSucceeds(getDoc(doc(db, contentPath)));
    }
    await assertSucceeds(getDocs(collection(db, 'lessons')));
    await assertSucceeds(getDocs(query(collection(db, 'questions'), where('moduleId', '==', 'oop'))));
  });

  test('signed-out visitors cannot read content', async () => {
    await assertFails(getDoc(doc(dbAs(null), 'lessons/oop-1')));
  });

  test('signed-in users cannot create, change or delete content', async () => {
    const db = dbAs('alice');
    for (const contentPath of contentPaths) {
      await assertFails(setDoc(doc(db, contentPath), { title: 'Vandalised' }));
      await assertFails(deleteDoc(doc(db, contentPath)));
    }
    await assertFails(setDoc(doc(db, 'lessons/brand-new'), { title: 'Injected' }));
  });
});

describe('users', () => {
  test('sign-up creates the profile document', async () => {
    await assertSucceeds(
      setDoc(doc(dbAs('alice'), 'users/alice'), {
        email: 'alice@example.com',
        displayName: 'Alice',
        lastName: 'Reyes',
        createdAt: serverTimestamp(),
        termsAcceptedAt: serverTimestamp(),
        termsVersion: '2026-10-15',
      })
    );
  });

  test('an avatar must be one of the 12 ids', async () => {
    const ref = doc(dbAs('alice'), 'users/alice');
    await seed((admin) => setDoc(doc(admin, 'users/alice'), { email: 'alice@example.com', displayName: 'Alice' }));
    await assertSucceeds(setDoc(ref, { avatar: 'w1' }, { merge: true }));
    await assertFails(setDoc(ref, { avatar: 'x9' }, { merge: true }));
    await assertFails(setDoc(ref, { avatar: '' }, { merge: true }));
    await assertFails(setDoc(ref, { avatar: 1 }, { merge: true }));
  });

  test('a nickname must be 1 to 30 characters of text', async () => {
    const ref = doc(dbAs('alice'), 'users/alice');
    await seed((admin) => setDoc(doc(admin, 'users/alice'), { email: 'alice@example.com', displayName: 'Alice' }));
    // Setup and Profile details both merge it in on its own.
    await assertSucceeds(setDoc(ref, { nickname: 'Kai' }, { merge: true }));
    await assertFails(setDoc(ref, { nickname: '' }, { merge: true }));
    await assertFails(setDoc(ref, { nickname: 'x'.repeat(31) }, { merge: true }));
    await assertFails(setDoc(ref, { nickname: ['Kai'] }, { merge: true }));
  });

  test('a last name must be 1 to 100 characters of text', async () => {
    const ref = doc(dbAs('alice'), 'users/alice');
    await seed((admin) => setDoc(doc(admin, 'users/alice'), { email: 'alice@example.com', displayName: 'Alice' }));
    // Profile details saves it alongside the goals.
    await assertSucceeds(setDoc(ref, { goals: [], lastName: 'Reyes' }, { merge: true }));
    await assertFails(setDoc(ref, { lastName: '' }, { merge: true }));
    await assertFails(setDoc(ref, { lastName: 'x'.repeat(101) }, { merge: true }));
    await assertFails(setDoc(ref, { lastName: 7 }, { merge: true }));
  });

  test('terms acceptance must use the server clock and a short version string', async () => {
    const ref = doc(dbAs('alice'), 'users/alice');
    const profile = { email: 'alice@example.com', displayName: 'Alice', createdAt: serverTimestamp() };
    await assertFails(
      setDoc(ref, {
        ...profile,
        termsAcceptedAt: Timestamp.fromDate(new Date('2020-01-01')),
        termsVersion: '2026-10-15',
      })
    );
    await assertFails(setDoc(ref, { ...profile, termsAcceptedAt: serverTimestamp(), termsVersion: 20261015 }));
    await assertFails(
      setDoc(ref, { ...profile, termsAcceptedAt: serverTimestamp(), termsVersion: 'x'.repeat(21) })
    );
  });

  test('every preference and profile write the app makes is allowed', async () => {
    const db = dbAs('alice');
    const ref = doc(db, 'users/alice');
    await seed((admin) =>
      setDoc(doc(admin, 'users/alice'), { email: 'alice@example.com', displayName: 'Alice' })
    );

    // SetupScreen, SettingsScreen, ProfileDetailsScreen, AuthContext.updateDisplayName
    await assertSucceeds(
      setDoc(ref, { reminderTime: '20:00', reminderEnabled: true, setupComplete: true }, { merge: true })
    );
    await assertSucceeds(setDoc(ref, { reminderEnabled: false }, { merge: true }));
    await assertSucceeds(setDoc(ref, { goals: ['Exam prep', 'Curiosity'] }, { merge: true }));
    await assertSucceeds(setDoc(ref, { goals: [] }, { merge: true }));
    await assertSucceeds(updateDoc(ref, { displayName: 'Alice B' }));
    await assertSucceeds(getDoc(ref));
  });

  test('a profile holding a field the rules do not know about can still be updated', async () => {
    // Accounts created by older builds may carry fields the app no longer
    // writes. Rules check only the fields a write changes, so these accounts
    // are not locked out of saving their preferences.
    await seed((admin) => setDoc(doc(admin, 'users/alice'), { email: 'a@x.com', legacyLevel: 2 }));
    await assertSucceeds(setDoc(doc(dbAs('alice'), 'users/alice'), { goals: [] }, { merge: true }));
  });

  test('nobody can read or write someone else’s profile', async () => {
    await seed((admin) => setDoc(doc(admin, 'users/bob'), { email: 'bob@example.com' }));
    const db = dbAs('alice');
    await assertFails(getDoc(doc(db, 'users/bob')));
    await assertFails(setDoc(doc(db, 'users/bob'), { displayName: 'Hacked' }, { merge: true }));
    await assertFails(getDoc(doc(dbAs(null), 'users/bob')));
  });

  test('unknown fields and wrong types are rejected', async () => {
    const ref = doc(dbAs('alice'), 'users/alice');
    await assertFails(setDoc(ref, { isAdmin: true }, { merge: true }));
    await assertFails(setDoc(ref, { reminderEnabled: 'yes' }, { merge: true }));
    await assertFails(setDoc(ref, { reminderTime: 'eight pm' }, { merge: true }));
    await assertFails(setDoc(ref, { goals: 'Exam prep' }, { merge: true }));
    await assertFails(setDoc(ref, { setupComplete: 1 }, { merge: true }));
    await assertFails(setDoc(ref, { displayName: '' }, { merge: true }));
  });

  test('a user can schedule their own deletion, stamped with the server time', async () => {
    await seed((admin) => setDoc(doc(admin, 'users/alice'), { email: 'alice@example.com' }));
    await assertSucceeds(
      setDoc(doc(dbAs('alice'), 'users/alice'), { deletionRequestedAt: serverTimestamp() }, { merge: true })
    );
  });

  test('a scheduled deletion cannot be backdated to skip the 30-day window', async () => {
    const longAgo = Timestamp.fromDate(new Date('2020-01-01'));
    await assertFails(
      setDoc(doc(dbAs('alice'), 'users/alice'), { deletionRequestedAt: longAgo }, { merge: true })
    );
  });

  test('logging back in during the window cancels the deletion', async () => {
    await seed((admin) =>
      setDoc(doc(admin, 'users/alice'), {
        email: 'alice@example.com',
        deletionRequestedAt: Timestamp.now(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(dbAs('alice'), 'users/alice'), { deletionRequestedAt: deleteField() })
    );
  });

  test('the app cannot delete a profile — only the purge script can', async () => {
    await seed((admin) => setDoc(doc(admin, 'users/alice'), { email: 'alice@example.com' }));
    await assertFails(deleteDoc(doc(dbAs('alice'), 'users/alice')));
  });
});

describe('progress', () => {
  test('every progress write the app makes is allowed', async () => {
    const ref = doc(dbAs('alice'), 'progress/alice');

    // recordLessonOpened
    await assertSucceeds(
      setDoc(ref, { lastLessonId: 'oop-1', updatedAt: serverTimestamp() }, { merge: true })
    );
    // setLessonComplete (complete, then undo, which leaves the streak alone)
    await assertSucceeds(
      setDoc(
        ref,
        {
          completedLessons: ['oop-1'],
          streak: { current: 1, longest: 1, lastActiveDate: '2026-09-30' },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );
    await assertSucceeds(
      setDoc(ref, { completedLessons: [], updatedAt: serverTimestamp() }, { merge: true })
    );
    // recordModuleQuizCompletion
    await assertSucceeds(
      setDoc(
        ref,
        {
          moduleScores: { oop: { correct: 4, total: 5, lastAttemptAt: Date.now() } },
          streak: { current: 2, longest: 2, lastActiveDate: '2026-10-01' },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );
    // recordTraceCompletion
    await assertSucceeds(
      setDoc(
        ref,
        {
          completedTraces: arrayUnion('oop-trace'),
          streak: { current: 3, longest: 3, lastActiveDate: '2026-10-02' },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );
    await assertSucceeds(getDoc(ref));
  });

  test('nobody can read or write someone else’s progress', async () => {
    await seed((admin) => setDoc(doc(admin, 'progress/bob'), { completedLessons: [] }));
    const db = dbAs('alice');
    await assertFails(getDoc(doc(db, 'progress/bob')));
    await assertFails(setDoc(doc(db, 'progress/bob'), { completedLessons: [] }, { merge: true }));
  });

  test('unknown fields and malformed values are rejected', async () => {
    const ref = doc(dbAs('alice'), 'progress/alice');
    await assertFails(setDoc(ref, { badges: ['all'] }, { merge: true }));
    await assertFails(setDoc(ref, { completedLessons: 'oop-1' }, { merge: true }));
    await assertFails(setDoc(ref, { moduleScores: 100 }, { merge: true }));
    await assertFails(setDoc(ref, { streak: { current: 'lots' } }, { merge: true }));
    await assertFails(
      setDoc(ref, { streak: { current: 1, longest: 1, lastActiveDate: null, bonus: 9 } }, { merge: true })
    );
    await assertFails(setDoc(ref, { updatedAt: Timestamp.fromDate(new Date('2020-01-01')) }, { merge: true }));
  });

  test('the app cannot delete a progress document', async () => {
    await seed((admin) => setDoc(doc(admin, 'progress/alice'), { completedLessons: [] }));
    await assertFails(deleteDoc(doc(dbAs('alice'), 'progress/alice')));
  });
});

describe('attempts', () => {
  // What functions/index.js gradeAnswer writes. Only it may: the app grading
  // its own answers is exactly what attempts must be protected from.
  function validAttempt(overrides = {}) {
    return {
      userId: 'alice',
      questionId: 'q1',
      topic: 'm1',
      correct: true,
      timeTakenMs: 5400,
      attemptNumber: 1,
      createdAt: Timestamp.now(),
      ...overrides,
    };
  }

  test('the app cannot record attempts, even its own well-formed ones', async () => {
    const attempts = collection(dbAs('alice'), 'attempts');
    await assertFails(addDoc(attempts, { ...validAttempt(), createdAt: serverTimestamp() }));
    await assertFails(addDoc(attempts, validAttempt({ userId: 'bob' })));
  });

  test('attempt history can be read by its owner only, and never edited or deleted', async () => {
    await seed(async (admin) => {
      await setDoc(doc(admin, 'attempts/a1'), validAttempt());
      await setDoc(doc(admin, 'attempts/b1'), validAttempt({ userId: 'bob' }));
    });
    const db = dbAs('alice');
    await assertSucceeds(getDoc(doc(db, 'attempts/a1')));
    await assertFails(getDoc(doc(db, 'attempts/b1')));
    await assertFails(getDocs(collection(db, 'attempts')));
    await assertFails(updateDoc(doc(db, 'attempts/a1'), { correct: false }));
    await assertFails(deleteDoc(doc(db, 'attempts/a1')));
  });
});

describe('chats', () => {
  const thread = (userId) => ({ userId, moduleId: 'm1', messages: [{ role: 'learner', text: 'hi', at: 1 }] });

  test('a user can read their own tutor thread but nobody else’s', async () => {
    await seed(async (admin) => {
      await setDoc(doc(admin, 'chats/alice_m1'), thread('alice'));
      await setDoc(doc(admin, 'chats/bob_m1'), thread('bob'));
    });
    const db = dbAs('alice');
    await assertSucceeds(getDoc(doc(db, 'chats/alice_m1')));
    await assertFails(getDoc(doc(db, 'chats/bob_m1')));
    await assertFails(getDocs(collection(db, 'chats')));
    await assertFails(getDoc(doc(dbAs(null), 'chats/alice_m1')));
  });

  test('a user can read their thread before it exists, which the tutor box does on first open', async () => {
    await assertSucceeds(getDoc(doc(dbAs('alice'), 'chats/alice_m1')));
  });

  test('the app cannot write a thread, so the tutor’s replies cannot be forged', async () => {
    await seed((admin) => setDoc(doc(admin, 'chats/alice_m1'), thread('alice')));
    const db = dbAs('alice');
    await assertFails(setDoc(doc(db, 'chats/alice_m2'), thread('alice')));
    await assertFails(updateDoc(doc(db, 'chats/alice_m1'), { messages: [] }));
    await assertFails(deleteDoc(doc(db, 'chats/alice_m1')));
  });

  test('the daily question counter is closed to the app', async () => {
    await seed((admin) => setDoc(doc(admin, 'tutorUsage/alice'), { askedAt: [1] }));
    await assertFails(getDoc(doc(dbAs('alice'), 'tutorUsage/alice')));
    await assertFails(setDoc(doc(dbAs('alice'), 'tutorUsage/alice'), { askedAt: [] }));
  });
});

describe('everything else', () => {
  test('collections without rules are closed', async () => {
    await assertFails(setDoc(doc(dbAs('alice'), 'admins/alice'), { role: 'admin' }));
    await assertFails(getDoc(doc(dbAs('alice'), 'secrets/anything')));
  });

  test('quiz answer keys cannot be read, so answers never reach the app', async () => {
    await seed((db) => setDoc(doc(db, 'answerKeys/q1'), { moduleId: 'm1', answer: 2 }));
    await assertFails(getDoc(doc(dbAs('alice'), 'answerKeys/q1')));
    await assertFails(getDocs(collection(dbAs('alice'), 'answerKeys')));
  });
});
