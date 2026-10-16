# Screen-size audit

Every restyled screen checked at three sizes, before night mode. The design
tracker (`docs/design-progress.md`) lists the frames; this file tracks how they
hold up on small screens, tablets and large text.

## Rules the app follows

- Text follows the phone's font size up to **1.5×** (`MAX_FONT_SCALE` in
  `src/components/AppText.js`). The tab bar stops at 1.2×. Settings' text
  size buttons do not scale, since they preview the sizes themselves.
- Every device is locked to portrait, tablets included.
- Content sits in a centred column: 720 wide for lists and lessons, 480 for
  forms, so tablets show the phone layout with room either side.

## How to check

**360dp phone (emulator).** Android Studio → Device Manager → Create device →
Phone → **Small Phone** (720×1280, xhdpi, which is 360dp wide). Start it, run
`npx expo start` and press `a` to open the app in Expo Go on it.

**Tablet (emulator).** Same, with Tablet → **Pixel Tablet** (or Medium Tablet).

**Largest font and display (your phone).** Settings → Display → Display size
and text: drag **Font size** and **Display size** to the maximum. Reload the
app. Set them back afterwards.

For each screen, look for: text cut off or overlapping, buttons or stickers
pushed off screen, rows that no longer line up, anything you cannot scroll to,
and on the tablet anything stretched or stuck to one side.

Mark each cell **✓** (fine) or **✗** with a short note in the Notes column.
Leave it blank if not checked yet. No "|" inside a cell.

## Start

| Screen | 360dp | Tablet | Largest font | Notes |
|---|---|---|---|---|
| Splash |  |  |  |  |
| Welcome |  |  |  |  |
| Sign up (and its field errors) |  |  |  |  |
| Terms popup |  |  |  |  |
| Check your email |  |  |  |  |
| Before you start (setup) |  |  |  |  |
| Log in (and its errors) |  |  |  |  |
| Forgot password |  |  |  |  |
| Welcome back · Restore |  |  |  |  |

## Tabs

| Screen | 360dp | Tablet | Largest font | Notes |
|---|---|---|---|---|
| Tab bar (all five tabs, swipe between them) |  |  |  |  |
| Home (and loading, offline bar) |  |  |  |  |
| Courses (and loading, error) |  |  |  |  |
| Javi · module picker (and loading) |  |  |  |  |
| Javi · chat (empty, writing a reply, daily limit) |  |  |  |  |
| Practice (and loading, first-time card) |  |  |  |  |
| Settings (and loading) |  |  |  |  |

## Learn and practise

| Screen | 360dp | Tablet | Largest font | Notes |
|---|---|---|---|---|
| Module (and loading, downloading, offline) |  |  |  |  |
| Lesson (and loading, offline, server error) |  |  |  |  |
| Ask Javi sheet (from a lesson) |  |  |  |  |
| Quizzes (and loading) |  |  |  |  |
| Quiz (question, correct, not quite, quit sheet) |  |  |  |  |
| Quiz result (passed, below 75%, not synced) |  |  |  |  |
| Code Tracer list (and loading) |  |  |  |  |
| Trace and trace result |  |  |  |  |
| My Progress (and loading) |  |  |  |  |
| Weak lessons |  |  |  |  |

## Profile and account

| Screen | 360dp | Tablet | Largest font | Notes |
|---|---|---|---|---|
| Profile (and loading) |  |  |  |  |
| Choose avatar sheet |  |  |  |  |
| Profile details (and loading, unsaved changes sheet) |  |  |  |  |
| Change password |  |  |  |  |
| Delete account |  |  |  |  |
| Log out sheet |  |  |  |  |
| Reminder time sheet |  |  |  |  |
| Download sheet |  |  |  |  |
| Edit name |  |  |  |  |
