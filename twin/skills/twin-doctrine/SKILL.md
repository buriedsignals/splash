---
name: twin-doctrine
description: The reference documents every twin production skill reads before writing a line of rendering code — the editorial standard, information architecture, the visual system, the named anti-patterns, and a verified reference set. Never invoked alone; there is no gate, no state, no script a journalist runs directly.
---

# twin-doctrine — what every production skill knows before it draws anything

## Overview

Five prose reference documents and one small mechanical check. `editorial-standard.md` states
what a visible layer is allowed to be *for* — encode data, supply context, establish hierarchy,
support verification, direct attention — and the test that follows from it: if removing a layer
does not reduce comprehension, remove it. `information-architecture.md` states how the layers of
a single graphic are *arranged* — reading order, the fixed stack, proximity, alignment, density.
`visual-system.md` states what a compliant layer is allowed to *look like* — flat field, one
semantic accent, direct labels over detached legends, furniture derived from the newsroom's own
ground, contrast measured on the real background. `anti-patterns.md` names the recurring failures
of all three by their usual shape, so a production skill can recognise the mistake before it is
halfway built. `reference-set.md` is the concrete half of the standard: real, verified,
**published, standalone, evidence-led newsroom graphics** — not a person narrating over a slide —
each reduced to one transferable information-design lesson, never a styling description, so a
model has a named target instead of an abstract rule to approximate.

**A sixth document, `motion-grammar.md`, is named by the design spec (§6) and is deliberately not
written here.** SP1 is static-only — no video, no reveal, no motion build — so a motion grammar has
no work to govern yet. It is owed, not forgotten: it arrives with the video sub-project, written
against real motion builds the way this set is written against real static ones, not drafted in
the abstract ahead of the work it would govern.

This skill produces no artifact of its own and closes no gate. It is read, not run — with one
exception: `scripts/check-reference-set.mjs` exports `checkReferenceSet(markdown)`, a structural
check that a reference table actually carries a link, a locator and a lesson per row, so "the
reference set has six real entries" is a fact a test asserts rather than a fact hoped to still be
true after the next edit.

## When to use

- **Every production skill reads this doctrine before writing a line of rendering code.** Not
  once at install time — at the start of the beat brief that precedes any component, chart
  geometry, or render call. The doctrine is the frame the first sketch is drawn inside, not a
  style pass applied afterward.
- `twin-storyboard`'s reference loop (movement ④ of `references/exchange.md`) draws its named
  set from `reference-set.md` directly — when it shows a journalist "the FT treated this
  argument structure one way, Reuters another," those are rows from this file.
- **Live reference research** — going out and finding a new real treatment, with its own verified
  link and locator — runs only when the argument structure a story needs is new to the shipped
  set. If an existing row already names the structure, use it; do not re-research what is already
  here.
- **Not** for a journalist to invoke directly. There is nothing to run against a story; it has no
  input and produces no per-story output.

## The one gotcha that will waste your day (read first)

**A reference that "looks right" and a reference that is real are not the same thing, and only
one of them belongs in this file — and a reference that argues for the doctrine's own opposite
does not belong here at all, however real it is.** A link, a date and a quoted locator that were
guessed at will pass a casual read and still be a fabrication — verify every row against the
actual page, the actual archived snapshot, or the actual caption track, never from memory or a
search snippet. But a genuinely real reference can still fail this file on a second axis: a
decorative flat-illustration channel, or a talk literally titled after "the beauty of" data
visualization, is real and findable and still contradicts `editorial-standard.md` and
`visual-system.md` on their own terms — colour on every mark, no on-canvas source, the argument
carried by a presenter's voice instead of the graphic itself. Both failures were caught in this
file's own history: fabricated-looking timecodes were never shipped, but three video references
that were real, on-topic and still doctrine-contradicting were shipped in an earlier round and
had to be pulled after review. Checking "is this real" is necessary and not sufficient — every row
also has to survive being read against `editorial-standard.md`, `visual-system.md` and
`anti-patterns.md` before it ships, the same test any production skill's own output has to survive.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Standard | `references/editorial-standard.md` | The five jobs a visible layer may do, the removal test, and where visual interest actually comes from |
| Structure | `references/information-architecture.md` | Reading order, the fixed stack, proximity, alignment, density — how a graphic's layers are arranged, not what they look like |
| System | `references/visual-system.md` | The concrete rules: flat field, colour grammar, direct labels, derived furniture, contrast escalation |
| Failures | `references/anti-patterns.md` | Named recurring failures of the standard, structure and system, one entry each, with the rule each one violates |
| Targets | `references/reference-set.md` | Verified, published, standalone newsroom graphics, each with a link, a locator, and one transferable lesson |
| Check | `scripts/check-reference-set.mjs` | `checkReferenceSet(markdown)` — the list of reasons a reference table is not usable; empty means every row is |
| Deferred | `references/motion-grammar.md` (does not exist yet) | Owed to the video sub-project, not to SP1 — see Overview |

## How it works (the shape)

1. **A production skill's beat brief opens by reading the reference documents** — not
   summarised, not paraphrased from memory, but read fresh each time a beat is drafted. The
   standard and information architecture and the visual system govern what gets built; the
   anti-patterns name what to catch before it ships; the reference set supplies the concrete
   target for the argument structure at hand.
2. **`reference-set.md` is a markdown table**: `| Reference | Moment | Transferable lesson |`,
   one row per verified graphic. The reference cell is `Outlet/person — [Title](url)`; the moment
   is a **locator** — a real timecode (`m:ss`) for the rare video row, or, for a published static
   graphic (which has no timecode), whatever actually identifies where in the piece the graphic
   sits: a chart's own title, its on-page caption, its element id. The lesson states an
   information-design rule that would transfer to a different dataset with the same argument
   shape — never a colour or a font.
3. **`checkReferenceSet(markdown)`** parses the table (splitting rows on unescaped pipes, so a
   lesson that legitimately needs a literal `\|` does not get mis-split into the wrong columns;
   detecting a data row by counting its unescaped pipes rather than requiring a leading one, so an
   indented row or a row missing its own leading pipe — both legal in GFM — is not silently
   invisible to the check) and returns one error string per row per failure: `"reference N: no
   link"` when the reference cell has no `[text](http...)` markdown link, `"reference N: no
   locator"` when the moment cell is neither a clean, anchored timecode nor a non-trivial piece of
   text naming a real spot in the graphic, `"reference N: lesson is too thin"` when the lesson is
   fewer than five words. An empty array means every row in the table is structurally usable — it
   does not by itself assert a minimum row count; `countReferenceRows(markdown)` does that,
   sharing the same row-detection the check itself uses, and a shipped file is required to carry
   at least six by `test/reference-set.test.ts` reading the file directly.
4. **Reading the doctrine is universal, not phase-specific.** Unlike the other skills in this
   twin, there is no gate this skill closes and no file it writes into a story's workspace — it is
   consulted, the way a style guide is consulted, by whichever skill is about to draw something.

## Quick start

```js
import { readFile } from "node:fs/promises";
import { checkReferenceSet, countReferenceRows } from "./scripts/check-reference-set.mjs";

const markdown = await readFile("./references/reference-set.md", "utf8");
const errors = checkReferenceSet(markdown);

if (errors.length > 0) {
  // A row is missing its link, its locator, or a lesson with real content — fix it before
  // treating the reference set as trustworthy.
} else {
  // Every row in this table carries a link, a locator and a lesson worth showing a journalist —
  // structurally. Whether each row is *doctrine-compliant*, not merely well-formed, is still a
  // human judgment call made against editorial-standard.md and visual-system.md before it ships.
}
```

A production skill's own beat brief step does not call this script at all in the common case — it
just reads the markdown files as prose. The script exists so the reference set's *structure* stays
enforced by a test, not by hoping nobody ever ships a row with the link forgotten.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| Minimum words before a lesson counts as substantive, not thin | `5` | `checkReferenceSet` (`lesson.split(/\s+/).filter(Boolean).length < 5`) |
| Minimum verified rows the shipped reference set must carry | `6` | `test/reference-set.test.ts`, via `countReferenceRows` |
| Minimum characters a non-timecode locator must carry, so a blank or stray-character cell cannot pass | `2` | `checkReferenceSet` (`MIN_LOCATOR_CHARS`) |
| Maximum leading digits a timecode's first segment (minutes, or hours) may carry | `3` | `checkReferenceSet` (`TIMECODE_RE`, `\d{1,3}`) |
| Minimum unescaped pipes for a trimmed line to count as a candidate table row | `2` | `checkReferenceSet` (`isTableRow`) |
| Whether a reference cell counts as linked | **not a number** — `](http` is a fixed structural pattern (a markdown link is present or it is not; there is no threshold to tune here, so none is invented) | `checkReferenceSet` |

## Files

- `references/editorial-standard.md` — the five jobs a layer may do, and the removal test.
- `references/information-architecture.md` — reading order, the stack, proximity, alignment, density.
- `references/visual-system.md` — the concrete colour, label and furniture rules.
- `references/anti-patterns.md` — named recurring failures, one entry per anti-pattern.
- `references/reference-set.md` — seven verified, published newsroom graphics with a link, a
  locator and a lesson; `checkReferenceSet` requires at least six, this ships with one to spare.
- `references/motion-grammar.md` — **does not exist yet**; deferred to the video sub-project, see
  Overview. Do not write it ahead of the motion work it would govern.
- `scripts/check-reference-set.mjs` — `checkReferenceSet(markdown)`, `countReferenceRows(markdown)`.
- `test/reference-set.test.ts` — `bun:test` coverage, including the test that reads the shipped
  `reference-set.md` and asserts it, not a fixture, actually passes the check.
