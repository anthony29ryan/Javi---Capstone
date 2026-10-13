// Cloud Functions. Deploy with `firebase deploy --only functions` (Blaze plan).
// Tested by functions/gradeAnswer.test.js, which `npm run test:rules` runs.

const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { HttpsError, onCall } = require('firebase-functions/v2/https');

// Spend cap: a traffic spike or loop can't scale past 5 instances per function.
setGlobalOptions({ maxInstances: 5 });
initializeApp();
const db = getFirestore();

/**
 * Grades one quiz answer and records it in `attempts`.
 *
 * Grading has to happen here: publishContent.js moves every answer into
 * `answerKeys`, which no security rule lets the app read. Writing the attempt
 * here as well means `correct` is the server's verdict rather than the app's
 * claim, which matters because `attempts` is the trained model's feature
 * source — so the rules no longer let the app create attempts at all.
 *
 * Takes { questionId, choice, timeTakenMs } and returns { correct, answer },
 * where `answer` is the correct choice's index, for the screen to highlight.
 */
exports.gradeAnswer = onCall({ region: 'asia-southeast1' }, async (request) => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated', 'Sign in to take a quiz.');

  // Everything below comes from the client, so none of it is trusted.
  const { questionId, choice, timeTakenMs } = request.data ?? {};
  if (typeof questionId !== 'string' || !questionId) {
    throw new HttpsError('invalid-argument', 'questionId must be a non-empty string.');
  }
  if (!Number.isInteger(choice) || choice < 0) {
    throw new HttpsError('invalid-argument', 'choice must be a choice index.');
  }
  if (!Number.isFinite(timeTakenMs) || timeTakenMs < 0) {
    throw new HttpsError('invalid-argument', 'timeTakenMs must be a non-negative number.');
  }

  const key = await db.collection('answerKeys').doc(questionId).get();
  if (!key.exists) throw new HttpsError('not-found', 'No such question.');
  const { moduleId, answer } = key.data();

  const earlier = await db
    .collection('attempts')
    .where('userId', '==', userId)
    .where('questionId', '==', questionId)
    .count()
    .get();

  const correct = choice === answer;
  await db.collection('attempts').add({
    userId,
    questionId,
    // The module id, not its display title: titles differ by screen ("X" vs
    // "X Quiz") and can be renamed, and the model groups features by topic.
    topic: moduleId,
    correct,
    timeTakenMs: Math.round(timeTakenMs),
    attemptNumber: earlier.data().count + 1,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { correct, answer };
});
