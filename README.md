# Javi — Java Learning App

An Android app for learning Java programming. Users work through tiered lessons
(Beginner / Intermediate / Advanced), practice with quizzes and coding problems, chat with an
AI tutor scoped to their current module, and track their progress.

Solo capstone project, built incrementally over one semester.

## Stack

- **Client:** Expo (React Native), JavaScript
- **Backend:** Firebase — Auth, Firestore, Cloud Functions
- **Navigation:** React Navigation
- **AI tutor:** Claude or OpenAI API, called from a Cloud Function (never from the client)
- **Code execution:** Piston or Judge0 API, called from a Cloud Function
- **Trained model:** TensorFlow.js (tfjs-node), run inside a Cloud Function

There is no custom Node/Express server — Firebase Cloud Functions are the only backend layer.
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

These are client identifiers, not secrets — safe to have in the built app. Real API keys (AI
tutor, code execution) stay server-side in Cloud Functions and never ship to the client.

Publish `firestore.rules` in the Firebase console (Firestore Database → Rules tab) so signed-in
users can read/write their own profile document, plus content collections while placeholder
content is being seeded.

Seed placeholder lesson content (courses/modules/lessons) so the app has data to render — add
`SEED_EMAIL` / `SEED_PASSWORD` to `.env` (an existing dev/test account), then:

```bash
node --env-file=.env scripts/seedContent.js
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
  context/     # AuthContext — auth state, sign up/log in/log out
  navigation/  # RootNavigator — switches Auth stack vs. App stack based on auth state
  screens/     # LoginScreen, SignupScreen, HomeScreen, CoursesScreen, ModulesScreen,
               # LessonsScreen, LessonDetailScreen
  services/    # firebase.js (init), content.js (courses/modules/lessons reads)
scripts/
  seedContent.js  # one-off placeholder content seeder
firestore.rules
```

## Firestore data model

Core collections: `users`, `courses`, `modules`, `lessons`, `questions`, `attempts`, `progress`.

- `attempts` records individual quiz answers (topic, correct/incorrect, time taken, attempt
  number) — also the feature source for the trained personalization model.
- `progress` tracks completed lessons, test scores, and streaks per user.

## Status

- [x] Expo scaffold + Firebase Auth/Firestore connection
- [x] Sign up / log in flow
- [x] Lesson tier structure (Courses → Modules → Lessons, placeholder content)
- [x] Multiple-choice quizzes (per lesson and per module) with attempt tracking
- [ ] Runnable coding problems (Piston/Judge0 via Cloud Function)
- [ ] AI tutor (Cloud Function)
- [ ] Progress tracking
- [ ] Trained personalization model
