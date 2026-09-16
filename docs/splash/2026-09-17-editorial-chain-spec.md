# Editorial chain spec — subject → proposal → direction, precision, choreography

Follows `2026-09-17-editorial-exchange-audit.md`. Closes its gaps 1–3. Spec only; no implementation here.

**The rule the chain exists to enforce.** A beat is produced from a *retained proposal*, not from a beat that
resembles it. What the journalist chose must be readable by code at every later step, and a step that stops
reading it must break a test, not degrade quietly.

**Four rulings this spec is built on.**

R-A. **One art direction per production run**, composed from `NEWSROOM.md` + the subject, inherited by all four
exports, redefinable by none. Catalogue proofs under `proof/` are the named exception: they render the three
filed directions (`docs/design-base/directions/{creme,nocturne,rapport}.md`) precisely to show the DA is a
parameter of the run.

R-B. **What precision and choreography ARE differs per export**, and none of the four is "none". One composed
frame, 579 frames, a reader's pointer and a card-to-card travel do not assert the same things and are not read the
same way. Four shapes, four checkers, no shared implementation.

R-C. **The guard holds VALUES, never prose.** An earlier draft of this spec required each BRIEF section to be
byte-identical to what a generator renders. The owner refused it, and rightly: it hands the generator authority
over sentences a journalist may legitimately reword, it creates pressure to exempt beats rather than fix them,
and — with the 160 catalogue proofs exempted — it left the guard exercised on nothing. Instead each of the two
sections carries a small **machine-readable block of values parsed out of what the beat itself declares** (§2.1).
The tests read that block; the surrounding prose is entirely the journalist's, and rewording it must keep them
green.

R-D. **The choreography is authored, per subject. The chain supplies the frame, never the content.** A
`deriveChoreography(type, retained)` that computed a choreography would manufacture clones, which is the one thing
this effort exists to prevent — every one of the 160 proofs is its own piece, and that is the point of them. So
the chain supplies: the export's required *shape*, the type's own *gesture vocabulary*, the type's *prohibitions*,
and what the retained proposal *constrains*. The beat supplies the choreography. The guard asserts three things
and no more — that one is **declared**, that it is **this beat's own** and not the worked example's, and that it
**violates none of its type's stated prohibitions**. It never asserts equality with a generated value. §1.4 says
the same for precision: what the grounding and the claim shape *require* to be asserted is the chain's; the
assertions themselves are the beat's.

## 1. The chain, link by link

| # | Decided | Composed in | Recorded in | Read by |
|---|---|---|---|---|
| L1 | subject, data facts, claim grounding | `intake`; `propose.mjs:97 resolveGrounding`, `:226 groundingScalar` | `source/profile.json`; `STORYBOARD.md` scalars `grounding`, `claimShape` | **NEW**: L4's `requiredAssertions` (today: nobody) |
| L2 | what to produce — medium, format, size, type, intent, **interaction** | `propose.mjs:814/:860/:1107` (`proposeMediums`/`proposeFormats`/`formatCandidates`) + **NEW** wiring of `:341 visualCatalogueEntries` so each candidate carries the catalogue's `interaction {kind,promise}` | `STORYBOARD.md` slot; **NEW** slot field `interaction` in `gate-contract.mjs:79 REQUIRED_SLOT_FIELDS` | **NEW** `readRetained` (§2.3) |
| L3 | the run's art direction | `shared/design-base/compose.mjs:559 composeDirections` (exists; today only prints a report) via **NEW** `composeRunDirection` | **NEW** `DIRECTION.md` at the story root, sibling of `PALETTE.md` | all four exports, through **NEW** `readRunDirection`, mirroring `colour.mjs:58 readPalette` |
| L4 | precision — **required** by the chain, **asserted** by the beat | requirements: **NEW** `requiredAssertions(retained, typeSheet)`; assertions: the journalist, from the subject's data | beat `BRIEF.md` `## Precision` — free prose, plus one `splash:precision` block holding what the beat declares (§2.1) | that beat's renderer / verifier, and the L4 guard |
| L5 | choreography — **framed** by the chain, **authored** by the beat | frame: **NEW** `choreographyFrame(retained, typeSheet)`; choreography: the journalist, from the subject | beat `BRIEF.md` `## The choreography` — the beat's own prose and table, plus one `splash:choreography` block parsed out of them | that beat's runner, the delivered-artifact guard `skills/splash/test/interaction-promises-are-kept.test.ts`, and the L5 guards |
| L6 | the beat's files | the 8 scaffolds (§4) | the beat directory | — |

### 1.1 What each export means by "precision"

- **static** (`chart-beat`, `map-beat` static, `image-beat`, `dw-beat`) — one frame's rounding, and which numbers
  that frame puts in front of the reader.
- **video** (`chart-video`, `map-beat` video) — which numbers are asserted *per shot*, and which may only be
  asserted on the hold.
- **web** (`chart-web`, `map-web`) — the floor the JS-off static frame asserts, plus the readings only revealed on
  demand.
- **scrolly** (`scrolly`) — what each card may assert given what is on screen at that card.

### 1.2 What each export means by "choreography"

Four exports, four dimensions, four declared shapes — and none of them is "none":

- **static — the reading order within one composed frame.** Where the eye enters, the sequence the marks and
  annotations lead it through, what is subordinate to what, and at which station the claim lands. Choreographed in
  space, not in time.
- **web — what the reader's pointer and keyboard can change, and in what order the picture responds**, plus the
  static frame it degrades to.
- **video — the unfolding in time.** The shot ladder, each shot's gesture, start and duration.
- **scrolly — the card-to-card travel.** What changes between card *n* and card *n+1*, and by which gesture.

The *content* of each is the subject's. Only the shape, the vocabulary and the prohibitions are the chain's.

### 1.3 The census — what the beats and the type sheets declare today

Read in full, not sampled: all 160 `BRIEF.md` (headings, plus the choreography and precision sections whole for
the 80 that carry them), all 40 `proof/web-*/render-directions-web.mjs`, and the four families of type sheets.

**The frame already exists, structured, for scrolly.** All 40 sheets under `skills/scrolly/references/types/`
carry exactly the four sections this spec needs: `## Scroll gestures` (the type's vocabulary), `## A choreography
must NOT` (the prohibitions — replay the static plate as a slideshow, pop marks in groups instead of interpolating
from the scroll's own progress, overlap two pictures on one card, let two cards' notes share a slot, rotate or cut
a label), `## Precision to assert` (what this type owes, e.g. "one value scale from zero across every card"), and
`## Devices the worked example implements`. **Video (32 sheets) and web (32) carry the same material as
unstructured bullets, and the 33 static sheets carry type *suitability* (`## When NOT to use it`, `## The one
thing that goes wrong`) rather than any reading order.** Giving those three families the same four sections,
harvested from what their sheets and their worked examples already say, is part of this work and is called out as
its own task in the plan.

**How the beats declare their choreography.**

- **video — 39 of 40.** `## The choreography` (14) or `## The choreography — an argument, not a reveal` (25),
  carrying a six-row table `event | what the shot says | gesture | what the viewer sees move | derived value
  asserted`. The six events are exactly `chart-video/assets/timing.ts:48 EVENT_ORDER`
  (`establish/reference/reveal/subject/conclusion/hold`), in order, every time. Column five is this beat's
  precision, per shot, already written.
- **scrolly — 40 of 40.** `## The choreography` carrying a six-row table `card | what the card says | gesture |
  what the reader sees move`. A gesture is one or more atoms joined by `+` (`split + rescale`, `compare + pull
  back`) or `—` for none. Across the 240 cells: `pull back` 34, `reveal` 19, `filter` 14, `trace` 11, `grow` 9,
  `rescale` 7, `mark` 7, `name` 6, `highlight` 6, `zoom` 5, `reorder` 5, `count` 4, then a long tail of one-offs
  (`morph`, `unfold`, `re-anchor`, `ghost`, `condense`…). The type sheets' `## Scroll gestures` are the head of
  that census; the beats extended it, subject by subject, which is exactly R-D in the data.
- **web — 27 of 40, in code.** `render-directions-web.mjs` holds `const interaction = { earns, controls: [{
  question, gesture, changes }] }`, one to four controls, with a closed seven-atom vocabulary: `ask-a-mark` 25,
  `toggle-a-comparison` 17, `find-your-own-case` 8, `open-the-full-table` 7, `ask-a-line` 2, `zoom-and-pan` 1,
  `filter-to-a-subset` 1. The BRIEF side does not reduce (22 of 40 carry the heading, in two casings, with varying
  sub-headings). **13 beats declare nothing anywhere**: `web-beeswarm-co2-per-person`,
  `web-bullet-low-carbon-share`, `web-diverging-bar-eu-per-capita`, `web-dot-strip-lowcarbon-spread`,
  `web-gantt-top-ten-tenure`, `web-parallel-coordinates-electricity`, `web-population-pyramid-switzerland`,
  `web-radar-electricity-mix`, `web-sankey-electricity-sources`, `web-small-multiples-solar-eu-six`,
  `web-streamgraph-swiss-electricity`, `web-treemap-europe-capacity`, `web-waterfall-germany-bridge`.
- **static — 0 of 40.** No static BRIEF declares a reading order; the one near-miss, `## The order, which is an
  editorial decision`, is about the order of the *data*. 37 of 40 carry something order-shaped in code (an
  annotation list, an entrance ladder, a sort) in no common shape. The house vocabulary for a static's stations
  nevertheless exists already, twice: the video's `EVENT_ORDER`, and the same five events copied into
  `chart-web/assets/entrance.ts:114 ENTRANCE_ORDER` so a web entrance "carries the ARGUMENT's order"
  (`web-entrance-is-an-addition.test.ts`, clause 4). That is what a static's declaration is written in — but it is
  **written**, by a person, per beat. Nothing here generates it.

**How the beats declare their precision.** Video's is the table's fifth column (39/40). Scrolly's `## Precision`
(40/40) is a bullet list of two to nine rules whose bold leads recur — `Every sentence is asserted` 33, `Laid out
in the reader's pixels` 23 — with a per-type tail. Web's nearest equivalent is `## Verification` (31/40) and
static's is `## Claim` / `## The claim` (32/40); neither reduces to a shape. So static and web owe a `##
Precision` section as much as they owe a choreography.

### 1.4 Precision — what the chain requires, and what the beat asserts

Two halves, and confusing them is how this link goes wrong in both directions.

**The chain's half (mechanical, derived from L1 and L2).** Given the retained proposal and the type sheet,
`requiredAssertions` returns *requirements*, not numbers:

- from `claim.grounding` — `supported`: the claim's own datum must appear among the beat's assertions;
  `unverifiable`: it must **not** be asserted, and the rounding must widen by one step; `overridden`: the
  exactness note is mandatory.
- from `claim.shape` — a `comparison` requires both compared values asserted; a `share` requires the denominator;
  a `trend` requires both endpoints; a `rank` requires the rank's own position and the set size.
- from the type sheet's `## Precision to assert` — the type's own owed rules ("one value scale from zero across
  every card").
- from `format` — where the assertion may land: per shot for video, per card for scrolly, in the JS-off floor for
  web, in the one frame for static.

**The beat's half (authored).** Which numbers those requirements are satisfied *with*, at what rounding, in which
unit, on which shot or card — all read off the subject's own data and written by the journalist into
`## Precision`. The block records them so a test can check two things that are genuinely mechanical: that every
requirement is **covered**, and that every declared value still **matches the frozen data** at the declared
rounding. Nothing generates the list.

## 2. Contracts

Shared, one canonical each, carried into skills per `carried-copies.test.ts` (line 1 `// twin/<path>`).

### 2.1 The value block — the shape, and why this one

Each of the two sections keeps its prose and its table and gains **exactly one fenced JSON block** whose info
string names it. The block is the *parse* of what that section declares, never a substitute for it:

~~~markdown
## The choreography

The beat's own paragraphs and its own six-row table, reworded at will, in any language.

```json splash:choreography
{
  "kind": "scroll",
  "cards": [{ "card": 1, "gesture": [], "changes": ["rows"] },
            { "card": 2, "gesture": ["regroup"], "changes": ["rows", "tail"] }]
}
```
~~~

and the BRIEF front matter gains one flat scalar, `derived: v1`, marking the beat as carrying blocks.

**Why a fenced JSON block and not nested front matter.** The repo already reads beat metadata from BRIEF front
matter — `parseBriefFrontMatter` (`shared/chart-beat/sizes.mjs:323`), which feeds `readPinnedSize` and
`delivered-size-matches-the-pin.test.ts`. That parser is deliberately **flat and scalar-only**, it is a hand-rolled
YAML subset, and it is CARRIED VERBATIM into eight skills. A declaration is nested and per-shot / per-card;
widening that parser to nested YAML would be the highest-blast-radius edit available in this tree, and would
amount to hand-writing a YAML implementation to hold data JSON already holds. A fenced block needs no grammar at
all: `JSON.parse`, and `JSON.stringify(value, null, 2)` to write. Key order, indentation and line wrapping
therefore cannot fail a beat, and neither can a sentence.

**Why the block sits inside the section rather than in front matter.** The record belongs next to the prose and
table it summarises: a journalist rewording the paragraph sees the values that paragraph is answerable to. Front
matter keeps the one scalar the flat reader needs (`derived: v1`), so tooling can tell a beat that carries blocks
from one that does not without parsing the body — the same way it reads `size:` today.

**No prose inside a block, mechanically, with no exception.** Every string in a block is an identifier from the
type's vocabulary (`pull back`, `ask-a-mark`, `establish`…) or a datum id — never a sentence. `assertNoProse`
refuses any string value longer than four whitespace-separated words or ending in `.`, `!`, `?`. The web promise
is *not* in the block: it is a sentence, it already lives in the slot's `interaction.promise` and in the artifact,
and `interaction-promises-are-kept.test.ts` already pins those two together; the block records only
`promiseSource: "slot"`. So "the tests never compare sentences" is a property of the format, not a convention.

```js
// shared/editorial/derived.mjs                        — NEW
export const DERIVED_BLOCKS = ["precision", "choreography"];
export function renderDerivedBlock(name, value): string     // the fence, JSON.stringify(value, null, 2)
export function readDerivedBlock(text, name): unknown       // throws when absent, throws when there are two
export function assertNoProse(value): void                  // throws, naming the path of the offending string
```

### 2.2 The frame — what the chain supplies to a choreography

```js
// shared/editorial/frame.mjs                          — NEW
/** @typedef {{ id: string, says: string }} Prohibition */   // id is checkable; says is the sheet's own line
export function choreographyFrame(retained, typeSheet): {
  export: "static"|"web"|"video"|"scrolly",
  shape: "frame"|"pointer"|"time"|"scroll",   // which declared shape this export owes
  vocabulary: string[],                       // the sheet's `## Scroll gestures` (per export equivalent); OPEN
  prohibitions: Prohibition[],                // the sheet's `## A choreography must NOT`
  constrains: { interactionKind: "none"|"time"|"pointer"|"scroll", size: string|null, cardsMin: number|null },
  workedExample: string                       // the beat the scaffold seeds from — what the declaration may not equal
}
export function requiredAssertions(retained, typeSheet): Array<{ id: string, because: "grounding"|"claim-shape"|"type-sheet"|"format" }>
export function parseGesture(cell): string[]  // "compare + pull back" → ["compare","pull back"]; "—" → []
```

`vocabulary` is **open**. The scrolly census's tail is one-offs per type, and refusing the next type's atom would
be the same defect as refusing the next type. An atom outside the sheet's list is reported as a vocabulary
addition the sheet should record — never as a failure of the beat.

### 2.3 The retained proposal

```js
// shared/editorial/retained.mjs                       — NEW
/** @typedef {{ kind: "none"|"time"|"pointer"|"scroll", promise: string }} Interaction */
/** @typedef {{
 *   slotId: string, proves: string, intent: string, language: string,
 *   medium: "chart"|"map"|"image", format: "static"|"video"|"web"|"scrolly",
 *   size: "landscape"|"square"|"portrait"|null, type: string,
 *   claim: { shape: string, grounding: "supported"|"unverifiable"|"overridden" },
 *   interaction: Interaction }} RetainedProposal */
export function retainedFrom(meta, slotId): RetainedProposal      // off gate-contract.mjs:324 parseStoryboard
export function readRetained(storyDir, slotId): RetainedProposal  // throws, naming the missing field
export function retainedFromBrief(beatDir): RetainedProposal      // catalogue beats: front matter + catalogue
```

`retainedFromBrief` exists because **1 of the 160 proofs has a `STORYBOARD.md`**. A catalogue beat's retained
proposal is reconstructed from its BRIEF front matter (`format`, `size`, `type`, `grounding`) plus the catalogue
entry for its `medium`/`format` (`propose.mjs:341 visualCatalogueEntries`, which carries `interaction`). Same typed
object; only the source differs.

### 2.4 The run direction

```js
// shared/design-base/run-direction.mjs                — NEW (thin over compose.mjs)
/** @typedef {{ id: string, origin: string, palette: object, registers: object, typefaces: object }} RunDirection */
export function composeRunDirection({ newsroom, filed, subject, textPerRegister, grounds }): { chosen: RunDirection, offered: RunDirection[], refused: object[] }
export function writeRunDirection(storyDir, chosen): void        // DIRECTION.md
export function readRunDirection(dir, { stopAt }): RunDirection  // signature mirrors colour.mjs:58 readPalette
```

### 2.5 The per-export parsers and checkers

**No `deriveChoreography` and no generated precision.** Each export owns two functions with the same two names,
over four different declared shapes (skills never import across a skill boundary):

```js
// skills/<export-skill>/scripts/choreography.mjs
export function parseChoreography(briefText, ctx): Declared     // the beat's own table/object → the block's value
export function checkChoreography(declared, frame): Violation[] // [] when it honours the frame; never "equals X"
```

The four declared shapes — transcribed from what the beats already write (§1.3), not invented:

```js
// video   (chart-video, map-beat video) — the six-row event table
{ kind: "time", fps: number,
  shots: Array<{ shot: "establish"|"reference"|"reveal"|"subject"|"conclusion"|"hold",
                 gesture: string[], start: number, duration: number, asserts: string[] }> }

// scrolly (scrolly) — the six-row card table
{ kind: "scroll", cards: Array<{ card: number, gesture: string[], changes: string[] }> }
//   changes = the state keys the drive module's own per-card states differ in — the comparison
//   `skills/scrolly/assets/reveal.mjs assertStates` already performs, read, not re-derived.

// web     (chart-web, map-web) — the `const interaction` object
{ kind: "pointer", promiseSource: "slot",
  controls: Array<{ order: number, gesture: WebGesture, input: "hover"|"tap"|"focus" }>,
  keyboard: boolean, degradesTo: "static-frame" }

// static  (chart-beat, map-beat static, image-beat, dw-beat) — the stations of one frame
{ kind: "frame", entry: string,
  stations: Array<{ station: "establish"|"reference"|"reveal"|"subject"|"conclusion",
                    carries: string, subordinateTo: string|null }>,
  claimLands: "establish"|"reference"|"reveal"|"subject"|"conclusion" }
```

```js
// skills/<export-skill>/scripts/precision.mjs
export function parsePrecision(briefText, ctx): { rounding: { unit: string, digits: number },
                                                  asserts: string[],   // datum ids the beat declares
                                                  values: Record<string, { value: number|string, unit: string|null, digits: number|null }>,
                                                  …per-export placement: perShot | perCard | staticFloor+onDemand | labels }
export function checkPrecision(declared, { required, data }): Violation[]
//   two mechanical checks and no third: every `required` id is covered by `asserts`,
//   and every `values` entry still equals the frozen data at `rounding`.
```

`dw-beat` carries the static precision pair and **no** choreography: rendering is delegated, so there is no
composed frame of ours whose reading order we could claim to have set.

`renderPrecisionSection` / `renderChoreographySection` live beside each pair. They write, at scaffold time, an
**empty** section: the export's table headers, the type sheet's vocabulary and prohibitions quoted as a comment
for the author, and no rows. A scaffold that pre-filled rows would be the clone factory R-D forbids.

## 3. Breaking tests — one per link

| Test file | Asserts | Mutation that must fail it |
|---|---|---|
| `skills/storyboard/test/a-candidate-carries-its-interaction.test.ts` (**L2**) | every `formatCandidates` candidate carries the catalogue `interaction` for its `medium/format`; `visualCatalogueEntries` has a non-test caller; `interaction` ∈ `REQUIRED_SLOT_FIELDS` | drop `interaction` from the candidate, from the slot fields, or re-orphan `visualCatalogueEntries` |
| `skills/splash/test/a-production-run-has-one-direction.test.ts` (**L3**) | every story with beats has exactly one `DIRECTION.md`; no beat under `stories/` reaches `readdirSync(DIRECTIONS)` or names a direction id; `proof/` is exempt by explicit path, never by heuristic | make one production beat re-read the three filed directions, or add a second direction to a story |
| `skills/splash/test/a-derived-block-holds-values-only.test.ts` (**R-C**) | `readDerivedBlock` finds exactly one block per name and throws on two; `renderDerivedBlock` round-trips; `assertNoProse` refuses a sentence and no shipped block contains one; **and, over every beat carrying `derived: v1`, reformatting a block's JSON or rewording every sentence and table cell of its section leaves every other guard green** | make a guard compare rendered text instead of parsed values; let a sentence into a block |
| `skills/splash/test/every-type-sheet-carries-its-frame.test.ts` (**R-D, the frame**) | every type sheet in all four families carries `## <export> gestures`, `## A choreography must NOT` with at least two prohibitions each having a checkable id, and `## Precision to assert`; `choreographyFrame` returns a non-empty `vocabulary` and `prohibitions` for every (export, type) pair a catalogue entry allows | delete a sheet's prohibitions section; add a type to the catalogue without a sheet |
| `skills/splash/test/a-choreography-is-declared-and-its-own.test.ts` (**L5 — the three assertions, and no fourth**) | for every beat carrying `derived: v1`: (1) a choreography block exists, in its export's `kind`, structurally complete for that shape — video's six shots are `EVENT_ORDER`, contiguous and non-overlapping; scrolly's cards are `1..n` with non-empty `changes` after the first; web's controls are ordered `1..n` with `gesture` ∈ the sheet's vocabulary; static's stations are a subsequence of `STATION_ORDER` with `entry` and `claimLands` naming roles the composition contains and no time-valued field anywhere; (2) it is **not deep-equal** to its type's `workedExample` block, and its datum ids are its own beat's; (3) `checkChoreography(declared, frame)` returns `[]`. **The file contains no expected-choreography fixture and no call to any generator** | give a static beat `kind:"none"` or an empty `stations`; scaffold a beat and ship the worked example's table unchanged; break a prohibition (pop marks in groups, overlap two pictures on a card); **and the structural mutation that must be caught by nothing: rewrite a beat's whole choreography into a different, legal one — the guard must stay green** |
| `skills/splash/test/precision-covers-what-the-chain-requires.test.ts` (**L4**) | for every beat carrying `derived: v1`, every id from `requiredAssertions(retained, sheet)` is covered by the block's `asserts`; every `values` entry equals the frozen data at the declared `rounding`; `grounding: "unverifiable"` removes the claim datum from the requirements and widens the rounding requirement; the four `parsePrecision` output shapes are pairwise distinct | drop an asserted value the claim shape requires; let a declared number drift from `data.csv`; ignore `grounding`; make two exports return the same shape |
| `skills/splash/test/the-chain-is-read-end-to-end.test.ts` (**L1/L6, the link guard**) | on a fixture story, `readRetained → readRunDirection → requiredAssertions → choreographyFrame → parse/check` all resolve by *calling* them; each of the 8 scaffolds imports the frame and the checker pair for its own format | delete the frame import from any one scaffold — the drift that let the catalogue and the web export diverge |
| `skills/splash/test/skill-md-matches-code.test.ts` (**extend, existing**) | each export SKILL.md's run section names the entry points it actually calls (`choreographyFrame`, `parseChoreography`, `checkChoreography`, `requiredAssertions`), and the section parses | rename `checkChoreography` without touching SKILL.md — the failure mode that left the scrolly run section unreadable for weeks |

Three of these mutations are **negative** — they must leave the suite green, and a change that makes any of them
red has reinstated the defect this spec was amended to remove: rewording a section's prose and table cells;
reformatting a block's JSON; and replacing a beat's choreography with a *different but legal* one.

## 4. Migration — the 160 beats

The blocks are **parsed out of what each beat already declares**; no beat's choreography is written, replaced or
defaulted by this work. R-A's exemption stays exactly where it belongs and no further: `proof/` keeps rendering
the three filed directions, so only the **L3** test exempts `proof/` by explicit path. L4 and L5 run on every beat
that carries `derived: v1`.

**Front-matter repair, first.** 40 static BRIEFs carry `size` and `type` but no `format` key, and
`proof/co2-suisse/BRIEF.md` has no front matter at all. The migration writes `format:` for the 40, full front
matter for `co2-suisse`, and an explicit `grounding: supported` on every beat whose claim is measured off its own
committed data — recorded as a fact rather than left as a default, because `requiredAssertions` refuses to guess
it. The retained proposal then comes from `retainedFromBrief` (§2.3); no gate reopens and no journalist is
re-asked.

**106 beats migrate mechanically** — their declaration parses and the block is written from it:

- **video, 39 of 40** — the six-row table parses; `gesture` through `parseGesture`; `asserts` from column five;
  `start`/`duration` from the beat's own `timing-contract.ts`, which all 40 carry.
- **scrolly, 40 of 40** — the six-row table parses in all 40; `changes` read from the drive module's own per-card
  states.
- **web, 27 of 40** — from `const interaction` in `render-directions-web.mjs`: `gesture` verbatim, `order` from
  array position, `input` from the gesture's kind.

**54 beats owe a declaration, and a person writes it.** They get no block, no `derived: v1`, and therefore no
guard — and the harvest emits them as a named worklist rather than burying them:

- **40 static** — no reading order is declared anywhere (§1.3), and under R-D nothing here may invent one. The
  static `renderChoreographySection` gives each an empty stations table with its type's vocabulary quoted; the
  author fills it.
- **13 web** — the beats named in §1.3.
- **1 video** — the beat whose table is absent or does not parse, named by the harvest.

This is the honest cost of the correction, and it is the right cost: 54 authored declarations is the price of not
having 54 generated clones. The guard is nevertheless exercised on 106 real beats from the day it lands, which is
106 more than the byte-equality design would have reached.

**`dw-beat` has no migration corpus.** The 160 are 40/40/40/40; there is no Datawrapper family under `proof/`. Its
`parsePrecision`/`checkPrecision` are exercised by a fixture only, and the L4 guard sees zero real beats for it
until one is produced. Stated rather than glossed.

**The scaffolds are where the frame is wired** — all eight: `chart-beat/scaffold-static-beat.mjs`,
`map-beat/scaffold-static-map-beat.mjs`, `chart-video/scaffold-video-beat.mjs`,
`map-beat/scaffold-map-video-beat.mjs`, `chart-web/scaffold-web-beat.mjs`, `map-web/scaffold-web-map-beat.mjs`,
`scrolly/scaffold-scrolly-beat.mjs`, `scrolly/scaffold-scrolly-map-beat.mjs`. They are the only place a beat's
files are written, and they already refuse on a missing `PALETTE.md` (`paletteReachable` /
`paletteRefusalMessage`); the same refusal shape extends to a missing `DIRECTION.md` and a missing retained slot.
They write the *empty* section with its frame quoted, never a filled one.
`chart-beat/scripts/static-plumbing.mjs:175 composedDirectionDefault` — which already rewrites a copied
three-direction loop into one composed direction — becomes the single-direction reader for `DIRECTION.md`, with
`--filed` kept as the catalogue-only escape.

**Existing BRIEF prose and tables are never rewritten.** The migration inserts a block into the existing section.
Nothing already written is edited, reflowed or translated.

## 5. Out of scope

- The palette/typeface mechanism (`PALETTE.md`, `TYPEFACE.md`, `readPalette`): it already works end to end and is
  untouched — `DIRECTION.md` sits beside it, does not absorb it.
- Generating, proposing or defaulting any beat's choreography, at scaffold time or in migration (R-D).
- Writing the 54 declarations §4 lists: the harvest names them; a person writes them, beat by beat.
- New journalist questions beyond confirming the retained candidate's `interaction`; no redesign of the G1/G2
  exchange, no UI work.
- Re-rendering the 160 beats; editing the three filed directions; changing `EXPORT_SIZES` / the size gate. The
  migration writes BRIEF text only — no beat's pixels move.
- `producer-gate.mjs`'s custom-vs-Datawrapper split.
- Audit gap 4 (`map-beat/SKILL.md:283` says "VIDEO genre"): a one-line doc fix, not part of this chain.
