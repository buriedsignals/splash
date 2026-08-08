---
name: splash-twin
description: Use to run the doctrine twin end to end — recover a story's phase from its own directory, refuse any jump ahead of it, close each gate into a file, and dispatch to the one craft skill a beat actually needs. Never produces a visual itself; that is always the craft skill's job.
---

# splash-twin — the orchestrator, sequencing and nothing else

## Overview

Runs the whole journey (spec §4) without ever holding it in memory. `whereIs(storyDir)`
(`scripts/where.mjs`) reads a story's own directory and returns the one phase it is actually in —
so a session resuming three days later, or a completely different runtime, recovers the same phase
a human would read off the filesystem by eye. This skill has exactly **four responsibilities, and
no fifth**:

1. **Sequence the phases and refuse the jumps.** The next legal action is whatever `whereIs` says
   the current phase is, dispatched to the skill that owns it. There is no path from `intake`
   straight to `production`.
2. **Hold state on disk, never in memory.** A story's phase is a fact about its directory, not a
   fact this skill remembers across a conversation. Two sessions reading the same `storyDir` get the
   same phase every time, whether or not either of them saw the other happen.
3. **Make each gate close into a file.** A gate is "closed" when the file it writes exists and is
   valid — never when a conversation merely reads as though it agreed. `twin-storyboard`'s own
   gotcha about a truthy-but-not-confirmed takeaway is a direct instance of this rule: a gate that
   can be satisfied by a fact readable *only* from a transcript is not really closed.
4. **Dispatch to the craft skill.** This skill decides *which* skill runs next; it never runs the
   render itself. Production of any pixel, embed or video belongs entirely to the craft skill named
   by the chosen candidate's medium (SP1 ships one: `twin-chart-beat`, for `medium: chart, genre:
   static`).

This skill **produces nothing at runtime** — no artifact of its own, ever. Its entire value is the
sequencing discipline above and the test (`test/phases.test.ts`) that keeps this document and
`where.mjs` from drifting apart, the way `main`'s `SKILL.md` once kept promising a fallback the code
had stopped producing.

## When to use

- At the start of **every** turn of a doctrine-twin conversation, before doing anything else: call
  `whereIs(storyDir)` and let its `phase` decide what runs next. Never assume the phase from what the
  previous turn was doing.
- When a caller (human or agent) asks to skip a phase — refuse, and report `missing` verbatim.
  A missing prerequisite is **reported**, never argued around.
- Once per session, before any story exists: run `runPreflight` (`scripts/preflight.mjs`) —
  dependencies, `NEWSROOM.md`, and a **probed** (not merely present) `MAPTILER_KEY`. Silent when
  every check passes.
- **Not** for writing a chart, a map, a brief, or an export. Those are `twin-intake`,
  `twin-storyboard`, the craft skill, and `twin-deliver` respectively — this skill only decides
  which one of them runs next.

## The one gotcha that will waste your day (read first)

**A confirmed takeaway is G1, not G2 — and a resumed session that treats it as "storyboard done"
dispatches a producer against a contract nobody actually confirmed.** The concrete failure this
guards against: the editorial exchange writes a `takeaway` into `STORYBOARD.md`, then the session
is interrupted before the journalist's hand (all six fields — `subject`, `comparison`, `limits`,
`placement`, `credit`, `effectiveDate`) or the slots are filled in. Three days later a fresh session
calls `whereIs`. If it trusted the takeaway alone, it would report `production` — no renders or
exports exist yet either — and this skill's own dispatch table would send the craft skill straight
at a storyboard that `twin-storyboard`'s own `checkStoryboard` would refuse outright. `whereIs`
closes the gap: `missingForGate2` (in `where.mjs`) holds a story in the `storyboard` phase, naming every
reason in `missing`, until the takeaway **and** every hand field **and** every slot's `chosen` (each
one actually drawn from its own listed `candidates`) are present — the real G2 condition, not a
truthy takeaway standing in for it.

That condition is reimplemented in `where.mjs`'s own `missingForGate2`, not imported from
`twin-storyboard`'s `checkStoryboard` — this branch's runtime code never imports across a skill
boundary, only the file format two skills share. `where.mjs` already had precedent for this before
the fix: its `hasConfirmedTakeaway` and `twin-storyboard`'s null-sentinel handling were already two
independent readings of the same rule, cross-referenced by comment rather than unified by an import
(see that file's own `isNullSentinel` note). `HAND` and the slot/candidate check follow the same
pattern — and a reimplementation is exactly the shape of risk that got this document written in the
first place, so it does not rest on the comment alone. Two things are mechanically closed, by two
different tests, and neither claims more than it proves:

- **Every branch of `missingForGate2` is pinned directly** in `test/where.test.ts` (missing hand
  field, empty slots, an unchosen slot, a chosen value with no `candidates` key at all, a chosen
  value present but off the candidate list) — this catches a break in `where.mjs`'s *own* logic,
  the same way any other function's tests would.
- **A second, narrower test proves the two implementations still agree with each other.** Runtime
  code never crosses a skill boundary — this one test does, for exactly this reason: it imports
  `checkStoryboard`/`parseStoryboard` from `twin-storyboard` and feeds nine shared fixtures to both
  gates, asserting they reach the same open/closed verdict every time. This is the one that catches
  the failure a same-file mutation cannot: a rule changed on `checkStoryboard`'s side alone (a
  seventh `HAND` field added there, say) with `where.mjs` left untouched. Verified in both
  directions — a rule mutated on the `twin-storyboard` side only, and a rule mutated on the
  `where.mjs` side only, both turn this test red.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Phase recovery | `scripts/where.mjs` | `whereIs(storyDir)` — the state machine; the sole source of truth for "what phase is this story in". `missingForGate2` applies the real Gate 2 condition (takeaway, all six hand fields, every slot resolved) before ever reporting `production` |
| Preflight | `scripts/preflight.mjs` | `runPreflight({root, env, fetchFn})` — dependencies installed, `NEWSROOM.md` present and valid, `MAPTILER_KEY` **probed** with a real call, not just present. "Dependencies" covers both `bun install`-resolvable packages **and** the vendored craft files under the root's own `shared/` — a root missing either reports `fail`, naming what's missing |
| Key probes | `scripts/keys.mjs` | `probeMapTiler`, `probeDatawrapper` — a real network call each; a present key that answers 403 fails, exactly the failure a presence check would have missed |
| Charter reader | `scripts/newsroom.mjs` | `parseNewsroom`, `validateNewsroom` — the front matter of `NEWSROOM.md` (name, url, language, brandColor, ground, typefaces) |
| Workspace scaffolder | `scripts/new-story.mjs` | `slugify`, `createStory({root, title})` — the `stories/<slug>/{source,beats,export}` shape every later phase reads and writes into |

## How it works (the shape)

1. **Preflight runs once, silently when green** (`execute-shell` the dependency check, `read-file`
   `NEWSROOM.md`, `fetch` the MapTiler probe). Any check that is not `"pass"` is reported and the
   session stops there — a missing key, a missing `NEWSROOM.md`, or a present-but-failing key is
   **never** worked around by falling back to a default.
2. **Recover the phase.** `read-file` the story's own directory tree via `whereIs(storyDir)`. Its
   result is the entire input to every dispatch decision — nothing else is consulted, nothing is
   carried over from an earlier turn.
3. **The phase table** (spec §4, folded onto the six phases `whereIs` actually recovers — Preflight
   has no story directory yet to read state from, and Assembly, for SP1's single-beat stories, does
   not yet need a recoverable state of its own):

   | Phase | What happens | Gate | File the gate closes into |
   | --- | --- | --- | --- |
   | `intake` | Article and data frozen and profiled, silently — `twin-intake` asks nothing. | — | `source/article.md`, `source/profile.json` |
   | `framing` | Intent named, the editorial exchange opens, `STORYBOARD.md` is created. | G1 | `STORYBOARD.md` (created) |
   | `storyboard` | Restitution, the journalist's hand, the reference loop, slots and candidates — `twin-storyboard`'s exchange completes the contract. | G2 | `STORYBOARD.md`'s front matter carries a confirmed `takeaway`, all six hand-of-the-journalist fields, and every slot's `chosen` drawn from its own `candidates` |
   | `production` | Beat by beat: `BRIEF.md` written first, bespoke component written under doctrine, render ladder climbed one rung at a time, checklist applied to the pixels. | G3, per beat | `beats/<n>-<slug>/renders/*` |
   | `delivery` | Per beat, `twin-deliver` offers the forms its genre allows; the journalist chooses; only that one is materialised. | — | `export/*` |
   | `done` | Terminal — the story has been delivered. | — | (`export/` already holds the chosen form) |

4. **Dispatch, one `invoke-skill` per phase** — every action in this skill is named with an
   abstract verb, precisely so this doctrine can move to a different runtime without a rewrite.
   This skill uses four of spec §8's six verbs — `read-file` (a story's directory, `NEWSROOM.md`),
   `execute-shell` (the dependency check), `fetch` (the MapTiler probe), and `invoke-skill` (every
   dispatch below). It never uses the other two: `write-file` and `search` belong to the skills it
   dispatches to (`twin-intake` writes the frozen source, `twin-doctrine`'s reference loop searches
   for a new reference) — naming a verb this skill never itself performs would be decoration, not
   vocabulary:

   | Phase | `invoke-skill` |
   | --- | --- |
   | `intake` | `twin-intake` |
   | `framing`, `storyboard` | `twin-storyboard` (which itself reads `twin-doctrine`'s reference set for the reference loop, movement ④) |
   | `production` | the craft skill matching the chosen candidate's medium — SP1 ships `twin-chart-beat` for `medium: chart, genre: static`; other media are future sub-projects, not dispatched to because they do not exist yet |
   | `delivery` | `twin-deliver` |
   | `done` | nothing — report completion and stop |

5. **Production's turn budget and stall** (spec §8): a beat gets **three cycles** — implement,
   render, check against the pixel checklist, and if it fails, one targeted fix naming the cause.
   On the third failure, **stall**: hand back to the journalist with the gaps named and what was
   tried, rather than a fourth silent attempt or a self-declared win.
6. **The never-list** — every one of these is an absolute, not a preference:
   - This skill **produces nothing itself** — no chart, no map, no video, no HTML. That is always
     the craft skill it dispatched to.
   - It **writes no ad-hoc script** to patch around a gap it finds.
   - It **moves no artifact by hand** — a rendered file exists because a producer wrote it, or it
     does not exist; this skill never relocates, renames, or fabricates one to make a gate look
     closed.
   - It **never continues past a producer that exited non-zero.** A failed `execute-shell` call
     halts the phase right there.
   - **A missing prerequisite is reported and never designed around.** (`scripts/preflight.mjs`
     carries the same line verbatim, for the same reason.)

## Quick start

```js
import { whereIs } from "./scripts/where.mjs";

const { phase, missing } = await whereIs("stories/annemasse-rain");

const DISPATCH = {
  intake: "twin-intake",
  framing: "twin-storyboard",
  storyboard: "twin-storyboard",
  production: "twin-chart-beat", // or whichever craft skill the chosen candidate names
  delivery: "twin-deliver",
  done: null, // nothing left to dispatch
};

if (missing.length > 0) {
  // report `missing` verbatim and stop — never designed around, never guessed past.
} else if (DISPATCH[phase]) {
  // invoke-skill DISPATCH[phase], passing storyDir — this skill runs nothing else.
} else {
  // phase is "done" — report completion, dispatch nothing.
}
```

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| How many phases the state machine recognises | `6` (`intake`, `framing`, `storyboard`, `production`, `delivery`, `done`) | `scripts/where.mjs` |
| How many responsibilities this skill holds | `4`, and no fifth | this document, `Overview` |
| Source files intake must freeze before leaving `intake` | `2` (`article.md`, `profile.json`) | `whereIs` |
| Hand-of-the-journalist fields `whereIs` itself requires before leaving `storyboard` | `6` (`HAND.length` — mirrors `twin-storyboard`'s own `HAND` constant) | `scripts/where.mjs` |
| Turns a beat gets before production stalls | `3` | spec §8, `How it works` step 5 |

## Files

- `scripts/where.mjs` — `whereIs(storyDir)`, the six-phase recovery function.
- `scripts/preflight.mjs` — `runPreflight`, the once-per-session environment gate.
- `scripts/keys.mjs` — `probeMapTiler`, `probeDatawrapper`.
- `scripts/newsroom.mjs` — `parseNewsroom`, `validateNewsroom`.
- `scripts/new-story.mjs` — `slugify`, `createStory`.
- `assets/root-template/` — `package.json` (declares the root's npm dependencies **and** its
  `"imports": {"#shared/*": "./shared/*"}` subpath map), `tsconfig.json`, `NEWSROOM.example.md` —
  copied into a fresh Splash root. This is the whole install: there is no separate installer
  script, so what lands under this directory is exactly what a newsroom ends up with.
- `assets/root-template/shared/twin-chart-beat/{render-still.mjs,inspect-render.mjs}` — the
  vendored **mechanism** of `twin-chart-beat` (never its seed — that stays in the skill, read as
  documentation, not copied). Physical copies, checked in, so the plain `cp -r root-template/`
  install carries them along with no extra step; a beat imports the copy that lands at
  `<root>/shared/twin-chart-beat/render-still.mjs` as `#shared/twin-chart-beat/render-still.mjs`,
  resolved by the root's own `package.json`, the same specifier regardless of how deep the beat
  sits under `stories/<slug>/beats/<n>-<name>/`. This closes the gap named in `TRIAL-THREE-BEATS.md`
  §4 and `PROOF.md` §1: a beat no longer imports craft code by an absolute path into this
  repository, so a fresh root works on a machine that has never seen it.
- `test/{where,preflight,keys,newsroom,new-story}.test.ts` — `bun:test` coverage for each script
  above. `where.test.ts` also carries this skill's one deliberate exception to "no cross-skill
  imports": a `checkStoryboard`/`parseStoryboard` import from `twin-storyboard`, used only to
  assert the two gates agree on nine shared fixtures — never in runtime code.
- `test/root-template-shared.test.ts` — a second, narrower cross-skill read for the same reason:
  asserts the vendored copies above stay byte-identical to `twin-chart-beat/scripts/*`, so an edit
  to the canonical mechanism can't silently leave the vendored copy stale.
- `test/phases.test.ts` — drives `whereIs` through a real story directory across all six phases and
  asserts this document names every phase it actually returned, never a phase it did not.
