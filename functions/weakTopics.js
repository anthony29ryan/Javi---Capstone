// The weak-topic classifier: feature extraction, model loading and prediction.
// scripts/trainModel.js trains with these same functions, so a feature can't
// mean one thing in training and another in the app. See docs/model.md.

const fs = require('node:fs');
const path = require('node:path');
const tf = require('@tensorflow/tfjs');

const WINDOW = 20; // about one quiz; older answers drop out so improvement counts
const MIN_ATTEMPTS = 10; // fewer than half a quiz is too little to judge
const MAX_SECONDS = 60; // one idle question shouldn't swamp the average
const MODEL_DIR = path.join(__dirname, 'model');

// Firestore gives a Timestamp; training and tests use plain numbers.
const millis = (attempt) => attempt.createdAt?.toMillis?.() ?? attempt.createdAt ?? 0;

/**
 * Turns one topic's attempts into the model's three inputs, each scaled to 0–1:
 *   accuracy    share of the last WINDOW answers that were right
 *   avgTime     mean seconds per answer (each capped at MAX_SECONDS) ÷ MAX_SECONDS
 *   wrongStreak longest run of consecutive wrong answers ÷ WINDOW
 * Also returns the unscaled values, for showing the learner why.
 */
function extractFeatures(attempts) {
  const recent = [...attempts].sort((a, b) => millis(a) - millis(b)).slice(-WINDOW);
  let correct = 0;
  let seconds = 0;
  let streak = 0;
  let longestWrongStreak = 0;
  for (const attempt of recent) {
    if (attempt.correct) {
      correct += 1;
      streak = 0;
    } else {
      streak += 1;
      longestWrongStreak = Math.max(longestWrongStreak, streak);
    }
    seconds += Math.min(attempt.timeTakenMs / 1000, MAX_SECONDS);
  }
  const accuracy = correct / recent.length;
  const avgTimeSec = seconds / recent.length;
  return {
    accuracy,
    avgTimeSec,
    longestWrongStreak,
    vector: [accuracy, avgTimeSec / MAX_SECONDS, longestWrongStreak / WINDOW],
  };
}

/** Logistic regression: one sigmoid unit over the three features. */
function buildModel() {
  const model = tf.sequential();
  // Zero start keeps training reproducible; logistic regression has one optimum anyway.
  model.add(tf.layers.dense({ units: 1, inputShape: [3], activation: 'sigmoid', kernelInitializer: 'zeros' }));
  return model;
}

let cachedModel;
/** Loads the committed model once per function instance. */
async function loadModel() {
  if (!cachedModel) {
    // Pure tfjs has no file:// loader in Node, so read the standard tfjs files ourselves.
    const { modelTopology, weightsManifest } = JSON.parse(fs.readFileSync(path.join(MODEL_DIR, 'model.json'), 'utf8'));
    const weights = fs.readFileSync(path.join(MODEL_DIR, weightsManifest[0].paths[0]));
    cachedModel = await tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology,
        weightSpecs: weightsManifest[0].weights,
        weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength),
      }),
    );
  }
  return cachedModel;
}

/**
 * Predicts, for every topic with at least MIN_ATTEMPTS answers, how likely the
 * learner is weak in it. Highest probability first; topics with too little
 * data are left out rather than called fine.
 */
function predictWeakTopics(model, attempts) {
  const byTopic = new Map();
  for (const attempt of attempts) {
    if (!byTopic.has(attempt.topic)) byTopic.set(attempt.topic, []);
    byTopic.get(attempt.topic).push(attempt);
  }
  const topics = [...byTopic]
    .filter(([, list]) => list.length >= MIN_ATTEMPTS)
    .map(([topic, list]) => ({ topic, attempts: list.length, ...extractFeatures(list) }));
  if (topics.length === 0) return [];

  const probabilities = tf.tidy(() => model.predict(tf.tensor2d(topics.map((t) => t.vector))).dataSync());
  return topics
    .map(({ vector, ...topic }, i) => ({ ...topic, probability: probabilities[i], weak: probabilities[i] >= 0.5 }))
    .sort((a, b) => b.probability - a.probability);
}

module.exports = { tf, WINDOW, MIN_ATTEMPTS, MAX_SECONDS, MODEL_DIR, extractFeatures, buildModel, loadModel, predictWeakTopics };
