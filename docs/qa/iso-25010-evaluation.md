# Software Quality Evaluation of Javi against ISO/IEC 25010:2011

| | |
|---|---|
| Date | 2026-11-16 |
| Commit evaluated | `70a98f0` (`main`, clean working tree) |
| Quality model | ISO/IEC 25010:2011, product quality model (8 characteristics, 31 sub-characteristics) |
| Method | Source inspection, automated test runs, local emulator probes, measurement scripts |
| Status | Original evaluation, written **before** any remediation. Sections 1 to 10 are not edited afterwards. Results after the fix are appended at the end. |

> This is an independent engineering evaluation that uses ISO/IEC 25010 as its quality model. It is
> **not** a formal ISO certification or conformity assessment. No characteristic was assumed to pass,
> and each rating below cites its evidence.

---

## 1. Application overview

Javi is an Android app (Expo SDK 54, React Native 0.81, JavaScript) for learning Java. Learners do five things:

- read tiered lessons: 3 courses, 21 modules, 180 lessons;
- take server-graded quizzes: 20 questions drawn from a bank of 24 to 30 per module;
- solve coding challenges run on Judge0, plus a free Playground;
- chat with a Gemini tutor that only sees the current module;
- get "weak topic" suggestions from a small TensorFlow.js logistic-regression model.

**Architecture**

| Layer | Contents |
|---|---|
| Client (`App.js`, `src/`) | 40 screens, 3 contexts (Auth, Progress, TextSize), 17 services. It owns the UI, navigation, local state, offline snapshots and Firestore reads/writes that the rules cover. |
| Backend (`functions/index.js`, region `asia-southeast1`) | 6 callable functions (`gradeAnswer`, `finishQuiz`, `getWeakTopics`, `askTutor`, `runChallenge`, `runCode`) and 1 scheduled purge (`purgeDeletedAccounts`). Every secret and every answer key stays here. |
| Data | Firestore: `users`, `progress`, `attempts`, `chats`, content collections, and the server-only `answerKeys`, `challengeTests`, `*Usage`. Storage holds lesson images. A hosting page handles the email-action links. |
| Content pipeline | `content/*.json` → `scripts/verifyContent.js` → `scripts/publishContent.js` → Firestore. |

**User roles:**
- **Verified learner:** the only in-app role.
- **Unverified account:** kept on the Verify Email screen; refused by every callable.
- **Administrator:** works only through scripts with Admin credentials. There is no admin UI.

## 2. Evaluation scope

**In scope:**
- all client source;
- all Cloud Functions;
- the Firestore and Storage security rules;
- the content pipeline;
- build and configuration files;
- the existing automated tests;
- the prior audit (`AUDIT_REPORT.md`, 2026-10-24), whose findings were re-checked against the current code.

**Evidence types used:**

| Code | Meaning |
|---|---|
| **T** (tested) | Automated test or probe executed during this evaluation; output kept |
| **S** (static) | Source or configuration inspection, with file:line cited |
| **M** (measured) | A script computed a number (contrast ratios, simulation, bundle size) |

**Environment:**
- macOS, Node 22.18.0, OpenJDK 17.0.21 (for the Firebase emulators), firebase-tools 13 (from devDependencies).
- Every backend probe ran against the **local emulator**, with project ids `demo-*`.
- Nothing was sent to the production Firebase project `javi-32f31`, Gemini or Judge0.

**Out of scope, or not possible here.** Each item below is marked *Not Tested* in section 3:
- **On-device behaviour:** usability, accessibility with TalkBack, screen sizes, Android versions. There is no `.env`, and the only Firebase project is production, so running quizzes on a device would write real data.
- **Real latency and load.**
- **Live Gemini and Judge0 responses.**
- **Production console settings:** App Check, budget alerts, Auth email templates, Secret Manager.

**Questionnaire:** the project has no ISO evaluation questionnaire (confirmed with the developer). Section 6 is therefore N/A.

## 3. Test results (before remediation)

### 3.1 Suite runs

| Command | Result | Evidence |
|---|---|---|
| `npm test` (no emulator) | **54 / 54 pass** | `npm-test.txt` |
| `npm run test:rules` (Firestore and Storage emulators; rules tests plus all `functions/*.test.js`) | **93 / 93 pass** | `test-rules.txt` |
| `npm run content:verify` | **OK**: 3 courses, 21 modules, 527 questions, 21 traces, 15 challenges | `content-verify.txt` |
| `npx expo-doctor` | **18 / 18 checks pass** | `expo-doctor.txt` |
| `npx expo export --platform android` | **Bundles**: one Hermes bytecode file, 6.2 MB | `expo-export.txt` |
| `npm audit --omit=dev` (root) | 23 advisories: 7 high, 15 moderate, 1 low. See F-13 | `audit-root-prod.txt` |
| `npm audit --omit=dev` (functions) | 7 advisories: 6 moderate, 1 low, all fixable without breaking changes | `audit-functions.txt` |
| Linter / type checker | **Not available**: no ESLint, TypeScript or JSDoc checking is configured | – |

The two suites contain 133 distinct tests. Three pure `functions/` files run in both scripts, so 147 test runs in total.

### 3.2 Test cases

Status values: **Pass**, **Fail**, **Partial**, **Not Tested**.

The probe and simulation scripts are in `docs/qa/evidence/`. The existing tests are named by file.

**Functional suitability**

| Test ID | ISO characteristic | Scenario | Expected result | Actual result | Status | Evidence | Recommendation |
|---|---|---|---|---|---|---|---|
| TC-FUN-01 | Functional correctness | Pure client logic: streak, tracer, recommendations, offline store, text scale, reminder time, inline format, swipe target, account-deletion window | All behave as specified | 40 / 40 tests pass | Pass | T: `tests/*.test.js` | – |
| TC-FUN-02 | Functional correctness | Quiz answer graded from the hidden key and recorded server-side | Verdict from `answerKeys`; attempt stored | Pass | Pass | T: `functions/gradeAnswer.test.js` | – |
| TC-FUN-03 | Functional correctness | Quiz score counted on the server from recorded attempts; a partial quiz, a repeated question or another user's attempts are refused | As described | Pass | Pass | T: `functions/finishQuiz.test.js` | – |
| TC-FUN-04 | Functional correctness | Challenges: Run checks only the example; Submit runs hidden tests and marks the challenge solved; hard-coded output fails | As described | 19 / 19 pass (Judge0 stubbed) | Pass | T: `functions/runChallenge.test.js` | – |
| TC-FUN-05 | Functional appropriateness | Tutor gets only the current module's lessons, in order; the question stays out of the system instruction | As described | Pass (Gemini stubbed) | Pass | T: `functions/askTutor.test.js` | – |
| TC-FUN-06 | Functional correctness | Weak-topic model gives sensible output on known learners (strong → not weak, struggling → weak; weight signs) | As described | 6 / 6 pass | Pass | T: `functions/weakTopics.test.js` | – |
| TC-FUN-07 | Functional completeness | Content files are complete and consistent | Verifier exits 0 | OK | Pass | T: `content-verify.txt` | – |
| TC-FUN-08 | Functional correctness / Fault tolerance | Connection drops and returns mid-quiz | The same 20 questions continue; the review and the saved score match what was answered | `ProgressContext.refresh()` runs on reconnect and replaces `lessonRefs`. QuizScreen's `load` depends on `lessons`, so it draws a **new random set** while `index` and `marks` are kept. Simulation with real content (42,000 trials): the review pairs a mark with a different question 97 to 100% of the time, and about 50% of the time a question repeats, so `finishQuiz` refuses the score permanently | **Fail** | S: `src/screens/QuizScreen.js:170-201`, `src/context/ProgressContext.js:62-75,114-125,265`; M: `evidence/reshuffle.sim.js`; T: TC-FUN-12 | Draw the question set once per visit to the screen (F-01) |
| TC-FUN-09 | Functional correctness (input validation) | `gradeAnswer` with `choice: 999` for a 4-choice question | Rejected as invalid | Accepted and recorded as a wrong attempt | Fail | T: `evidence/functions.probe.js` | Bound `choice` by the number of choices (F-09) |
| TC-FUN-10 | Functional correctness (boundary) | `gradeAnswer` with `timeTakenMs: 1e15` | Rejected or clamped | Accepted and stored as-is. The model caps time at 60 s, which limits the effect | Partial | T: `evidence/functions.probe.js`; S: `functions/weakTopics.js` | Clamp on write (F-09) |
| TC-FUN-11 | Functional correctness (boundary) | `runChallenge` with a 2,000-character `challengeId` | Clean refusal | `not-found` "No such challenge." on the emulator. Production's 1,500-byte document-id limit could not be tested | Pass (emulator) | T: `evidence/functions.probe.js` | Add the same length bound as `CONTENT_ID` anyway |
| TC-FUN-12 | Data integrity | `finishQuiz` given the same question twice (what a reshuffled quiz sends) | Refused | `invalid-argument` "Each question can be counted once." | Pass (the guard works; this confirms the effect of TC-FUN-08) | T: `evidence/functions.probe.js` | – |

**Security**

| Test ID | ISO characteristic | Scenario | Expected result | Actual result | Status | Evidence | Recommendation |
|---|---|---|---|---|---|---|---|
| TC-SEC-01 | Confidentiality / Integrity | Firestore rules: content is read-only; profiles and progress are owner-only; attempts and chats are server-written; answer keys, hidden tests and usage counters are closed | As described | 31 / 31 pass | Pass | T: `tests/rules/firestore.test.js` | – |
| TC-SEC-02 | Confidentiality | Storage rules: lesson images are readable when signed in; nothing is writable | As described | 4 / 4 pass | Pass | T: `tests/rules/storage.test.js` | – |
| TC-SEC-03 | Confidentiality | The exported client bundle contains no server secret (Gemini or Judge0 key, private key) | None found | The only matches are the Privacy-policy sentences naming Judge0 and Gemini; no key material | Pass | T: `strings` scan of the exported `.hbc` | – |
| TC-SEC-04 | Authenticity | Unverified or signed-out callers are refused by the callables | `permission-denied` / `unauthenticated` | Pass | Pass | T: `functions/askTutor.test.js`, `*.test.js` "signed-out callers…" cases | – |
| TC-SEC-05 | Integrity | Client writes `streak: {current: 100000, longest: 100000, lastActiveDate: <10,000 chars>}` | Denied, or bounded | **Allowed** | Fail | T: `evidence/rules.probe.js` | Bound the values, or move the streak to the server (F-05) |
| TC-SEC-06 | Integrity | Client writes 1,000 `completedLessons` with mixed types and non-existent ids | Denied | **Allowed** | Fail | T: `evidence/rules.probe.js` | F-05 |
| TC-SEC-07 | Integrity | Client creates its profile with a 500,000-character `email` that does not match the token | Denied | **Allowed** | Fail | T: `evidence/rules.probe.js` | Require `email == request.auth.token.email` (F-05) |
| TC-SEC-08 | Integrity | Client writes 20 object-valued `goals` | Denied | **Allowed** | Fail | T: `evidence/rules.probe.js` | Check item type and format (F-05) |
| TC-SEC-09 | Integrity | Client writes its own `moduleScores` (control) | Denied | Denied | Pass | T: `evidence/rules.probe.js` | – |
| TC-SEC-10 | Authenticity | Callables accept only requests from the genuine app (App Check) | Enforced | No `enforceAppCheck` in any function; client never calls `initializeAppCheck` | Fail | S: `functions/index.js:62,158,225,459,643,744`; `src/services/firebase.js:18-27` | F-02 |
| TC-SEC-11 | Confidentiality / Integrity | Runtime dependency advisories | None high in shipped code | 7 high in the root runtime tree. Most are Expo CLI and Metro build tools. `firebase` is flagged through `@grpc/grpc-js`, which is the Node transport and not the one React Native uses. The functions tree has none high | Partial | T: `npm audit` | F-13 |

**Reliability, data integrity and capacity**

| Test ID | ISO characteristic | Scenario | Expected result | Actual result | Status | Evidence | Recommendation |
|---|---|---|---|---|---|---|---|
| TC-REL-01 | Availability / Capacity | Per-user limits: 31st answer in a minute and 401st in a day; 7th weak-topic call in a minute; 6th tutor question in a minute and 31st in a day; 6th run in a minute and 21st challenge check in a day | Refused with `resource-exhausted`; refused calls not charged | Pass | Pass | T: `gradeAnswer`, `getWeakTopics`, `askTutor` and `runChallenge` tests | – |
| TC-REL-02 | Availability | App-wide Judge0 budget against one person holding several accounts | The service stays available to other learners | Per-account ceiling is 50 calls a day (`20 × 2 + 10`). The app-wide cap is 300 a day, so **6 verified accounts** use up code running for everyone until midnight | Fail (risk) | S: `functions/index.js:533-545`; T: "the app-wide daily cap…" test confirms the cap behaves as coded | F-03 |
| TC-REL-03 | Fault tolerance | Lost reply on a quiz answer, retried with the same `attemptId` | First verdict returned; no extra attempt | Pass | Pass | T: `functions/gradeAnswer.test.js` | – |
| TC-INT-01 | Integrity | The app cannot write `attempts` (the model's feature source) | Denied | Pass | Pass | T: `tests/rules/firestore.test.js` | – |
| TC-INT-02 | Integrity | Two tutor questions answered at the same time | Both saved | Pass | Pass | T: `functions/askTutor.test.js` | – |
| TC-INT-03 | Integrity | 4 concurrent `gradeAnswer` calls with the same `attemptId` and choices 0 to 3 | One attempt stored; all replies agree | One attempt stored; all four replies identical. The race seen in the code was **not reproduced**: the per-user allowance transaction appears to serialize same-user calls | Pass | T: `evidence/functions.probe.js` | F-08 (theoretical) |

**Performance, compatibility and portability**

| Test ID | ISO characteristic | Scenario | Expected result | Actual result | Status | Evidence | Recommendation |
|---|---|---|---|---|---|---|---|
| TC-PERF-01 | Resource utilization | JS bundle size | Reasonable for an Expo app | 6.2 MB Hermes bytecode; the export folder (with assets) is 11 MB | Pass (informational) | M: `expo-export.txt` | – |
| TC-PERF-02 | Resource utilization / Capacity | `getWeakTopics` reads are bounded | Bounded | `limit(500)` plus a composite index; 6 calls a minute | Pass | S: `functions/index.js:216,241`; T: `getWeakTopics.test.js` | – |
| TC-PERF-03 | Time behaviour | Screen load and answer-check latency on a device | Measured against a target | No target defined; no device available | Not Tested | – | Define targets; measure on a mid-range Android phone |
| TC-COMP-01 | Interoperability | Expo dependency compatibility | Healthy | 18 / 18 | Pass | T: `expo-doctor.txt` | – |
| TC-COMP-02 | Co-existence / Compatibility | App on several Android versions and screen sizes | Works | `docs/screen-size-audit.md` device checklist is blank | Not Tested | S: `docs/screen-size-audit.md:78-129` | Run the existing checklist |
| TC-PORT-01 | Installability | Production build installs and runs | Installs | `expo export` succeeds; an EAS build was not run (no credentials here) | Partial | T: `expo-export.txt` | Install a preview APK on a clean device |

**Usability**

| Test ID | ISO characteristic | Scenario | Expected result | Actual result | Status | Evidence | Recommendation |
|---|---|---|---|---|---|---|---|
| TC-USA-01 | Accessibility | WCAG 2.x text contrast of theme pairs used for text | ≥ 4.5:1 for normal text | Fail: muted `#A1A4B2` on bg **2.28:1** (28 text styles plus placeholders); success `#5EB78D` on white **2.43:1** ("Correct"); accent on bg **2.59:1** (header tint); white on `#C88B7A` **2.83:1** (quiz hero, 10 px at 82% opacity). Pass: ink2 4.63, button 5.16, error 5.33, ink 11.81 | Fail | M: `evidence/contrast.js`; S: `src/theme/authTheme.js:18-49`, `src/components/auth/AuthTextField.js:43`, `src/screens/QuizScreen.js:728-742` | F-06 |
| TC-USA-02 | Accessibility | Screen-reader semantics | Roles, labels and states present | 80 roles, 47 labels; `Button`/`AuthButton` never report `disabled`; Settings toggle has no `switch` role; auth inputs rely on placeholders | Partial | S: `src/components/Button.js:48`, `src/screens/SettingsScreen.js:22-55`, `src/components/auth/AuthTextField.js:41-48` | F-10 |
| TC-USA-03 | Operability | Typing a tutor question when the connection returns | Text and reply kept | `TutorScreen` swaps `TutorChat` for a skeleton while `loading`, and `refresh()` sets `loading` on reconnect | Fail | S: `src/screens/TutorScreen.js:84`, `src/context/ProgressContext.js:64,121` | F-04 |
| TC-USA-04 | Operability / Learnability / Aesthetics | Task completion, comprehension and satisfaction with real learners | – | Needs participants and a device | Not Tested | – | Short moderated test with 5 learners (SUS or task success) |

## 4. ISO/IEC 25010:2011 evaluation

**Ratings:**
- **Satisfied:** evidence shows the sub-characteristic is met for this app's stated requirements.
- **Partially satisfied:** met with documented gaps.
- **Not satisfied:** a defect or missing implementation materially affects it.
- **Not evaluated:** no adequate evidence could be collected here.

The evidence codes T, S and M are defined in section 2.

### 4.1 Functional suitability
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Functional completeness | Satisfied | All core deliverables in `CLAUDE.md` exist and are exercised by tests: lessons, quizzes, challenges and Playground, scoped tutor, trained model, progress and streaks, reminders, offline downloads, account deletion (TC-FUN-01 to 07). Twenty-six unbuilt design frames (`docs/design-progress.md`) are outside the stated requirements. Two routes are registered but unreachable: `EditProfile` and `Progress` (`src/navigation/RootNavigator.js:167,172`). |
| Functional correctness | **Partially satisfied** | Server logic is correct under test (TC-FUN-02 to 06). A reconnect during a quiz corrupts the session (TC-FUN-08, **F-01 High**). Input bounds are missing for `choice` and `timeTakenMs` (TC-FUN-09/10). |
| Functional appropriateness | Satisfied | Grading, answer keys and hidden tests sit on the server. The tutor is restricted to the module. Offline downloads cover the reading use case (S: `functions/index.js`, `src/services/offline.js`). |

### 4.2 Performance efficiency
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Time behaviour | Not evaluated | No targets and no device measurement (TC-PERF-03). Static indicators are positive: one `meta/lessonIndex` read on launch, an instance cache for tutor lessons, functions in `asia-southeast1`, a 15 s Gemini timeout with model fallback. |
| Resource utilization | Satisfied (S, M) | 6.2 MB bundle (TC-PERF-01). Bounded reads (TC-PERF-02). Minor: code drafts are written to AsyncStorage on every keystroke (`src/screens/ChallengeScreen.js:136-140`). |
| Capacity | Partially satisfied | `maxInstances: 5` (`functions/index.js:17`). Judge0 has an app-wide cap of 300 calls a day that 6 accounts can use up (TC-REL-02, F-03). The Gemini free tier is shared by everyone. |

### 4.3 Compatibility
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Co-existence | Satisfied (S only) | Storage and overlay permissions are blocked (`app.json:20-24`); `allowBackup: false`; only local notifications. Not checked on a device. |
| Interoperability | Satisfied | Firebase, Gemini (with ordered fallback models) and Judge0 behind one adapter (`functions/codeRunner.js`). Expo dependency check passes (TC-COMP-01). Integration tests use stubs. |

### 4.4 Usability
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Appropriateness recognizability | Not evaluated | Needs participants. Static indicators: first-run tour, Help screen with FAQ. |
| Learnability | Not evaluated | Needs participants. Static indicators: tiered courses, "Continue" card, scoped tutor. |
| Operability | Partially satisfied | A reconnect discards tutor input (TC-USA-03, F-04). Several writes never finish offline (F-07). Error states on header-less screens have no back button (`src/components/ScreenState.js:15-30` used in `src/screens/ProfileDetailsScreen.js:162` and others). |
| User error protection | Partially satisfied | Good: confirmations before leaving a quiz or deleting an account (typed `DELETE` plus reauthentication), password rules, a reset-email cooldown. Gaps: names have no client maximum length (rules cap them at 100), and raw `err.message` is shown to users (`src/context/ProgressContext.js:97`, `src/screens/ChangePasswordScreen.js:71`). |
| User interface aesthetics | Not evaluated | Subjective; needs participants. A consistent theme and design system exist (`src/theme/`). |
| Accessibility | **Not satisfied** | Contrast failures measured at 2.28 to 2.83:1 on text in common use (TC-USA-01, F-06). Missing semantics (TC-USA-02, F-10). Good: font scaling up to 1.5× app-wide (`src/components/AppText.js:5`), reduced-motion support in 10 places. |

### 4.5 Reliability
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Maturity | Partially satisfied | 147 / 147 automated runs pass. No crash reporting (the `ErrorBoundary` only logs to the console, `src/components/ErrorBoundary.js:19`). No recorded device pass. |
| Availability | Partially satisfied | Per-user limits work (TC-REL-01). The shared budgets can be used up (F-03). Single Firebase project for development and production (prior audit L-06, still open: `.firebaserc:3`). |
| Fault tolerance | Partially satisfied | Offline snapshot, NetInfo detection, save timeouts, a retry-safe `attemptId`, model fallback, and an error boundary are in place. The quiz breaks on reconnect (F-01). Some writes have no timeout, and the auth listener has awaits with no catch (F-07). |
| Recoverability | Partially satisfied | "Score not saved" retry, account-restore window, and refunded allowance when a call fails. Recovery is impossible in the F-01 repeat case: the retry is refused every time. |

### 4.6 Security
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Confidentiality | Satisfied | Keys are server-only (TC-SEC-03). Answer keys and hidden tests are unreadable (TC-SEC-01). Hidden-test output is never returned (`runChallenge.test.js`). Note: trace drills' `output` (their answer) is readable by design, and unverified accounts can read content. |
| Integrity | **Partially satisfied** | Server-side grading, scoring and challenge completion; the app cannot write attempts or scores (TC-SEC-01/09, TC-INT-01). Streak, completed lessons, `email` and `goals` accept forged or oversized values (TC-SEC-05 to 08, F-05). |
| Non-repudiation | Satisfied | Terms acceptance is stamped with the server clock and a version (`firestore.rules:98-101`). Attempts are written only by the server with `serverTimestamp()`. |
| Accountability | Satisfied | Every callable is tied to a verified uid; usage is kept per uid (`quizUsage`, `tutorUsage`, `runUsage`). |
| Authenticity | Partially satisfied | Firebase Auth, email verification checked on the server (TC-SEC-04), reauthentication before deletion. No App Check, so a request need not come from the genuine app (TC-SEC-10, **F-02 High**). |

### 4.7 Maintainability
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Modularity | Satisfied | The runner provider is isolated in `functions/codeRunner.js`; services and contexts are separated from screens. Three screens are large (QuizScreen 891, ProfileScreen 960, ModulesScreen 708 lines). |
| Reusability | Satisfied | Shared `ScreenState`, `AppText`, `Button`, `BottomSheet`, `LessonBlocks`; pure helpers in `src/services/`. |
| Analysability | Partially satisfied | Code is thoroughly commented. There is no linter or type checking. Some documentation is out of date (F-12). |
| Modifiability | Partially satisfied | Limits are duplicated between client and server and kept in step by comments: `QUIZ_LENGTH` (`functions/index.js:140-141`), tutor limits (`src/components/TutorChat.js:13-14`). |
| Testability | Partially satisfied | A strong emulator harness (handlers called directly, external APIs stubbed). No component, navigation or end-to-end tests. `npm test` lists files by hand, so a new test file is skipped silently (F-11). |

### 4.8 Portability
| Sub-characteristic | Rating | Evidence |
|---|---|---|
| Adaptability | Partially satisfied | Portrait lock, text scaling, centred columns on wide screens. Known tablet and large-font layout issues (`docs/screen-size-audit.md:53-63`); device checklist not run. |
| Installability | Partially satisfied | Bundle exports; three EAS profiles. No documented minimum Android version. The README says the app runs in Expo Go, but native Google Sign-In needs a development build (F-12). |
| Replaceability | Satisfied | The code runner was replaced twice (JDoodle → Piston → Judge0) behind one module; Gemini models are swappable through an ordered list. |

### 4.9 Summary by characteristic
| Characteristic | Satisfied | Partially | Not satisfied | Not evaluated |
|---|---|---|---|---|
| Functional suitability (3) | 2 | 1 | 0 | 0 |
| Performance efficiency (3) | 1 | 1 | 0 | 1 |
| Compatibility (2) | 2 | 0 | 0 | 0 |
| Usability (6) | 0 | 2 | 1 | 3 |
| Reliability (4) | 0 | 4 | 0 | 0 |
| Security (5) | 3 | 2 | 0 | 0 |
| Maintainability (5) | 2 | 3 | 0 | 0 |
| Portability (3) | 1 | 2 | 0 | 0 |
| **Total (31)** | **11** | **15** | **1** | **4** |

## 5. Identified software defects and risks

Each finding has a kind:
- **Defect:** confirmed incorrect behaviour.
- **Risk:** a weakness that could be exploited or could fail, not observed failing.
- **Recommendation:** an improvement, not a defect.

| ID | Severity | Kind | ISO sub-characteristic(s) | Finding | Evidence |
|---|---|---|---|---|---|
| **F-01** | **High** | Defect | Functional correctness; Fault tolerance; Recoverability | A reconnect mid-quiz redraws the question set while progress is kept. The review shows wrong answers, and about half the time the score can never be saved. | TC-FUN-08, TC-FUN-12 |
| **F-02** | **High** | Risk | Authenticity; Integrity | No App Check on any callable. The budget only sends alerts (prior audit H-01, still open). Anyone with a verified account token can script calls. | TC-SEC-10 |
| F-03 | Medium | Risk | Availability; Capacity | 6 verified accounts can use up the app-wide Judge0 budget for a day. The Gemini free tier is shared in the same way. | TC-REL-02 |
| F-04 | Medium | Defect | Operability | Same root cause as F-01. A reconnect or offline-banner retry unmounts the tutor chat (losing typed text and any in-flight reply) and flashes skeletons on tab screens. | TC-USA-03 |
| F-05 | Medium | Defect | Integrity | The rules accept a forged streak, arbitrary completed lessons, an oversized `email` that doesn't match the token, and object-valued `goals`. Streak and lesson badges can be faked (prior audit M-03, partly fixed). | TC-SEC-05 to 08 |
| F-06 | Medium | Defect | Accessibility | Text contrast is 2.28 to 2.83:1 for muted labels and placeholders, "Correct", the header tint and the quiz hero (prior audit M-05, partly fixed). | TC-USA-01 |
| F-07 | Medium | Defect | Fault tolerance; Operability | Offline, `setDoc`/`updateDoc` with no timeout spins forever in Setup, ReminderSheet, AvatarSheet, ProfileDetails, terms acceptance and restore. Awaits with no catch in the auth listener can leave the splash stuck if AsyncStorage throws. | S: `src/context/AuthContext.js:91-102`, `src/screens/SetupScreen.js:63-71`, `src/screens/ReminderSheetScreen.js:31` |
| F-08 | Low | Risk | Integrity | `gradeAnswer` reads then writes the attempt outside a transaction. A concurrent double-submit was not reproduced (TC-INT-03), so the risk is theoretical. | S: `functions/index.js:106-124` |
| F-09 | Low | Defect | Functional correctness | `choice` and `timeTakenMs` have no upper bound. Out-of-range values are stored in `attempts`, the model's feature source. | TC-FUN-09, TC-FUN-10 |
| F-10 | Low | Defect | Accessibility | Buttons never report `disabled`, the toggle has no `switch` role, auth inputs are labelled only by placeholder, and some hit targets are under 44 dp (tutor chips about 36). | TC-USA-02 |
| F-11 | Low | Recommendation | Testability; Analysability | No linter, type checking or CI. Client screens and contexts are untested. `npm test` file list is maintained by hand. | §3.1, `package.json` |
| F-12 | Info | Recommendation | Analysability; Installability | Out-of-date documentation: README and CLAUDE.md say the app "stays in Expo Go", but `expo-dev-client` and native Google Sign-In are dependencies. The README status list understates what is built. `docs/model.md:109-110` predates the 500-read cap. No minimum Android version is documented. | S: `README.md:19,151-156`, `package.json` |
| F-13 | Low | Risk | Confidentiality; Integrity | `npm audit` flags 7 high advisories in the root runtime tree. They are mostly build-time Expo CLI and Metro packages, plus `firebase` through the Node-only gRPC transport. No direct exploit path in the shipped app was found. | TC-SEC-11 |

## 6. ISO questionnaire inconsistencies

**N/A.** No evaluation questionnaire exists for this project (confirmed with the developer). This evaluation uses the ISO/IEC 25010:2011 model directly, with all 8 characteristics and 31 sub-characteristics, and no terms from the 2023 edition. If a questionnaire is written later, check that it:
- names ISO/IEC 25010:2011 explicitly;
- uses "Usability" and "Portability", not the 2023 names "Interaction Capability" and "Flexibility";
- does not include "Safety", which only exists in the 2023 edition;
- covers every sub-characteristic it scores.

## 7. Security and performance concerns

**Security (in priority order)**
1. **F-02, App Check.** This is the main remaining control against scripted abuse.
   - The callables already require a verified email and have per-user limits, but anyone can create accounts.
   - Enabling it needs the Firebase console (Play Integrity, registering the app's SHA-256), a native App Check provider in the client, and `enforceAppCheck: true` per function. Monitor first, then enforce.
   - The app already ships native modules (`expo-dev-client`, native Google Sign-In), so the "stay in Expo Go" reason for skipping it no longer applies.
2. **F-05, client-written progress fields.** Bound the values in the rules: `longest` no greater than the days since the account was created, `lastActiveDate` matching a date pattern, list items being strings that match `CONTENT_ID`, `email == request.auth.token.email`. Alternatively, move the streak to a function.
3. **F-03, shared budgets.** Lower the per-account daily Judge0 ceiling, or reserve part of the global budget per account. This is a cost decision, and the numbers live in `functions/index.js:533-545`.
4. **F-13, dependencies.** Apply the non-breaking `npm audit fix` in `functions/`. Track the Firebase JS SDK release that clears the grpc-js advisory.
5. **Tutor hardening (informational):** no `safetySettings`, and `finishReason` is not checked, so truncated replies are returned silently (`functions/index.js:360-376`).

**Performance**
- No performance targets are defined. Set at least: cold start to the Home screen, answer-check round trip, tutor reply time. Then measure them on a mid-range device.
- The capacity ceiling is deliberate (`maxInstances: 5`, Judge0 cap). It is adequate for the stated 500 to 1,000 users only if F-03 is addressed.

## 8. Recommended improvements

**Fix now (Critical/High, in this remediation)**
- **F-01:** draw a quiz's questions once per visit to the screen, so a context refresh cannot change them.

**Needs infrastructure access or a decision (documented, not changed here)**
- **F-02:** App Check (console plus native provider).
- **F-03:** budget allocation numbers.
- **L-06 (prior audit):** a separate development Firebase project.

**Next (Medium)**
- **F-04:** make `ProgressContext.refresh()` a background refresh when data is already shown, and give the offline banner its own "retrying" state.
- **F-05:** tighten the progress and user rules, with a rules test for each.
- **F-06:** use `ink2`/`accentDeep` for text instead of `muted`/`accent`; use a darker success shade for the "Correct" text; use `primaryDark` behind the quiz hero.
- **F-07:** reuse `saveProgress`'s timeout pattern (`src/services/progress.js:21-38`) for the other writes; wrap the auth-listener awaits in try/catch.

**Later (Low / Info)**
- **F-08:** use `create()` or a transaction for the attempt write.
- **F-09:** bound `choice` and clamp `timeTakenMs`.
- **F-10:** add accessibility roles and states.
- **F-11:** add ESLint (`eslint-config-expo`) and a CI job that runs both test scripts; use a glob for `npm test`.
- **F-12:** refresh README, CLAUDE.md and `docs/model.md`.
- **F-13:** update dependencies.

## 9. Severity classification

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | – |
| High | 2 | F-01 (defect), F-02 (risk) |
| Medium | 5 | F-03 (risk), F-04, F-05, F-06, F-07 (defects) |
| Low | 5 | F-08 (risk), F-09, F-10 (defects), F-11 (recommendation), F-13 (risk) |
| Informational | 1 | F-12 |

**Severity scale:**
- **Critical:** data loss, a security breach, or a core feature unusable for all users.
- **High:** a core feature gives wrong results under realistic conditions, or a missing primary security control.
- **Medium:** a degraded experience or an exploitable weakness with limited impact.
- **Low:** minor, unlikely or cosmetic.
- **Informational:** no direct impact.

## 10. Overall assessment

Javi's backend is well designed:
- secrets never reach the client;
- grading, scoring and challenge completion run on the server;
- hidden material is unreadable;
- spending is capped;
- all 147 automated test runs pass.

Functional suitability, confidentiality, interoperability and replaceability are strong.

The weakest areas are:
- **Accessibility**, rated not satisfied: measured contrast failures on text in common use.
- **Reliability under flaky connections**: one High defect in the quiz flow, plus offline writes that never finish.
- **Authenticity and integrity**: no App Check; client-written progress fields.

Four usability and performance sub-characteristics could not be evaluated without devices and participants. This is a gap in the evidence, not a pass.

Of 31 sub-characteristics: **11 satisfied, 15 partially satisfied, 1 not satisfied, 4 not evaluated**. There are no Critical findings and two High (one fixable defect, one infrastructure risk). The app is suitable for its capstone purpose once F-01 is fixed. F-02 and the Medium items should be addressed before a public release to the stated 500 to 1,000 users.

### Manual verification checklist (what this evaluation could not run)
1. **F-01 on a device:** start a quiz, answer 5 questions, turn airplane mode on and then off, and finish the quiz. Expect the same questions, a matching review and a saved score.
2. **TalkBack:** go through sign-up, a lesson, a quiz and the tutor, and check that every control is announced with its role and state.
3. **The `docs/screen-size-audit.md` checklist:** a 360 dp phone, a Pixel Tablet, the largest font and display size.
4. **Console:** App Check status, budget alerts and their recipients, Auth email templates, and that the old JDoodle secret is destroyed.
5. **Performance:** cold start and answer-check time on a mid-range Android phone over 4G.

---

*Raw outputs were kept in the evaluator's local session. The probe and measurement scripts are in `docs/qa/evidence/`. To re-run the probes:*

```sh
REPO="$PWD" npx firebase emulators:exec --project demo-qa-probe --only firestore \
  "node --test docs/qa/evidence/rules.probe.js docs/qa/evidence/functions.probe.js"
node docs/qa/evidence/reshuffle.sim.js "$PWD"
node docs/qa/evidence/contrast.js
```

---

## Post-remediation results (appended after the fix; sections 1 to 10 above are unchanged)

**Branch:** `qa/iso-25010-remediation`, from `origin/main` at `70a98f0`.

**Scope:** confirmed Critical and High findings that can be fixed in code. There were no Critical findings, so the only change is F-01. F-02 (App Check) needs Firebase console access and a native provider, so it is documented, not changed.

### Fix

| Finding | Change | Files |
|---|---|---|
| F-01 (High) | The quiz's question set is drawn once per visit to the screen. `load` now depends only on `moduleId` and reads the lessons through a ref, so a ProgressContext refresh (on reconnect or an offline-banner tap) no longer redraws it mid-quiz. "Try again" after a failed load, and Retake, still draw a fresh set. The shuffle and order logic moved unchanged into a pure helper with unit tests. | `src/screens/QuizScreen.js`, `src/services/quizOrder.js` (new), `tests/quizOrder.test.js` (new), `package.json` (test list) |

### Test results after the fix

| Command | Before | After |
|---|---|---|
| `npm test` | 54 / 54 pass | **59 / 59 pass** (5 new `quizOrder` tests) |
| `npm run test:rules` (emulator) | 93 / 93 pass | **93 / 93 pass** |
| `npm run content:verify` | OK | **OK** |
| `npx expo export --platform android` | Bundles, 6.2 MB | **Bundles, 6.21 MB** |
| Lint / type check | Not available | Not available (none added; no new dependencies) |

### Re-test of the affected cases

| Test ID | Before | After | How verified |
|---|---|---|---|
| TC-FUN-08 | Fail | **Pass (code trace)**, device check pending | A refresh changes `lessons`. Only the ref-update effect runs, and `load` keeps its identity (its dependencies are `[moduleId]`), so `useEffect(load, [load])` does not run again and `questions`, `index` and `marks` stay consistent. The bundle compiles. No React Native component-test library is installed, so this could not be exercised automatically. It is listed for manual verification below. |
| TC-FUN-12 | Pass | Pass | Unchanged. The server guard still refuses duplicates, which a fixed question set no longer produces. |

### Remaining issues (not changed in this branch)
- F-02 High (App Check)
- F-03 to F-07 Medium
- F-08 to F-11 and F-13 Low
- F-12 Informational

See section 8 for the recommended fixes. F-04 shares F-01's root cause and is still open: on reconnect, `ProgressContext.refresh()` still sets `loading`, which unmounts the tutor chat and flashes the tab skeletons.

### Manual verification needed
1. On an Android device: open a quiz, answer about 5 questions, turn airplane mode on, wait for the offline banner, turn it off, then finish. Expect the same questions, a review that matches the answers, and the score saved (no "Score not saved yet").
2. Check that Retake still draws a different set, and that "Try again" after a failed load still works.
