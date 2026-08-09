---
name: twin-storyboard
description: Use to run the STORYBOARD phase of the doctrine twin — the editorial exchange (restitution, the confirmed takeaway, the journalist's hand, the reference loop, slots and candidates) that closes Gate 2 by writing STORYBOARD.md, never by conversation alone.
---

# twin-storyboard — the editorial contract, closed into a file

## Overview

Runs the STORYBOARD phase: the six-movement editorial exchange (`references/exchange.md`) that
turns an article's claims into an ordered list of **slots**, each carrying **one to n candidate
treatments**, one of them **chosen**. This skill **proposes — it does not interrogate.** It gives
back what it read, asks one question at a time, always with a recommendation attached — on the five
hand-of-the-journalist questions as much as on the slots, so an "I don't know" is met with a
proposal to accept, adjust or reject, never silently logged as a blank — and never fills a field the
journalist should have filled themselves. `scripts/storyboard.mjs` is the
machine half of the contract: `parseStoryboard` reads the `STORYBOARD.md` a conversation produced,
and `checkStoryboard` says whether Gate 2 has actually closed — a proposal the journalist never
answered does not close it, no matter how the conversation reads.

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
checks it against that data. A takeaway can be false about its own numbers — a real trial
(`twin/TRIAL-THREE-BEATS.md`) produced one that claimed a year was the lowest since a given year
while the fetched series showed the opposite — and nothing in the toolkit caught it until this.
`checkStoryboard` surfaces a claim the data actively contradicts as a gate error; a claim it
cannot check comes back `unverifiable`, which is not an error — it is information the journalist
should see, never silently upgraded to "supported."

## When to use

- At the FRAMING→STORYBOARD handoff, once `whereIs` (Task 3, `skills/splash-twin/scripts/where.mjs`)
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
| Doctrine | `references/exchange.md` | The six movements of the editorial exchange, the five hand-of-the-journalist questions with their destinations, and the discipline list — what a conversation running this phase must actually do |
| Reader + gate | `scripts/storyboard.mjs` | `parseStoryboard(text)` splits front matter from prose; `checkStoryboard(meta)` — **one argument** — returns the list of reasons Gate 2 has not closed (empty means it has), reading only RECORDED scalars. `REQUIRED_SCALARS` and `REQUIRED_SLOT_FIELDS` are exported so the parity test can drive off them |
| Claim grounding | `scripts/ground-claim.mjs` | `groundTakeaway(takeaway, profile)` checks the confirmed takeaway's own numbers and year comparisons against the frozen data profile — a number is placed in a column's range **or** against a column's `sum` (a part-to-whole total), and a number it can place in neither is `unverifiable`, never `contradicted`. Not a fact-checker, not a conformance engine, one narrow class of error |
| Reachability | `scripts/genre-catalog.mjs` | `GENRE_CATALOG`, keyed on the **medium/genre PAIR**, and `genreGap(medium, genre)` — whether this kind of beat, in this genre, has both a producer and a delivery path. `genresFor(medium)` is what the genre gate (G2b) may offer. `image/web` and `image/video` are absent on purpose: no producer exists, and an absent row is what the journalist is told at the gate rather than at the last phase |
| Capability gate | `scripts/capability-gap.mjs` | `capabilityGap(capabilities, medium)` says whether a chosen slot's medium is one the environment can actually honour — a **carried copy** of `splash-twin`'s own function (see Files below), not an import |

## How it works (the shape)

1. **Restitution → the exchange runs** (`references/exchange.md`, movements ①–⑥): the claims read
   back, the confirmed takeaway, the journalist's hand (five questions, each landing somewhere
   named), the reference loop, the slots-and-candidates proposal, the beat brief. This is prose
   conducted in conversation — this skill's reference is what governs it, not code.
2. **The exchange writes `STORYBOARD.md`**: YAML front matter (`takeaway`, the hand-of-the-journalist
   fields, `slots: [{id, proves, medium, genre, candidates, chosen}, ...]`) above the prose the
   journalist actually reads.
3. **`parseStoryboard`** reads that file back: a dependency-free reader for the narrow YAML subset
   in use here — scalars (quoted or bare, with `null`/`~` resolved to a real missing value), and a
   list of slot maps whose values are scalars or quote-aware inline string arrays (a comma inside
   a quoted element, e.g. `["a, b", "c"]`, does not split it — a naive `.split(",")` would silently
   fragment a candidate name that happens to contain one).
4. **`checkStoryboard(meta)`** names every reason the gate has not closed: a missing or unconfirmed
   takeaway, any missing hand-of-the-journalist field, a missing or unresolved `grounding` verdict,
   a missing `reference`, zero slots (nothing would be produced), a slot missing its `medium`,
   `genre` or `size` (Gate 2's three sub-gates), a slot whose `reachable` is not `yes`, a slot with
   nothing chosen, a slot whose `chosen` value has no `candidates` ever listed to verify it against
   (malformed — a real choice can only be confirmed from a list that was actually shown), or a slot
   whose `chosen` value is not one of its own listed `candidates`. An empty array is the only
   "yes" — Gate 2 closes into this file, or it has not closed.

   **It takes ONE argument, and that is load-bearing.** It used to accept a `profile` and a
   `capabilities` argument and re-derive three expensive semantic checks from them —
   `groundTakeaway`, `genreGap`, `capabilityGap`. `where.mjs`'s own Gate-2 reading has neither
   argument, so it could not run any of the three, and the two gates disagreed for real: `whereIs`
   reported `production` on a storyboard this function was refusing
   (`twin/FEEDBACK-2026-08-10.md`, A7/A14). Each check now runs ONCE, in the phase that owns it —
   grounding at **G1**, genre and capability at **G2b** — and records its verdict into
   `STORYBOARD.md` (`grounding:`, and the slot's `reachable:`). Both gates read the record. Neither
   can run a check the other cannot, because neither runs one at all. Do not reintroduce a second
   argument here without adding the same reading to `where.mjs`; the parity test
   (`skills/splash-twin/test/where.test.ts`) generates its fixtures from both sides' exported
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
   part-to-whole takeaway ever written, and did refuse a real one
   (`twin/FEEDBACK-2026-08-10.md`, A13). Only a value that contradicts a fact this function DID
   establish — the year comparisons and the superlatives, which read real rows — stays
   `contradicted`. Everything else, including "first time" claims, comparisons the profile cannot
   resolve to a single value column, and phrasing shapes this function does not parse, comes back
   `unverifiable` with a reason, never silently `supported`.

## Quick start

```js
import { readFile } from "node:fs/promises";
import {
  parseStoryboard,
  checkStoryboard,
  groundTakeaway,
  genreGap,
  capabilityGap,
} from "./scripts/storyboard.mjs";

// At G1, the moment the takeaway is confirmed — BEFORE the journalist is asked to pick anything.
// The verdict is written into STORYBOARD.md as `grounding:`; a claim the data actually refutes is
// corrected here, or the journalist records `overridden — "<reason>"` and says why.
const profile = JSON.parse(await readFile("stories/annemasse-rain/source/profile.json", "utf8"));
const claims = groundTakeaway(confirmedTakeaway, profile);

// At G2b, once a medium and a genre have been offered and picked. The verdict is written into the
// slot as `reachable:`; a pair nothing can produce or deliver is refused HERE, at the gate, not
// three phases downstream at twin-deliver.
const { capabilities } = await runPreflight({ root, env: process.env, fetchFn: fetch });
const unreachable = genreGap(medium, genre) ?? capabilityGap(capabilities, medium);

// And the gate itself, which re-derives none of it — one argument, recorded scalars only.
const text = await readFile("stories/annemasse-rain/STORYBOARD.md", "utf8");
const { meta, prose } = parseStoryboard(text);
const errors = checkStoryboard(meta);

if (errors.length > 0) {
  // Gate 2 is not closed — surface `errors` to the exchange, do not proceed to production. An
  // ungrounded takeaway, an unanswered reference loop, and a slot whose medium/genre/size were
  // never chosen or never confirmed reachable are all among these reasons.
} else {
  // meta.slots[*].chosen names the candidate production reads.
}
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many hand-of-the-journalist fields are required | `6` (`HAND.length`: subject, comparison, limits, placement, credit, effectiveDate) | `scripts/storyboard.mjs` |
| Minimum slots before the storyboard can produce anything | `1` (`slots.length === 0` is the refusal threshold) | `checkStoryboard` |
| Fewest candidates a slot may list once something is `chosen` | `1` (`candidates.length === 0` refuses as malformed, not silently passed) | `checkStoryboard` |
| Leading spaces that mark a line as a slot's own field, not a top-level one | `4` (`/^\s{4,}[A-Za-z]+:/`) | `parseStoryboard` |
| How many numeric columns a comparison claim may resolve to before it is ambiguous | `1` (`findValueColumn`'s `candidates.length === 1` — more or fewer and the comparison comes back `unverifiable`, never guessed) | `scripts/ground-claim.mjs` |
| How far around a "highest/lowest ... ever" phrase this looks for the year to anchor on | `80` characters each side | `scripts/ground-claim.mjs`'s `SUPERLATIVE_EVER_RE` handling |
| How far a rounded total may sit from its column's exact sum and still resolve | `AGGREGATE_TOLERANCE` = `0.01` (relative, with an absolute floor of 0.5) | `scripts/ground-claim.mjs` |

## Files

- `references/exchange.md` — the six movements, the five hand-of-the-journalist questions with
  their destinations, and the discipline list. Read by every conversation running this phase.
- `scripts/storyboard.mjs` — `parseStoryboard`, `checkStoryboard`.
- `scripts/ground-claim.mjs` — `groundTakeaway`, the claim-grounding guard `checkStoryboard` calls
  when given a profile.
- `scripts/capability-gap.mjs` — `capabilityGap(capabilities, medium)`, the guard `checkStoryboard`
  calls when given `capabilities`. This is a **carried copy** of `splash-twin`'s own
  `capabilityGap` (`skills/splash-twin/scripts/preflight.mjs`), not an import — a skill directory
  has to stay copy-pasteable on its own, the same rule `genre-catalog.mjs` follows for
  `twin-deliver`'s `FORMS_BY_GENRE`. **Do not delete it as duplication**: `test/capability-gap-parity.test.ts`
  is the guard against the two copies drifting apart, and it is the reason this file is allowed to exist
  twice.
- `test/storyboard.test.ts` — `bun:test` coverage, including a regression test locking the
  `null`/`~` sentinel resolution described in the gotcha above, and the medium/capability gate.
- `test/ground-claim.test.ts` — `bun:test` coverage for `groundTakeaway`, including the real
  Norway/Swiss cases from `twin/TRIAL-THREE-BEATS.md` that motivated it.
- `test/capability-gap-parity.test.ts` — asserts this skill's `capabilityGap` copy agrees with
  `splash-twin`'s original across the full `{map, datawrapper, hostedEmbed} × {open, closed,
  absent}` matrix (the one place a cross-skill import is legitimate: a `test/` directory asserting
  two deliberate duplicates still agree — see `skills/splash-twin/test/helper-parity.test.ts`, the
  pattern this follows).
