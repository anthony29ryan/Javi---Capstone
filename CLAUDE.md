# CLAUDE.md

Project context for AI coding assistance. Read this before making changes.

## What this project is

An Android app for learning Java programming, built as a solo capstone project over roughly
one semester. Users work through tiered lessons (Beginner / Intermediate / Advanced), practice
with quizzes and coding problems, chat with an AI tutor scoped to their current module, and
track their progress.

The developer is strong in JavaScript and CSS, has basic Java knowledge, and is new to mobile
development. Prefer explanations alongside code, and favor clarity over cleverness.

## Stack

- **Client:** Expo (React Native), JavaScript
- **Backend:** Firebase — Auth, Firestore, Cloud Functions, notifications
- **AI tutor:** Gemini 3.5 Flash Lite (Google AI Studio free-tier key), called from a Cloud Function (never from the client)
- **Code execution:** Piston or Judge0 API, called from a Cloud Function
- **Trained model:** TensorFlow.js (`@tensorflow/tfjs`, pure JS — no native build), loaded and run inside a Cloud Function
- **Video demos:** embedded YouTube

There is no custom Node/Express server. Firebase Cloud Functions are the only backend layer.

## Architecture rules

- **API keys never touch the client.** All calls to the AI API and the code execution API go
  through Cloud Functions. If a task seems to need a key in the app, that's a signal the logic
  belongs in a function instead.
- **Cloud Functions own:** AI tutor orchestration, quiz grading, trained-model inference,
  and anything involving a secret or third-party API.
- **The client owns:** UI, navigation, local state, and direct Firestore reads/writes that
  security rules already cover.
- Keep the client thin. When in doubt, put logic in a function.

## Firestore data model

Core collections: `users`, `courses`, `modules`, `lessons`, `questions`, `attempts`, `progress`.

- `attempts` records individual quiz answers (topic, correct/incorrect, time taken, attempt
  number) — this is also the feature source for the trained personalization model, so don't
  change its shape without accounting for that.
- `progress` tracks completed lessons, test scores, and streaks per user.

## Course content

Content is authored as JSON under `content/` and pushed to Firestore by a script; the app
reads it from Firestore at runtime and nothing is bundled.

```
content/courses.json · modules.json · lessons/*.json  ->  scripts/publishContent.js  ->  Firestore
```

- `npm run content:verify` checks the files and exits non-zero if anything is wrong.
- `npm run content:publish` verifies, then publishes. It upserts every local lesson and
  **deletes any Firestore lesson that no longer exists locally**, which is what keeps the
  two in step and what makes a rollback work.
- Lesson bodies are an array of blocks (`text`, `code`, `heading`, `list`, `note`, `table`,
  `image`, `video`) rendered by `src/components/LessonBlocks.js`. A block type with no case
  there renders as blank space, so add both together.

**Read the `publish-content` skill before publishing, regenerating, or rolling back content.**
It covers the safety steps, what to test afterwards, and how to undo it.

## Conventions

- Functional React components with hooks. No class components.
- Keep components small; extract shared UI into reusable components rather than duplicating.
- Descriptive names over abbreviations.
- Handle loading, empty, and error states explicitly — don't assume the happy path.
- Comment anything non-obvious, especially around the AI tutor context injection and the
  trained model's feature extraction.

## The AI tutor

Must stay scoped to Java, and specifically to the module the user is currently studying.
Scoping is done by injecting that module's content into the request context from the Cloud
Function. When touching this code, preserve that scoping — don't widen it to general-purpose
chat. Off-topic and non-Java questions should be declined or redirected.

## The trained model

A small classifier (single hidden layer or logistic regression) that predicts weak topics from
quiz attempt features: per-topic accuracy, average time per question, streaks of wrong answers.
Trained on synthetic data generated for this project, with the generation methodology documented.

Keep it simple and explainable — this has to be defended verbally, so avoid adding layers or
complexity that make it harder to reason about. Note that a model can train without errors and
still produce meaningless predictions, so changes here need output sanity-checked against
known examples, not just a clean run.

## Important constraints

- **Stay in Expo Go** for the main build. Don't introduce dependencies that require a custom
  dev client or native modules unless explicitly asked — losing Expo Go is a real cost here.
- **Don't add libraries casually.** Prefer what Expo and Firebase already provide. If a new
  dependency is genuinely needed, say why before adding it.
- **Test Firestore security rules explicitly.** Rules that are too permissive still let the
  app work normally, so they fail silently — flag any rules change for verification.
- Scope is tight and the timeline is short. Prefer the simplest thing that satisfies the
  requirement over the most general or extensible solution.

## Out of scope (deliberately deferred)

Content management system with version control, adaptive quiz difficulty as its own algorithm,
a full achievement/badge engine, community/discussion forum, offline local LLM. Don't build
toward these unless asked — they were cut to protect the core deliverables.

## Working style

- Make one focused change at a time; this project is built incrementally week by week.
- When something could break existing work, say so before doing it.
- If a request is ambiguous, ask rather than guessing — a wrong assumption compounds quickly
  in a codebase this young.

## Note on Expo version

This project was scaffolded with a newer Expo SDK than older training data may reflect. Consult
the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before relying on remembered API
shapes for Expo-specific code.
