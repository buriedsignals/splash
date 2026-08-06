---
name: twin-storyboard
description: Use to run the STORYBOARD phase of the doctrine twin — the editorial exchange (restitution, the confirmed takeaway, the journalist's hand, the reference loop, slots and candidates) that closes Gate 2 by writing STORYBOARD.md, never by conversation alone.
---

# twin-storyboard — the editorial contract, closed into a file

## Overview

Runs the STORYBOARD phase: the six-movement editorial exchange (`references/exchange.md`) that
turns an article's claims into an ordered list of **slots**, each carrying **one to n candidate
treatments**, one of them **chosen**. This skill **proposes — it does not interrogate.** It gives
back what it read, asks one question at a time, always with a recommendation attached, and never
fills a field the journalist should have filled themselves. `scripts/storyboard.mjs` is the
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
this codebase must agree on which one they mean.** `where.mjs`'s `hasConfirmedTakeaway` refuses
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
| Reader + gate | `scripts/storyboard.mjs` | `parseStoryboard(text)` splits front matter from prose; `checkStoryboard(meta)` returns the list of reasons Gate 2 has not closed (empty means it has) |

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
4. **`checkStoryboard`** names every reason the gate has not closed: a missing or unconfirmed
   takeaway, any missing hand-of-the-journalist field, zero slots (nothing would be produced), a
   slot with nothing chosen, a slot whose `chosen` value has no `candidates` ever listed to verify
   it against (malformed — a real choice can only be confirmed from a list that was actually
   shown), or a slot whose `chosen` value is not one of its own listed `candidates`. An empty array
   is the only "yes" — Gate 2 closes into this file, or it has not closed.

## Quick start

```js
import { readFile } from "node:fs/promises";
import { parseStoryboard, checkStoryboard } from "./scripts/storyboard.mjs";

const text = await readFile("stories/annemasse-rain/STORYBOARD.md", "utf8");
const { meta, prose } = parseStoryboard(text);
const errors = checkStoryboard(meta);

if (errors.length > 0) {
  // Gate 2 is not closed — surface `errors` to the exchange, do not proceed to production.
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

## Files

- `references/exchange.md` — the six movements, the five hand-of-the-journalist questions with
  their destinations, and the discipline list. Read by every conversation running this phase.
- `scripts/storyboard.mjs` — `parseStoryboard`, `checkStoryboard`.
- `test/storyboard.test.ts` — `bun:test` coverage, including a regression test locking the
  `null`/`~` sentinel resolution described in the gotcha above.
