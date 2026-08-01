// Publishes content/ (courses.json, modules.json, lessons/*.json) to Firestore.
// Safe to re-run any time after editing a content file — it's an upsert.
//
// Run with:
//   node --env-file=.env scripts/publishContent.js
//
// Requires SEED_EMAIL / SEED_PASSWORD env vars pointing at an existing
// dev/test account (Firestore rules currently require an authenticated user
// to write to courses/modules/lessons — see firestore.rules).

const fs = require('fs');
const path = require('path');

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const CONTENT_DIR = path.join(__dirname, '..', 'content');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function main() {
  const missingConfig = Object.entries(firebaseConfig).filter(([, v]) => !v);
  if (missingConfig.length > 0) {
    throw new Error(
      `Missing Firebase config values: ${missingConfig.map(([k]) => k).join(', ')}. Did you run with --env-file=.env?`
    );
  }
  if (!process.env.SEED_EMAIL || !process.env.SEED_PASSWORD) {
    throw new Error('Set SEED_EMAIL and SEED_PASSWORD in .env to an existing dev account.');
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, process.env.SEED_EMAIL, process.env.SEED_PASSWORD);
  console.log('Signed in as', process.env.SEED_EMAIL);

  const courses = readJson(path.join(CONTENT_DIR, 'courses.json'));
  for (const course of courses) {
    const { id, ...data } = course;
    await setDoc(doc(db, 'courses', id), data);
    console.log('Wrote course:', id);
  }

  const modules = readJson(path.join(CONTENT_DIR, 'modules.json'));
  for (const module of modules) {
    const { id, ...data } = module;
    await setDoc(doc(db, 'modules', id), data);
    console.log('Wrote module:', id);
  }

  const lessonsDir = path.join(CONTENT_DIR, 'lessons');
  const lessonFiles = fs.existsSync(lessonsDir)
    ? fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.json'))
    : [];

  for (const file of lessonFiles) {
    const lesson = readJson(path.join(lessonsDir, file));
    const { id, ...data } = lesson;
    await setDoc(doc(db, 'lessons', id), data);
    console.log('Wrote lesson:', id);
  }

  console.log(
    `Done. Published ${courses.length} courses, ${modules.length} modules, ${lessonFiles.length} lessons.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
