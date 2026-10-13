---
name: publish-content
description: Publish lesson content to Firestore safely. Use when asked to publish, import, update, seed, or roll back course content, lessons, modules, or courses, or after editing anything under content/. Covers verification, the publish step, what to test in the app afterwards, and how to undo it.
---

# Publishing content

Lesson content lives in `content/` as JSON and is pushed to Firestore by a script.
The app reads it from Firestore at runtime; nothing is bundled.

```
content/courses.json     3 tiers
content/modules.json     21 modules, each with a courseId
content/lessons/*.json   one file per lesson, each with a moduleId and blocks[]
        |
        |  node scripts/publishContent.js
        v
Firestore collections: courses, modules, lessons
```

**`publishContent.js` upserts every local file and deletes any Firestore lesson
that no longer exists locally.** That prune is what keeps the two in step, and it
is also what makes a rollback work.

## Before doing anything

**1. Check for unrelated uncommitted work.**

```bash
git status --short
```

If the working tree mixes content changes with unrelated feature work, commit the
unrelated work **first**, on its own. Otherwise a content rollback (`git checkout`)
will destroy it. Ask the user which files belong to which change if it is not obvious.

**2. Work on a branch.**

```bash
git checkout -b content/<short-description>
```

## Verify before publishing

```bash
node scripts/verifyContent.js
```

This checks ids match filenames, every `moduleId` exists, lesson `order` runs
1..n per module with no gaps, tables are not ragged, no block type lacks a
renderer, and inline `**` / backtick markers are balanced.

**A non-zero exit means do not publish.** Fix the reported problems first.
Warnings are safe to publish with but worth reading.

## Publish

```bash
node --env-file=.env scripts/publishContent.js
```

Requires `GOOGLE_APPLICATION_CREDENTIALS` in `.env`, pointing at a service-account key
file kept outside the repo (see `scripts/adminApp.js` for how to get one). The script
writes with admin rights because `firestore.rules` makes content read-only for every
app user. A normal account, even the developer's, can no longer publish. Do not
loosen the rules to get around a missing key.

Expected output ends with a line like
`Done. Published 3 courses, 21 modules, 180 lessons, removed 77 stale.`

If `removed` is unexpectedly large, stop and check with the user before going further.

## Test in the app

```bash
npx expo start -c
```

Use `-c` whenever a component file changed, so Metro does not serve a stale bundle.

Check, at minimum:

- Each tier still lists its modules, and no module is empty.
- Open one module and confirm its lessons are listed in order.
- Open a lesson containing a **table** and a **note** callout and confirm both render.
- Confirm `**bold**` and `` `inline code` `` render as formatting, not as raw symbols.

Block rendering lives in `src/components/LessonBlocks.js`. If a block renders as
blank space, its `type` has no `case` there.

## Rolling back

**Before publishing** — discard local content changes:

```bash
git checkout -- content/ && git clean -fd content/
```

**After publishing** — restore the previous content from git and publish again.
The prune step removes the new documents and restores the old ones:

```bash
git checkout main -- content/ && node --env-file=.env scripts/publishContent.js
```

## Regenerating lessons from the authored source

Only needed when the **source Markdown** changed, not for a normal publish.

The Markdown lessons are authored outside this repo (default `H:/Modules Java/lessons`).
That folder is not part of the project, so request access to it before reading it.
Its own `build.js` must be run first to refresh its `dist/` output.

```bash
node scripts/importLessons.js "H:/Modules Java/lessons"
```

This **deletes and rewrites all of `content/lessons/`**. It maps the authored
lessons onto `content/modules.json` **by position**, so both must list the same
topics in the same order; the script refuses to run if the counts differ. Tier
assignments come from `modules.json` and the authored tiers are ignored.

Exercise and quiz screens are deliberately skipped — those belong in the
`questions` collection, not in lesson blocks.

Then verify and publish as above.

## Things that are expected, not bugs

- **"No quiz questions yet"** on the quiz screen. The `questions` collection is
  empty until quiz content is authored separately.
- **Progress appears reset** after lesson ids change. `progress.completedLessons`
  stores lesson ids; renamed or re-split lessons no longer match. Mention it to the
  user rather than trying to repair it silently — the right fix depends on whether
  real users exist.

## Known rough edge

`src/services/content.js` `getLessons(moduleId)` fetches the **entire** `lessons`
collection and filters client-side, so opening one module costs one read per lesson
in the whole course. `getModules` and `getAllLessonProgressRefs` do the same. A
`where('moduleId', '==', moduleId)` query fixes it. Not urgent, but it gets worse
as content grows — raise it if the user is looking at Firestore costs or load times.
