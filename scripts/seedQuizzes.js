// One-off quiz question seeder. Run with:
//   node --env-file=.env scripts/seedQuizzes.js
//
// Requires SEED_EMAIL / SEED_PASSWORD (same as scripts/seedContent.js) and
// assumes scripts/seedContent.js has already been run, since these questions
// reference lesson/module IDs created there.
//
// All questions below are placeholder content standing in for real quiz
// material that will eventually be written against real lessons.

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

// One short quiz question per lesson.
const lessonQuestions = [
  {
    lessonId: 'beginner-getting-started-hello-world',
    prompt: 'Which method is the entry point of a Java program?',
    choices: ['main', 'start', 'run', 'init'],
    correctIndex: 0,
  },
  {
    lessonId: 'beginner-getting-started-comments',
    prompt: 'How do you write a single-line comment in Java?',
    choices: ['# comment', '// comment', '<!-- comment -->', '** comment'],
    correctIndex: 1,
  },
  {
    lessonId: 'beginner-variables-declaring',
    prompt: 'Which line correctly declares an integer variable named age?',
    choices: ['int age = 20;', 'age int = 20;', 'var age == 20;', 'integer age = 20;'],
    correctIndex: 0,
  },
  {
    lessonId: 'beginner-variables-primitives',
    prompt: 'Which of these is NOT a Java primitive type?',
    choices: ['int', 'boolean', 'String', 'double'],
    correctIndex: 2,
  },
  {
    lessonId: 'intermediate-oop-basics-classes',
    prompt: 'What keyword creates a new instance of a class?',
    choices: ['new', 'create', 'instance', 'make'],
    correctIndex: 0,
  },
  {
    lessonId: 'intermediate-oop-basics-constructors',
    prompt: "A constructor's name must match:",
    choices: ['the file name', 'the class name', 'the method it calls', 'the package name'],
    correctIndex: 1,
  },
  {
    lessonId: 'intermediate-collections-arraylist',
    prompt: 'Which interface does ArrayList implement?',
    choices: ['Map', 'Set', 'List', 'Queue'],
    correctIndex: 2,
  },
  {
    lessonId: 'intermediate-collections-hashmap',
    prompt: 'A HashMap stores data as:',
    choices: ['key-value pairs', 'ordered pairs only', 'a single sorted list', 'unique values only'],
    correctIndex: 0,
  },
  {
    lessonId: 'advanced-concurrency-threads',
    prompt: 'Which method starts a new thread of execution?',
    choices: ['run()', 'start()', 'begin()', 'execute()'],
    correctIndex: 1,
  },
  {
    lessonId: 'advanced-design-patterns-singleton',
    prompt: 'The Singleton pattern ensures a class has:',
    choices: ['no instances', 'exactly one instance', 'multiple instances', 'a static main method'],
    correctIndex: 1,
  },
];

// Two broader questions per module.
const moduleQuestions = [
  {
    moduleId: 'beginner-getting-started',
    prompt: 'What must every Java class file eventually be compiled into before running?',
    choices: ['Bytecode', 'Machine code directly', 'HTML', 'Assembly'],
    correctIndex: 0,
  },
  {
    moduleId: 'beginner-getting-started',
    prompt: 'Comments are:',
    choices: ['Executed at runtime', 'Ignored by the compiler', 'Required in every file', 'Only allowed at the top of a file'],
    correctIndex: 1,
  },
  {
    moduleId: 'beginner-variables',
    prompt: 'Java is best described as:',
    choices: ['Dynamically typed', 'Statically typed', 'Untyped', 'Type-optional'],
    correctIndex: 1,
  },
  {
    moduleId: 'beginner-variables',
    prompt: 'Which is a valid variable declaration?',
    choices: ['double price = 9.99;', 'price double = 9.99', '9.99 = double price;', 'double: price = 9.99'],
    correctIndex: 0,
  },
  {
    moduleId: 'intermediate-oop-basics',
    prompt: 'An object is:',
    choices: ['A blueprint for a class', 'An instance of a class', 'A type of loop', 'A Java keyword'],
    correctIndex: 1,
  },
  {
    moduleId: 'intermediate-oop-basics',
    prompt: 'A constructor is called:',
    choices: ['Every time a method runs', 'When an object is created', 'Only at program exit', 'Manually, like any method'],
    correctIndex: 1,
  },
  {
    moduleId: 'intermediate-collections',
    prompt: 'Which collection type stores unique keys mapped to values?',
    choices: ['ArrayList', 'HashMap', 'LinkedList', 'Array'],
    correctIndex: 1,
  },
  {
    moduleId: 'intermediate-collections',
    prompt: 'ArrayList is best suited for:',
    choices: ['Ordered, resizable lists of elements', 'Key-value lookups', 'Fixed-size arrays only', 'Thread synchronization'],
    correctIndex: 0,
  },
  {
    moduleId: 'advanced-concurrency',
    prompt: 'Running code on a separate thread allows it to:',
    choices: ['Run at the same time as other code', 'Always run faster', 'Skip compilation', 'Avoid using variables'],
    correctIndex: 0,
  },
  {
    moduleId: 'advanced-concurrency',
    prompt: 'Calling run() directly instead of start():',
    choices: ['Starts a new thread', 'Runs the code on the current thread', 'Throws a compile error', 'Is identical to start()'],
    correctIndex: 1,
  },
  {
    moduleId: 'advanced-design-patterns',
    prompt: 'Design patterns are best described as:',
    choices: ['Java-specific syntax rules', 'Reusable solutions to common design problems', 'Required parts of every class', 'A type of comment'],
    correctIndex: 1,
  },
  {
    moduleId: 'advanced-design-patterns',
    prompt: 'A common use case for Singleton is:',
    choices: ['A shared configuration or connection manager', 'A list of items', 'A one-off calculation', 'A loop counter'],
    correctIndex: 0,
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

  const lessonCounters = {};
  for (const q of lessonQuestions) {
    lessonCounters[q.lessonId] = (lessonCounters[q.lessonId] || 0) + 1;
    const id = `q-lesson-${q.lessonId}-${lessonCounters[q.lessonId]}`;
    await setDoc(doc(db, 'questions', id), {
      lessonId: q.lessonId,
      moduleId: null,
      order: lessonCounters[q.lessonId],
      prompt: q.prompt,
      choices: q.choices,
      correctIndex: q.correctIndex,
    });
    console.log('Wrote lesson question:', id);
  }

  const moduleCounters = {};
  for (const q of moduleQuestions) {
    moduleCounters[q.moduleId] = (moduleCounters[q.moduleId] || 0) + 1;
    const id = `q-module-${q.moduleId}-${moduleCounters[q.moduleId]}`;
    await setDoc(doc(db, 'questions', id), {
      lessonId: null,
      moduleId: q.moduleId,
      order: moduleCounters[q.moduleId],
      prompt: q.prompt,
      choices: q.choices,
      correctIndex: q.correctIndex,
    });
    console.log('Wrote module question:', id);
  }

  console.log('Done seeding placeholder quiz questions.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
