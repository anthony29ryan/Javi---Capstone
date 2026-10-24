# Pre-Deployment Audit: Javi (Capstone)

Audit date: 2026-10-24 · Commit audited: `cb54e49` (main, clean tree) · Read-only: no source file was changed.

**What this repo does:** Javi is an Android app (Expo / React Native) for learning Java. Learners
read lessons, take server-graded quizzes, solve code challenges that run on Judge0, chat with a
Gemini tutor scoped to one module, and get "weak topic" suggestions from a small TensorFlow.js
model. Everything with a secret or an answer key lives in Firebase Cloud Functions
(`functions/index.js`, region `asia-southeast1`).

**Load assumed:** 500 to 1,000 real users after the defense (the stated deployment plan), plus
at least one curious or hostile user with a script. A "script" here means someone who signs in
once, copies their Firebase ID token, and calls the backend directly instead of through the app.

---

## 1. Executive Summary

**Overall verdict: READY WITH FIXES.** The design is sound: keys never reach the app, quizzes
and challenges are graded on the server, hidden tests and answer keys are unreadable, and the
Judge0 spend has a hard app-wide cap. One backend function has no limit at all, and its cost
grows with data the same user can inflate. Fix that one first. It takes about an hour.

| Area | Score /10 | One-line reason |
|---|---|---|
| Security | 7.5 | Excellent server-side trust model; no App Check; progress fields are client-written |
| Rate limiting & cost | 5 | Tutor and Judge0 are well capped; `getWeakTopics` is not capped at all |
| Bugs & correctness | 7.5 | Few real bugs; lost-connection saves hang; no error boundary |
| Performance | 8.5 | Lesson index document, caching, lazy TF.js load, right region |
| Code quality | 8.5 | Clear, well commented, 133 tests passing; a few client paths untested |
| Deployment readiness | 6 | Privacy text is behind the features; extra permissions; no crash reporting |
| **Overall** | **7** | |

**Findings by severity:** CRITICAL 1 · HIGH 1 · MEDIUM 5 · LOW 8 · INFO 5 (20 total)

**Top 5 most urgent**
1. **C-01**: `getWeakTopics` has no rate limit and reads every attempt the user has; a script can run up a Firestore bill of hundreds of dollars a day.
2. **H-01**: No App Check and no hard spending stop; the $10 budget only sends emails.
3. **M-01**: The Privacy text does not say that learners' code goes to Judge0 (RapidAPI), and it states the tutor limit wrongly.
4. **M-02**: Once the connection drops mid-session, "Mark complete" and "See results" spin until reconnect; the "Score not saved" banner can never appear.
5. **M-03**: Quiz scores, completed lessons and streaks are written by the app, so badges can be faked with one direct write.

**Tool results**
- `npm test`: 47/47 pass. `npm run test:rules` (emulator, rules + all function tests): 86/86 pass.
- `npm run content:verify`: OK, 3 courses, 21 modules, 180 lessons, 527 questions, 21 traces, 15 challenges, no problems. Answer positions are balanced (A 122, B 127, C 118, D 105).
- `npx expo-doctor`: 17/18 pass; `expo-asset` 12.0.13 should be ~12.0.14 (patch).
- `npm audit` (root): 41 (2 critical, 26 high, 13 moderate), all in dev tools (firebase-tools, Expo CLI, rules-unit-testing). None ship in the APK. See L-02.
- `npm audit` (functions): 1 high, `body-parser`, fix available without breaking changes. See L-02.
- Secrets: `.env` and `.env.preview.local` are git-ignored and were never committed. Searching all 173 commits for the Judge0 and JDoodle key values and any `AIza…` key found nothing.

---

## 2. Findings Table

| ID | Severity | Area | Title | File:Line |
|---|---|---|---|---|
| C-01 | CRITICAL | Rate limiting / cost | `getWeakTopics` is unlimited and reads every attempt per call | functions/index.js:128-144 |
| H-01 | HIGH | Security / cost | No App Check, and the budget only alerts | functions/index.js:17, src/services/firebase.js:18-27 |
| M-01 | MEDIUM | Deployment / privacy | Privacy and Terms text behind the features (Judge0 undisclosed, wrong tutor limit) | src/constants/legal.js:59, 78, 84 |
| M-02 | MEDIUM | Bugs | A connection lost after launch is never noticed; saves hang | src/context/ProgressContext.js:86-97 |
| M-03 | MEDIUM | Security (cheating) | Scores, lessons and streak are client-written; badges can be faked | firestore.rules:124-145, src/services/progress.js:79-93 |
| M-04 | MEDIUM | Bugs / deployment | No error boundary and no crash reporting | App.js:12-21 |
| M-05 | MEDIUM | Accessibility | Muted label text is 2.28:1 contrast (AA needs 4.5:1) | src/theme/authTheme.js:24 |
| L-01 | LOW | Deployment | Unneeded Android permissions from Expo defaults | app.json:13-21 |
| L-02 | LOW | Security / deps | `npm audit` findings; `expo-asset` patch mismatch | functions/package.json, package.json |
| L-03 | LOW | Privacy | Unexpected sign-out leaves the last user's code drafts on the phone | src/context/AuthContext.js:66-69 |
| L-04 | LOW | Privacy | Abandoned Google sign-up leaves an Auth account with no consent | src/context/AuthContext.js:86-93 |
| L-05 | LOW | Bugs (ops) | Publishing an empty questions/traces/challenges file wipes that collection | scripts/publishContent.js:100, 176-207 |
| L-06 | LOW | Deployment | One Firebase project serves development and production | .firebaserc:3 |
| L-07 | LOW | Deployment | EAS production builds never bump versionCode; launcher name is "Capstone" | eas.json:24-29, app.json:3-4 |
| L-08 | LOW | Code quality | Quiz scoring and the log-in state machine have no tests | src/screens/QuizScreen.js:253-268, src/context/AuthContext.js:200-238 |
| I-01 | INFO | Security | AI tutor: prompt-injection residue is low-impact; output is plain text | functions/index.js:203-225, src/components/TutorChat.js:32-43 |
| I-02 | INFO | Security | Code runner limits: what is enforced and what is Judge0's default | functions/codeRunner.js:7-10, 54-59 |
| I-03 | INFO | Bugs | "Offline preset hints" do not exist; challenge hints need a connection | src/services/challenges.js:306-317 |
| I-04 | INFO | Security | Firebase Auth keeps its session in AsyncStorage | src/services/firebase.js:22-24 |
| I-05 | INFO | Code quality | Stale JDoodle credentials still in `.env` (and maybe Secret Manager) | .env (untracked) |

---

## 3. Detailed Findings

### C-01 · `getWeakTopics` is unlimited and reads every attempt per call
- **Severity / area:** CRITICAL · Rate limiting & cost
- **Location:** `functions/index.js:128-144`, with `functions/index.js:38` and `:75-81` (gradeAnswer)
- **Evidence:**
  ```js
  exports.getWeakTopics = onCall({ region: 'asia-southeast1' }, async (request) => {
    const userId = verifiedUserId(request, 'Sign in to see weak topics.');
    ...
    // shortcut: reads all of a user's attempts, add orderBy+index or a cap if users reach thousands.
    db.collection('attempts').where('userId', '==', userId).get(),
    db.collection('modules').select().get(),
  ```
  ```js
  const ANSWERS_PER_MINUTE = 30;   // gradeAnswer's only limit; there is no daily cap
  ```
- **What is wrong:** Every other paid function takes an allowance first (`takeAllowance`). This
  one does not. Each call is billed one Firestore read per attempt the user has, plus 21 for
  `modules`. The same user controls the attempt count: `gradeAnswer` accepts 30 answers a
  minute with no daily cap, which is up to 43,200 new attempts a day per account. The
  `shortcut:` comment names the limit as "users reach thousands". A script crosses it on day one,
  so it is a finding.
- **How it fails:** A verified account runs `gradeAnswer` in a loop for a few hours (about 5,000
  attempts), then calls `getWeakTopics` 5 times a second. That is 5 × 5,000 = 25,000 reads a
  second, or about 2.2 billion reads a day. At Firestore's price of about $0.06 per 100,000
  reads, that is roughly **$1,300 a day**. `maxInstances: 5` does not stop it, because each
  instance serves many requests at once. The $10 budget only sends emails (see H-01).
- **Fix (smallest that works):**
  1. Rate-limit it with the existing helper, at the top of the handler:
     ```js
     await takeAllowance(`quizUsage/${userId}`, 'weakTopicsLastMinute', 6,
       'Slow down: try again in a minute.', Date.now() - 60 * 1000);
     ```
  2. Bound the read. The model only looks at the last 20 answers per topic (`WINDOW`), and there
     are 21 topics, so the newest 500 attempts are enough:
     `.where('userId', '==', userId).orderBy('createdAt', 'desc').limit(500)`. This needs a
     composite index (`attempts`: `userId` ASC, `createdAt` DESC) in a new
     `firestore.indexes.json`, referenced from `firebase.json` under `"firestore"`.
  3. Give `gradeAnswer` a daily cap beside the per-minute one, e.g. 400 answers a day (20 full
     quizzes): `await takeAllowance(\`quizUsage/${userId}\`, 'today', 400, '…They reset at midnight.')`.
  4. Optional: reuse a cached module id list instead of reading `modules` on every call.
  Add one emulator test, "a 7th call within a minute is refused", next to `functions/getWeakTopics.test.js`.
- **Effort:** S (about an hour, plus the index build)

### H-01 · No App Check, and the budget only alerts
- **Severity / area:** HIGH · Security & cost
- **Location:** `functions/index.js:17` (no `enforceAppCheck` on any `onCall`), `src/services/firebase.js:18-27` (no App Check set-up). A search of `src/`, `functions/` and `package.json` finds no App Check code.
- **Evidence:**
  ```js
  setGlobalOptions({ maxInstances: 5 });
  exports.gradeAnswer = onCall({ region: 'asia-southeast1' }, ...
  ```
- **What is wrong:** App Check lets Firebase refuse calls that do not come from your real app.
  Without it, anyone with a verified account can call every function and read every
  `signedIn()` collection from a script. Some of this is fine because each function has its own
  cap, but Firestore reads have no cap. For example, listing the `questions` collection costs
  527 reads per query, and the rules allow it for any signed-in user (`firestore.rules:52-54`).
  The project notes say the Google Cloud budget is $10 with alerts at 50/90/100% and "spend cap:
  Not applicable". So nothing stops a large bill. It only reports it.
- **Fix:** There are two parts, and you choose the trade-off:
  - **App Check:** it needs a native module (`@react-native-firebase/app-check` with Play
    Integrity). That conflicts with the "stay in Expo Go" rule, so it can only go into the EAS
    build. It is reasonable to skip it for the defense and add it before a public release.
  - **Hard stop (recommended now):** follow Google's "cap costs" pattern. A budget sends a
    Pub/Sub message to a small function, and the function removes billing from the project at
    100%. That takes the app offline, which is better than an unbounded bill for a
    billing-averse solo project. Ask yourself first whether a dead app on demo day is worse.
  - Either way, do C-01. It removes the one place where one call costs thousands of reads.
- **Effort:** M (hard stop), L (App Check in a dev build)

### M-01 · Privacy and Terms text behind the features
- **Severity / area:** MEDIUM · Deployment / privacy
- **Location:** `src/constants/legal.js:59`, `:78`, `:84`, and the Privacy "Data Sharing" list (around `:205-212`)
- **Evidence:**
  ```js
  'Each account can ask up to 30 questions in any 24 hours.',
  "Javi uses Firebase (by Google) for sign-in, its database and its server functions, and Google Gemini for the AI tutor."
  ```
- **What is wrong:** Code Challenges and the Playground (added 2026-10-23/24) send the learner's
  source code and input to Judge0 CE on RapidAPI, a third party that the Terms and Privacy text
  never name. The text also does not list "challenges solved" or "ran a program" as data
  collected. The tutor limit now resets at midnight Manila time (`functions/index.js:160`), not
  "in any 24 hours". The Play Store data-safety form and RA 10173 both expect every processor to
  be named.
- **Fix:** Add Judge0 (RapidAPI) to both third-party lists ("receives the code and input you run
  in Code Challenges and the Playground; nothing else"). Add challenges solved and
  `ranFirstProgram` to the collected-data list. Change the tutor sentence to "30 questions a day,
  reset at midnight Philippine time". Add challenges and the playground to the "needs internet"
  line at `:78`. Then bump `TERMS_VERSION` (`:12`) per the file's own rule.
- **Effort:** S

### M-02 · A connection lost after launch is never noticed; saves hang
- **Severity / area:** MEDIUM · Bugs
- **Location:** `src/context/ProgressContext.js:86-97` (the only place `offline` becomes true), `src/screens/LessonDetailScreen.js:209-215`, `src/screens/QuizScreen.js:255-268` and `:385-389`
- **Evidence:**
  ```js
  } catch (err) {
    const snapshot = await loadSnapshot().catch(() => null);
    if (snapshot) { ... setOffline(true); }
  ```
  ```js
  async function next() {
    if (isLast) { await saveScore(); setFinished(true); return; }
  ```
- **What is wrong:** `offline` is set only when the launch load fails, and only the banner's
  Retry clears it. If the signal drops later, the app still thinks it is online. Firestore's
  `setDoc` does not reject offline: its promise resolves only after the server confirms the
  write. So:
  - "Mark complete" on a lesson shows its spinner until the phone reconnects, with no message.
  - On the last quiz question, "See results" spins the same way. The "Score not saved yet"
    banner (Frame 98) needs `saveScore` to throw, which never happens offline, so the screen
    built for that case cannot appear.
- **Fix:** Race the write against a timer, so the screens' existing error paths run:
  ```js
  const withTimeout = (promise, ms = 10000) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
  ```
  Wrap the `setDoc` calls in `src/services/progress.js` with it. The write stays queued and lands
  when the phone reconnects (`arrayUnion` and merge make that safe). A connectivity listener
  would be more complete, but it needs a new dependency (`@react-native-community/netinfo`).
  This fix needs none.
- **Effort:** S

### M-03 · Scores, lessons and streak are client-written; badges can be faked
- **Severity / area:** MEDIUM · Security (cheating). Rated below HIGH because nothing is shared
  between users (no leaderboard, ranking or certificate), so a cheater only fools themselves.
  Raise it to HIGH if a leaderboard or graded export is ever added.
- **Location:** `firestore.rules:124-145`, `src/services/progress.js:79-93`, badges in `src/screens/ProfileScreen.js:37-75`
- **Evidence:**
  ```
  && (!changed('moduleScores') || data.moduleScores is map)
  && data.streak.current is int && data.streak.longest is int
  ```
  ```js
  moduleScores: { [moduleId]: { correct, total, lastAttemptAt: Date.now() } },
  ```
- **What is wrong:** Each answer is graded on the server, but the app adds up the score and
  writes it. A single REST write of `moduleScores: {oop: {correct: 20, total: 20}}`,
  `streak: {current: 365, longest: 365}` and every lesson id in `completedLessons` passes the
  rules. It turns on every badge except First Compile and Bug Squasher, which only the server
  can set. A non-numeric score also gets through (`{correct: "x"}` is a valid map), and
  `scorePercent` then shows `NaN%` on the owner's screens.
- **Fix:** Cheapest: tighten the rule so values are sane (`correct` and `total` ints,
  `0 <= correct <= total <= 25`). That stops garbage but not a fake 20/20. A full fix is a
  `finishQuiz` callable that counts this attempt's correct answers from `attempts` and writes
  `moduleScores` itself, the same way `runChallenge` writes `completedChallenges`. For a
  capstone, the rule tightening plus one sentence in the defense ("scores are self-reported;
  answers and challenges are server-verified") is a reasonable stopping point.
- **Effort:** S (rule) / M (callable)

### M-04 · No error boundary and no crash reporting
- **Severity / area:** MEDIUM · Bugs / deployment
- **Location:** `App.js:12-21`. A search for `ErrorBoundary` and `componentDidCatch` in `src/` finds nothing, and there is no Sentry or Crashlytics.
- **Evidence:**
  ```jsx
  <SafeAreaProvider>
    <AuthProvider>
      <RootNavigator />
  ```
- **What is wrong:** In a release build, an exception thrown while rendering any screen unmounts
  the whole app. For example, a hand-edited lesson in the Firebase console with `items` as a
  string would break `ListBlock`. The learner sees a closed app, and you never hear about it.
  `content:verify` protects published content, but not edits made in the console.
- **Fix:** One small boundary around `<RootNavigator />` that shows `ScreenState` with a "Try
  again" button. React only supports error boundaries as class components, so this is the one
  justified exception to the "no class components" rule in CLAUDE.md (about 25 lines). For crash
  reports, `sentry-expo`/`@sentry/react-native` works in Expo Go for JS errors. It is a new
  dependency, so decide whether you want it. Without it, the EAS build has no field visibility.
- **Effort:** S

### M-05 · Muted label text fails contrast
- **Severity / area:** MEDIUM · Accessibility
- **Location:** `src/theme/authTheme.js:24` (`muted: '#A1A4B2'`), used as `colors.borderStrong` for text in 55 places (e.g. `src/screens/QuizScreen.js:529`, `:754`, `:790`)
- **Evidence:** `color: colors.borderStrong` on `background: '#F7F5F0'` gives a **2.28:1** ratio
  (computed). WCAG AA needs 4.5:1 for small text. The quiz header module name, section labels,
  "Question N" and placeholders all use it, mostly at 10-11 px. The white score on the quiz hero
  (`#FFFFFF` on `colors.primary #C88B7A`) is 2.83:1, under the 3:1 needed even for large text.
- **Fix:** Use `colors.textMuted` (`#6B6E7F`, 4.63:1) for text, and keep `borderStrong` for
  borders and chevrons. For the hero, use `primaryDark` (`#A8563F`) as its background. This is a
  design change, so check it against the Flow file first.
- **Effort:** S

### L-01 · Unneeded Android permissions
- **Location:** `app.json:13-21` (no `permissions` / `blockedPermissions`)
- **Evidence:** `npx expo config --type introspect` lists `READ_EXTERNAL_STORAGE`,
  `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `VIBRATE`, `INTERNET`.
- **Problem:** The app never touches shared storage or draws over other apps. Play shows these
  permissions on the listing, and reviewers ask about them.
- **Fix:** `"android": { "blockedPermissions": ["android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.SYSTEM_ALERT_WINDOW"] }`. After a build, confirm that notifications still ask for `POST_NOTIFICATIONS`.
- **Effort:** S

### L-02 · Dependency audit results
- **Location:** `functions/package.json`, `package.json`
- **Evidence:** functions: `body-parser 2.0.0-2.3.0 · high · DoS via trailing bytes after a compressed body · fix available via npm audit fix`. Root: 2 critical (`shell-quote`, `tar`) and 26 high, all pulled in by `firebase-tools`, `@expo/cli`, `@firebase/rules-unit-testing` and the Node-only `@grpc/grpc-js`.
- **Problem:** Only the functions one can reach production: Cloud Functions parse request
  bodies. The root ones are dev tools that run on your PC and are not in the APK. `npm audit`
  suggests "expo@44" / "firebase@9" as fixes. Those are downgrades. Do not apply them.
- **Fix:** `cd functions && npm audit fix`, then redeploy. `npx expo install expo-asset` for the doctor's patch warning. Leave the root ones until the next planned `firebase-tools` upgrade (pinned at v13 for Java 17).
- **Effort:** S

### L-03 · Unexpected sign-out leaves the last user's code drafts
- **Location:** `src/context/AuthContext.js:66-69` (compare `logOut`, `:274-279`)
- **Evidence:**
  ```js
  if (!firebaseUser) {
    if (userRef.current && !signingOut.current) setExpiredEmail(userRef.current.email ?? '');
  ```
- **Problem:** When Firebase ends a session on its own (for example, the password was changed on
  another phone), this branch does not call `clearOfflineData()`. The next person who signs in
  on this phone sees the previous user's challenge drafts ("In progress") and Playground code
  (`challengeDraft:*`, `playgroundDraft`), and the offline snapshot of their progress until the
  first successful load.
- **Fix:** In that branch, add `clearOfflineData().catch(() => {});` and `cancelDailyReminder()`, the same as `logOut`.
- **Effort:** S

### L-04 · Abandoned Google sign-up keeps an Auth account without consent
- **Location:** `src/context/AuthContext.js:86-93`
- **Evidence:**
  ```js
  if (profile && !profile.exists && !hasPasswordProvider(firebaseUser)) {
    await forgetGoogleAccount();
    await endSession();
  ```
- **Problem:** If someone taps "Continue with Google" and closes the app on the Terms popup,
  Firebase Auth keeps their name and email. Next launch only signs out; it never deletes. The
  purge job keys off `users.deletionRequestedAt`, so it never finds these accounts. This goes
  against the code's own promise at `:188-190` ("nothing is kept for someone who did not
  consent").
- **Fix:** In the daily `purgeDeletedAccounts` job, also list Auth users created more than a day
  ago with no `users/{uid}` document, and delete them (`auth.listUsers` + `getAll`). Deleting from
  the client here fails with `requires-recent-login` on an old session.
- **Effort:** M

### L-05 · Publishing an empty file wipes a collection
- **Location:** `scripts/publishContent.js:100` vs `:176-179`, `:184-190`, `:197-207`
- **Evidence:**
  ```js
  // Every removal below is skipped when its local source is empty or absent,
  if (fs.existsSync(questionsDir)) { removed.questions = await removeStale(...)
  ```
- **Problem:** Courses, modules and lessons check `length > 0`. Questions, traces and challenges
  only check that the file exists. If `challenges.json` holds `[]` (a bad merge or a half-saved
  edit) and someone runs `node --env-file=.env scripts/publishContent.js` directly, skipping
  `content:verify`, every challenge and hidden test is deleted from production.
- **Fix:** Apply the same `size > 0` guard to those three blocks, as the comment already promises.
- **Effort:** S

### L-06 · One Firebase project for development and production
- **Location:** `.firebaserc:3` (`"default": "javi-32f31"`), `.env.preview.local` points at the same project
- **Problem:** Test accounts, test attempts (which feed the model) and every content publish land
  on the project real users will use. `removeStale` deletes live documents.
- **Fix:** For 500-1,000 users, a second project (`javi-dev`) used through `firebase use` and a
  `.env.development` is the usual fix. If that is too much for now, at least delete test accounts
  and their `attempts` before release (see NEEDS MANUAL CHECK).
- **Effort:** M

### L-07 · versionCode never increases; launcher name is "Capstone"
- **Location:** `eas.json:24-29`, `app.json:3-4`
- **Evidence:** `"appVersionSource": "remote"` with no `"autoIncrement": true` on `production`; `"name": "Capstone"`.
- **Problem:** With remote versioning and no auto-increment, every production build gets the same
  `versionCode`, and Play rejects the second upload. The phone's app drawer shows "Capstone", not "Javi".
- **Fix:** Add `"autoIncrement": true` to `build.production`, and set `"name": "Javi"`. Keep the
  `slug` unchanged: it is tied to the EAS project id.
- **Effort:** S

### L-08 · Quiz scoring and log-in state machine have no tests
- **Location:** `src/screens/QuizScreen.js:253-268`, `src/context/AuthContext.js:200-238`
- **Problem:** Server code is well tested: 86 emulator tests cover every function's limits,
  refunds and leaks. The two trickiest client paths are not. One is the quiz's
  marks → `correctCount` → `recordModuleQuizCompletion`. The other is `openSession`'s
  deletion-window branch, where an off-by-one locks a user out or lets a purged account back in.
- **Fix:** One test: move the "is this deletion past its window" decision (`:218`) into
  `src/constants/accountDeletion.js` next to `permanentDeletionDate`, and test day 29 / 30 / 31
  in `tests/`. That file is already Firebase-free.
- **Effort:** S

### I-01 · AI tutor: prompt injection is low-impact; output is plain text
- **Location:** `functions/index.js:203-225`, `:359-361`, `:386-389`, `src/components/TutorChat.js:32-43`
- **Observation:** The learner's text only ever goes in as a `user` turn, never into the system
  instruction. Questions are capped at 500 characters on the server (and by `maxLength` in the
  app). Replies are capped at 800 tokens and stripped of Markdown, and the app renders them as
  plain `Text` and code blocks: no HTML, no links, so there is nothing to inject into the UI. A
  determined learner can still talk the model into an off-topic answer or into repeating its
  instruction. That leaks nothing secret (the instruction is lesson text) and costs nothing on
  the free tier. No action needed. If billing is ever enabled on the Gemini key, add an app-wide
  daily cap like `takeBudgetCall`.

### I-02 · Code runner limits
- **Location:** `functions/codeRunner.js:7-10`, `:54-59`, `functions/index.js:443-445`
- **Observation:** The app cannot reach Judge0: only the `runChallenge` and `runCode` functions
  hold `JUDGE0_KEY`. They enforce 5 s CPU time, a 25 s request timeout, 20,000-character code,
  5,000-character input, 4,000-character output kept, 20/10 runs per user a day, 5 a minute,
  and 300/1,350 calls app-wide a day and a month. Memory, process count and network access are
  left to Judge0's defaults, which this code cannot see (see NEEDS MANUAL CHECK). Infinite
  loops come back as `timeout`. Fork bombs and huge outputs are contained by Judge0's sandbox
  and the 4,000-character slice.

### I-03 · "Offline preset hints" do not exist
- **Location:** `src/services/challenges.js:306-317`; lesson JSON has no hint field
- **Observation:** The audit brief mentions offline preset hints stored with lessons. The code
  has none. The only hints are on challenges (`challenge.hint`), loaded with `getDocsFromServer`,
  so they need a connection, like challenges themselves. Offline, learners get downloaded lessons
  only. That matches the Terms text. Nothing is broken; correct the description if it appears in
  the capstone paper.

### I-04 · Session token in AsyncStorage
- **Location:** `src/services/firebase.js:22-24`
- **Observation:** Firebase Auth's refresh token is stored unencrypted in AsyncStorage through
  `getReactNativePersistence`. This is Firebase's supported setup for React Native. Moving it to
  `expo-secure-store` needs a custom persistence adapter and runs into SecureStore's ~2 KB value
  limit. No other secrets are stored on the phone. Accept as is.

### I-05 · Stale JDoodle credentials
- **Location:** `.env` (git-ignored, never committed): `JDOODLE_CLIENT_ID`, `JDOODLE_CLIENT_SECRET`
- **Observation:** JDoodle was replaced by Judge0 on 2026-10-24. The keys are still on disk, and
  the project notes say they were also stored as Firebase secrets. Delete them from `.env` and
  `.env.example` comments, and run `firebase functions:secrets:destroy JDOODLE_CLIENT_ID` (and
  `_SECRET`) if they still exist. Unused live credentials are only risk.

---

## 4. NEEDS MANUAL CHECK

These items cannot be confirmed from the code.

1. **Hard spend stop (Google Cloud).** Console → Billing → Budgets & alerts → budget "Javi". Confirm whether a Pub/Sub topic is connected ("Manage notifications → Connect a Pub/Sub topic"). Without one, the budget only emails. See H-01.
2. **Gemini key billing.** aistudio.google.com → API keys → the key's project → check whether billing is enabled. If it is, the tutor is paid (about 15k input tokens per question at the 60,000-character lesson cap) and needs an app-wide cap. If it is not, note that free-tier prompts may be used by Google; the Privacy text already says so.
3. **RapidAPI hard limit.** rapidapi.com → My Apps → Judge0 CE subscription → check the plan's overage and hard limit. The app's 1,350-calls-a-month stop does not count calls made with the same key from your PC.
4. **Judge0 sandbox defaults.** Call `GET https://judge0-ce.p.rapidapi.com/config_info` once (free) and check `enable_network: false`, `max_memory_limit`, `max_processes_and_or_threads` and `max_file_size`.
5. **App Check status.** Firebase console → App Check → confirm Firestore, Functions and Storage show "Unenforced". Do not enforce until the app sends tokens, or every request fails.
6. **Email enumeration protection and password policy.** Firebase console → Authentication → Settings → "User actions" (email enumeration protection on), and "Password policy" matches `PASSWORD_RULES` in `src/components/auth/PasswordRules.js` (8+ characters, upper, lower, symbol; enforced, not just "notify").
7. **Authorized domains.** Authentication → Settings → Authorized domains: remove `localhost` and anything unused before release.
8. **Test data in production.** Firestore → `users`, `attempts`, `progress`, `chats`: delete test accounts (and their attempts, which feed the model) before release, or move testing to a second project (L-06).
9. **Deployed rules match the repo.** `npx firebase deploy --only firestore:rules --dry-run`, or compare Firestore → Rules in the console against `firestore.rules`. Storage deploy fails without a bucket (known), so use `--only firestore:rules`.
10. **Deployed functions match the repo.** `npx firebase functions:list` should show exactly `gradeAnswer`, `getWeakTopics`, `askTutor`, `runChallenge`, `runCode`, `purgeDeletedAccounts`, all in `asia-southeast1`. Remove any older JDoodle-era or test function still deployed.
11. **The purge job runs.** Cloud Console → Logging → filter `purgeDeletedAccounts` → confirm one run a day at 03:00 Manila without errors.
12. **Play Console (if publishing):** data-safety form lists Firebase, Google Gemini and Judge0; target API level meets the current Play requirement (Expo SDK 54 targets API 35); privacy policy URL points to a public page with the same text as `legal.js`.

---

## 5. Pre-Deployment Checklist

In order, most urgent first.

1. **C-01**: rate-limit `getWeakTopics`, read at most the newest 500 attempts (plus index), and give `gradeAnswer` a daily cap. Add the emulator test.
2. **H-01**: decide on a billing hard stop (Manual check 1). Keep App Check on the list for the EAS build.
3. **M-01**: update Terms and Privacy for Judge0, solved challenges and the midnight reset; bump `TERMS_VERSION`.
4. **M-02**: add a timeout to progress writes so offline saves fail visibly.
5. **M-04**: add one error boundary around `RootNavigator`; decide on crash reporting.
6. **M-03**: tighten the `moduleScores` rule (or add `finishQuiz`); mention self-reported scores in the defense.
7. **L-02**: `npm audit fix` in `functions/`, `npx expo install expo-asset`, redeploy functions.
8. **L-01, L-07**: block the three permissions, add `autoIncrement`, rename the app to "Javi".
9. **M-05**: swap muted text to `textMuted` after checking the design.
10. **L-03, L-05**: clear offline data on unexpected sign-out; add the empty-file guard to publishing.
11. Run every item in section 4, especially 6-10.
12. **L-04, L-06, L-08, I-05**: after release is fine.

---

## 6. What Is Done Well

Keep these patterns.

- **Secrets stay on the server.** Gemini and Judge0 keys live in Secret Manager (`defineSecret`), and the app only gets `EXPO_PUBLIC_FIREBASE_*` identifiers. Git history is clean, and `.gitignore` blocks service-account files.
- **Answers can't be read by the app.** `answerKeys` and `challengeTests` have no rule, so only the functions can read them. Hidden tests return only pass/fail. Compile errors on Submit are hidden because they could quote test values (`functions/index.js:601-605`).
- **Allowances are atomic.** `takeAllowance` runs in a transaction, so a double tap cannot slip past the limit. Failed calls give the use back. The Judge0 budget is never refunded, because a failed call may still be billed. That is the right call.
- **Email must be verified on the server** (`verifiedUserId`), not just in the UI.
- **Rules are tight and tested:** default deny, `hasOnly` field lists, server timestamps for `createdAt`, `termsAcceptedAt` and `deletionRequestedAt`, and 86 passing emulator tests.
- **Account deletion is complete:** the purge removes Auth, attempts, chats, all three usage docs, progress and profile, and is safe to re-run.
- **Cheap reads:** `meta/lessonIndex` instead of 180 lesson docs at launch; challenges and weak topics are cached per session; TF.js is loaded lazily so it doesn't slow other functions' cold starts; the region is right for the Philippines.
- **The tutor is scoped by construction:** module text in the system instruction, the learner's text only as a user turn, and plain-text rendering.
- **Content is verified before publish:** duplicate ids, answer ranges, true/false shape, and challenges that a hard-coded answer would pass.
- **Comments explain why**, as CLAUDE.md asks, which made this audit faster.

---

**Not checked:** UI layout and animation code in screens beyond their data paths (read by
search, not line by line: Home, Profile, Settings, Courses, Modules, TracerList, Streak, Help and
the auth screens); the `.agents/` and `.claude/` skill folders (not shipped, excluded by
`.easignore`); `hosting/auth-action.*` beyond a check for DOM injection (deployed but unused, by
decision); `docs/`. Nothing was run against the live Firebase project, and no EAS build was made.
