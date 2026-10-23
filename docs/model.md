# Weak-topic classifier

The personalization engine predicts which topics (modules) a learner is weak in from how they
answer quiz questions. It is a TensorFlow.js logistic regression, trained offline on synthetic
learners and run inside the `getWeakTopics` Cloud Function.

| Piece | File |
|---|---|
| Features, model loading, prediction | `functions/weakTopics.js` |
| Synthetic data, training, evaluation | `functions/scripts/trainModel.js` (`npm run model:train`) |
| Trained model (standard tfjs format) | `functions/model/model.json`, `weights.bin` |
| Callable for the app | `getWeakTopics` in `functions/index.js`, `src/services/weakTopics.js` |
| Sanity tests | `functions/weakTopics.test.js` (`npm test`), `functions/getWeakTopics.test.js` (`npm run test:rules`) |

## What it predicts

One prediction per (learner, topic). The output is the probability that the learner is weak in
that topic, and a topic counts as **weak** when the probability is 0.5 or higher. Topics with
fewer than **10** attempts are not judged at all and are left out of the result. Half a quiz is
too little to go on.

## Features

These are computed from the `attempts` collection, which only the server writes (in
`gradeAnswer`), so `correct` is trustworthy. Each feature uses the learner's **last 20 attempts**
on the topic (about one quiz), so a learner who improves stops being flagged.

| Feature | Definition | Scaled to 0–1 by | Why |
|---|---|---|---|
| `accuracy` | correct ÷ attempts | already 0–1 | The most direct signal of knowing the material |
| `avgTime` | mean seconds per answer, each capped at 60 | ÷ 60 | Hesitation suggests uncertainty; the cap stops one idle question from dominating |
| `wrongStreak` | longest run of consecutive wrong answers | ÷ 20 | Clustered mistakes suggest a misconception, not a slip |

## Training data (synthetic)

There are no real learners yet, so the training data is simulated. The key design choice is
that **the label is not computed from the features.** If the label were "weak = accuracy < 60%",
the model would just relearn that rule. Instead, each synthetic learner-topic has a **hidden
mastery** value, and the model only sees the noisy answers it produces:

- `mastery` ~ Uniform(0, 1). **Label: weak = mastery < 0.5.**
- `pace` ~ Uniform(8, 25) seconds. This is how fast this person reads, independent of skill, so
  speed alone can't reveal mastery.
- The number of answers is 10–20 (half to one full quiz).
- For each answer:
  - guess floor = 0.25 for a 4-choice question (90%) or 0.5 for true/false (10%). This matches
    the real question bank: 472 questions have 4 choices and 55 have 2.
  - P(correct) = floor + (1 − floor) × mastery, minus 0.25 × (1 − mastery) if the previous
    answer was wrong (a misconception tends to repeat, more so for weaker learners).
  - seconds = max(2, pace + 12 × (1 − mastery) + Normal(0, 6)).
- 5000 samples, seed 42 (mulberry32), first 80% for training and last 20% for the holdout.

**Why the simulator looks like this.** A first version had time depend only on mastery, and
every answer independent. It trained without errors and scored 93%, but the weights were
nonsense: time got a weight of +33 (being slow almost *was* the label), and wrongStreak came out
negative (with independent answers, a streak adds nothing once accuracy is known). Adding
individual pace and repeated misconceptions made every feature carry its own signal. This is
why the tests check the weight signs, not just that training runs.

## Model

`tf.sequential` with a single `dense` layer: 3 inputs → 1 unit, sigmoid. This is logistic
regression. Initialized at zero (convex problem, reproducible). Trained with Adam (lr 0.05),
binary cross-entropy, 60 epochs, batch 64.

Learned weights (current `functions/model/`):

| | Weight | Reading |
|---|---|---|
| accuracy | **−9.51** | Higher accuracy → much less likely weak (the strongest signal) |
| avgTime | **+5.89** | Slower answers → more likely weak |
| wrongStreak | **+4.50** | Longer runs of wrong answers → more likely weak |
| bias | +2.77 | |

The prediction is `sigmoid(2.77 − 9.51·accuracy + 5.89·avgTime + 4.50·wrongStreak)`. For
example, 70% accuracy, 15 s per answer and a longest streak of 2 gives
sigmoid(2.77 − 6.66 + 1.47 + 0.45) = sigmoid(−1.97) ≈ 0.12, so not weak.

## Results (holdout, 1000 samples)

| Method | Accuracy |
|---|---|
| **This model** | **89.0%** |
| Previous stand-in rule (quiz score < 80%) | 78.4% |
| Always "not weak" | 51.5% |

The model can't reach 100% even in principle. A learner with mastery 0.48 and one with 0.52
answer almost identically over 20 questions, but they get opposite labels. Most of the errors are
in that band.

## Sanity checks (`functions/weakTopics.test.js`)

- Weight signs: accuracy negative, avgTime positive, wrongStreak positive.
- 20/20 correct at 8 s → not weak (probability < 0.1). 5/20 correct at 30 s with long streaks →
  weak (probability > 0.9).
- At the same 14/20 accuracy, answering slower raises the probability, and having the mistakes
  clustered rather than spread out raises it too.
- Only the latest 20 answers count. Topics with under 10 answers are left out.

## Limits

- Trained on simulated learners. The simulator's assumptions (pace range, size of the
  misconception effect) are reasonable guesses, not measured. Retraining on real `attempts`
  would need a real label, such as a later test score, which the app doesn't collect yet.
- `timeTakenMs` is measured by the app, so a learner who leaves the screen open inflates it.
  The 60-second cap limits the damage.
- Attempts recorded before grading moved server-side stored the module title as `topic` and were
  written by the app. `getWeakTopics` ignores any attempt whose topic isn't a real module id.
- `getWeakTopics` reads all of a learner's attempts on each call. That's fine at capstone scale.
  The code is marked with a `shortcut:` comment for when it isn't.
- To retrain, change the simulator, run `npm run model:train`, and check that the printed
  weights still have the expected signs before committing.
