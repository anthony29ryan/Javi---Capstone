# Javi: Java Learning App

An Android app for learning Java programming. Users work through tiered lessons
(Beginner / Intermediate / Advanced), practice with quizzes and coding problems, chat with an
AI tutor scoped to their current module, and track their progress.

Solo capstone project, built incrementally over one semester.

## Stack

- **Client:** Expo (React Native), JavaScript
- **Backend:** Firebase (Auth, Firestore, Cloud Functions)
- **Navigation:** React Navigation
- **AI tutor:** Gemini 3.5 Flash Lite (Google AI Studio free-tier key), called from a Cloud Function (never from the client)
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

Security rules live in `firestore.rules` and `storage.rules`. Signed-in users read content and
read/write only their own profile, progress and quiz attempts; nobody can write content from the
app. Test and deploy them with the Firebase CLI (installed as a dev dependency; the emulator
needs Java 17+):

```bash
npm run test:rules      # runs tests/rules/ against the local emulator
npx firebase login      # once per machine
npm run rules:deploy
```

The scripts in `scripts/` write as admin, using a service-account key. Download one from
Firebase console → Project settings → Service accounts → Generate new private key, save it
**outside** this folder, and set `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to its path. Then
publish lesson content (courses/modules/lessons, sourced from the `content/` folder):

```bash
npm run content:publish
```

Deleted accounts are kept for 30 days, and logging in during that time restores them. Run this
regularly (e.g. weekly) to permanently remove accounts past their 30 days:

```bash
npm run accounts:purge               # lists who is due, deletes nothing
npm run accounts:purge -- --confirm  # deletes them
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
