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

**The phase named `framing` and the phase named `storyboard` do not split the work the way their
names suggest.** Read `where.mjs` closely: `framing` is reported whenever `STORYBOARD.md` does not
exist yet on disk — *before* a single word of it has been written, takeaway included. `storyboard`
is reported once the file exists, for as long as its front matter has no confirmed `takeaway`. So
the transition **out of** `framing` is gated on the file merely existing, and the transition **out
of** `storyboard` is gated on the takeaway inside that same file being confirmed — not on the
richer G2 checklist (`twin-storyboard`'s own `checkStoryboard`: the journalist's hand, the reference
loop, every slot resolved) that skill enforces during the actual exchange. If you assume `framing`
closes on the confirmed takeaway (matching spec §4's G1 row) and `storyboard` closes on the full
contract (G2), you will misread what `whereIs` is actually telling you to resume. `whereIs` is a
**light** recovery check — good enough to say "there is unfinished work here, and roughly where" —
not a re-run of `checkStoryboard`'s full gate. Trust `checkStoryboard` for whether G2 has genuinely
closed; trust `whereIs` only for which skill to dispatch to next.

## Architecture

| Layer | File | Role |
| --- | --- | --- |
| Phase recovery | `scripts/where.mjs` | `whereIs(storyDir)` — the state machine; the sole source of truth for "what phase is this story in" |
| Preflight | `scripts/preflight.mjs` | `runPreflight({root, env, fetchFn})` — dependencies installed, `NEWSROOM.md` present and valid, `MAPTILER_KEY` **probed** with a real call, not just present |
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
   | `storyboard` | Restitution, the journalist's hand, the reference loop, slots and candidates — `twin-storyboard`'s exchange completes the contract. | G2 | `STORYBOARD.md`'s front matter carries a confirmed `takeaway` |
   | `production` | Beat by beat: `BRIEF.md` written first, bespoke component written under doctrine, render ladder climbed one rung at a time, checklist applied to the pixels. | G3, per beat | `beats/<n>-<slug>/renders/*` |
   | `delivery` | Per beat, `twin-deliver` offers the forms its genre allows; the journalist chooses; only that one is materialised. | — | `export/*` |
   | `done` | Terminal — the story has been delivered. | — | (`export/` already holds the chosen form) |

4. **Dispatch, one `invoke-skill` per phase** — every action in this skill is named with the
   abstract verb vocabulary (`read-file`, `write-file`, `execute-shell`, `search`, `fetch`,
   `invoke-skill`) precisely so this doctrine can leave Claude Code for a different runtime without
   a rewrite:

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
| Turns a beat gets before production stalls | `3` | spec §8, `How it works` step 5 |

## Files

- `scripts/where.mjs` — `whereIs(storyDir)`, the six-phase recovery function.
- `scripts/preflight.mjs` — `runPreflight`, the once-per-session environment gate.
- `scripts/keys.mjs` — `probeMapTiler`, `probeDatawrapper`.
- `scripts/newsroom.mjs` — `parseNewsroom`, `validateNewsroom`.
- `scripts/new-story.mjs` — `slugify`, `createStory`.
- `assets/root-template/` — `package.json`, `tsconfig.json`, `NEWSROOM.example.md` copied into a
  fresh Splash root.
- `test/{where,preflight,keys,newsroom,new-story}.test.ts` — `bun:test` coverage for each script
  above.
- `test/phases.test.ts` — drives `whereIs` through a real story directory across all six phases and
  asserts this document names every phase it actually returned, never a phase it did not.
