// One-off content seeder. Run with:
//   node --env-file=.env scripts/seedContent.js
//
// Requires SEED_EMAIL / SEED_PASSWORD env vars pointing at an existing
// dev/test account (Firestore rules currently require an authenticated user
// to write to courses/modules/lessons — see firestore.rules).
//
// All text/code below is placeholder content standing in for real lesson
// material that will eventually be transcribed from PDFs.

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

const PLACEHOLDER_NOTICE =
  '[PLACEHOLDER CONTENT — to be replaced with real lesson material.]';

const courses = [
  {
    id: 'beginner',
    title: 'Beginner',
    description: 'Start here if you are new to Java.',
    order: 1,
    modules: [
      {
        id: 'beginner-getting-started',
        title: 'Getting Started',
        description: 'Setting up and writing your first program.',
        order: 1,
        lessons: [
          {
            id: 'beginner-getting-started-hello-world',
            title: 'Hello, World!',
            order: 1,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              {
                type: 'text',
                value: 'Every Java program starts with a class and a main method.',
              },
              {
                type: 'code',
                language: 'java',
                value:
                  'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
              },
              { type: 'text', value: 'Run it, and you should see "Hello, World!" printed.' },
            ],
          },
          {
            id: 'beginner-getting-started-comments',
            title: 'Comments',
            order: 2,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'text', value: 'Comments are ignored by the compiler and document your code.' },
              { type: 'code', language: 'java', value: '// This is a single-line comment\n/* This is a\n   multi-line comment */' },
            ],
          },
        ],
      },
      {
        id: 'beginner-variables',
        title: 'Variables & Data Types',
        description: 'Storing and naming values.',
        order: 2,
        lessons: [
          {
            id: 'beginner-variables-declaring',
            title: 'Declaring Variables',
            order: 1,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'text', value: 'Java is statically typed — every variable has a declared type.' },
              { type: 'code', language: 'java', value: 'int age = 20;\nString name = "Ada";\ndouble price = 9.99;' },
            ],
          },
          {
            id: 'beginner-variables-primitives',
            title: 'Primitive Types',
            order: 2,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'text', value: 'Java has eight primitive types: byte, short, int, long, float, double, boolean, char.' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    description: 'For learners comfortable with the basics.',
    order: 2,
    modules: [
      {
        id: 'intermediate-oop-basics',
        title: 'Object-Oriented Basics',
        description: 'Classes, objects, and methods.',
        order: 1,
        lessons: [
          {
            id: 'intermediate-oop-basics-classes',
            title: 'Classes and Objects',
            order: 1,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'text', value: 'A class is a blueprint; an object is an instance of that blueprint.' },
              {
                type: 'code',
                language: 'java',
                value:
                  'class Dog {\n  String name;\n  void bark() {\n    System.out.println(name + " says woof!");\n  }\n}\n\nDog d = new Dog();\nd.name = "Rex";\nd.bark();',
              },
            ],
          },
          {
            id: 'intermediate-oop-basics-constructors',
            title: 'Constructors',
            order: 2,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'text', value: 'Constructors initialize an object when it is created.' },
            ],
          },
        ],
      },
      {
        id: 'intermediate-collections',
        title: 'Collections',
        description: 'Lists, sets, and maps.',
        order: 2,
        lessons: [
          {
            id: 'intermediate-collections-arraylist',
            title: 'ArrayList',
            order: 1,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'code', language: 'java', value: 'List<String> names = new ArrayList<>();\nnames.add("Ada");\nnames.add("Grace");' },
            ],
          },
          {
            id: 'intermediate-collections-hashmap',
            title: 'HashMap',
            order: 2,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'code', language: 'java', value: 'Map<String, Integer> ages = new HashMap<>();\nages.put("Ada", 36);' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: 'Deeper topics for experienced learners.',
    order: 3,
    modules: [
      {
        id: 'advanced-concurrency',
        title: 'Concurrency',
        description: 'Threads and synchronization.',
        order: 1,
        lessons: [
          {
            id: 'advanced-concurrency-threads',
            title: 'Creating Threads',
            order: 1,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'code', language: 'java', value: 'Thread t = new Thread(() -> System.out.println("Running!"));\nt.start();' },
            ],
          },
        ],
      },
      {
        id: 'advanced-design-patterns',
        title: 'Design Patterns',
        description: 'Common reusable solutions.',
        order: 2,
        lessons: [
          {
            id: 'advanced-design-patterns-singleton',
            title: 'Singleton',
            order: 1,
            blocks: [
              { type: 'text', value: PLACEHOLDER_NOTICE },
              { type: 'text', value: 'The Singleton pattern restricts a class to a single instance.' },
            ],
          },
        ],
      },
    ],
  },
];

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

  for (const course of courses) {
    const { modules, ...courseData } = course;
    await setDoc(doc(db, 'courses', course.id), courseData);
    console.log('Wrote course:', course.id);

    for (const module of modules) {
      const { lessons, ...moduleData } = module;
      await setDoc(doc(db, 'modules', module.id), { ...moduleData, courseId: course.id });
      console.log('  Wrote module:', module.id);

      for (const lesson of lessons) {
        const { id, ...lessonData } = lesson;
        await setDoc(doc(db, 'lessons', id), { ...lessonData, moduleId: module.id });
        console.log('    Wrote lesson:', id);
      }
    }
  }

  console.log('Done seeding placeholder content.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
