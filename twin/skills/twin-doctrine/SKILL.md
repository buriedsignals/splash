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

**A sixth document, `motion-grammar.md`, arrived with the video sub-project.** It was deliberately
absent while SP1 was static-only — a motion grammar with no motion build to govern is drafted in
the abstract — and it was written against `twin-chart-video`'s first real 8-second build, the way
the rest of this set is written against real static ones. It governs the video genre only: what a
layer is allowed to *do over time*, the order a reveal follows, and the timing contract every
window in a build derives from.

This skill produces no artifact of its own and closes no gate. It is read, not run — with one
exception: `scripts/check-reference-set.mjs` exports `checkReferenceSet(markdown)`, a structural
check that a reference table actually carries a link, a locator and a lesson per row, so "the
reference set has at least as many real entries as it claims" is a fact a test asserts — against
what the file currently ships, seven, not against an unmet aspiration — rather than a fact hoped to
still be true after the next edit.

## When to use

- **Every production skill reads this doctrine before writing a line of rendering code.** Not
  once at install time — at the start of the beat brief that precedes any component, chart
  geometry, or render call. The doctrine is the frame the first sketch is drawn inside, not a
  style pass applied afterward.
- `twin-storyboard`'s reference loop (movement ⑧ of `references/exchange.md`) draws its named
  set from `reference-set.md` directly — when it shows a journalist "the Post treated this
  argument structure one way, Vox another," those are rows from this file.
- **Live reference research** — going out and finding a new real treatment, with its own verified
  link and locator — runs only when the argument structure a story needs is new to the shipped
  set. If an existing row already names the structure, use it; do not re-research what is already
  here.
- **Not** for a journalist to invoke directly. There is nothing to run against a story; it has no
  input and produces no per-story output.

## The one gotcha that will waste your day (read first)

**Looking at the pixels is necessary and still not sufficient — read what sits next to them too.**
This file has been wrong in three different shapes across three rounds of review, each one a
stricter version of "actually check" than the last. Round 1 verified metadata — `og:title`,
`datePublished`, a caption track — and never looked at a single pixel; a chart described as "one
accent colour against grey comparators" in fact carried eight saturated categorical colours with
the claimed subject drawn in dark grey. Round 2 downloaded and looked at real images and real
video frames — genuinely — and still got three rows wrong, because *looking* was not the same as
*describing only what was there*: a simulation cited as "four panels running side by side under one
shared clock" was in fact four sequential, independently-randomized runs (the piece says so in its
own body text); a locator pointed at real markup whose quoted sentence, on the actual page,
belonged to a *different* chart several thousand characters away. Round 3 fixed those, looked at
the right pixels this time — and still shipped a chart that was a **design mockup**, because the
`<figcaption>` sitting immediately next to the image, in the article's own words, said "placeholder
data and annotations," and nobody read it. **The rule now: look at the actual pixels, AND read the
caption, the credit line, and the surrounding paragraph, before writing a lesson.** A row verified
only against a promotional/social-preview derivative (not the article's own embedded image) must
say so in plain words in the file, and its lesson may describe only what that specific derivative
actually shows — see `reference-set.md`'s preamble for which rows this applies to and why. A
reference can also be real, accurately described, correctly sourced, and still fail this file on a
different axis entirely: a decorative flat-illustration channel, or a talk literally titled after
"the beauty of" data visualization, is real and findable and still contradicts
`editorial-standard.md` and `visual-system.md` on their own terms — colour on every mark, no
on-canvas source, the argument carried by a presenter's voice instead of the graphic itself.
Verification is: is this real, does the lesson match only what is actually on screen, does the
surrounding text confirm rather than contradict that, AND does it survive being read against
`editorial-standard.md`, `visual-system.md` and `anti-patterns.md` — the same test any production
skill's own output has to survive.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Standard | `references/editorial-standard.md` | The five jobs a visible layer may do, the removal test, and where visual interest actually comes from |
| Structure | `references/information-architecture.md` | Reading order, the fixed stack, proximity, alignment, density — how a graphic's layers are arranged, not what they look like |
| System | `references/visual-system.md` | The concrete rules: flat field, colour grammar, direct labels, derived furniture, contrast escalation |
| Failures | `references/anti-patterns.md` | Named recurring failures of the standard, structure and system, one entry each, with the rule each one violates |
| Targets | `references/reference-set.md` | Verified, published, standalone newsroom graphics, each with a link, a locator, and one transferable lesson |
| Check | `scripts/check-reference-set.mjs` | `checkReferenceSet(markdown)` — the list of reasons a reference table is not usable; empty means every row is |
| Motion | `references/motion-grammar.md` | The video genre only — data arriving is the motion event, chronological or argumentative order, the pause on the baseline, the subject as a distinct event, the conclusion after its evidence, the final hold, and the editorial timing contract |

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
   at least seven by `test/reference-set.test.ts` reading the file directly — the floor tracks what
   is actually shipped and honestly verified today, past the original six-row target (see Files
   section).
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
| Minimum verified rows the shipped reference set must carry — tracks what the file actually ships today; `6` was the original target, passed this round (see Files section below) | `7` | `test/reference-set.test.ts`, via `countReferenceRows` |
| Minimum characters a non-timecode locator must carry, so a blank or stray-character cell cannot pass | `2` | `checkReferenceSet` (`MIN_LOCATOR_CHARS`) |
| Maximum leading digits a timecode's first segment (minutes, or hours) may carry | `3` | `checkReferenceSet` (`TIMECODE_RE`, `\d{1,3}`) |
| Minimum unescaped pipes for a trimmed line to count as a candidate table row | `2` | `checkReferenceSet` (`isTableRow`) |
| Whether a reference cell counts as linked | **not a number** — `](http` is a fixed structural pattern (a markdown link is present or it is not; there is no threshold to tune here, so none is invented) | `checkReferenceSet` |

## Files

- `references/editorial-standard.md` — the five jobs a layer may do, and the removal test.
- `references/information-architecture.md` — reading order, the stack, proximity, alignment, density.
- `references/visual-system.md` — the concrete colour, label and furniture rules. Includes the
  cross-cutting rule that a label's ink is measured against its own background even when that
  background is a data mark, not the page — the single most independently-rediscovered defect in
  this project's history — and names one still-open gap: a CVD-safe palette's members are not
  separately checked for adjacency to each other.
- `references/anti-patterns.md` — named recurring failures, one entry per anti-pattern, including
  the fixed-gutter class (a reserved text space sized as a constant instead of measured against the
  real string about to be drawn — the second most independently-rediscovered defect in this
  project's history, and the reason "measured" is itself a claim this file teaches how to check).
- `references/reference-set.md` — **seven** rows, past the original six-row target. The floor in
  `test/reference-set.test.ts` tracks that reality (`7`) so the suite stays green against what is
  actually true rather than standing permanently red against an unmet aspiration or, just as bad,
  green against a stale one. Five outlets, seven rows counting NYT's two desks (The Upshot, Visual
  Investigations) and ABC News Australia's two separate pieces each as distinct rows — The New York
  Times (×2), The Washington Post, Vox, ABC News Australia (×2), The Pudding. Four kinds of
  verification are mixed in (the file's own preamble says which row is which): a social-preview
  image (rows 1–2), an extracted video frame at a real timecode (rows 3–4), a live-rendered in-page
  chart read on the article's real, live URL (rows 5–6, new this round), and a genuinely published,
  in-article static `<img>` (row 7, new this round — the artifact three earlier rounds went looking
  for and did not find). **The static bar (at least half genuinely static) is still not fully met**:
  two rows are unambiguously static (row 1, row 7); two more (rows 5–6) are static charts but
  implemented as rendered SVG rather than a raster file, so this file declines to count them either
  way — stated here and in the file's own preamble rather than papered over. The three new rows each
  target one of the three argument structures that broke the original four-row set on real stories —
  a long time series read against a historical level (row 5, AFL scoring against its own 1982 peak),
  a profile of one entity across dimensions that disagree with each other (row 6, Everest's raw
  death toll against its fatality rate), and a ranking whose subject sits mid-table rather than at
  an extreme (row 7, NBA draft picks re-ranked by career value) — found by sampling
  `infoviz.design`'s catalogue and verified against the real, live pixels and the text beside them,
  never the gallery's own stored thumbnail (see that investigation's own notes: `infoviz.design` is
  a random-sample function, not a searchable index, and cannot be queried by argument structure).
  Two rows were dropped in an earlier round and are named here as the standing caution this round's
  additions were held against: a FiveThirtyEight design mockup (its own `<figcaption>` read
  "placeholder data and annotations" — a process illustration, not published evidence) and a Reuters
  social-preview card whose lesson asserted a mechanic (two lines crossing repeatedly across
  labelled years) the actual cropped card cannot show.
- `references/motion-grammar.md` — the video genre's rules, written against `twin-chart-video`'s
  first real build. Read by any beat whose output is frames. Its one departure from
  `information-architecture.md` is deliberate and argued in place: in a video the takeaway is the
  **conclusion event**, not furniture, because time is the stack and the reader does not choose
  their own reading order. Also states which two rules are genre-scoped and why applying either one
  outside its own genre produces a named defect: axis/tick density (dense for a static frame a
  reader can scrutinise at their own pace, sparse — this genre's own line reveal draws with none at
  all — for a frame the reader cannot pause), and an end-label's reveal (gated on the mark's own
  local progress and positioned at its current location, never gated on a signal describing the
  whole composition and pinned to the mark's eventual, final one — the mistake that shipped
  independently in both a scroll-driven build and a timed one).
- `references/geo-discipline.md` — the rules a map beat is written under, in either genre. Includes
  the three-colour basemap discipline (water as a blue tint, land as a very light neutral, no-data as
  a distinct mid-grey — a flat colour, not the textured hatching an earlier draft of this rule
  called for, corrected here because hatching reads illegibly at the size a no-data region is
  actually drawn), the antimeridian and frame-gating discipline paid for by this project's own CO₂
  choropleth beat, and one problem recorded as still open rather than solved: a proportional-symbol
  legend box sized only to its widest mark can still clip a long unit word ("8 magnitud…") because
  nothing measures the legend the way a label gutter is measured.
- `scripts/check-reference-set.mjs` — `checkReferenceSet(markdown)`, `countReferenceRows(markdown)`.
- `test/reference-set.test.ts` — `bun:test` coverage, including the test that reads the shipped
  `reference-set.md` and asserts it, not a fixture, actually passes the check.
