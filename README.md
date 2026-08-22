# Javi: Java Learning App

An Android app for learning Java programming. Users work through tiered lessons
(Beginner / Intermediate / Advanced), practice with quizzes and coding problems, chat with an
AI tutor scoped to their current module, and track their progress.

Solo capstone project, built incrementally over one semester.

## Stack

- **Client:** Expo (React Native), JavaScript
- **Backend:** Firebase (Auth, Firestore, Cloud Functions)
- **Navigation:** React Navigation
- **AI tutor:** Claude or OpenAI API, called from a Cloud Function (never from the client)
- **Code execution:** Piston or Judge0 API, called from a Cloud Function
- **Trained model:** TensorFlow.js (tfjs-node), run inside a Cloud Function

There is no custom Node/Express server. Firebase Cloud Functions are the only backend layer.
The app stays inside **Expo Go** (no custom dev client or native modules).

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS)
- [Expo Go](https://expo.dev/go) installed on your Android device
- A Firebase project with **Authentication** (Email/Password provider) and **Firestore**
  enabled

### Setup

```bash
npm install
```

Copy `.env.example` to `.env` and fill in your Firebase web app config (Firebase console →
Project settings → your app → SDK setup and configuration):

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

These are client identifiers, not secrets, safe to have in the built app. Real API keys (AI
tutor, code execution) stay server-side in Cloud Functions and never ship to the client.

Publish `firestore.rules` (Firestore Database → Rules tab) and `storage.rules` (Storage → Rules
tab, after enabling Storage) in the Firebase console so signed-in users can read/write their own
profile document, plus content collections/images while content is being actively authored.

Publish lesson content (courses/modules/lessons, sourced from the `content/` folder). Add
`SEED_EMAIL` / `SEED_PASSWORD` to `.env` (an existing dev/test account), then:

```bash
node --env-file=.env scripts/publishContent.js
```

### Run

```bash
npx expo start
```

Scan the QR code with Expo Go, or open the printed `exp://` URL manually if your device and
computer are on the same network but auto-discovery doesn't find it.

## Project structure

```
src/
  components/  # shared UI: Button, TextField, ListCard, ScreenState, Avatar, JaviCard
  context/     # AuthContext: auth state, sign up / log in / log out
  hooks/       # useProgressSummary: streak and completion figures, reloaded on focus
  navigation/  # RootNavigator (auth vs. app stack), MainTabs (Home / Learn / Progress)
  screens/     # one file per screen, including HomeScreen (the dashboard)
  services/    # firebase.js (init), content.js, quizzes.js, progress.js
  theme/       # colors.js: palette plus spacing and type scales
content/
  courses.json   # the 3 tiers
  modules.json   # all modules (one per topic), tagged with courseId
  lessons/       # one JSON file per lesson (blocks array); real content lives here
scripts/
  publishContent.js  # reads content/ and upserts it to Firestore; re-run after any edit
firestore.rules
storage.rules
```

### Changing the look

Every screen reads its colors, spacing, and font sizes from `src/theme/colors.js`, so a
restyle is a one-file edit rather than a pass over each screen. Change the values freely;
avoid removing keys, since the screens import `colors`, `radius`, `spacing`, and `type` by
name.

Javi is the in-app learning companion. His wording lives in `messageFor()` inside
`src/components/JaviCard.js`, and the message shown depends on the learner's progress.

### Adding/editing lesson content

Each lesson is a JSON file in `content/lessons/<lessonId>.json` with a `blocks` array, an
ordered mix of:

```json
{ "type": "text", "value": "..." }
{ "type": "code", "language": "java", "value": "..." }
{ "type": "image", "url": "<Firebase Storage download URL>", "caption": "optional" }
{ "type": "video", "videoId": "<YouTube video ID>", "caption": "optional" }
```

Edit the file, then re-run `node --env-file=.env scripts/publishContent.js` to push the change.
Safe to run any time, it just upserts whatever's in `content/`.

## Firestore data model

Core collections: `users`, `courses`, `modules`, `lessons`, `questions`, `attempts`, `progress`.

- `attempts` records individual quiz answers (topic, correct/incorrect, time taken, attempt
  number). Also the feature source for the trained personalization model.
- `progress` tracks completed lessons, test scores, and streaks per user.

## Status

- [x] Expo scaffold + Firebase Auth/Firestore connection
- [x] Sign up / log in flow
- [x] Lesson tier structure (3 tiers, 21 real modules from course PDFs, all 77 lessons authored)
- [x] Multiple-choice quizzes (per lesson and per module) with attempt tracking
- [ ] Runnable coding problems (Piston/Judge0 via Cloud Function)
- [ ] AI tutor (Cloud Function)
- [x] Progress tracking (streaks, lessons completed, module quiz scores)
- [ ] Trained personalization model
