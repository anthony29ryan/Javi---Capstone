// Trains the weak-topic classifier on synthetic learners and saves it to
// functions/model/ (committed; the Cloud Function only loads it).
//
//   npm run model:train
//
// Each synthetic learner-topic has a hidden mastery (0–1). Answers are drawn
// from it, and the label is mastery < 0.5. The model never sees mastery, only
// the noisy answers, so it has to infer something it can't read off directly
// (unlike a rule such as "accuracy < 60%", which it would just relearn).
// Method and results: docs/model.md. Fixed seed, so reruns give the same model.

const fs = require('node:fs');
const path = require('node:path');
const { tf, MODEL_DIR, extractFeatures, buildModel } = require('../weakTopics');

const SAMPLES = 5000;
const HOLDOUT = 0.2;
const WEAK_BELOW = 0.5;

// mulberry32: small seeded PRNG, so the data set is identical on every run.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(42);
const gaussian = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

function simulateLearnerTopic() {
  const mastery = random();
  // Reading pace differs between people regardless of skill, so time alone can't give mastery away.
  const pace = 8 + 17 * random();
  const count = 10 + Math.floor(random() * 11); // 10–20 answers, i.e. half to one full quiz
  const attempts = [];
  let previousWrong = false;
  for (let i = 0; i < count; i++) {
    // ~90% of the real questions have 4 choices, ~10% are true/false.
    const guessFloor = random() < 0.1 ? 0.5 : 0.25;
    // A misconception tends to repeat: after a miss, weaker learners are likelier to miss again.
    const pCorrect = guessFloor + (1 - guessFloor) * mastery - (previousWrong ? 0.25 * (1 - mastery) : 0);
    const correct = random() < pCorrect;
    const seconds = Math.max(2, pace + 12 * (1 - mastery) + 6 * gaussian());
    attempts.push({ createdAt: i, correct, timeTakenMs: seconds * 1000 });
    previousWrong = !correct;
  }
  return { mastery, attempts };
}

async function main() {
  const samples = Array.from({ length: SAMPLES }, simulateLearnerTopic).map(({ mastery, attempts }) => ({
    features: extractFeatures(attempts),
    label: mastery < WEAK_BELOW ? 1 : 0,
  }));
  const split = Math.round(SAMPLES * (1 - HOLDOUT));
  const train = samples.slice(0, split);
  const test = samples.slice(split);

  const model = buildModel();
  model.compile({ optimizer: tf.train.adam(0.05), loss: 'binaryCrossentropy', metrics: ['accuracy'] });
  await model.fit(
    tf.tensor2d(train.map((s) => s.features.vector)),
    tf.tensor2d(train.map((s) => [s.label])),
    { epochs: 60, batchSize: 64, shuffle: false, verbose: 0 },
  );

  const predicted = model.predict(tf.tensor2d(test.map((s) => s.features.vector))).dataSync();
  const share = (fn) => test.filter(fn).length / test.length;
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  console.log(`Holdout (${test.length} samples):`);
  console.log(`  model accuracy                 ${pct(share((s, i) => (predicted[i] >= 0.5 ? 1 : 0) === s.label))}`);
  console.log(`  stand-in rule (score < 80%)    ${pct(share((s) => (s.features.accuracy < 0.8 ? 1 : 0) === s.label))}`);
  console.log(`  always "not weak"              ${pct(share((s) => s.label === 0))}`);

  const [kernel, bias] = model.layers[0].getWeights().map((w) => [...w.dataSync()]);
  const names = ['accuracy', 'avgTime', 'wrongStreak'];
  console.log('Weights:', Object.fromEntries(names.map((n, i) => [n, +kernel[i].toFixed(3)])), 'bias:', +bias[0].toFixed(3));

  // Standard tfjs layout (model.json + weights.bin), loadable by any TensorFlow.js runtime.
  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      fs.mkdirSync(MODEL_DIR, { recursive: true });
      fs.writeFileSync(path.join(MODEL_DIR, 'weights.bin'), Buffer.from(artifacts.weightData));
      const modelJson = {
        modelTopology: artifacts.modelTopology,
        format: artifacts.format,
        generatedBy: artifacts.generatedBy,
        weightsManifest: [{ paths: ['weights.bin'], weights: artifacts.weightSpecs }],
      };
      fs.writeFileSync(path.join(MODEL_DIR, 'model.json'), `${JSON.stringify(modelJson, null, 2)}\n`);
      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }),
  );
  console.log(`Saved to ${path.relative(process.cwd(), MODEL_DIR)}`);
}

main();
