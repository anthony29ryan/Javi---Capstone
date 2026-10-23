// Security-rules tests for storage.rules, run against the local emulator.
//
//   npm run test:rules
//
// Lesson images are uploaded by the developer through the Firebase console,
// which bypasses rules, so the app itself only ever reads them.

const { readFileSync } = require('node:fs');
const path = require('node:path');
const { after, before, test } = require('node:test');

const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { deleteObject, getBytes, ref, uploadString } = require('firebase/storage');

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-javi-rules',
    storage: {
      rules: readFileSync(path.join(__dirname, '..', '..', 'storage.rules'), 'utf8'),
    },
  });
  await testEnv.withSecurityRulesDisabled((context) =>
    uploadString(ref(context.storage(), 'lessons/oop-1/diagram.png'), 'image-bytes')
  );
});

after(async () => {
  await testEnv.clearStorage();
  await testEnv.cleanup();
});

test('signed-in users can view lesson images', async () => {
  const storage = testEnv.authenticatedContext('alice').storage();
  await assertSucceeds(getBytes(ref(storage, 'lessons/oop-1/diagram.png')));
});

test('signed-out visitors cannot view lesson images', async () => {
  const storage = testEnv.unauthenticatedContext().storage();
  await assertFails(getBytes(ref(storage, 'lessons/oop-1/diagram.png')));
});

test('signed-in users cannot upload, replace or delete lesson images', async () => {
  const storage = testEnv.authenticatedContext('alice').storage();
  await assertFails(uploadString(ref(storage, 'lessons/oop-1/diagram.png'), 'replaced'));
  await assertFails(uploadString(ref(storage, 'lessons/new/anything.png'), 'injected'));
  await assertFails(deleteObject(ref(storage, 'lessons/oop-1/diagram.png')));
});

test('paths outside lessons/ are closed', async () => {
  const storage = testEnv.authenticatedContext('alice').storage();
  await assertFails(uploadString(ref(storage, 'uploads/alice/file.txt'), 'data'));
});
