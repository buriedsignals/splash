# Editorial chain spec — subject → proposal → direction, precision, choreography

Follows `2026-09-17-editorial-exchange-audit.md`. Closes its gaps 1–3. Spec only; no implementation here.

**The rule the chain exists to enforce.** A beat is produced from a *retained proposal*, not from a beat that
resembles it. What the journalist chose must be readable by code at every later step, and a step that stops
reading it must break a test, not degrade quietly.

**Two rulings this spec is built on.**
R-A. **One art direction per production run**, composed from `NEWSROOM.md` + the subject, inherited by all four
exports, redefinable by none. Catalogue proofs under `proof/` are the named exception: they render the three
filed directions (`docs/design-base/directions/{creme,nocturne,rapport}.md`) precisely to show the DA is a
parameter of the run.
R-B. **Precision and choreography are derived per export.** One composed frame, 579 frames, a reader's pointer
and a card-to-card travel do not assert the same things. Four derivations, four shapes, no shared implementation.

## 1. The chain, link by link

| # | Decided | Composed in | Recorded in | Read by |
|---|---|---|---|---|
| L1 | subject, data facts, claim grounding | `intake`; `propose.mjs:97 resolveGrounding`, `:226 groundingScalar` | `source/profile.json`; `STORYBOARD.md` scalars `grounding`, `claimShape` | **NEW**: L4 precision derivation (today: nobody) |
| L2 | what to produce — medium, format, size, type, intent, **interaction** | `propose.mjs:814/:860/:1107` (`proposeMediums`/`proposeFormats`/`formatCandidates`) + **NEW** wiring of `:341 visualCatalogueEntries` so each candidate carries the catalogue's `interaction {kind,promise}` | `STORYBOARD.md` slot; **NEW** slot field `interaction` in `gate-contract.mjs:79 REQUIRED_SLOT_FIELDS` | **NEW** `readRetained` (below) |
| L3 | the run's art direction | `shared/design-base/compose.mjs:559 composeDirections` (exists; today only prints a report) via **NEW** `composeRunDirection` | **NEW** `DIRECTION.md` at the story root, sibling of `PALETTE.md` | all four exports, through **NEW** `readRunDirection`, mirroring `colour.mjs:58 readPalette` |
| L4 | precision — rounding, what is asserted, label exactness | **NEW** `derivePrecision` in each export skill's own `scripts/precision.mjs` | beat `BRIEF.md` `## Precision` (section already exists, today hand-written) | that beat's renderer / verifier |
| L5 | choreography / interaction | **NEW** `deriveChoreography` in each export skill's own `scripts/choreography.mjs` (video already has a stub file) | beat `BRIEF.md` `## The choreography` (already exists, today hand-written) | that beat's runner, and the delivered-artifact guard `skills/splash/test/interaction-promises-are-kept.test.ts` |
| L6 | the beat's files | the 8 scaffolds (§4) | the beat directory | — |

Per export, L4/L5 resolve to:

- **static** (`chart-beat`, `map-beat` static, `image-beat`, `dw-beat`) — precision: one frame's rounding and the
  sentences that frame asserts. Choreography: `{kind:"none"}`, and the BRIEF carries **no** choreography table.
- **video** (`chart-video`, `map-beat` video) — precision: what is asserted *per shot*, and what may only be
  asserted on the hold. Choreography: the shot ladder (`establish/reference/reveal/subject/conclusion/hold`) from
  `skills/chart-video/references/directed-type-choreography.md`.
- **web** (`chart-web`, `map-web`) — precision: the floor the JS-off static frame asserts, plus the readings only
  revealed on demand. Choreography: the hover/tap/keyboard map from `references/directed-interaction.md`, with the
  promise string taken from L2's `interaction.promise` — the same string the delivered-artifact guard checks.
- **scrolly** (`scrolly`) — precision: what each card may assert given what is on screen at that card. Choreography:
  the card table with its gesture vocabulary (reveal by datum, filter, zoom, reorder, count).

## 2. Contracts

Shared, one canonical each, carried into skills per `carried-copies.test.ts` (line 1 `// twin/<path>`):

```js
// shared/editorial/retained.mjs                       — NEW
/** @typedef {{ kind: "none"|"time"|"pointer"|"scroll", promise: string }} Interaction */
/** @typedef {{
 *   slotId: string, proves: string, intent: string, language: string,
 *   medium: "chart"|"map"|"image", format: "static"|"video"|"web"|"scrolly",
 *   size: "landscape"|"square"|"portrait"|null, type: string,
 *   claim: { shape: string, grounding: "supported"|"unverifiable"|"overridden" },
 *   interaction: Interaction }} RetainedProposal */
export function retainedFrom(meta, slotId): RetainedProposal   // off gate-contract.mjs:324 parseStoryboard
export function readRetained(storyDir, slotId): RetainedProposal  // throws, naming the missing field
```

```js
// shared/design-base/run-direction.mjs                — NEW (thin over compose.mjs)
/** @typedef {{ id: string, origin: string, palette: object, registers: object, typefaces: object }} RunDirection */
export function composeRunDirection({ newsroom, filed, subject, textPerRegister, grounds }): { chosen: RunDirection, offered: RunDirection[], refused: object[] }
export function writeRunDirection(storyDir, chosen): void        // DIRECTION.md
export function readRunDirection(dir, { stopAt }): RunDirection  // signature mirrors colour.mjs:58 readPalette
```

Per-export derivations — **same two names, four different output types**, each in its own skill (skills never
import across a skill boundary):

```js
// skills/chart-beat/scripts/precision.mjs
export function derivePrecision(retained, { profile, data, size }): { rounding: {unit: string, digits: number}, asserted: string[], labels: { exactness: "as-rounded"|"exact", unitCarriedBy: "header"|"label" } }
// skills/chart-video/scripts/precision.mjs
export function derivePrecision(retained, { profile, data, shots }): { rounding, perShot: Array<{ shot: string, asserted: string[] }>, holdAsserts: string[] }
// skills/chart-web/scripts/precision.mjs
export function derivePrecision(retained, { profile, data }): { rounding, staticFloor: string[], onDemand: Array<{ reading: string, revealedBy: "hover"|"tap"|"focus" }> }
// skills/scrolly/scripts/precision.mjs
export function derivePrecision(retained, { profile, data, cards }): { rounding, perCard: Array<{ card: number, asserted: string[], onScreen: string[] }> }

// skills/chart-beat/scripts/choreography.mjs
export function deriveChoreography(retained, ctx): { kind: "none", readingOrder: string[] }
// skills/chart-video/scripts/choreography.mjs
export function deriveChoreography(retained, { type, seconds }): { kind: "time", shots: Array<{ shot: string, gesture: string, at: number, shows: string }> }
// skills/chart-web/scripts/choreography.mjs
export function deriveChoreography(retained, { type, readings }): { kind: "pointer", promise: string, hover, tap, keyboard, degradesTo: "static-frame" }
// skills/scrolly/scripts/choreography.mjs
export function deriveChoreography(retained, { type, cards }): { kind: "scroll", cards: Array<{ card: number, says: string, gesture: string, moves: string }> }
```

`grounding` is a *required* argument of every `derivePrecision`: `unverifiable` must widen rounding and strip the
claim from `asserted`; `overridden` must force the exactness note. That is the read L1 never had.

Renderers of both BRIEF sections live beside the derivation (`renderPrecisionSection`, `renderChoreographySection`)
so the file and the object can be compared byte for byte by test.

## 3. Breaking tests — one per link

| Test file | Asserts | Mutation that must fail it |
|---|---|---|
| `skills/storyboard/test/a-candidate-carries-its-interaction.test.ts` (**L2**) | every `formatCandidates` candidate carries the catalogue `interaction` for its `medium/format`; `visualCatalogueEntries` has a non-test caller; `interaction` ∈ `REQUIRED_SLOT_FIELDS` | drop `interaction` from the candidate, from the slot fields, or re-orphan `visualCatalogueEntries` |
| `skills/splash/test/a-production-run-has-one-direction.test.ts` (**L3**) | every story with beats has exactly one `DIRECTION.md`; no beat under `stories/` reaches `readdirSync(DIRECTIONS)` or names a direction id; `proof/` is exempt by explicit path, never by heuristic | make one production beat re-read the three filed directions, or add a second direction to a story |
| `skills/splash/test/every-export-derives-its-own-precision.test.ts` (**L4**) | the four `derivePrecision` exist, their output keys are pairwise distinct; each beat's `## Precision` is byte-equal to `renderPrecisionSection(derivePrecision(retained,…))`; flipping `grounding` to `unverifiable` changes the output | make two exports return the same shape; hand-edit a BRIEF Precision line; ignore `grounding` |
| `skills/splash/test/every-export-derives-its-own-choreography.test.ts` (**L5**) | same for `## The choreography`; static's plan is `{kind:"none"}` and its BRIEF has no choreography table; the gesture vocabularies of video and scrolly are disjoint where the formats differ; the web plan's `promise` equals the slot's recorded `interaction.promise` | paste a scrolly card table into a video beat; give a static beat a choreography table; edit the promise in one place only |
| `skills/splash/test/the-chain-is-read-end-to-end.test.ts` (**L1/L6, the link guard**) | on a fixture story, `readRetained → readRunDirection → derivePrecision → deriveChoreography` all resolve by *calling* them; each of the 8 scaffolds imports the derivation pair for its own format | delete the derivation import from any one scaffold — the drift that let the catalogue and the web export diverge |
| `skills/splash/test/skill-md-matches-code.test.ts` (**extend, existing**) | each export SKILL.md's run section names the derivation entry points it actually calls, and the section parses | rename `derivePrecision` without touching SKILL.md — the failure mode that left the scrolly run section unreadable for weeks |

## 4. Migration

- **The 160 beats under `proof/` change nothing.** They are catalogue proofs (R-A's exception): they keep rendering
  the three filed directions, their BRIEFs keep their hand-written sections, and the L3/L4/L5 tests exempt `proof/`
  by explicit path. Only the L5 *shape* checks (static has no table; vocabularies disjoint) run against them, and
  the current 160 already satisfy them.
- **Stories under `stories/` with a closed `STORYBOARD.md`** gain `interaction` by back-fill: `retainedFrom`
  resolves it from the catalogue given `medium` + `format`, so no gate reopens and no journalist is re-asked.
  `DIRECTION.md` is written on the run's first production, not retro-fitted.
- **The scaffolds are where the derivation is wired** — all eight: `chart-beat/scaffold-static-beat.mjs`,
  `map-beat/scaffold-static-map-beat.mjs`, `chart-video/scaffold-video-beat.mjs`,
  `map-beat/scaffold-map-video-beat.mjs`, `chart-web/scaffold-web-beat.mjs`, `map-web/scaffold-web-map-beat.mjs`,
  `scrolly/scaffold-scrolly-beat.mjs`, `scrolly/scaffold-scrolly-map-beat.mjs`. They are the only place a beat's
  files are written, and they already refuse on a missing `PALETTE.md` (`paletteReachable` /
  `paletteRefusalMessage`); the same refusal shape extends to a missing `DIRECTION.md` and a missing retained slot.
  `chart-beat/scripts/static-plumbing.mjs:175 composedDirectionDefault` — which already rewrites a copied
  three-direction loop into one composed direction — becomes the single-direction reader for `DIRECTION.md`, with
  `--filed` kept as the catalogue-only escape.
- Existing `BRIEF.md` files are never rewritten by the migration; a beat re-scaffolded after this lands gets
  generated sections and joins the byte-equality checks.

## 5. Out of scope

- The palette/typeface mechanism (`PALETTE.md`, `TYPEFACE.md`, `readPalette`): it already works end to end and is
  untouched — `DIRECTION.md` sits beside it, does not absorb it.
- Any unification of the four derivations behind one implementation: explicitly refused (R-B).
- New journalist questions beyond confirming the retained candidate's `interaction`; no redesign of the G1/G2
  exchange, no UI work.
- Re-rendering the 160 beats; editing the three filed directions; changing `EXPORT_SIZES` / the size gate.
- `producer-gate.mjs`'s custom-vs-Datawrapper split. `dw-beat` derives precision but has no choreography — rendering
  is delegated.
- Audit gap 4 (`map-beat/SKILL.md:283` says "VIDEO genre"): a one-line doc fix, not part of this chain.
