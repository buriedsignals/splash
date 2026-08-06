---
name: twin-doctrine
description: The reference documents every twin production skill reads before writing a line of rendering code — the editorial standard, the visual system, the named anti-patterns, and a verified reference set. Never invoked alone; there is no gate, no state, no script a journalist runs directly.
---

# twin-doctrine — what every production skill knows before it draws anything

## Overview

Four prose reference documents and one small mechanical check. `editorial-standard.md` states
what a visible layer is allowed to be *for* — encode data, supply context, establish hierarchy,
support verification, direct attention — and the test that follows from it: if removing a layer
does not reduce comprehension, remove it. `visual-system.md` states what a compliant layer is
allowed to *look like* — flat field, one semantic accent, direct labels over detached legends,
furniture derived from the newsroom's own ground, contrast measured on the real background.
`anti-patterns.md` names the recurring failures of both by their usual shape, so a production
skill can recognise the mistake before it is halfway built. `reference-set.md` is the concrete
half of the standard: real, watched newsroom and explainer-video graphics, each reduced to one
transferable information-design lesson — never a styling description — so a model has a named
target instead of an abstract rule to approximate.

This skill produces no artifact of its own and closes no gate. It is read, not run — with one
exception: `scripts/check-reference-set.mjs` exports `checkReferenceSet(markdown)`, a structural
check that a reference table actually carries a link, a timecode and a lesson per row, so "the
reference set has six real entries" is a fact a test asserts rather than a fact hoped to still be
true after the next edit.

## When to use

- **Every production skill reads this doctrine before writing a line of rendering code.** Not
  once at install time — at the start of the beat brief that precedes any component, chart
  geometry, or render call. The doctrine is the frame the first sketch is drawn inside, not a
  style pass applied afterward.
- `twin-storyboard`'s reference loop (movement ④ of `references/exchange.md`) draws its named
  set from `reference-set.md` directly — when it shows a journalist "the FT treated this
  argument structure one way, the NYT another," those are rows from this file.
- **Live reference research** — going out and finding a new real treatment, with its own verified
  link and timecode — runs only when the argument structure a story needs is new to the shipped
  set. If an existing row already names the structure, use it; do not re-research what is already
  here.
- **Not** for a journalist to invoke directly. There is nothing to run against a story; it has no
  input and produces no per-story output.

## The one gotcha that will waste your day (read first)

**A reference that "looks right" and a reference that is real are not the same thing, and only
one of them belongs in this file.** A link, a timecode and a quoted moment that were guessed at —
because the described chart *probably* appears near the start, or *around* two minutes in — will
pass a casual read and still be a fabrication. Every row currently in `reference-set.md` was
verified against the actual video's own captions (fetched, not transcribed from memory) before it
shipped, and the quoted text is what is actually said at that timecode. If you add a row, verify
it the same way — pull the real transcript or captions for the specific timecode, confirm the
quote and the moment against it, and only then write the row. A reference set that cannot be
trusted is worse than an empty one, because the entire point of the reference loop is to give a
model a concrete target in place of an abstract rule — a fabricated target is worse than no target
at all.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Standard | `references/editorial-standard.md` | The five jobs a visible layer may do, the removal test, and where visual interest actually comes from |
| System | `references/visual-system.md` | The concrete rules: flat field, colour grammar, direct labels, derived furniture, contrast escalation |
| Failures | `references/anti-patterns.md` | Named recurring failures of the standard and system, one entry each, with the rule each one violates |
| Targets | `references/reference-set.md` | Verified real graphics, each with a link, a timecode, and one transferable lesson |
| Check | `scripts/check-reference-set.mjs` | `checkReferenceSet(markdown)` — the list of reasons a reference table is not usable; empty means every row is |

## How it works (the shape)

1. **A production skill's beat brief opens by reading the four reference documents** — not
   summarised, not paraphrased from memory, but read fresh each time a beat is drafted. The
   standard and the system govern what gets built; the anti-patterns name what to catch before it
   ships; the reference set supplies the concrete target for the argument structure at hand.
2. **`reference-set.md` is a markdown table**: `| Reference | Moment | Transferable lesson |`,
   one row per verified graphic. The reference cell is `Outlet/person — [Title](url)`; the moment
   is a real timecode (`m:ss`); the lesson states an information-design rule that would transfer
   to a different dataset with the same argument shape — never a colour or a font.
3. **`checkReferenceSet(markdown)`** parses the table (splitting rows on unescaped pipes, so a
   lesson that legitimately needs a literal `\|` does not get mis-split into the wrong columns)
   and returns one error string per row per failure: `"reference N: no link"` when the reference
   cell has no `[text](http...)` markdown link, `"reference N: no timecode"` when the moment cell
   has no `\d+:\d{2}` pattern, `"reference N: lesson is too thin"` when the lesson is fewer than
   five words. An empty array means every row in the table is structurally usable — it does not
   by itself assert a minimum row count; that a shipped file carries at least six is a fact the
   test asserts by reading the file directly.
4. **Reading the doctrine is universal, not phase-specific.** Unlike the other skills in this
   twin, there is no gate this skill closes and no file it writes into a story's workspace — it is
   consulted, the way a style guide is consulted, by whichever skill is about to draw something.

## Quick start

```js
import { readFile } from "node:fs/promises";
import { checkReferenceSet } from "./scripts/check-reference-set.mjs";

const markdown = await readFile("./references/reference-set.md", "utf8");
const errors = checkReferenceSet(markdown);

if (errors.length > 0) {
  // A row is missing its link, its timecode, or a lesson with real content — fix it before
  // treating the reference set as trustworthy.
} else {
  // Every row in this table carries a link, a timecode and a lesson worth showing a journalist.
}
```

A production skill's own beat brief step does not call this script at all in the common case — it
just reads the four markdown files as prose. The script exists so the reference set's *structure*
stays enforced by a test, not by hoping nobody ever ships a row with the link forgotten.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| Minimum words before a lesson counts as substantive, not thin | `5` (`lesson.split(/\s+/).filter(Boolean).length < 5`) | `checkReferenceSet` |
| Minimum verified rows the shipped reference set must carry | `6` (asserted by `test/reference-set.test.ts` reading the shipped file, not by the check function itself) | `references/reference-set.md` |
| Timecode shape a moment cell must contain | `\d+:\d{2}` (minutes, a colon, two-digit seconds — matches `7:46` and the `1:02:33` inside a longer `h:mm:ss` timecode alike) | `checkReferenceSet` |
| Link shape a reference cell must contain | `](http` — a markdown link with an `http`/`https` URL | `checkReferenceSet` |

## Files

- `references/editorial-standard.md` — the five jobs a layer may do, and the removal test.
- `references/visual-system.md` — the concrete colour, label and furniture rules.
- `references/anti-patterns.md` — named recurring failures, one entry per anti-pattern.
- `references/reference-set.md` — seven verified real graphics with link, timecode and lesson;
  `checkReferenceSet` requires at least six, this ships with one to spare.
- `scripts/check-reference-set.mjs` — `checkReferenceSet(markdown)`.
- `test/reference-set.test.ts` — `bun:test` coverage, including the test that reads the shipped
  `reference-set.md` and asserts it, not a fixture, actually passes the check.
