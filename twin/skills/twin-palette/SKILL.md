---
name: twin-palette
description: Use to decide the two colours a beat is drawn in — the ground and the one accent that carries the argument. Proposes the newsroom's house colours and, when the subject carries a convention a reader already holds, that convention beside them; measures each against the WCAG non-text floor; records the journalist's answer in PALETTE.md. Every craft skill's own seed reads that file and refuses rather than default; a beat that reads it refuses rather than default; 54 of 70 shipped beats still name their colours as hex literals and are the migration debt this mechanism is closing.
---

# twin-palette — propose the colours, measure them, let the journalist decide

## Overview

`NEWSROOM.md` has carried `brandColor` and `ground` since preflight was written, `preflight.mjs`
validates them, and **nothing threaded them into a render**. Every beat named its colours as hex
literals in its own source, with a `// from NEWSROOM.md` comment beside them — an instruction to
copy by eye. A newsroom's identity was collected and then never used.

This skill closes that. It does three things and refuses a fourth:

1. **Proposes.** `proposePalette` returns up to two options — the newsroom's house colours, and the
   subject's own convention when one applies — each carrying where its values came from, why it is
   being offered, and what it **measured**.
2. **Measures.** Every option is scored against `NON_TEXT_CONTRAST_MIN`. A failing option is shown
   *as failing*, with the nearest passing variant offered beside it, never swapped in.
3. **Reads the answer back.** `readPalette` walks up from a beat's own directory looking for
   `PALETTE.md`, so one recorded decision at a story root serves every beat under it.

The fourth thing — **writing a colour anywhere** — it does not do. There is no write path in this
skill, not a commented-out one, not a flag. `PALETTE.md` is authored from the journalist's answer,
the same way `NEWSROOM.md` is.

## When to use

- Before the first beat of a story is rendered, once `NEWSROOM.md` is resolved (valid *or*
  declined). The proposal is a question the journalist answers once per story.
- When a single beat needs to leave the story's decision — a renewables beat inside a story about
  something else. Drop a `PALETTE.md` beside that beat; `readPalette` finds the nearest one first.
- **Not** to pick a categorical set, a sequential scale or a diverging scale. This skill proposes
  **one accent on one ground**. The rest are decisions with constraints a single-accent lookup has
  no business making — see `references/subject-conventions.md`, last section.
- **Not** to derive a newsroom's charter from scratch. That is `twin-newsroom-charter`, which
  measures the newsroom's own website; this skill starts from the result.

## The one gotcha that will waste your day (read first)

**The accent floor is 3:1, and raising it to 4.5:1 is the mistake that looks like rigour.** Those
are two different WCAG success criteria for two different things. 4.5:1 is SC 1.4.3, and it governs
**text** — which is already handled, on any ground, by `deriveFurniture` escalating `ink` and
`muted` until they clear it. 3:1 is SC 1.4.11 Non-text Contrast, and it governs the visual
information that identifies a **graphical object**: the line, the bar, the highlighted circle. The
accent carries no text. Holding it to a text threshold rejects perfectly legible house colours for
failing a criterion they were never subject to — and the newsroom whose brand just got rejected has
no way to learn that the wrong rule was applied.

The second half of the same trap is the mid-grey band, and the honest version of it is narrower
than it sounds. Swept over 4352 grounds, `adjustToContrast` returns `null` **zero times at 3:1 and
zero times at 4.5:1**; the first null appears at 5:1. The hardest ground found is `#747474`, where
the far pole lands at 3.0000809:1 — tight, and still a pass, because `towards` switches poles at
luminance 0.18 precisely so both sides clear. The `null` branch exists for a caller who raises
`min`, not for a ground that defeats the default. What the band *does* defeat is reasoning: on
`#808080` the obvious "luminance > 0.5 means use black" rule picks white at 3.95:1 over black at
5.32:1, which is why `deriveFurniture` measures both poles instead. Full numbers in
`references/contrast-floors.md`.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Colour maths | `scripts/palette.mjs` | `contrast` — a verbatim copy of the block in `render-still.mjs`, guarded against drift by `helper-parity.test.ts` |
| Conventions | `scripts/palette.mjs` | `SUBJECT_CONVENTIONS`, `matchConvention` — a deliberately short table, one entry per association a reader already holds |
| Scoring | `scripts/palette.mjs` | `NON_TEXT_CONTRAST_MIN`, `adjustToContrast` — the floor, and the remedy shown beside a failure rather than substituted for it |
| Proposal | `scripts/palette.mjs` | `proposePalette({newsroom, subject})` — the options, each with provenance, reasoning and measured contrast |
| Renderer | `scripts/format-proposal.mjs` | `formatProposal(proposal)` — the question the journalist actually reads and answers |
| Reader | `scripts/palette.mjs` | `readPalette(dir, {stopAt})`, `parsePalette` — reads the recorded answer back, throws naming every directory searched |

## How it works (the shape)

1. **The house option, when there is one.** A `NEWSROOM.md` with both `brandColor` and `ground`
   produces option one. A malformed hex in either field throws — a newsroom charter is validated
   input, and quietly ignoring a broken value there would put a default into a published chart.
2. **The subject option, when a convention applies.** `matchConvention` tests the subject line the
   journalist wrote against a short table. It returns the single match, and **nothing when several
   match**: a story about coal replacing hydro is not two accents, it is an editorial choice, and
   returning the first table row would make that choice by table order, invisibly.
3. **Both options are scored.** Contrast is measured accent-against-ground and compared to
   `NON_TEXT_CONTRAST_MIN`. A failing option keeps its place in the list, marked failing, with
   `adjustToContrast`'s nearest passing variant attached as a `remedy` — or `null`, honestly, when
   the ground leaves no room on either side.
4. **The house option is recommended when it exists and passes.** A subject convention is a reason
   to *depart* from the newsroom's identity, offered as such. It is never applied over the
   journalist's head, and the recommendation never falls to a failing option.
5. **`formatProposal` renders the question**, always ending in a real ask, always carrying the
   escape branch — including when there is exactly one option, and including when every option
   fails. A proposal that cannot be refused is not a proposal, and the case where refusing matters
   most is the case where the house colours themselves do not measure up.
6. **The answer is recorded by hand in `PALETTE.md`** (`assets/PALETTE.example.md` is the shape),
   with `origin:` naming who chose — `newsroom`, `subject` or `journalist`.
7. **A render that reads it never defaults, and the reach is measured, not claimed.**
   `readPalette` walks from the beat's own directory up to `stopAt`, and a search that finds
   nothing **throws, naming every directory it looked in**. A render that fell back to
   black-on-white would publish in a colour nobody chose, and it would look deliberate.

   Measured 2026-08-10, and the number is stated rather than rounded up to "every":

   | population | reads a recorded palette |
   |---|---|
   | craft-skill seed runners | **12 of 12** |
   | `render-still.mjs` copies carrying `readPalette` | 9 of 22 (the 13 `proof/` map copies reach the shared one through `#shared/…`) |
   | beats under `proof/` | **16 of 70** |

   The seed row is the one that decides the trend: until 2026-08-10 it read **0 of 12**, and eleven
   runners named `#FFFFFF`/`#0B7A75` as literals — the defect this whole skill exists to remove,
   sitting inside the files a new beat is copied from. `splash-twin/test/seed-reads-a-recorded-palette.test.ts`
   walks for those runners and keeps the row at 12. The beat row is a backlog that stops growing
   here; it does not shrink here.

## Quick start

```js
import { proposePalette } from "./scripts/palette.mjs";
import { formatProposal } from "./scripts/format-proposal.mjs";

console.log(formatProposal(proposePalette({
  newsroom: { name: "Heidi.news", brandColor: "#0B7A75", ground: "#FFFFFF" },
  subject: "La part du solaire dans le mix électrique suisse",
})));
```

```markdown
# Colours for this beat

PROPOSED, not applied. Nothing is rendered in these colours until you answer.

Subject read as: *La part du solaire dans le mix électrique suisse*

## The options

**1. Heidi.news's house colours** — **recommended**

  - Ground `#FFFFFF`, accent `#0B7A75`.
  - Where from: NEWSROOM.md — brandColor: #0B7A75, ground: #FFFFFF
  - Why: The chart reads as this newsroom's, beside everything else it publishes. …
  - Measured: **5.18:1** accent against ground — clears the 3:1 floor.

**2. the renewable generation convention**

  - Ground `#FFFFFF`, accent `#1B7F4B`.
  - Where from: references/subject-conventions.md — renewables; ground kept from NEWSROOM.md
  - Why: Green reads as renewable generation before the legend is read. …
  - Measured: **5.02:1** accent against ground — clears the 3:1 floor.

## Your answer

- **1** — Heidi.news's house colours
- **2** — the renewable generation convention
- **Something else — give me the two hex codes and I will use those.**
```

(Real output, trimmed at the `…` marks only. `#0B7A75` is the value `NEWSROOM.example.md` documents.)

Then, once the journalist has answered and `PALETTE.md` is recorded beside the story, a beat reads
it instead of naming hexes:

```js
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";

const { ground, accent } = readPalette(import.meta.dirname, { stopAt: process.cwd() });
```

`readPalette` is vendored into `render-still.mjs` alongside `deriveFurniture` — a beat already
imports that module to render at all, and a second import path for two colours would be one more
thing to get wrong. The copies are guarded against drift by `helper-parity.test.ts`.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| The contrast floor an accent must clear against its ground before it is recommended | `3` | `NON_TEXT_CONTRAST_MIN`, `scripts/palette.mjs` |
| How finely the remedy walks the accent toward the far pole (steps, so `1/50` per step) | `50` | `adjustToContrast`, `scripts/palette.mjs` |
| How many conventions may match a subject before none is offered | `1` | `matchConvention`, `scripts/palette.mjs` |
| Which subject conventions exist at all, and their accents | `4` entries | `SUBJECT_CONVENTIONS`, `scripts/palette.mjs` |

## Files

- `scripts/palette.mjs` — `contrast`, `NON_TEXT_CONTRAST_MIN`, `adjustToContrast`,
  `SUBJECT_CONVENTIONS`, `matchConvention`, `proposePalette`, `readPalette` and `parsePalette`.
  No write path.
- `scripts/format-proposal.mjs` — `formatProposal`, the markdown the journalist reads and answers.
- `assets/PALETTE.example.md` — the recorded-answer shape: `ground`, `accent`, `origin`.
- `references/subject-conventions.md` — the evidence behind each convention, why the table is short,
  and why a multi-match returns nothing.
- `references/contrast-floors.md` — why 3:1 and not 4.5:1, why a failing option is still shown, and
  the mid-grey band where nothing passes.
- `test/palette.test.ts` — the proposal, the conventions, the scoring, the remedy, and the reader's
  refusal to default.
- `test/format-proposal.test.ts` — the rendered question, in each of its three shapes.
