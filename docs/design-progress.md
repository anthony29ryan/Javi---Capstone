# Design progress

Tracks the Claude Design file `Java Learning App Flow.dc.html` (project
f39ab299-97d0-4af2-9557-893e69db1e59) against the app, frame by frame, in the
canvas's own order and numbering. Update a row in the same commit that changes
its screen.

- **done**: the app matches the frame.
- **partly**: some of the frame is applied; the Commit column says what.
- **to do**: the app has this screen or state; it has not been restyled yet.
- **not built**: the app has no such feature. Skipped; each is its own decision.
- **last**: night mode, built after every light screen is done.

How we work through it: the next `to do` frame in order, one screen per
commit, checked in Expo Go before moving on. A screen's state frames (the
`with …` rows) are done together with that screen. After the last light frame
and before night mode comes a screen-size audit: every restyled screen at
360dp width, on tablets, and at the largest font and display size, checked in
Expo Go with Android's Display size and Font size settings.

Deliberate differences from the design: code is set in JetBrains Mono, not
Outfit; the Code Tracer list filters by level, not topic; the trace result has
no variable-value chips.

Totals: 71 done · 0 to do · 43 not built · 1 partly · 9 last

## A · Onboarding and sign-in

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 01 | Splash | SplashView | done | b2c2de5 |
| 02 | Welcome | WelcomeScreen | done | 316b4cc |
| 03 | Sign up | SignupScreen | done | 92c72ee |
| 04 | Sign up · Terms popup | TermsSheet | done | 92c72ee |
| 05 | Check your email | VerifyEmailScreen | done | 2d8ffad |
| 06 | Link expired | — | not built |  |
| 07 | Before you start | SetupScreen | done | 289e43f |
| 08 | Notification permission | Android's own dialog | done | 289e43f |
| 09 | Log in | LoginScreen | done | 00c4d64 |
| 10 | Continue with Google | — | not built |  |
| 11 | Forgot password | ForgotPasswordScreen | done | 388a1d4 |
| 12 | Set a new password | — | not built |  |

## A2 · First-time tour

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 13 | Tour · Welcome | — | not built |  |
| 14 | Tour · Home | — | not built |  |
| 15 | Tour · Courses | — | not built |  |
| 16 | Tour · Javi | — | not built |  |
| 17 | Tour · Practice | — | not built |  |
| 18 | Tour · Settings | — | not built |  |

## B · Main tabs

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 19 | Home | HomeScreen | done | 2894257 |
| 20 | Courses | CoursesScreen | done | 4e9c640 |
| 21 | Tutor | TutorScreen | done | a01ce13 (module picker first (accordion)) |
| 22 | Practice | PracticeScreen | done | 1083617, 5c6116d |
| 23 | Settings (tab) | SettingsScreen | done | b33a2bb (code-glyph stickers in terracotta, centre label Javi; the part of the Javi button above the bar may not take taps on Android) |
| 24 | Profile · from Home | ProfileScreen | done | 4ad2ad9, b33a2bb (opens from Home's avatar, with a back button; Quizzes / Tracer panel; 2 badges locked until the code runner) |
| 25 | Profile · Choose avatar | ProfileScreen sheet | done | 4ad2ad9 |

## C · Learning and quizzes

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 26 | Module | ModulesScreen | done | 0a1bd8d |
| 27 | Lesson | LessonDetailScreen | done | 3c5b564 (pinned Javi + complete bar, read-to-the-end gate, Ask Javi sheet links to the Javi tab; slide card and step-through demo skipped, no such data; 28 still not built) |
| 28 | Lesson complete | — | not built |  |
| 29 | Module complete | — | not built |  |
| 30 | Quizzes | QuizzesScreen | done | 5c6116d (last score, not best) |
| 31 | Code Challenges | — | not built |  |
| 32 | Challenge | — | not built |  |
| 33 | Full editor · Output open | — | not built |  |
| 34 | Challenge solved | — | not built |  |
| 35 | Code Tracer | TracerListScreen | done | 1083617 |
| 36 | Trace | TracerScreen | done | 1083617, d62ff49 |
| 37 | Trace result | TracerScreen | done | 0a61859 |
| 38 | Quiz | QuizScreen | done | 3f4c279 (pick then submit; no question explanations, so feedback names the right answer) |
| 39 | Quit quiz · bottom sheet | with Quiz | done | 3f4c279 (honest copy: last score not best, checked answers still recorded) |
| 40 | Quiz result | QuizScreen | done | 3f4c279 (What next card instead of Adaptive, which the app does not do; review missed first) |

## D · Progress and coming later

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 41 | Streak | — | not built |  |
| 42 | Playground | — | not built |  |
| 43 | Mini-projects | — | not built |  |

## E · Settings

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 44 | Settings | SettingsScreen | done | ebfb3e6 (text size scales lessons and quizzes only, kept on the phone; read-only Terms row; Notifications, Help and About not built) |
| 45 | Log out · bottom sheet | with Settings | done | ebfb3e6 (honest copy: downloads and the reminder leave the phone) |
| 46 | Notifications | — | not built |  |
| 47 | Profile details | ProfileDetailsScreen | done | 3e5eb9c (first and last name plus nickname instead of one display name; goal chips removed; no Change email, 48 not built) |
| 48 | Change email | — | not built |  |
| 49 | Change password | ChangePasswordScreen | done | 17911ea (current-password check as OWASP ASVS / NIST ask; Firebase signs other devices out; known gap: no email alert after a change, needs an email service) |
| 50 | Delete account | DeleteAccountScreen | done | da06720 (honest 30-day card instead of cannot be undone; no extra confirm popup; 51 not built) |
| 51 | Account deleted | — | not built |  |
| 52 | Welcome back · Restore | RestoreAccountScreen | done | 54e8792 (two choices, Restore or Keep it deleted; Start fresh left out, it needs a Cloud Function) |
| 53 | Help & feedback | — | not built |  |
| 54 | About | — | not built |  |
| 55 | Terms & privacy | — | not built |  |

## K · Offline downloads

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 56 | Module · Download sheet | DownloadSheetScreen | done | 0a1bd8d (lesson counts, no sizes) |
| 57 | Module · Downloading | with Module | done | 0a1bd8d (% by finished modules) |
| 58 | Toast · Modules saved | with Module | done | 0a1bd8d |
| 59 | Download · Not enough space | — | not built |  |
| 60 | Module · Offline, saved modules | with Module | done | 0a1bd8d |
| 61 | Offline lessons | — | not built |  |
| 62 | Toast · Module removed | — | not built |  |
| 63 | Remove all downloads | — | not built |  |
| 64 | Offline lessons · Empty | — | not built |  |

## F · Loading, empty and offline

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 65 | Home · Loading | with Home | done | 2894257 |
| 66 | Lesson · Loading | with Lesson | done | 3c5b564 |
| 67 | Courses · Loading | with Courses | done | 4e9c640 |
| 68 | Module · Loading | with Module | done | 0a1bd8d |
| 69 | Practice · Loading | with Practice | done | 5c6116d |
| 70 | Profile · Loading | with Profile | done | 4ad2ad9 |
| 71 | Home · Offline, saved content | with Home | done | 2894257 (inline bar, not edge to edge) |
| 72 | Courses · Error | with Courses | done | 4e9c640 (no saved-modules list; offline not claimed) |
| 73 | Lesson · Offline | with Lesson | done | 3c5b564 (honest copy: only downloaded modules read offline) |
| 74 | Quiz · Offline | with Quiz | done | 3f4c279 (server grades every answer, so offline shows a needs-internet page; questions read from the server) |
| 75 | Tutor · Error | with Tutor | done | a01ce13 |
| 76 | Practice · Empty | with Practice | done | 5c6116d (card inside the page; Code Tracer stays visible) |
| 77 | Tutor · Empty | with Tutor | done | a01ce13 |
| 78 | Toast · Email verified | — | not built |  |
| 79 | Toast · Link sent again | with Check your email | done | 2d8ffad |
| 80 | Toast · Profile updated | with Settings | done | ebfb3e6 |

## G · Form validation and sign-in errors

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 81 | Log in · Empty fields | with Log in | done | 00c4d64 |
| 82 | Log in · Wrong password | with Log in | done | 00c4d64 (generic message; no tries-left count (Firebase decides)) |
| 83 | Log in · Too many attempts | with Log in | done | 00c4d64 (no 5-minute claim (Firebase decides)) |
| 84 | Log in · Email not verified | with Log in | done | 00c4d64 (handled by Check your email) |
| 85 | Log in · Google sign-in failed | — | not built |  |
| 86 | Log in · No connection | with Log in | done | 00c4d64 |
| 87 | Log in · Signing in | with Log in | done | 00c4d64 |
| 88 | Sign up · Field errors | with Sign up | partly | 92c72ee (one error at a time; the design shows all at once) |
| 89 | Sign up · Email already used | with Sign up | done | 92c72ee |
| 90 | Forgot password · Rate limited | with Forgot password | done | 388a1d4 (shown when Firebase refuses; no 3-in-10-minutes claim) |
| 91 | New password · Mismatch | — | not built |  |
| 92 | Set up · Name missing | with Before you start | done | 289e43f (asks for a nickname) |
| 93 | Profile details · Unsaved changes | with Profile details | done | 3e5eb9c |
| 94 | Change password · Wrong current | with Change password | done | 17911ea |
| 95 | Change email · Already in use | — | not built |  |
| 96 | Delete account · Wrong password | with Delete account | done | da06720 |
| 97 | Feedback · Not sent | — | not built |  |

## H · Runtime errors and warnings

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 98 | Session expired | — | not built |  |
| 99 | Lesson · Server error | with Lesson | done | 3c5b564 (real Firebase error code, not a made-up ref; Back to module instead of Report) |
| 100 | Quiz result · Not synced | with Quiz result | done | 3f4c279 (banner with Try saving again) |
| 101 | Challenge · Compile error | — | not built |  |
| 102 | Challenge · Test failing | — | not built |  |
| 103 | Challenge · Time limit | — | not built |  |
| 104 | Challenge · Runner offline | — | not built |  |
| 105 | Playground · Compile error | — | not built |  |
| 106 | Tutor · Writing a reply | with Tutor | done | a01ce13 |
| 107 | Tutor · Daily limit | with Tutor | done | a01ce13 (rolling 24 h, shown after a refusal) |
| 108 | Notifications · Blocked by Android | — | not built |  |

## J · Mascot moments

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 109 | Quiz result · Passed | with Quiz result | done | 3f4c279 (pass at 75% everywhere, Quizzes badge too) |
| 110 | Quiz result · Below 75% | with Quiz result | done | 3f4c279 |
| 111 | Quiz · Correct answer | with Quiz | done | 3f4c279 |
| 112 | Quiz · Not quite | with Quiz | done | 3f4c279 |
| 113 | Lesson complete | — | not built |  |
| 114 | Module complete | — | not built |  |
| 115 | Tutor · Empty | with Tutor | done | a01ce13 |

## I · Night study mode

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 116 | Welcome · Dark | needs a theme switch | last |  |
| 117 | Home · Dark | needs a theme switch | last |  |
| 118 | Lesson · Dark | needs a theme switch | last |  |
| 119 | Practice · Dark | needs a theme switch | last |  |
| 120 | Quiz · Dark | needs a theme switch | last |  |
| 121 | Settings · Dark | needs a theme switch | last |  |
| 122 | Download sheet · Dark | needs a theme switch | last |  |
| 123 | Module · Downloading · Dark | needs a theme switch | last |  |
| 124 | Offline lessons · Dark | needs a theme switch | last |  |
