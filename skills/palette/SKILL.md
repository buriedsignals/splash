---
name: palette
description: Use to decide the colours a beat is drawn in — the ground, the accent that carries the argument, and the further house accents a multi-series beat needs. Proposes the subject's own convention first when the subject carries one a reader already holds, the newsroom's house colours second, and says out loud when no convention applies; measures every accent against the WCAG non-text floor and REFUSES one a reader cannot see, at the proposal and again when the answer is read back; records the journalist's answer in PALETTE.md. ALSO owns the same question for TYPE: proposes the newsroom's recorded typefaces, measures whether each one actually resolves on the machine that will render, refuses a face nothing here can draw, and WRITES the answer into TYPEFACE.md. Every craft skill's own seed reads those files and refuses rather than default; a beat that reads them refuses rather than default.
---

# palette — propose the colours and the face, measure them, let the journalist decide

## Overview

`NEWSROOM.md` has carried `brandColor` and `ground` since preflight was written, `preflight.mjs`
validates them, and **nothing threaded them into a render**. Every beat named its colours as hex
literals in its own source, with a `// from NEWSROOM.md` comment beside them — an instruction to
copy by eye. A newsroom's identity was collected and then never used.

This skill closes that. It does four things and refuses a fifth:

1. **Proposes.** `proposePalette` returns the options — the newsroom's house colours, and the
   subject's own convention when one applies — each carrying where its values came from, why it is
   being offered, and what it **measured**. A `NEWSROOM.md` may record SEVERAL accents (`brandColor`
   is the primary, `accents` lists the rest), and each one becomes its own scored option: a house
   palette is rarely one colour, and a longer one must not become a way past the contrast floor.
2. **Measures.** Every option is scored against `NON_TEXT_CONTRAST_MIN` — every recorded accent,
   not only the first. A failing option is shown *as failing*, with the nearest passing variant
   offered beside it, never swapped in, and `recommended` only ever names an option that PASSED:
   a newsroom whose primary accent misses the floor gets the first of its own further accents that
   clears it, and nothing at all when none does.
3. **Reads the answer back — and measures it again.** `readPalette` walks up from a beat's own
   directory looking for `PALETTE.md`, so one recorded decision at a story root serves every beat
   under it. `parsePalette` then measures **every** recorded accent against the recorded ground and
   REFUSES one under 3:1, naming the ratio, the criterion and the nearest colour that clears it.
   That second measurement is not redundancy for its own sake: measured on 2026-08-10, a
   `PALETTE.md` recording `#FFFF00` on white rendered a clean PNG with the beat's whole number in
   it, because the floor lived only inside the proposal — and a `PALETTE.md` can be written by
   hand, copied from another story, or produced by `newsroom-charter`, which measures a
   newsroom's own site.
4. **Carries more than one accent, when the newsroom has more than one.** `accents:` lists the
   further house colours beside `accent:`, same shape `NEWSROOM.md` uses. A beat drawing several
   series takes them in order through `seriesInks` and derives further ones — shades of a recorded
   accent, each clearing the mark floor and reading apart from the others — instead of falling back
   to the furniture grey, which is what a three-series beat did until this landed.

The fifth thing — **writing a colour anywhere** — it does not do. `scripts/palette.mjs` has no write
path, not a commented-out one, not a flag. `PALETTE.md` is authored from the journalist's answer,
the same way `NEWSROOM.md` is — or, when no journalist is present, from the proposal's own
measured recommendation, exactly as described below.

**The typeface half DOES write**, in `scripts/typeface.mjs`, and the asymmetry is deliberate rather
than an inconsistency: a colour answer is two hex codes a person can type into a file, while a
typeface answer carries a measurement no person can make by eye — whether the machine that will
render actually HAS the face. Answer and measurement are recorded together or the record is worth
nothing. See "The typeface", below.

## When nobody is there to answer (unattended and batch runs)

`readPalette`'s refusal used to say "print the same proposal and end the turn there... do not
write PALETTE.md yourself" for this case too, matching the interactive rule ("Human gates stop
the turn", `splash/SKILL.md`). Every unattended run this project has produced — eight stress
stories (`stress-a`, `-c`, `-d`, `-e`, `-f`, `-g`, `-h`, `-i`) across two stress rounds — wrote
`PALETTE.md` anyway, because ending the turn with no one to resume it does not pause a
decision, it abandons the beat. A rule every reader breaks is not a rule.

So the two cases are genuinely different, and only one of them stops:

- **A journalist is present.** Show the printed proposal, end the turn, and record their answer —
  including the escape ("give me the two hex codes"), which is `origin: journalist`. This is the
  interactive human gate, unchanged.
- **No journalist is present, and `proposePalette`'s own `recommended` names an option.** The
  proposal already measured every option against the 3:1 floor; `recommended` never names one
  that failed it (see "Measures", above). Write `PALETTE.md` yourself, using **exactly** that
  option's `ground` and `accent` (and `accents`, when the newsroom records further ones) — never a
  colour invented for the occasion, never an option the proposal itself marked failing. Set
  `origin` to that option's own `origin` (`subject` or `newsroom`; an unattended run is never
  `journalist`, because no journalist answered). Say so in the file's own prose: that no
  journalist was present, and which option was recorded and why — a documented, reasoned
  departure from `recommended` toward another PASSING option is legitimate (see
  `stories/stress-e-electricity-mix/PALETTE.md`, which declines a subject convention that would
  have miscoded the chart's own accent), inventing one is not. This is `origin` doing the job its
  own field already claims: "a render is allowed to say where its colours came from"
  (`assets/PALETTE.example.md`) — an unattended run is one more thing it is allowed to say.
- **No journalist is present, and `recommended` is `null`.** Nothing in the proposal cleared the
  floor — the one case with no safe default. This is where the old rule still holds: print the
  proposal and end the turn there, the same rule this project's every other human gate follows. Do
  not invent a colour and do not pick a failing one.

This is narrower than it may look: it is a proposal this skill has already fully measured, written
to a local file a later run can still revise, never an irreversible action taken in a journalist's
name. It does not generalise to `splash/SKILL.md`'s other human gates — G2b's format choice, final
delivery confirmation — which stay exactly as strict as they already are.

## The typeface — the same question, one property over

`readTypeface`, `parseTypeface`, `useTypeface` and `assertDrawnInActiveTypeface` have shipped in
every `render-still.mjs` for as long as `readPalette` has, five render paths REFUSE without a
recorded `TYPEFACE.md`, and — measured 2026-08-21, round four's finding 17 —
`grep -rn "TYPEFACE.md" skills/ shared/ | grep -i write` returned **nothing**. No writer, no
movement in the exchange, no owning skill. Twenty of this tree's twenty-one stories have no
`TYPEFACE.md`; the one that has it wrote it by hand. `NEWSROOM.md` records `Space Grotesk`, which
does not resolve on this machine, so the refusal at the render was right and there was no path to
answer it.

This skill owns that question now, because it is the same mechanism: a recorded answer, walked up
from the beat's own directory, refused rather than defaulted, with `origin` naming who chose.
`references/typeface.md` carries the full rule (`typeface-is-recorded`) and the measurements behind
it. In brief:

1. **`proposeTypeface({newsroom, resolves, sample})`** offers every face `NEWSROOM.md` records, in
   the newsroom's own order, plus the substrate stack as an explicit option — never as a silent
   floor. `sample` is the text the story will actually draw.
2. **It cannot be run unmeasured.** `resolves` is required, and it is `familyResolves` from any
   `render-still.mjs`: resvg never errors on a family it lacks, it draws the fallback and reports
   nothing, so an unmeasured proposal would recommend a face the render then refuses. A proposal
   without the probe THROWS rather than guessing.
3. **The probe is the STORY'S OWN STRINGS, not a Latin one.** Round five, finding X2:
   `RESOLUTION_PROBE` is `"Handgloves 0123456789 — MWmw il1 %"`, and it was the only string
   `familyResolves` ever laid out — so the gate said nothing about a story in another script. On
   `stress-x-tunisian-water`, `familyResolves("Geeza Pro")` is true, correctly, for Latin, and that
   face draws that story's own ASCII colon and `2025` as **empty boxes**. `familyResolves(family,
   sample)` now takes the probe as an argument, and `proposeTypeface` measures every option against
   the sample and reports `drawsTheSample`. **What it still cannot see is stated, in
   `proposal.sampleLimit` and in the document the journalist reads**: resvg uses a family it finds
   for the whole run and draws the characters that family lacks as boxes, and no bounding box or
   per-character probe can tell that apart — so a face has to be LOOKED at in the story's own
   strings before it is recorded. A proposal made with NO sample says that too, rather than letting
   a Latin answer read as an answer about the story.
4. **`recommended` names a face this machine has, and one that belongs in a chart.** A face that
   does not resolve is never recommended. Nor is one that resolves but is a monospaced or display
   face: `stress-p` reached that judgement by hand ("a monospaced typewriter face is not a chart
   face and choosing it only because it resolves would be a worse answer than a stated fallback"),
   and it is now made the same way, with the reason printed. A caution never removes an option — a
   journalist who wants Courier can have it.
5. **`writeTypeface({dir, option, ...})` WRITES the answer** — the one thing the colour half
   deliberately does not do, and for a reason that does not apply here. A colour answer is two hex
   codes a person can type; a typeface answer carries a measurement no person can make by eye, so
   the answer and its measurement are written together or the file is worth nothing. It refuses an
   unmeasured option, refuses a face that does not resolve (the same refusal `useTypeface` makes at
   the render, made where three answers are still available), and refuses to overwrite a recorded
   answer without `replace: true`.

**The unattended rule is the colour one, and it always has an answer.** With a journalist: print
`formatTypefaceProposal`, end the turn, record what they say. With nobody there: record
`recommended`, with `answeredBy: "nobody"` and the proposal's own `recommendationReason`, which is
written into the file's prose. There is no `recommended: null` branch here — the stated fallback is
always available as `origin: default` — so this never becomes a refusal nobody can honour.

```js
import { familyResolves } from "#shared/chart-beat/render-still.mjs";
import { proposeTypeface, formatTypefaceProposal, writeTypeface } from "<splash>/skills/palette/scripts/typeface.mjs";

const proposal = proposeTypeface({ newsroom, resolves: familyResolves, sample: everyStringThisBeatDraws });
console.log(formatTypefaceProposal(proposal));            // the question, when someone is there
await writeTypeface({                                     // the answer, wherever it came from
  dir: storyDir,
  option: proposal.options.find((o) => o.id === proposal.recommended),
  newsroom,
  answeredBy: "nobody",
  because: proposal.recommendationReason,
});
```

The two modules are composed at the CALL SITE rather than imported into each other: `familyResolves`
needs a rasteriser this skill does not have, and a second copy of that decision, in a skill with no
renderer to check it against, is drift waiting to happen.

## When to use

- Before the first beat of a story is rendered, once `NEWSROOM.md` is resolved (valid *or*
  declined). The proposal is a question the journalist answers once per story.
- When a single beat needs to leave the story's decision — a renewables beat inside a story about
  something else. Drop a `PALETTE.md` beside that beat; `readPalette` finds the nearest one first.
- **Not** to pick a categorical set, a sequential scale or a diverging scale. This skill proposes
  **one accent on one ground**. The rest are decisions with constraints a single-accent lookup has
  no business making — see `references/subject-conventions.md`, last section.
- **Not** to derive a newsroom's charter from scratch. That is `newsroom-charter`, which
  measures the newsroom's own website; this skill starts from the result.
- For the TYPEFACE, at the same moment and from the same `NEWSROOM.md` — one question per story,
  asked and recorded beside the colour one. A story that renders anything needs both files.

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
| Conventions | `scripts/palette.mjs` | `SUBJECT_CONVENTIONS`, `matchConvention`, `CONVENTION_LANGUAGES`, `scriptsWithNoConvention` — a deliberately short table, one entry per association a reader already holds, read in English, French, Greek and Arabic |
| Scoring | `scripts/palette.mjs` | `NON_TEXT_CONTRAST_MIN`, `adjustToContrast` — the floor, and the remedy shown beside a failure rather than substituted for it |
| Proposal | `scripts/palette.mjs` | `proposePalette({newsroom, subject, about})` — the options, each with provenance, reasoning and measured contrast. `about` is what the story SAYS IT IS ABOUT (its takeaway): a subject line names the entity, and a convention is about the subject matter |
| Renderer | `scripts/format-proposal.mjs` | `formatProposal(proposal)` — the question the journalist actually reads and answers |
| Reader | `scripts/palette.mjs` | `readPalette(dir, {stopAt})`, `parsePalette` — reads the recorded answer back, throws naming every directory searched, and refuses an accent under the mark floor |
| Refusal | `scripts/palette.mjs` | `assertLegible(colour, against, {role})` — one of `mark` (3:1, SC 1.4.11), `text` (4.5:1, SC 1.4.3) or `largeText` (3:1, the same criterion's relaxation). The caller names the role rather than the number, because the two floors coincide at 3:1 and mean different things |
| Typeface proposal | `scripts/typeface.mjs` | `proposeTypeface({newsroom, resolves, sample})` — every recorded face, in the newsroom's order, each measured on THIS machine against the story's OWN strings, plus the substrate stack as an option; throws rather than propose unmeasured, and names in `sampleLimit` the question the rasteriser gives no way to ask |
| Typeface question | `scripts/typeface.mjs` | `formatTypefaceProposal(proposal)` — the question the journalist reads, with the escape and the install branch |
| Typeface writer | `scripts/typeface.mjs` | `writeTypeface({dir, option, ...})`, `renderTypefaceRecord(option, ...)` — the answer on disk, refusing a face this machine cannot draw and refusing to overwrite one already recorded |
| Series inks | `chart-beat/scripts/render-still.mjs` | `seriesInks(palette, count)` — the recorded accents first, then shades derived from them; never the furniture grey, and a throw rather than a default when it runs out |

## How it works (the shape)

1. **The subject option comes FIRST, when a convention applies.** `matchConvention` tests the
   subject line the journalist wrote against a short table. It returns the single match, and
   **nothing when several match**: a story about coal replacing hydro is not two accents, it is an
   editorial choice, and returning the first table row would make that choice by table order,
   invisibly. A convention the reader already holds — blue for water, green for renewables — is
   doing work the legend would otherwise have to do, for THIS chart, which is why it leads.
2. **The house option comes second, and it is what leads when no convention applies.** A
   `NEWSROOM.md` with both `brandColor` and `ground` produces it. A malformed hex in either field
   throws — a newsroom charter is validated input, and quietly ignoring a broken value there would
   put a default into a published chart.
3. **Both options are scored.** Contrast is measured accent-against-ground and compared to
   `NON_TEXT_CONTRAST_MIN`. A failing option keeps its place in the list, marked failing, with
   `adjustToContrast`'s nearest passing variant attached as a `remedy` — or `null`, honestly, when
   the ground leaves no room on either side.
4. **The SUBJECT option is recommended when it exists and passes; the house option second.** An
   earlier draft did the reverse, on the reasoning that a convention is a reason to *depart* from
   the newsroom's identity; the owner's ruling inverts it. Neither is ever applied over the
   journalist's head, and the recommendation never falls to a failing option.
   **And when NO convention applies, the proposal says so.** `noConventionReason` carries that
   sentence and `formatProposal` prints it — because four conventions ship, so "none applies" is
   the common case, and a one-option proposal with no explanation reads as a tool with nothing to
   say rather than as a subject with no convention.
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

   Measured by `scripts/palette-reach.mjs`, re-run rather than typed — this table has drifted from
   the tree twice already, which is why it is now a script's output:

   | population | reads a recorded palette | names nothing else of its own |
   |---|---|---|
   | craft-skill seed runners | **12 of 12** | — |
   | `render-still.mjs` copies carrying `readPalette` | 9 of 22 (the 13 `proof/` map copies reach the shared one through `#shared/…`) | — |
   | beats under `proof/` | **76 of 76** | **58 of 76** |

   The seed row is the one that decided the trend: until 2026-08-10 it read **0 of 12**, and eleven
   runners named `#FFFFFF`/`#0B7A75` as literals — the defect this whole skill exists to remove,
   sitting inside the files a new beat is copied from. `splash/test/seed-reads-a-recorded-palette.test.ts`
   walks for those runners and keeps the row at 12.

   The beat row went from 21 to 76 the same day, format by format. The **second** column is the honest
   half: 18 beats still name a colour of their own beyond the two contrast poles, and every one of
   them is a map — the basemap's own water and land paint baked into its plate, the no-data grey,
   and the territory cycle the three flow beats hold in `geo-flow.ts`. Whether a journalist should
   be able to change those is a judgement about what a basemap IS, so the script reports them rather
   than scoring them.

8. **The reach is proved on the PIXELS, not on the source.** `scripts/two-palette-proof.mjs` renders
   every beat twice under two recorded answers that share a ground — so all the furniture is
   byte-identical and every pixel that moves is the accent's — and counts what moved. That is the
   measurement a static scan cannot make: the walking guard above proves a runner MENTIONS
   `readPalette`, and a decoy call beside a laundered literal defeats it (the audit mutated it and
   watched it stay green). The mutation for the pixel proof is in its own header, with its RED.

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

**1. the renewable generation convention** — **recommended**

  - Ground `#FFFFFF`, accent `#1B7F4B`.
  - Where from: references/subject-conventions.md — renewables; ground kept from NEWSROOM.md
  - Why: Green reads as renewable generation before the legend is read. …
  - Measured: **5.02:1** accent against ground — clears the 3:1 floor.

**2. Heidi.news's house colours**

  - Ground `#FFFFFF`, accent `#0B7A75`.
  - Where from: NEWSROOM.md — brandColor: #0B7A75, ground: #FFFFFF
  - Why: The chart reads as this newsroom's, beside everything else it publishes. …
  - Measured: **5.18:1** accent against ground — clears the 3:1 floor.

## Your answer

- **1** — the renewable generation convention
- **2** — Heidi.news's house colours
- **Something else — give me the two hex codes and I will use those.**
```

(Real output, trimmed at the `…` marks only. `#0B7A75` is the value `NEWSROOM.example.md` documents.)

Then, once the journalist has answered and `PALETTE.md` is recorded beside the story, a beat reads
it instead of naming hexes:

```js
import { readPalette } from "#shared/chart-beat/render-still.mjs";

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
| The languages a convention's own words are read in | English, French, Greek, Arabic | `CONVENTION_LANGUAGES`, `scripts/palette.mjs` |

## Files

- `scripts/palette.mjs` — `contrast`, `NON_TEXT_CONTRAST_MIN`, `TEXT_CONTRAST_MIN`,
  `LARGE_TEXT_CONTRAST_MIN`, `adjustToContrast`, `assertLegible`, `SUBJECT_CONVENTIONS`,
  `matchConvention`, `CONVENTION_LANGUAGES`, `scriptsWithNoConvention`, `proposePalette`,
  `readPalette` and `parsePalette`. No write path — the
  colour answer is authored, and only the typeface answer is written (`scripts/typeface.mjs`).
- `scripts/format-proposal.mjs` — `formatProposal`, the markdown the journalist reads and answers.
- `scripts/typeface.mjs` — `DEFAULT_STACK`, `ORIGINS`, `newsroomFaces`, `proposeTypeface`,
  `formatTypefaceProposal`, `renderTypefaceRecord` and `writeTypeface`. The one write path in this
  skill, and `references/typeface.md` says why type has one and colour does not.
- `references/typeface.md` — `typeface-is-recorded`: what was measured, the rule, and what a skill
  whose renderer still holds `FONT_FAMILY` as a `const` has to say instead.
- `test/typeface.test.ts` — the proposal's refusal to run unmeasured, the recommendation that never
  names a face this machine lacks, the writer's three refusals, and the record read back by the real
  `parseTypeface`.
- `assets/PALETTE.example.md` — the recorded-answer shape: `ground`, `accent`, the optional
  `accents` list, `origin`.
- `references/subject-conventions.md` — the evidence behind each convention, why the table is short,
  and why a multi-match returns nothing.
- `references/contrast-floors.md` — why 3:1 and not 4.5:1, why a failing option is still shown, and
  the mid-grey band where nothing passes.
- `test/palette.test.ts` — the proposal, the conventions, the scoring, the remedy, and the reader's
  refusal to default.
- `test/format-proposal.test.ts` — the rendered question, in each of its three shapes.
- `../../scripts/palette-reach.mjs` — how far the recorded answer reaches, counted per format and
  per beat, with what each beat still names of its own.
- `../../scripts/two-palette-proof.mjs` — the same question answered on the rendered pixels: every
  beat drawn twice under two palettes, with the count of beats whose data ink actually moved.
