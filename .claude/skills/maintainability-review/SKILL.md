---
name: maintainability-review
description: Strict maintainability review of the current branch's diff for this project. Use when asked for a maintainability review, code quality audit, or "is this getting messy". Reviews only; does not refactor unless asked.
disable-model-invocation: true
---

# Maintainability review

Review the current branch's diff (`git diff main...HEAD`) for structure and readability problems. This is a review, not a refactor: report findings and let the developer decide. Respect CLAUDE.md. The project favors the simplest thing that works, one focused change at a time, and clarity over cleverness, so do not propose sweeping restructures or new abstractions "for the future".

## What to check

1. **File size.** Flag any file the diff pushes past ~500 lines (screens and components) or ~1000 lines (anything else). Suggest what to extract.
2. **Scattered special cases.** Flag new `if` branches, boolean flags, or nullable modes added to unrelated flows. Ask whether the logic belongs in its own component, hook, or function.
3. **Duplication.** Flag copy-pasted JSX, styles, or logic that should be a shared component or hook (CLAUDE.md: extract shared UI rather than duplicating).
4. **Wrong layer.** Flag these against the architecture rules:
   - Secrets, AI, code-execution, quiz grading, or model inference logic in the client. It belongs in a Cloud Function.
   - Business logic piled into screens instead of hooks or helpers.
   - Firestore reads or writes that security rules do not cover.
5. **Pointless indirection.** Flag wrappers or helpers with one caller that only pass through, and abstractions that do not make the code easier to read.
6. **Missing states.** Flag data-loading code with no loading, empty, or error handling.
7. **Block types.** If a new lesson block type was added, check it has a case in `src/components/LessonBlocks.js` and in the content verification.
8. **Protected shapes.** Flag changes to the `attempts` document shape. It feeds the trained model's features.
9. **Comments.** Flag non-obvious code with no comment, especially AI tutor context injection and model feature extraction.
10. **Naming.** Flag abbreviations and vague names (`data`, `temp`, `handleStuff`).

## How to report

- Lead with the 3-5 findings that matter most. Do not pad the list.
- For each: file and line, what is wrong, and the smallest change that fixes it.
- Say plainly if the diff is clean. Do not invent findings.
- Do not report bugs or style nits here. Use `/code-review` for correctness.
- Explain in plain language, since the developer is new to mobile development.
