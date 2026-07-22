# S2-slice-2 — Map claim-arc parity (workhorse-first) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Give the journalist claim-arc control over the two workhorse map story types (choropleth `deriveMapStory` + symbol `deriveSymbolStory`) via an `arcBeats` override — the map analogue of chart-native's `spec.beats` — while all map story types gain the `Beat.role` model for consistency; the other 4 derivers' override is a documented follow-up.

**Architecture:** `arcErrors` is engine-agnostic, so it moves to `lib/core/claim-arc.ts` (the sanctioned shared barrel — engines can't import each other's `src/`). Both engines import it; chart-native re-exports it so slice-1's tests keep passing. A map spec gains `arcBeats?: MapArcBeat[]` (`{region, role?, text?}`); a shared `applyMapArc(arcBeats, resolve)` helper builds the ordered reveal `Beat`s (role + claim), delegating anchor→camera/highlight resolution to each deriver's callback. Absent `arcBeats` ⇒ the existing salience derivation, byte-identical.

**Tech Stack:** Bun, TypeScript, `bun:test`.

## Global Constraints
- Runtime **Bun** only. Tests `bun:test`. **TDD**: failing test before impl.
- Code/comments/commits: **English**. NO Claude/Anthropic mention; no `Co-Authored-By`. **No new `any`**.
- **Gate green each task**: `bun run check` passes before every commit. Typecheck via `cd skills/<skill> && bunx tsc --noEmit` (NEVER `-p` from repo root). A fresh worktree needs per-skill `bun install` (map-native, chart-native, splash at minimum) + root `bun install` + a copied `.env`.
- **Behaviour-preserving**: a map story with NO `arcBeats` renders BYTE-IDENTICALLY to today (both choropleth and symbol). Only a present `arcBeats` changes the reveal sequence; only its absence adds a non-blocking warning.
- **Field name is `arcBeats`** (NOT `storyBeats` — `conformance.ts:148` already uses `storyBeats` for a beat count).
- **Honest scope**: only choropleth + symbol accept `arcBeats` this slice. SKILL.md must NOT promise an override on route/cartogram/dot-density/hex-grid/locator (they get `Beat.role` only).
- Work on a dedicated branch off `main` (created in Task 0).

---

### Task 0: Branch + read the map story chain

**Files:** none (setup + read).

- [ ] **Step 1: Create the branch off main**
```bash
cd /Users/rmdms/Sites/Professional/splash-merge && git checkout -b feat/map-claim-arc-parity
```
- [ ] **Step 2: Read (MUST read before Task 1):**
  - `skills/chart-native/src/chart-story.ts` — `ARC_ROLES`/`ArcRole`/`arcErrors` (the block to extract; note it's exported and used by `narrativeBeatErrors` locally + imported by `validate-gate.ts`).
  - `lib/core/index.ts` (barrel: `export * from "./<module>"`) + any existing `lib/core/*.ts` for the module style; `skills/chart-native/src/manifest.ts:7` shows an engine importing `../../../lib/core/registry`.
  - `skills/map-native/src/map-story.ts` — `Beat` (line 9), `deriveMapStory` (line 83): title/establish beats, `revealRows` chosen by `temporalRevealRows`/`magnitudeRevealRows`, each reveal Beat built with `camera: cameraOf(key)`, `highlight: [key]`, `callout`, `copy`; the concluding `takeaway` beat (~line 236). `cameraOf(key)`/`nameOf(key)`/`fmt(value)` are the anchor-resolution closures.
  - `skills/map-native/src/symbol-story.ts` — `deriveSymbolStory` (line 24): title/establish, reveals from `sorted` points (by value desc, capped), each reveal camera = a `CITY_DELTA` box around `p.lon/p.lat`, `highlight: [name]` where `name = p.label`. `SymbolPoint` shape + `SymbolStoryMeta`.
  - `skills/map-native/src/validate-config.ts` — `validateChoroplethConfig` (~line 136) + `validateSymbolConfig` (~line 255): where per-type validation lives + how `regionKey`/`valueField`/rows or points are read (to check an `arcBeats` region exists).
  - `skills/splash/src/validate-gate.ts:100-128` — `validateScrolly`: the chart track validates `narrativeBeatErrors` + `narrativeFallbackWarning`; the map track (~line 121) REJECTS `beats`. This is where `arcBeats` validation + the map fallback warning wire in.
  - The config→deriver seam: `rg -n "deriveMapStory\(|deriveSymbolStory\(" skills/map-native skills/scrolly` — find where each is CALLED with the config so you know where `arcBeats` threads from (the produced config → meta/args).

---

### Task 1: extract `arcErrors` to `lib/core/claim-arc.ts`

**Files:**
- Create: `lib/core/claim-arc.ts`
- Modify: `lib/core/index.ts` (barrel export)
- Modify: `skills/chart-native/src/chart-story.ts` (import + re-export from lib/core; delete the local copy)
- Test: `lib/core/claim-arc.test.ts` (new — golden cases for `arcErrors`)

**Interfaces:**
- Produces: `lib/core/claim-arc.ts` exporting `ARC_ROLES: readonly ["establish","build","turn","payoff"]`, `type ArcRole`, `arcErrors(beats: { role?: ArcRole; text?: string }[]): string[]` — MOVED VERBATIM from chart-story.ts (same logic, same messages). `chart-story.ts` re-exports them (`export { ARC_ROLES, arcErrors, type ArcRole } from "../../../lib/core/claim-arc";`) so its own `narrativeBeatErrors` and `validate-gate.ts`'s import keep resolving.

- [ ] **Step 1: Write `lib/core/claim-arc.test.ts`** — golden cases mirroring chart-native's arc tests but importing from `./claim-arc`: well-formed arc → `[]`; no-establish-open → error; no-payoff-close → error; no-build → error; >1 turn → error; half-arc → error; empty-claim → error; no-role (legacy) → `[]`. Run `cd lib/core && bunx tsc --noEmit && bun test claim-arc.test.ts` (or the repo's lib test runner) → FAIL (module absent).
- [ ] **Step 2: Create `lib/core/claim-arc.ts`** — cut `ARC_ROLES`, `ArcRole`, `arcErrors` VERBATIM from `chart-story.ts` (keep the Cohn/Amini comment). Add `export * from "./claim-arc";` to `lib/core/index.ts`.
- [ ] **Step 3: Rewire `chart-story.ts`** — delete the local `ARC_ROLES`/`ArcRole`/`arcErrors`, add `export { ARC_ROLES, arcErrors, type ArcRole } from "../../../lib/core/claim-arc";` (confirm the relative depth from `skills/chart-native/src/` to `lib/core/` — it is `../../../lib/core`). `narrativeBeatErrors` still calls `arcErrors(beats)` (now the imported one).
- [ ] **Step 4: Prove no regression.** `cd skills/chart-native && bunx tsc --noEmit && bun test tests/claim-arc.test.ts` → the slice-1 tests still PASS unchanged. `cd lib/core && bun test claim-arc.test.ts` → PASS.
- [ ] **Step 5: Commit.** `git commit -am "refactor(lib/core): extract arcErrors to lib/core/claim-arc (shared by chart-native + map-native)"`

---

### Task 2: `Beat.role` + `MapArcBeat` + `arcBeats` + per-type validation (choropleth + symbol)

**Files:**
- Modify: `skills/map-native/src/map-story.ts` (`Beat.role`; export `MapArcBeat`)
- Modify: `skills/map-native/src/validate-config.ts` (validate `arcBeats` in `validateChoroplethConfig` + `validateSymbolConfig`)
- Test: `skills/map-native/src/claim-arc-map.test.ts` (new) — follow map-native's existing test-file convention (grep where map-native tests live: `src/` per `map-story.test.ts`).

**Interfaces:**
- Produces: `Beat.role?: ArcRole` (import `ArcRole` from `../../../lib/core/claim-arc`). `export interface MapArcBeat { region: string; role?: ArcRole; text?: string }`. The choropleth + symbol configs accept `arcBeats?: MapArcBeat[]`.
- Produces: `mapArcErrors(arcBeats: MapArcBeat[], validRegions: string[]): string[]` — a small map wrapper: each `region` must be in `validRegions` (fail-loud, message lists a bounded sample like chart's `listValidAnchors`), then `...arcErrors(arcBeats)` for the arc shape. Returns `[]` when `arcBeats` is empty/absent.

- [ ] **Step 1: Write the failing tests** — `claim-arc-map.test.ts`: `mapArcErrors` accepts a well-formed region-anchored arc (all regions in the valid set); rejects an unknown region (`/not found|region/i`); rejects a malformed arc (reuse the arcErrors cases — no-establish, no-payoff, no-build, >1 turn, empty claim); legacy (no role) region-only list → `[]`. Run → FAIL.
- [ ] **Step 2: Add `Beat.role`** to `map-story.ts` + export `MapArcBeat`. Add `mapArcErrors` (in map-story.ts or validate-config.ts — co-locate with the validators; import `arcErrors`/`ArcRole` from lib/core).
- [ ] **Step 3: Wire `arcBeats` validation** into `validateChoroplethConfig` (regions = the join/data region keys it already reads) and `validateSymbolConfig` (regions = the point labels it already reads): when the config carries `arcBeats`, append `mapArcErrors(arcBeats, <validRegions>)` to that validator's errors. Add `arcBeats?: MapArcBeat[]` to the config types both validators accept.
- [ ] **Step 4: Run → PASS.** `cd skills/map-native && bunx tsc --noEmit && bun test src/claim-arc-map.test.ts`
- [ ] **Step 5: Commit.** `git commit -am "feat(map-native): Beat.role + MapArcBeat + arcBeats validation for choropleth & symbol"`

---

### Task 3: `applyMapArc` helper + wire into `deriveMapStory` + `deriveSymbolStory`

**Files:**
- Modify: `skills/map-native/src/map-story.ts` (add `applyMapArc`; use it in `deriveMapStory`)
- Modify: `skills/map-native/src/symbol-story.ts` (use `applyMapArc` in `deriveSymbolStory`)
- Test: `skills/map-native/src/claim-arc-map.test.ts` (extend)

**Interfaces:**
- Produces: `applyMapArc(arcBeats: MapArcBeat[], resolve: (region: string) => { camera: [number,number,number,number]; highlight: string[]; name: string; value: string } | null): Beat[]` — returns ORDERED reveal `Beat`s (`kind:"reveal"`), each carrying `role` (from the arcBeat) and `copy` = the arcBeat's `text` (the claim). `resolve` maps a region to its anchor facts (each deriver supplies its own — choropleth via `cameraOf`/`nameOf`/`fmt(value-by-key)`; symbol via the point's lon/lat box + label + `fmt(value)`). A `resolve` returning null is unreachable (validation caught it) but throws a clear error if it happens (defense in depth).

- [ ] **Step 1: Write the failing tests** — extend `claim-arc-map.test.ts`: (a) `deriveMapStory` with a confirmed `arcBeats` (regions in the fixture data) emits reveals in the arc ORDER, each `reveal` Beat carrying `role` and `copy` = the claim `text` (not the salience `name — value`); (b) `deriveMapStory` WITHOUT `arcBeats` emits the SAME beats as before (byte-identical — assert a known shape/count on a fixture); (c) the same two assertions for `deriveSymbolStory`. Run → FAIL.
- [ ] **Step 2: Add `applyMapArc`** to `map-story.ts` (pure; builds the reveal Beats from arcBeats + resolve).
- [ ] **Step 3: Wire `deriveMapStory`** — thread `arcBeats` in (from `meta`/args — add `arcBeats?: MapArcBeat[]` to `MapStoryMeta`). When present + non-empty: `reveals = applyMapArc(arcBeats, key => ...)` using the existing `cameraOf`/`nameOf`/`fmt` + the value-by-key lookup; skip the salience `revealRows` selection. When absent: the existing path, UNCHANGED (byte-identical). Keep the title/establish/takeaway scaffold.
- [ ] **Step 4: Wire `deriveSymbolStory`** — same pattern: `arcBeats` from `meta`/opts; present ⇒ `applyMapArc(arcBeats, name => ...)` resolving the point by `p.label`, building the `CITY_DELTA` camera box + `fmt(p.value)`; absent ⇒ the existing sorted-cap path, UNCHANGED.
- [ ] **Step 5: Run → PASS + regression.** `cd skills/map-native && bunx tsc --noEmit && bun test src/claim-arc-map.test.ts && bun test` (whole map-native suite green — especially `map-story.test.ts`/symbol tests; the byte-identity assertions guard the no-arcBeats path).
- [ ] **Step 6: Commit.** `git commit -am "feat(map-native): applyMapArc — choropleth & symbol honour a confirmed claim-arc; salience path byte-identical"`

---

### Task 4: un-reject the map track + map fallback flag (validate-gate)

**Files:**
- Modify: `skills/splash/src/validate-gate.ts` (`validateScrolly` map track)
- Modify: `skills/map-native/src/map-story.ts` (add `mapNarrativeFallbackWarning`)
- Test: `skills/splash/src/validate-gate.test.ts` (extend)

**Interfaces:**
- Produces: `mapNarrativeFallbackWarning(config): string | null` — returns a non-blocking warning when a choropleth/symbol map story config has NO `arcBeats` (salience-derived narrative, not a confirmed arc); null when `arcBeats` present or the type isn't a workhorse map story. Mirror chart's `narrativeFallbackWarning` wording.

- [ ] **Step 1: Write the failing tests** — `validate-gate.test.ts`: a map-track config (choropleth/symbol) WITH a valid `arcBeats` → `ok:true` (no arc error); WITH an unknown-region `arcBeats` → `ok:false` (fail-loud); WITHOUT `arcBeats` → `ok:true` with a warning matching `/auto-picked|salience/i`; a CHART `beats` field on a map config → STILL `ok:false` (rejected — wrong field). Run → FAIL.
- [ ] **Step 2: Un-reject the map track** (`validate-gate.ts:121-128`): replace the blanket "beats not supported on the map track" rejection with: (a) if the config carries the chart-only `beats` field → STILL reject (wrong field for a map — keep the loud message, point to `arcBeats`); (b) validate `arcBeats` via the map validators (Task 2) — surface their errors as `ok:false`; (c) on the OK path, add `mapNarrativeFallbackWarning(config)` to the warnings (same channel/pattern as the chart track's fallback in Task-2 of slice-1).
- [ ] **Step 3: Add `mapNarrativeFallbackWarning`** to `map-story.ts`.
- [ ] **Step 4: Run → PASS.** `cd skills/map-native && bunx tsc --noEmit`; `cd skills/splash && bunx tsc --noEmit && bun test src/validate-gate.test.ts`
- [ ] **Step 5: Commit.** `git commit -am "feat(splash): accept + validate map arcBeats at the gate; flag the map salience fallback (chart beats on a map still rejected)"`

---

### Task 5: FRONT prose — map claim-arc in SKILL.md (honest scope)

**Files:**
- Modify: `skills/splash/SKILL.md`

- [ ] **Step 1: Extend the Gate 1b / claim-arc section** (added in slice-1): the claim-arc override now also applies to MAP scrollies — but ONLY choropleth + symbol, via a region-anchored `arcBeats` plan (same establish→build+→[turn]→payoff, journalist confirms/vetoes, pinned as `arcBeats`). State EXPLICITLY that the other map story types (route, cartogram, dot-density, hex-grid, locator) do NOT yet accept a confirmed arc (their beats are data-derived) — a follow-up. Do NOT promise an override those types lack (slice-1 lesson).
- [ ] **Step 2: Update the slice-1 "map follow-up (not built yet)" note** to reflect that choropleth + symbol ARE now built; keep the honest note for the remaining 4 types.
- [ ] **Step 3: Verify frontmatter** (`head -4 skills/splash/SKILL.md` → `---`) + no existing rule weakened (additive only). Commit: `git commit -am "docs(splash): map claim-arc for choropleth + symbol (honest scope; remaining map types deferred)"`

---

## Self-Review
- **Spec coverage:** §3.1 lib/core extraction + Beat.role → Task 1 + Task 2. §3.2 arcBeats override + validation + applyMapArc (choropleth+symbol) → Tasks 2+3. §3.3 map fallback flag → Task 4. §3.4 SKILL.md prose → Task 5. Un-reject map track → Task 4.
- **Placeholder scan:** the config→deriver threading + the per-validator region source are read-anchors (Task 0 + Task 2/3 name the exact functions); no silent TODOs. The `resolve` callback contract is concrete (return type spelled out).
- **Type consistency:** `ArcRole`/`arcErrors` from `lib/core/claim-arc` (Task 1), consumed by chart-native (re-export) + map-native (`mapArcErrors`, `Beat.role`, Task 2) + `applyMapArc` (Task 3); `MapArcBeat` defined Task 2, consumed Tasks 3+4; `arcBeats` field name consistent throughout (never `storyBeats`).
- **Behaviour-preserving:** every deriver task asserts the no-`arcBeats` path is byte-identical (Task 3 Steps 1b + regression suite); the gate change only adds a warning / accepts a new valid field, never flips a legit run to `ok:false` (Task 4 keeps the chart-`beats`-on-map rejection).
