# Tom feedback — flow redesign, preflight, and the produce-all crash

**Date:** 2026-07-16
**Branch:** `feat/tom-feedback-spec` (based on `rd-dev`)
**Status:** validated design, pre-plan

## Context

Tom Vaillant (Buried Signals) ran the first fully external test of Splash: cloned `rd-dev`,
standard install, drove a real article ("apple-tariff-test") through the pipeline. Six feedback
points came back. Verdict: "pas foufou" — the pipeline died before he could evaluate the output,
and the flow fought his editorial instincts on the two structural questions (when to pick a
format, how many proposals to show).

This spec triages all six points into six work streams (C1–C6), ordered by what unblocks Tom
first. Two locked decisions are explicitly reversed (see below). Screenshots of the run are the
evidence base; the code anchors were verified against this branch.

### The six feedback points → streams

| # | Tom's point | Stream |
|---|---|---|
| 5 | Deployment failed, pipeline stopped (`Cannot find package 'react' from …/remotion/…/index.mjs`) | **C1** |
| 4 | Preflight never ran; never asked for a DW API key or a hosting choice | **C2** |
| 1 | Formatting asked too early; chart **type** is the important choice; format via a later cycle | **C3** |
| 2 | Only one recommendation; wants a selection, first one recommended with the why | **C4** |
| 3 | Text block with a few percentages → flat "not enough data"; no image-scrolly recognition | **C5** |
| 6 | Add scripted guardrails against data hallucination | **C6** |

### Locked decisions reversed by this spec

1. **2026-06-23 "② proposes just the best visual"** → reversed by C4. The suggester now emits a
   ranked list of every reachable type, first one recommended with an editorial why.
2. **CADRAGE Q3 channel question (channel asked at Gate 1, both branches)** → reversed by C3. The
   channel/format question moves to PROPOSITION, after the type choice. The single-format model
   (2026-07-10) itself is **kept** — one element = one pinned format, produced and delivered
   alone — but the pin becomes iterable via an explicit cycle-2 re-format path.

Everything downstream of the pin (channel sizes, `assertFormatAllowed`, off-embed ⇒ never
interactive, single-format produce) is unchanged.

---

## C1 — Fix the produce-all crash (Tom's #5)

### Root cause (verified)

`produce-all.mjs:6` → `validate-gate.ts:9-17` → `map-native/src/validate-config.ts:3` →
`route-geo.ts:2` (`import { TITLE_SCENE_FRAMES } from "./video-scene"`) → `video-scene.ts:5`
(`import { interpolate, Easing } from "remotion"`) → remotion's `index.mjs` imports `react`.

One shared constant re-exported from a Remotion module pulls the whole video runtime into the
**validation** closure — eagerly, at module load, before any producer is dispatched, even for a
batch that is 100 % Datawrapper. `remotion`/`react` are deps of `skills/map-native` only; a
standard clone where map-native's `node_modules` is missing or partial kills every `produce-all`
invocation at import time. This is exactly Tom's environment.

### Fix

- Extract `TITLE_SCENE_FRAMES` (and any other shared scene constant) into a runtime-free module
  `skills/map-native/src/scene-constants.ts`. Both `video-scene.ts` and `route-geo.ts` import it
  from there. `validate-config.ts`'s closure no longer reaches remotion.
- **Drift-guard test**: resolve the static import closure of `validate-gate.ts` and
  `produce-all.mjs`; FAIL if `remotion` or `react` appears anywhere in it. Same family as the
  anti-hang drift guard over the 21 video compositions — the whole class becomes structurally
  impossible, not just this instance.
- **Repro verification**: run `produce-all` on a dw-chart case with `skills/map-native/node_modules`
  absent (Tom's exact repro). Must pass.

## C2 — Mechanical preflight (Tom's #4)

Today nothing pipeline-side is named or acts as preflight (the only "preflight" is the release
gate `scripts/preflight-release.mjs`). Keys fail late and deep:
`DATAWRAPPER_API_TOKEN` throws lazily at the first API call mid-PRODUCTION
(`skills/dw-chart/src/datawrapper.ts:3-8`); `FLY_API_TOKEN` fail-fasts but only at EXPORT
(`deploy-embed.mjs:71-79`); MapTiler keys throw at component load
(`map-native/scripts/produce.mjs:49-79`).

### Design

A declarative **per-engine prerequisite manifest**, `skills/splash/src/preflight.ts`, checked at
two moments:

1. **At PROPOSITION** (engine candidates known): types whose engine is not ready are **annotated**
   in the ranked list ("needs a Datawrapper key — I'll guide you if you pick it"), never silently
   omitted.
2. **At dispatch** (`produce-all`, before production starts): fail-fast with a journalist-language
   message — which key, where to get it, where to put it (`/splash/.env`) — instead of the lazy
   throw mid-PRODUCTION.

Manifest contents per engine:
- required env vars: `DATAWRAPPER_API_TOKEN` (dw-chart, map-dw) ·
  `VITE_MAPTILER_KEY`/`REMOTION_MAPTILER_KEY` (map-native; mirror rule already exists) ·
  `FLY_API_TOKEN` (embed delivery form only, not the engine);
- **installed deps**: the skill's imports actually resolve (this, not a key, is what killed Tom's
  run). Cheap check: attempt resolution of each engine's entry module, or verify the workspace
  `node_modules` markers.

Single source of truth: reuse the key list the installer already writes
(`install/configurator-core.ts:45-49`). The manifest and the installer must not drift — one
module exports the list, both consume it.

**Out of scope for C2**: interactive key entry mid-pipeline. The key goes into `.env`; preflight
says exactly how. No new gate.

## C3 — Inverted flow: type first, format last, cycle-2 re-format (Tom's #1)

### Current state (anchors)

Q3 channel is asked in CADRAGE (Gate 1) on both branches (`skills/splash/SKILL.md:89-125`,
Q-label positions at `SKILL.md:40`); it fixes the allowed format set; the format pin is surfaced
once at PROPOSITION (`SKILL.md:117-123`, `suggest-chart/SKILL.md:108-113`);
`assertFormatAllowed(channel, format)` runs at produce (`produce-all.ts:103-104`); channel is
threaded to producers via `SPLASH_CHANNEL` (`adapters.ts:28-37`) and `withProposalChannel`
(`adapters.ts:152-158`).

### New flow

- **CADRAGE (Gate 1)** loses the channel question on BOTH branches (guided and DIRECT). Remaining:
  branch, takeaway (Gate 1b, unchanged, non-skippable), constraint. The SKILL.md question model is
  **rewritten, not patched** — question renumbering is a known-sensitive zone (Wave 11:
  anti-double-ask, real counting); the question-count rules and the harness driver contract are
  updated together.
- **PROPOSITION** becomes: ranked type selection (C4) → journalist picks the **type** → ONE
  question **"where will it live?"** (channel+format merged: the three channel options; format is
  derived — social ⇒ static/video at the channel's sizes, article-web ⇒ interactive by default —
  and announced for veto) → `spec.format` pinned → produce.
- **Downstream unchanged**: `normalizeChannel` stays fail-closed, `assertFormatAllowed` at
  produce, channel sizes, off-embed ⇒ never interactive. The guards just receive the channel
  later.

### Cycle-2 re-format

New explicit path on an already-delivered element: re-ask ONLY the "where will it live?"
question, re-pin the new format, re-produce into the same export dir (same accepted spec, same
data, same takeaway — no re-CADRAGE, no re-selection). This is Tom's ask verbatim ("si le
journaliste veut une version vidéo il peut relancer un cycle 2"). Delivery of the new format goes
through the same export forms (a/b/c) as any produce.

### Companion work (private repo)

The splash-harness driver answers Q3 in CADRAGE today; its cases and the question-count checks
must migrate with this change. Tracked as companion work, not part of this repo's gate.

## C4 — Full ranked selection at PROPOSITION (Tom's #2)

### Current state (anchors)

`suggest-chart` emits exactly ONE decision (`suggest-chart/SKILL.md:834-846`); Gate 2 is a veto
of an already-made decision, not a menu (`splash/SKILL.md:152-158`); "one opportunity = one
accept decision" (`SKILL.md:230-239`). There is no runtime candidate scorer.

### Design

- The suggester emits a **ranked list of ALL reachable types** for the opportunity. Reachable =
  mapper exists × data shape fits × deterministic guardrails pass (`guardrail-parity` filters
  BEFORE presentation — a type barred by a guard never appears).
- **Presentation in tiers, no raw scores**: ★ Recommended (1, full editorial why) · Solid (2-4,
  one line each) · Possible (rest, names only). Digestible for an unequipped newsroom, complete
  for a power user. Types whose engine fails preflight (C2) are annotated, not hidden.
- **One accept decision preserved**: choosing from the list replaces accept/edit/reject; "none" =
  veto. The full spec is built and the format pinned **only after** the choice (C3's "where will
  it live?" question follows). `no-chart` remains possible when nothing is reachable.

## C5 — image-scrolly engine (Tom's #3)

### The gap

A narrative text block with a few percentages gets a flat honest-data refusal ("The chosen claim
has only one usable number… not enough for an honest data visual"). The refusal is correct **for
charts** — but Splash has no engine for "make a text block visual", which is the Buried Signals
DNA (image scrolly). The suggester only knows data visuals.

### Design

- **New engine skill** in the canonical self-contained format: the journalist provides **their
  images + captions/beats**; Splash orchestrates a crossfade scrolly, reusing the existing
  `skills/scrolly` mechanism (orchestrator piloting a renderer; furniture inherited per the
  engine-furniture rule). Splash generates no images — editorial intent stays with the
  journalist.
- **Suggester recognition rule**: narrative text block (place, process, before/after) without
  sufficient tabular data → image-scrolly candidate in the ranked list (C4), with an explicit
  note of what the journalist must supply. The honest-data guard stays for charts, but it now
  leads to an alternative instead of a dead end.
- **v1 format**: interactive-scrolly only (video = follow-up). Single-format model applies
  unchanged.
- **Sequencing**: built last (see order below). Until the engine ships, the suggester does NOT
  propose it — we never propose what we cannot produce.

## C6 — Extended anti-hallucination guardrails (Tom's #6)

### Current state (anchors)

GUARD 4 claim-grounding exists (`validate-gate.ts:188-203`, impl `:328-378`): checks `spec.title`
+ `confirmedTakeaway` numeric/temporal claims against the CSV data domain. It no-ops for any
spec without parseable CSV `data` — so dw-chart + chart-native are covered; map-dw, map-native,
scrolly are not. Annotation grounding is dw-chart's separate y-domain tripwire
(`spec-to-metadata.ts:41-56`). Beat captions have their own checks.

### Design

- **Extend GUARD 4 to map paths**: read the value domain from the map spec's data values
  (GeoJSON properties / joined values) instead of bailing on non-CSV data. Same two checks
  (years vs time axis where applicable, values exceeding the max).
- **Cover chart-native annotations** with a y-domain tripwire mirroring dw-chart's.
- **Document what exists**: `docs/splash/guardrails.md` — the list of scripted guards
  (claim-grounding, annotation y-domain, beat captions, guardrail-parity, channel/format gates,
  contrast/label-fit snaps…) with what each catches. Tom's ask reveals the guards are invisible
  more than absent.

---

## Implementation order

**C1 → C2 → C3+C4 (coupled) → C6 → C5**

- C1 and C2 unblock Tom immediately (his run died on C1's bug and C2's missing preflight).
- C3 and C4 land together — same zone of `skills/splash/SKILL.md` + `suggest-chart/SKILL.md`,
  one coherent rewrite of the PROPOSITION stage; shipping them separately would rewrite the same
  question model twice.
- C6 is small and independent.
- C5 is the only genuinely new engine; it depends on C4's list (to be proposable) and is the
  largest chunk.

Each stream is its own plan task-group with its own review; the whole spec is one branch
programme (`feat/tom-feedback-spec` is the spec branch; implementation branches per stream).

## Out of scope

- Interactive key entry mid-pipeline (C2 points to `.env` instead).
- image-scrolly video format (v1 is interactive-scrolly only).
- Producing multiple formats in one cycle (single-format model stands; cycle-2 is the path).
- map-dw single-format over-produce (already in backlog, separate).
- Harness driver migration (private repo, companion work).

## Verification

- C1: drift-guard test (no remotion/react in validate closure) + Tom-repro run (dw produce with
  map-native deps absent).
- C2: unit tests on the manifest (each engine × missing key/dep → journalist-language failure,
  correct env var names); installer-list parity test (manifest keys == configurator keys).
- C3: gate tests on the rewritten question model (channel never asked in CADRAGE, asked once at
  PROPOSITION post-type-choice; cycle-2 re-format produces the second format without re-CADRAGE);
  `assertFormatAllowed` unchanged and still fail-hard.
- C4: suggester emits full reachable list (reachability = guardrail-parity filtered); tier
  presentation; pin only after choice.
- C5: engine self-contained format checks + scrolly furniture inheritance; suggester proposes it
  only once shipped.
- C6: GUARD 4 map-path coverage tests (claim exceeding joined-value max → fail loud);
  chart-native annotation tripwire test.
- Full `bun run check` green before each merge; render-verified where a visual changes.
