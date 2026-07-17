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

1. **2026-06-23 "② proposes just the best visual"** → reversed by C4. The suggester now emits
   multiple proposals per opportunity, each with its editorial why, first one recommended.
2. **CADRAGE question order** → restructured by C3 (Rémy's canonical 12-step sequence,
   2026-07-16, which supersedes the earlier "channel moves after the type choice" draft): the
   channel question STAYS in CADRAGE but moves LAST — after takeaway, prose-table, source and
   constraints — so data truth is established before anything is routed, and every proposal is
   channel-aware when emitted. There is NO standalone format question anywhere: the format is
   derived (channel × type), announced for veto with the chosen proposal; an explicit
   journalist signal ("statique", "print") always wins. The single-format model (2026-07-10)
   is **kept** — one element = one pinned format, produced and delivered alone — and becomes
   iterable via the proactive post-export other-format offer (step 12).

Everything downstream of the pin (channel sizes, `assertFormatAllowed`, off-embed ⇒ never
interactive, single-format produce) is unchanged.

### The canonical question sequence (Rémy, 2026-07-16 — source of truth for C3+C4)

1. **Read the journalist's prompt.**
2. **No article supplied → ask for it** (new explicit INPUT ask; a bare topic no longer walks
   straight into dataset-naming).
3. **Intent unclear → ask**: "do you already have a precise idea, or should I guide you?"
   (conditional — a clearly named visual skips to a confirm-back, as today).
4. **Takeaway** — "what is the ONE thing the reader must retain?" (GATE 1b, unchanged:
   verbatim, non-skippable, one per element).
5. **Data truth, before any routing**: if figures come from prose → confirm the reconstructed
   table (GATE 2b, prose-only); then ask the source (GATE 2c, ALWAYS — CSV-provided data needs
   its "Source:" line too). Two successive prompts, never bundled into one.
6. **Constraints** — mobile-first, deadline, house style (conditional, as today).
7. **Channel** — "where will it be published?" (the same three options; now the LAST CADRAGE
   question, informing the proposals that follow).
8. **PROPOSITIONS — plural, batched**: for the article's opportunities, present ALL proposals
   in ONE message — per opportunity, its chart/map candidates, each explained (what it shows,
   why it can be interesting), the first one recommended. One accept decision per opportunity
   (invariant kept) but NO per-opportunity question loop. The chosen proposal's derived format
   is announced for veto here.
9. **Produce** the accepted visual(s).
10. **Satisfaction** — GATE 3 ship-it on the REAL render (unchanged).
11. **If interactive → the three delivery forms** (GATE 4 a/b/c, unchanged).
12. **Once exported, proactively offer another format** of the same element (cycle 2 — splash
    offers; the journalist doesn't have to know to ask). A yes re-runs ONLY steps 7'→9 (a
    one-line channel/format re-pin on a new `<id>-<format>` entry), never re-CADRAGE.

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

**Tri-state persisted statuses (Spotlight practice, `docs/splash/spotlight-learnings.md` A2):**
each engine's preflight result is a status OBJECT `{status: green|yellow|red, checkedAt,
reason}` persisted per project (`.splash-preflight.json`), never a transient boolean —
`yellow` = degraded-but-announced (engine annotated in the proposals), `red` = blocking at
dispatch for that engine only. The PROPOSITION-time CLI reads the persisted file instead of
re-probing every run.

Single source of truth: reuse the key list the installer already writes
(`install/configurator-core.ts:45-49`). The manifest and the installer must not drift — one
module exports the list, both consume it.

**~~Out of scope for C2: interactive key entry mid-pipeline~~ — REVERSED (Rémy, 2026-07-17,
implemented):** missing keys are a PREREQUISITE collected IN the flow. At INPUT on a fresh
install (and again at Stage 2 when the chosen candidate's engine is yellow), splash asks for
the key (one free-text prompt, the preflight `reason` carries the get-it URL) and saves it via
the mechanical seam `skills/splash/scripts/save-key.mjs` — manifest-gated names only, quoted +
newline-stripped values (installer escaping rule), `.env` chmod 0600, MapTiler mirror pair kept
in sync, the value never echoed back. Production never starts on a non-green engine; `red`
(deps) stays non-key-fixable (bun install instruction + stall options).

## C3 — The 12-step question sequence (Tom's #1, arbitrated by Rémy)

### Current state (anchors)

Q3 channel is asked mid-CADRAGE, before data truth (`skills/splash/SKILL.md:89-125`, Q-label
positions at `SKILL.md:40`); GATE 2b (prose table) and GATE 2c (source) fire late, at
PROPOSITION (`SKILL.md:247-257` and the 2c block) — a bad table invalidates an already-routed
proposal; there is no explicit ask-for-the-article INPUT step; nothing offers another format
after export. `assertFormatAllowed(channel, format)` runs at produce (`produce-all.ts:103-104`);
channel is threaded via `SPLASH_CHANNEL` (`adapters.ts:28-37`) and `withProposalChannel`
(`adapters.ts:152-158`).

### New flow — the canonical sequence (see "The canonical question sequence" above)

- **INPUT**: no article → ask for it (step 2). Intent unclear → branch question (step 3,
  conditional; a named visual keeps today's confirm-back inference).
- **CADRAGE reordered, channel LAST**: takeaway (4, GATE 1b unchanged) → prose table if prose
  (5a, GATE 2b relocated here) → source ALWAYS (5b, GATE 2c relocated here) → constraints (6,
  conditional) → channel (7, same three options, now informed-by and informing everything).
  Data truth is established BEFORE any routing — a wrong table can no longer invalidate a
  routed proposal. The SKILL.md question model is **rewritten, not patched** (Wave 11 lesson:
  renumbering is a known-sensitive zone; question-count rules and the harness driver contract
  move together).
- **No standalone format question**: the format derives from channel × type and is announced
  for veto with the chosen proposal (step 8); an explicit journalist signal ("statique",
  "print") wins, as today.
- **Downstream unchanged**: `normalizeChannel` fail-closed, `assertFormatAllowed` at produce,
  channel sizes, off-embed ⇒ never interactive.

### Step 12 — proactive other-format offer (cycle 2)

After every export, splash OFFERS another format of the same element ("tu la veux aussi en
vidéo pour Instagram ?") — the journalist doesn't have to know to ask. A yes re-runs ONLY the
channel/format re-pin (one line) + produce + Gate 3 on a NEW `accepted.json` entry
`<original-id>-<new-format>` (same spec/takeaway/source copied verbatim; new id ⇒ `freshOutDir`
can never wipe the first delivery). No re-CADRAGE, no re-selection. Delivery goes through the
same export forms (a/b/c) as any produce.

### Orchestration hardening riding the same SKILL.md rewrite (Spotlight practices)

Three sections adopted from Tom's Spotlight orchestrator (study 2026-07-16,
`docs/splash/spotlight-learnings.md` A1/A3/A4) land in the same rewrite:

- **Context recovery** (A1): a resume table keyed on artifact PRESENCE in `exports/<slug>/`
  (no `accepted.json` → CADRAGE/PROPOSITION · `accepted.json` without `report.json` →
  PRODUCTION · `report.json` without `*-export/` → EXPORT · `*-export/` present → step-12
  offer) so an interrupted run reconstitutes its position from `ls`, never from memory.
  Declined choices leave marker files, not just conversation turns.
- **Bounded-retry discipline** (A3): a non-zero produce/validate is retried ONCE, quoting the
  error verbatim, shape-only fixes; otherwise STOP and present the failure honestly — never
  worked around (the exact improvisation Tom's run exhibited).
- **Stall protocol** (A4): after 2 produce failures (or 2 successive Gate-3 rejections) on one
  element, a SCRIPTED stop: « Je bloque sur {élément} : {raison}. Options : (a) un autre type
  de la sélection, (b) abandonner cet élément, (c) me donner une consigne précise. » — the
  model fills the gaps, never invents when to give up.

### Companion work (private repo)

The splash-harness driver answers the channel at its old CADRAGE position and never sees
batched proposals or the step-12 offer; its cases and question-count checks must migrate with
this change. Tracked as companion work, not part of this repo's gate.

## C4 — Multiple proposals, batched, each with its why (Tom's #2)

### Current state (anchors)

`suggest-chart` emits exactly ONE decision (`suggest-chart/SKILL.md:834-846`); Gate 2 is a veto
of an already-made decision, not a menu (`splash/SKILL.md:152-158`); "one opportunity = one
accept decision" (`SKILL.md:230-239`). There is no runtime candidate scorer.

### Design

- Per opportunity, the suggester emits **multiple reachable candidates** (charts AND maps),
  each with its editorial why ("en quoi chacune peut être intéressante"), the first one
  recommended. Reachable = mapper exists × data shape fits × deterministic guardrails pass
  (`guardrail-parity` filters BEFORE presentation — a guard-barred type never appears) ×
  channel-compatible (the channel is KNOWN by step 8 — candidates never carry a format the
  channel forbids). Types whose engine fails preflight (C2) are annotated, not hidden.
- **Batched presentation across opportunities**: ALL proposals land in ONE message — per
  opportunity, its candidate list — never a per-opportunity question loop (Rémy, 2026-07-16).
  The journalist answers for each opportunity (pick a candidate / "aucun"); each kept
  opportunity remains its own accept decision and its own `accepted.json` entry (invariant
  kept).
- The full spec is built and the single format pinned only after the choice, announced for
  veto in the same breath. `no-chart` remains possible when nothing is reachable — and with
  C5, the image-scrolly candidate turns the data-poor dead-end into an alternative.
- **Mechanical sub-skill proof** (Spotlight practice A5, `docs/splash/spotlight-learnings.md`):
  `AcceptedProposal` gains `skillsInvoked: string[]` (emitted at §5b like
  `channel`/`confirmedTakeaway`); `validate-gate` warns when absent and fails a guided-branch
  proposal that doesn't list `suggest-chart` — "invoke as a real Skill call" stops being
  trust-only prose.

## C5 — image-scrolly engine (Tom's #3)

### The gap

A narrative text block with a few percentages gets a flat honest-data refusal ("The chosen claim
has only one usable number… not enough for an honest data visual"). The refusal is correct **for
charts** — but Splash has no engine for "make a text block visual", which is the Buried Signals
DNA (image scrolly). The suggester only knows data visuals.

### Design

- **The engine is already half-built — resume it, don't redesign it.** A validated design exists
  (`docs/superpowers/specs/2026-07-10-image-scrolly-design.md`, written with Tom's scope decision
  "Splash formats images, never generates them") plus a phase-1 plan
  (`docs/superpowers/plans/2026-07-10-image-scrolly.md`, 7 tasks, delivered: the
  `skills/image-native` data contract — `ImageStory` schema + conformance + tests, registered in
  the root gate). What remains is phase 2: the deterministic producers (`prep-images`, static
  key-frame, `ScrollyImage.tsx` in `skills/scrolly`), the `suggest-image` orchestration skill
  (vision for matching/ordering ONLY; caption words come from the article), and splash routing.
  The journalist provides **their images + article**; Splash formats, orders (vetoable), renders.
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

- **Extend GUARD 4 to map-native**: its configs carry `rows: Record<string, string|number>[]` +
  `valueField` (`choropleth-geo.ts`), not CSV — read the value domain from `rows[valueField]`
  instead of bailing. Same value-exceeds-max check. (`map-dw`'s `MapSpec.data` IS CSV text per
  the adapters contract, so GUARD 4 likely already bites there — prove it with a test rather
  than assume either way.)
- **chart-native**: no `annotations` field exists on `NativeSpec`; its narrative `beats` are
  already anchor-validated fail-loud (`narrativeBeatErrors`). Nothing to add there.
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
- C3: doc-parity tests on the rewritten question model (12-step order: article-ask → takeaway →
  table/source → constraints → channel LAST in CADRAGE; no standalone format question; step-12
  proactive offer present; cycle-2 re-pin produces the second format without re-CADRAGE on its
  own `<id>-<format>` outDir); `assertFormatAllowed` unchanged and still fail-hard.
- C4: suggester emits multiple channel-aware candidates per opportunity, each with a why, first
  recommended (reachability = guardrail-parity filtered); ALL opportunities batched in one
  presentation; pin only after choice. Harness: `check:single-proposal-no-alternatives` flips
  red → green on the candidates payload.
- C5: engine self-contained format checks + scrolly furniture inheritance; suggester proposes it
  only once shipped.
- C6: GUARD 4 map-native coverage tests (claim exceeding the `rows[valueField]` max → fail
  loud); a test proving (or disproving) existing map-dw CSV coverage.
- Full `bun run check` green before each merge; render-verified where a visual changes.
