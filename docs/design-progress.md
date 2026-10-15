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

Totals: 60 done · 9 to do · 43 not built · 1 partly · 9 last

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
| 16 | Tour · Practice | — | not built |  |
| 17 | Tour · Tutor | — | not built |  |
| 18 | Tour · Profile | — | not built |  |

## B · Main tabs

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 19 | Home | HomeScreen | done | 2894257 |
| 20 | Courses | CoursesScreen | done | 4e9c640 |
| 21 | Practice | PracticeScreen | done | 1083617, 5c6116d |
| 22 | Tutor | TutorScreen | done | a01ce13 (module picker first (accordion)) |
| 23 | Profile | ProfileScreen | done | 4ad2ad9 (Quizzes / Tracer panel; 2 badges locked until the code runner) |
| 24 | Profile · Choose avatar | ProfileScreen sheet | done | 4ad2ad9 |

## C · Learning and quizzes

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 25 | Module | ModulesScreen | done | 0a1bd8d |
| 26 | Lesson | LessonDetailScreen | done | 3c5b564 (pinned Javi + complete bar, read-to-the-end gate, Ask Javi sheet links to the Javi tab; slide card and step-through demo skipped, no such data; 27 still not built) |
| 27 | Lesson complete | — | not built |  |
| 28 | Module complete | — | not built |  |
| 29 | Quizzes | QuizzesScreen | done | 5c6116d (last score, not best) |
| 30 | Code Challenges | — | not built |  |
| 31 | Challenge | — | not built |  |
| 32 | Full editor · Output open | — | not built |  |
| 33 | Challenge solved | — | not built |  |
| 34 | Code Tracer | TracerListScreen | done | 1083617 |
| 35 | Trace | TracerScreen | done | 1083617, d62ff49 |
| 36 | Trace result | TracerScreen | done | 0a61859 |
| 37 | Quiz | QuizScreen | done | 3f4c279 (pick then submit; no question explanations, so feedback names the right answer) |
| 38 | Quit quiz · bottom sheet | with Quiz | done | 3f4c279 (honest copy: last score not best, checked answers still recorded) |
| 39 | Quiz result | QuizScreen | done | 3f4c279 (What next card instead of Adaptive, which the app does not do; review missed first) |

## D · Progress and coming later

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 40 | Streak | — | not built |  |
| 41 | Playground | — | not built |  |
| 42 | Mini-projects | — | not built |  |

## E · Settings

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 43 | Settings | SettingsScreen | to do |  |
| 44 | Log out · bottom sheet | with Settings | to do |  |
| 45 | Notifications | — | not built |  |
| 46 | Profile details | ProfileDetailsScreen | to do |  |
| 47 | Change email | — | not built |  |
| 48 | Change password | ChangePasswordScreen | to do |  |
| 49 | Delete account | DeleteAccountScreen | to do |  |
| 50 | Account deleted | — | not built |  |
| 51 | Help & feedback | — | not built |  |
| 52 | About | — | not built |  |
| 53 | Terms & privacy | — | not built |  |

## K · Offline downloads

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 54 | Module · Download sheet | DownloadSheetScreen | done | 0a1bd8d (lesson counts, no sizes) |
| 55 | Module · Downloading | with Module | done | 0a1bd8d (% by finished modules) |
| 56 | Toast · Modules saved | with Module | done | 0a1bd8d |
| 57 | Download · Not enough space | — | not built |  |
| 58 | Module · Offline, saved modules | with Module | done | 0a1bd8d |
| 59 | Offline lessons | — | not built |  |
| 60 | Toast · Module removed | — | not built |  |
| 61 | Remove all downloads | — | not built |  |
| 62 | Offline lessons · Empty | — | not built |  |

## F · Loading, empty and offline

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 63 | Home · Loading | with Home | done | 2894257 |
| 64 | Lesson · Loading | with Lesson | done | 3c5b564 |
| 65 | Courses · Loading | with Courses | done | 4e9c640 |
| 66 | Module · Loading | with Module | done | 0a1bd8d |
| 67 | Practice · Loading | with Practice | done | 5c6116d |
| 68 | Profile · Loading | with Profile | done | 4ad2ad9 |
| 69 | Home · Offline, saved content | with Home | done | 2894257 (inline bar, not edge to edge) |
| 70 | Courses · Error | with Courses | done | 4e9c640 (no saved-modules list; offline not claimed) |
| 71 | Lesson · Offline | with Lesson | done | 3c5b564 (honest copy: only downloaded modules read offline) |
| 72 | Quiz · Offline | with Quiz | done | 3f4c279 (server grades every answer, so offline shows a needs-internet page; questions read from the server) |
| 73 | Tutor · Error | with Tutor | done | a01ce13 |
| 74 | Practice · Empty | with Practice | done | 5c6116d (card inside the page; Code Tracer stays visible) |
| 75 | Tutor · Empty | with Tutor | done | a01ce13 |
| 76 | Toast · Email verified | — | not built |  |
| 77 | Toast · Link sent again | with Check your email | done | 2d8ffad |
| 78 | Toast · Profile updated | with Settings | to do |  |

## G · Form validation and sign-in errors

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 79 | Log in · Empty fields | with Log in | done | 00c4d64 |
| 80 | Log in · Wrong password | with Log in | done | 00c4d64 (generic message; no tries-left count (Firebase decides)) |
| 81 | Log in · Too many attempts | with Log in | done | 00c4d64 (no 5-minute claim (Firebase decides)) |
| 82 | Log in · Email not verified | with Log in | done | 00c4d64 (handled by Check your email) |
| 83 | Log in · Google sign-in failed | — | not built |  |
| 84 | Log in · No connection | with Log in | done | 00c4d64 |
| 85 | Log in · Signing in | with Log in | done | 00c4d64 |
| 86 | Sign up · Field errors | with Sign up | partly | 92c72ee (one error at a time; the design shows all at once) |
| 87 | Sign up · Email already used | with Sign up | done | 92c72ee |
| 88 | Forgot password · Rate limited | with Forgot password | done | 388a1d4 (shown when Firebase refuses; no 3-in-10-minutes claim) |
| 89 | New password · Mismatch | — | not built |  |
| 90 | Set up · Name missing | with Before you start | done | 289e43f (asks for a nickname) |
| 91 | Profile details · Unsaved changes | with Profile details | to do |  |
| 92 | Change password · Wrong current | with Change password | to do |  |
| 93 | Change email · Already in use | — | not built |  |
| 94 | Delete account · Wrong password | with Delete account | to do |  |
| 95 | Feedback · Not sent | — | not built |  |

## H · Runtime errors and warnings

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 96 | Session expired | — | not built |  |
| 97 | Lesson · Server error | with Lesson | done | 3c5b564 (real Firebase error code, not a made-up ref; Back to module instead of Report) |
| 98 | Quiz result · Not synced | with Quiz result | done | 3f4c279 (banner with Try saving again) |
| 99 | Challenge · Compile error | — | not built |  |
| 100 | Challenge · Test failing | — | not built |  |
| 101 | Challenge · Time limit | — | not built |  |
| 102 | Challenge · Runner offline | — | not built |  |
| 103 | Playground · Compile error | — | not built |  |
| 104 | Tutor · Writing a reply | with Tutor | done | a01ce13 |
| 105 | Tutor · Daily limit | with Tutor | done | a01ce13 (rolling 24 h, shown after a refusal) |
| 106 | Notifications · Blocked by Android | — | not built |  |

## J · Mascot moments

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 107 | Quiz result · Passed | with Quiz result | done | 3f4c279 (pass at 75% everywhere, Quizzes badge too) |
| 108 | Quiz result · Below 75% | with Quiz result | done | 3f4c279 |
| 109 | Quiz · Correct answer | with Quiz | done | 3f4c279 |
| 110 | Quiz · Not quite | with Quiz | done | 3f4c279 |
| 111 | Lesson complete | — | not built |  |
| 112 | Module complete | — | not built |  |
| 113 | Tutor · Empty | with Tutor | done | a01ce13 |

## I · Night study mode

| # | Frame | App screen | Status | Commit |
|---|---|---|---|---|
| 114 | Welcome · Dark | needs a theme switch | last |  |
| 115 | Home · Dark | needs a theme switch | last |  |
| 116 | Lesson · Dark | needs a theme switch | last |  |
| 117 | Practice · Dark | needs a theme switch | last |  |
| 118 | Quiz · Dark | needs a theme switch | last |  |
| 119 | Settings · Dark | needs a theme switch | last |  |
| 120 | Download sheet · Dark | needs a theme switch | last |  |
| 121 | Module · Downloading · Dark | needs a theme switch | last |  |
| 122 | Offline lessons · Dark | needs a theme switch | last |  |
