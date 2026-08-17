---
name: storyboard
description: Use to run the STORYBOARD phase of the doctrine twin — the editorial exchange, platform-neutral treatment selection, and conditional custom-or-Datawrapper choice that close Gate 2 by writing STORYBOARD.md, never by conversation alone.
---

# storyboard — the editorial contract, closed into a file

## Stop at every human gate

At every human gate, present the decision and recommendation, then **end the turn**. Do not
continue, self-approve, or treat silence as approval. At G2b, use the confirmed medium to recommend
one reachable publication format, show the alternatives, ask which format Splash should produce
first, and end the turn. Only the user's next message may supply `format:`. Before that reply, do
not run the reference loop, choose a palette or treatment, write `reachable: yes`, or dispatch a
producer.

After palette confirmation, open Storyboard. Do not ask the journalist to choose an interface:
Storyboard is the normal continuation and calls `open_splash_storyboard`,
uses `recommendVisualChoice` to rank that set against confirmed Storyboard fields and the frozen
profile, and opens only the first two: one recommendation and one alternative. The journalist still
presses the separate browser Confirm; focus, recommendation, silence, timeout or dismissal does not
supply the answer. Keep the MCP tool call open during the browser interaction. On Confirm, write the
treatment, attempt to close the page, return the confirmed choice to Goose, re-read the story from disk and
continue with the conditional producer gate or production without asking for a second chat message.
À-la-carte is an explicit override only: call `open_splash_a_la_carte` when the journalist has
directly asked in chat to see every treatment or used the words “À-la-carte”. Never infer that
override from uncertainty, a missing answer, or the existence of many reachable treatments.
If the browser refuses script-close for an operating-system-opened tab, leave a completed state that
says Goose is continuing and the tab is safe to close.
Without the browser launch tools, show the same two Storyboard options or a compact
grouped À-la-carte list in text and require an explicit reply.

After a chart treatment is chosen, consult `references/datawrapper-chart-types.json` through
`scripts/producer-gate.mjs`. If that treatment has a faithful Datawrapper implementation in the
chosen format, present the custom-or-Datawrapper choice and end the turn again. Never ask this
before treatment selection, and never ask it for an unmapped treatment.

## Overview

Runs the STORYBOARD phase: the ten-movement editorial exchange (`references/exchange.md`) that
turns an article's claims into an ordered list of **slots**, each carrying **one to n candidate
treatments**, one of them **chosen**. This skill **proposes — it does not interrogate.** It gives
back what it read, asks one question at a time, always with a recommendation attached — on the
hand-of-the-journalist questions as much as on the slots, so an "I don't know" is met with a
proposal to accept, adjust or reject, never silently logged as a blank — and never fills a field the
journalist should have filled themselves. `scripts/storyboard.mjs` is the
machine half of the contract: `parseStoryboard` reads the `STORYBOARD.md` a conversation produced,
and `checkStoryboard` says whether Gate 2 has actually closed — a proposal the journalist never
answered does not close it, no matter how the conversation reads.

Persist a provisional slot before G2a with `id` and the confirmed claim in `proves`. Complete
G2a → G2b → G2c for the first incomplete slot in array order before asking about the next slot.
After candidate selection, resolve the conditional G2-producer gate for that slot before Gate 2
closes.
Use `scripts/storyboard.mjs`'s atomic writer for every creation or mutation of `STORYBOARD.md`;
never rewrite the file ad hoc.

The slots-with-candidates shape is why "the journalist wants one visual" and "the journalist wants
a sequence" are the same object: one slot with three candidates (the same takeaway as a trajectory,
as a comparison, as a map) is the first case; N slots with one candidate each, ordered, is the
second. Gate 2 always asks the same question per slot — *which one do you keep, or do you drop the
slot?* — regardless of which case it is.

**Nothing is produced outside the storyboard.** Production (the next phase) reads chosen
candidates from a closed `STORYBOARD.md`; it does not invent a beat that was never proposed and
never confirmed.

`scripts/ground-claim.mjs`'s `groundTakeaway` is the second half of the machine contract: the
confirmed takeaway is a claim about the frozen data, and nothing upstream of this skill ever
checks it against that data. A takeaway can be false about its own numbers — an earlier trial
produced one that claimed a year was the lowest since a given year
while the fetched series showed the opposite — and nothing in the toolkit caught it until this.
`checkStoryboard` surfaces a claim the data actively contradicts as a gate error; a claim it
cannot check comes back `unverifiable`, which is not an error — it is information the journalist
should see, never silently upgraded to "supported."

## When to use

- At the FRAMING→STORYBOARD handoff, once `whereIs` (Task 3, `skills/splash/scripts/where.mjs`)
  reports the phase as `storyboard` — source is frozen, but `STORYBOARD.md` is missing or its
  takeaway is not yet confirmed.
- To validate a `STORYBOARD.md` a conversation just wrote, before treating Gate 2 as closed —
  always run `checkStoryboard` on the parsed front matter; never assume the exchange succeeded
  because the conversation felt complete.
- **Not** for production. This skill's whole output is the file; it never renders a beat.

## The one gotcha that will waste your day (read first)

**A "confirmed" takeaway and a `truthy` takeaway are not the same thing, and the two gates in
this codebase must agree on which one they mean.** `where.mjs`'s `isMissingScalar` refuses
the bare YAML sentinels `null` and `~` as well as an empty string — a `takeaway: null` line reports
`phase: "storyboard"`, gate still open. A naive front-matter scalar reader that just trims and
strips quotes turns `null` into the **non-empty string `"null"`**, which is truthy — `checkStoryboard`
would then say Gate 2 is closed while `whereIs` still says it isn't. `scripts/storyboard.mjs`'s
`scalar()` resolves the bare `null`/`~` tokens to a real `null` *before* `checkStoryboard` ever sees
them, specifically so the two gates cannot diverge. If you touch `scalar()`, keep that resolution —
and if you touch `where.mjs`'s sentinel list, mirror the change here.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Survey | `references/type-survey.md` | Every visual type this toolchain holds a sheet for — 32 chart, 8 map — each with its own opening sentence verbatim and the formats proven on disk for it. **Generated** by `twin/scripts/type-survey.mjs` from the two `references/types/` directories and `matrix.mjs`'s own beat reader; drift-checked by `test/type-survey.test.ts` |
| Choice guide | `references/chart-choice.md` | Splash's advisory intent rankings. Hard data requirements remove types before rank; editorial fit precedes reachability; a lower-ranked choice remains available when its candidate reason explains why the higher surviving form lost. `test/chart-choice.test.ts` keeps every local type sheet represented and every ranking consecutive |
| Doctrine | `references/exchange.md` | The ten movements of the editorial exchange **in the order they must happen** (restitution · takeaway **and its grounding** · the hand · the survey · medium · format · size · the reference loop · palette · proposal and brief), the hand-of-the-journalist questions with their medium-neutral destinations, and the discipline list — what a conversation running this phase must actually do |
| Reader + gate | `scripts/storyboard.mjs` | `parseStoryboard(text)` splits front matter from prose; `checkStoryboard(meta)` — **one argument** — returns the list of reasons Gate 2 has not closed (empty means it has), reading only RECORDED scalars. `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` are exported so the parity test can drive off them |
| Claim grounding | `scripts/ground-claim.mjs` | `groundTakeaway(takeaway, profile)` checks the confirmed takeaway's own numbers and year comparisons against the frozen data profile — a number is placed in a column's range **or** against a column's `sum` (a part-to-whole total), and a number it can place in neither is `unverifiable`, never `contradicted`. Not a fact-checker, not a conformance engine, one narrow class of error |
| Reachability | `scripts/format-catalog.mjs` | `FORMAT_CATALOG`, keyed on the **medium/format PAIR**, and `formatGap(medium, format)` — whether this kind of beat, in this format, has both a producer and a delivery path. `formatsFor(medium)` is what the format gate (G2b) may offer. `image/web` and `image/video` are absent on purpose: no producer exists, and an absent row is what the journalist is told at the gate rather than at the last phase |
| Format gate prompt | `scripts/format-gate.mjs` | `formatPublicationFormatGate({recommended, rationale, options})` renders the complete G2b assistant turn from the reachability rows. Its output is the last action in the turn; never append a later movement |
| Producer catalogue and gate | `references/datawrapper-chart-types.json`; `scripts/producer-gate.mjs` | Complete upstream `VisualizationType` inventory at its recorded source revision, conservative mappings from Splash treatments, the conditional custom-or-Datawrapper question, and validation of persisted `producer`/`datawrapperType` fields |
| Proposal | `scripts/propose.mjs` | **Where the four verdicts are actually called.** `resolveGrounding` runs `groundTakeaway` at G1 and collapses its ARRAY of claim verdicts into the one `grounding:` scalar (`groundingScalar` refuses to close on `contradicted` without the journalist's own override reason); `proposeMediums` / `proposeFormats` / `proposeSizes` compute what may be offered at ⑤ / ⑥ / ⑦, each row carrying its refusal; `confirmFormatReachable` is the ONE function that returns the `"yes"` a slot's `reachable:` records, and only after `formatGap` and `capabilityGap` both return `null`; `assertDistinctWays` refuses a candidate set that is one idea wearing three labels; `formatCandidates` renders the textual menu; `recommendVisualChoice` adds a deterministic, revision-bound advisory order for the graphical view without treating proof coverage as fit or confirmation |
| Capability gate | `scripts/capability-gap.mjs` | `capabilityGap(capabilities, medium)` says whether a chosen slot's medium is one the environment can actually honour — a **carried copy** of `splash`'s own function (see Files below), not an import |

## How it works (the shape)

1. **Restitution → the exchange runs** (`references/exchange.md`, movements ①–⑩): the claims read
   back, the confirmed takeaway **and its grounding at G1**, the journalist's hand (each question
   landing somewhere named, and no destination presuming a medium), the survey of every type this
   data could support and the advisory intent ranking in `references/chart-choice.md`, then the
   three sub-gates in order — **medium (G2a), format (G2b), size
   (G2c)** — the reference loop, the palette, the slots-and-candidates proposal, the conditional
   producer choice, and the beat brief.
   The order is the argument: each movement depends on the one before it. This is prose conducted
   in conversation — this skill's reference is what governs it, not code.
2. **The exchange writes `STORYBOARD.md`**: YAML front matter (`takeaway`, the hand-of-the-journalist
   fields, the two recorded verdicts `grounding` and `reference`, `language`, and
   `slots: [{id, proves, medium, format, size, reachable, candidates, chosen, producer,
   datawrapperType}, ...]`) above the prose
   the journalist actually reads.

   **`language` is the story's own, as a code** (`fr`, `de-CH`) — ruling R4: it follows the ARTICLE
   rather than the newsroom's configuration, and is confirmed with the journalist against the
   languages `NEWSROOM.md` records. It is written down because the exchange is not the last thing
   the journalist reads: `deliver` writes `HANDOVER.md` and makes the closing offer in it, by
   READING this field. A hand-over came out in English on a French story for want of it.

   **`size` is asked at G2c only where the format has one** (ruling R2). A `static` or `video` beat
   ships at `landscape` (YouTube, article web), `square` (social posts) or `portrait` (stories), and
   the slot records which. A `web` beat is asked NOTHING at G2c and must carry no `size` — web is
   not a fourth size, it fills whatever container the CMS gives it, like an embed component; a
   `scrolly` has no single exported frame at all. `checkStoryboard` refuses all three ways: a size
   this toolchain does not export, a sized format with none, and an unsized format carrying one.
   `splash/scripts/where.mjs` reads the same rule independently and words its refusals
   identically, and `splash/test/where.test.ts` compares the two string for string.
3. **`parseStoryboard`** reads that file back: a dependency-free reader for the narrow YAML subset
   in use here — scalars (quoted or bare, with `null`/`~` resolved to a real missing value), and a
   list of slot maps whose values are scalars or quote-aware inline string arrays (a comma inside
   a quoted element, e.g. `["a, b", "c"]`, does not split it — a naive `.split(",")` would silently
   fragment a candidate name that happens to contain one).
4. **`checkStoryboard(meta)`** names every reason the gate has not closed: a missing or unconfirmed
   takeaway, any missing hand-of-the-journalist field, a missing or unresolved `grounding` verdict,
   a missing `reference`, zero slots (nothing would be produced), a slot missing its `medium`,
   `format` or `size` (Gate 2's three sub-gates), a slot whose `reachable` is not `yes`, a slot with
   nothing chosen, a slot whose `chosen` value has no `candidates` ever listed to verify it against
   (malformed — a real choice can only be confirmed from a list that was actually shown), or a slot
   whose `chosen` value is not one of its own listed `candidates`, or an eligible chart treatment
   whose custom-or-Datawrapper decision is missing or inconsistent. `datawrapperType` is required
   only for `producer: datawrapper`; unmapped treatments skip this human question and carry no
   producer fields — absence is their canonical custom state. An empty array is the only
   "yes" — Gate 2 closes into this file, or it has not closed.

   **It takes ONE argument, and that is load-bearing.** It used to accept a `profile` and a
   `capabilities` argument and re-derive three expensive semantic checks from them —
   `groundTakeaway`, `formatGap`, `capabilityGap`. `where.mjs`'s own Gate-2 reading has neither
   argument, so it could not run any of the three, and the two gates disagreed for real: `whereIs`
   reported `production` on a storyboard this function was refusing. Each check now runs ONCE, in the phase that owns it —
   grounding at **G1**, format and capability at **G2b** — and records its verdict into
   `STORYBOARD.md` (`grounding:`, and the slot's `reachable:`). Both gates read the record. Neither
   can run a check the other cannot, because neither runs one at all. Do not reintroduce a second
   argument here without adding the same reading to `where.mjs`; the parity test
   (`skills/splash/test/where.test.ts`) generates its fixtures from both sides' exported
   `REQUIRED_SCALARS` / `REQUIRED_SLOT_FIELDS`, so a field added to one side alone turns red.

   `grounding:` closes on `supported`, `unverifiable`, or `overridden — "<reason>"` with a
   non-empty reason. **`contradicted` is never a closing value**: a takeaway the data refutes is
   corrected, or the journalist records the override and says why.
5. **`groundTakeaway`** checks the takeaway text against `profile` for exactly one class of
   failure: a number or a direction the frozen data itself contradicts. It is not a fact-checker
   (it knows nothing outside `profile`) and not a conformance engine (it never looks at a rendered
   chart). It recognises: a numeric token that falls inside some numeric column's range; a numeric
   token that equals a numeric column's `sum` within `AGGREGATE_TOLERANCE` — **a part-to-whole
   total**, which is by construction ≥ the max of the column it sums and so can never be found in
   a range; a two-year comparison ("X in 2024 was lower than in 1993") where both years are present
   in `profile.rows`; a windowed superlative ("lower... than in any year since 1993", "the lowest
   since 1993") checked against every row in the claimed range, not just its boundary year; and
   "highest/lowest ever" checked against the whole profile.

   **A number it can place in neither a range nor a total is `unverifiable`, never `contradicted`.**
   Reading "I could not place this number" as "the data refutes this number" refused every
   part-to-whole takeaway ever written, including a real production case. Only a value that contradicts a fact this function DID
   establish — the year comparisons and the superlatives, which read real rows — stays
   `contradicted`. Everything else, including "first time" claims, comparisons the profile cannot
   resolve to a single value column, and phrasing shapes this function does not parse, comes back
   `unverifiable` with a reason, never silently `supported`.

6. **`propose.mjs` is the seam that consults all of the above**, and until it existed there was
   none: `grep -rn "formatGap(\|capabilityGap(\|groundTakeaway(" skills/` returned four lines and
   all four were the definitions. `grounding:` and `reachable:` were recorded scalars both gates
   checked and no code produced — not trusted verdicts, unwritten ones. Each phase now calls the
   verdict it owns:

   - **G1** — `resolveGrounding(takeaway, profile)`, then `groundingScalar(resolved)` for the field.
     `groundTakeaway` returns one verdict PER CLAIM and `grounding:` is a single word, so the
     collapse is stated rather than left to the model: **any refuted claim → `contradicted`**
     (which never closes G1 — correct it, or record the journalist's override with their reason);
     **at least one confirmed and none refuted → `supported`**; **nothing placeable → `unverifiable`**.
     `supported` therefore means "every claim this check could resolve, it resolved in favour", not
     "every number was verified" — the detail names how many could not be placed, and that half is
     said out loud, because an unverifiable claim is information, not a refusal.
   - **④ ⑤** — `typeSurvey()` reads the generated survey back. The exchange reads
     `references/chart-choice.md`, removes types whose hard data requirements fail, and ranks the
     survivors by the confirmed intent before reachability is considered. The ranking is advisory:
     a lower-ranked candidate is valid when its reason says why the higher surviving form lost.
     `proposeMediums({capabilities})` then marks a medium the environment has closed AT THE MEDIUM
     QUESTION, with what would open it.
   - **⑥** — `proposeFormats({medium, capabilities})` returns every format in the vocabulary, each
     marked reachable or not AND CARRYING ITS REFUSAL, so an absent pair is named rather than
     quietly omitted. Render those rows with `formatPublicationFormatGate`, send its output as the
     final action of the turn, and wait. After the reply,
     `confirmFormatReachable({medium, format, capabilities})` produces the recorded
     `"yes"`, or throws the refusal the journalist hears.
   - **⑦** — `proposeSizes(format)`: the three export sizes for a static or a video, none for a page
     that fills its container.
   - **⑩** — `assertDistinctWays(candidates)` refuses a set whose candidates all name the same type
     (the run offered three and all three were bars of the same three numbers), and
     `formatCandidates` renders the menu from the computed options — every candidate carrying the
     type sheet's own purpose sentence verbatim and the caller's reason why THIS story is worth
     seeing that way. A candidate whose pair the catalog refuses cannot be rendered at all.
     The graphical variant passes those same currently reachable choices to
     `recommendVisualChoice({model, profile})`. Its scored facts come only from confirmed
     `STORYBOARD.md` fields and `source/profile.json`; unknown data-shape requirements remain named
     as unresolved, and equal scores retain catalogue order while disclosing the tie. Reading or
     rejecting this advice writes nothing.
   - **After ⑩, and only after the journalist chooses a treatment** —
     `datawrapperMatch({medium, format, treatment})` checks the pinned provider catalogue. No match
     means no extra question, no producer fields, and production remains custom. A match means
     `formatProducerGate(...)` presents the Datawrapper-or-custom preference as the final action of
     the turn. On the next reply, `confirmProducerChoice(...)` records either
     `producer: custom`, or `producer: datawrapper` plus the exact `datawrapperType`. This is a
     producer choice for the chosen treatment, never another treatment candidate.

## Quick start

```js
import { readFile } from "node:fs/promises";
import {
  parseStoryboard,
  checkStoryboard,
  groundTakeaway,
  formatGap,
  capabilityGap,
} from "./scripts/storyboard.mjs";

// At G1, the moment the takeaway is confirmed — BEFORE the journalist is asked to pick anything.
// The verdict is written into STORYBOARD.md as `grounding:`; a claim the data actually refutes is
// corrected here, or the journalist records `overridden — "<reason>"` and says why.
const profile = JSON.parse(await readFile("stories/annemasse-rain/source/profile.json", "utf8"));
const claims = groundTakeaway(confirmedTakeaway, profile);

// At G2b, once a medium and a format have been offered and picked. The verdict is written into the
// slot as `reachable:`; a pair nothing can produce or deliver is refused HERE, at the gate, not
// three phases downstream at deliver.
const { capabilities } = await runPreflight({ root, env: process.env, fetchFn: fetch });
const unreachable = formatGap(medium, format) ?? capabilityGap(capabilities, medium);

// And the gate itself, which re-derives none of it — one argument, recorded scalars only.
const text = await readFile("stories/annemasse-rain/STORYBOARD.md", "utf8");
const { meta, prose } = parseStoryboard(text);
const errors = checkStoryboard(meta);

if (errors.length > 0) {
  // Gate 2 is not closed — surface `errors` to the exchange, do not proceed to production. An
  // ungrounded takeaway, an unanswered reference loop, and a slot whose medium/format/size were
  // never chosen or never confirmed reachable are all among these reasons.
} else {
  // meta.slots[*].chosen names the candidate production reads.
}
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many hand-of-the-journalist fields are required | `5` (`HAND.length`: subject, comparison, limits, credit, effectiveDate) | `scripts/storyboard.mjs` |
| Minimum slots before the storyboard can produce anything | `1` (`slots.length === 0` is the refusal threshold) | `checkStoryboard` |
| Fewest candidates a slot may list once something is `chosen` | `1` (`candidates.length === 0` refuses as malformed, not silently passed) | `checkStoryboard` |
| Leading spaces that mark a line as a slot's own field, not a top-level one | `4` (`/^\s{4,}[A-Za-z]+:/`) | `parseStoryboard` |
| How many numeric columns a comparison claim may resolve to before it is ambiguous | `1` (`findValueColumn`'s `candidates.length === 1` — more or fewer and the comparison comes back `unverifiable`, never guessed) | `scripts/ground-claim.mjs` |
| How far around a "highest/lowest ... ever" phrase this looks for the year to anchor on | `80` characters each side | `scripts/ground-claim.mjs`'s `SUPERLATIVE_EVER_RE` handling |
| How far a rounded total may sit from its column's exact sum and still resolve | `AGGREGATE_TOLERANCE` = `0.01` (relative, with an absolute floor of 0.5) | `scripts/ground-claim.mjs` |
| Fewest genuinely different ways of seeing the data a candidate set must offer | `2` (`assertDistinctWays`'s `min` — two honest ways beat three labels over one idea; fewer is allowed when that is the honest answer) | `scripts/propose.mjs` |

## Files

- `references/exchange.md` — the movements, the hand-of-the-journalist questions with
  their destinations, and the discipline list. Read by every conversation running this phase.
- `references/type-survey.md` — **generated, do not edit by hand.** Every type sheet in the tree,
  what each is for in its own words, and which formats are proven on disk for it. Regenerate with
  `bun scripts/type-survey.mjs` from `twin/`; `bun scripts/type-survey.mjs --check` fails on drift,
  and `test/type-survey.test.ts` runs that check. It exists as a generated copy because a script in
  this skill may not read `chart-beat/references/types/` — that path resolves inside another
  skill — which is the same reason `twin/MATRIX.md` is generated rather than hand-kept.
- `references/chart-choice.md` — the advisory intent-to-form rankings used at movement ④. It keeps
  hard data refusals ahead of rank, fit ahead of reachability, and agent judgement ahead of an
  automatic dispatch rule. `test/chart-choice.test.ts` makes a new type sheet fail until the guide
  accounts for it.
- `references/datawrapper-chart-types.json` — the complete Datawrapper visualization-type inventory
  at the recorded upstream source revision, plus the deliberately conservative Splash-treatment
  mappings that may open the producer preference gate. Unmapped treatments never trigger it.
- `scripts/storyboard.mjs` — `parseStoryboard`, `checkStoryboard`.
- `scripts/format-gate.mjs` — `formatPublicationFormatGate`, the complete G2b assistant turn.
- `scripts/producer-gate.mjs` — `datawrapperMatch`, `producerGap`,
  `formatProducerGate`, and `confirmProducerChoice`: eligibility, journalist-facing question, and
  persisted-answer validation for the conditional G2-producer gate.
- `scripts/propose.mjs` — `resolveGrounding`, `groundingScalar`, `typeSurvey`, `readTypeSurvey`,
  `proposeMediums`, `proposeFormats`, `proposeSizes`, `confirmFormatReachable`, `assertDistinctWays`,
  `formatCandidates`. The one file that CALLS `groundTakeaway`, `formatGap` and `capabilityGap`.
- `scripts/ground-claim.mjs` — `groundTakeaway`, the claim-grounding guard the **G1 phase** calls
  through `propose.mjs`'s `resolveGrounding`. `checkStoryboard` does NOT call it and takes no
  profile: it reads the recorded `grounding:` scalar, which is what stops the two gates diverging.
- `scripts/capability-gap.mjs` — `capabilityGap(capabilities, medium)`, the guard the **G2b phase**
  calls through `propose.mjs` (`proposeMediums`, `proposeFormats`, `confirmFormatReachable`), never
  `checkStoryboard`, which takes no `capabilities` argument either. This is a **carried copy** of `splash`'s own
  `capabilityGap` (`skills/splash/scripts/preflight.mjs`), not an import — a skill directory
  has to stay copy-pasteable on its own, the same rule `format-catalog.mjs` follows for
  `deliver`'s `FORMS_BY_FORMAT`. **Do not delete it as duplication**: `test/capability-gap-parity.test.ts`
  is the guard against the two copies drifting apart, and it is the reason this file is allowed to exist
  twice.
- `test/storyboard.test.ts` — `bun:test` coverage, including a regression test locking the
  `null`/`~` sentinel resolution described in the gotcha above, and the medium/capability gate.
- `test/ground-claim.test.ts` — `bun:test` coverage for `groundTakeaway`, including the real
  Norway/Swiss regression cases that motivated it, and — its last block — the
  seam A13 actually lived in: `intake`'s own `profileTable` output fed to the real check. Every
  other fixture in that file hand-builds its columns, so deleting `sum` from `profileTable` used to
  leave the whole file green while the defect it was written for came back.
- `test/propose.test.ts` — `bun:test` coverage for the proposal seam, opening with the walking
  guard that gives this file its reason to exist: each of `groundTakeaway`, `formatGap` and
  `capabilityGap` must be called by a script other than its own definition. It strips comments
  before scanning, because its first draft stayed green through the mutation that deleted all three
  calls — `propose.mjs`'s header quotes the grep that found the hole, so the literals were sitting
  in a comment.
- `test/capability-gap-parity.test.ts` — asserts this skill's `capabilityGap` copy agrees with
  `splash`'s original across the full `{map, datawrapper, hostedEmbed} × {open, closed,
  absent}` matrix (the one place a cross-skill import is legitimate: a `test/` directory asserting
  two deliberate duplicates still agree — see `skills/splash/test/helper-parity.test.ts`, the
  pattern this follows).
