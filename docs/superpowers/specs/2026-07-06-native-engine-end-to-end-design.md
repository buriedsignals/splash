# Native chart engine, end-to-end — design

> Status: design approved (brainstorming, 2026-07-06). Next: `writing-plans`.
> Scope: make chart-native's article→spec→config→conformance path reach every article-realistic
> chart type (Family A), guarded, with a completeness test that forbids silent gaps. NOT the
> suggester's editorial judgment, NOT map-native, NOT Family B wiring (deferred, one at a time later).

## Problem

chart-native ships **41 renderable types** (41 `*-geometry.ts` modules + components + per-type
conformance checks + tests; all render static/interactive/video in isolation). But only **4 are
reachable end-to-end from an article** and only **7 are guarded at produce time**:

1. **Reachability bottleneck** — `skills/chart-native/src/spec-to-config.ts:78-165` is a 4-case
   `switch` (bar/line/scatter/pie); every other `nativeType` throws `UnsupportedNativeType`, which
   `produce-from-spec.mjs:29-33` turns into `exit 2` / `FALLBACK_TO_DW` → the orchestrator silently
   degrades to a *static Datawrapper* chart (`skills/splash/src/adapters.ts:150-160`). So naming any
   of the 37 unmapped native types quietly loses the format the human may have chosen at CADRAGE.
2. **Guard gap** — `skills/chart-native/src/core/resolve-conformance-colors.ts:29-37` resolves the
   painted palette for 7 types only; the other 34 print "no produce-time guard wired yet … skipping"
   (`produce.mjs:63-77`) and produce unguarded. The *check functions already exist for all 41*
   (`core/conformance.ts`); the gap is the color resolver + dispatch, not the checks.
3. **Duplicated, un-exported truth** — the 41-type list lives only as un-exported literals in two
   places (`produce.mjs:30-44` PREFIX, `mount.tsx:159/205` registries); nothing asserts they agree,
   and there is no single list the mapper/resolver/test can consume.
4. **Gate-invisible native types** — the eval gate `skills/suggest-chart/eval/score.ts:95` only
   validates a DW `ChartSpec.type`; a bogus/unmapped `nativeType` is invisible to the deterministic
   gate and surfaces only as a produce-time fallback.

The result: 90% of a fully-built engine is dead code from the article flow, and widening it naïvely
would ship types with no produce-time guard.

## Principle (locked)

A native type is not "done" when it renders in isolation — it is done when it is reachable **and**
guarded **and** the suggester can pick it **and** it has been looked at. Reliability comes from making
that a **machine-checked invariant**, not a checklist someone remembers:

> Every type in the canonical `NATIVE_TYPES` list is either **`mapped`** (the full 5-deliverable
> contract below, render-verified) or **`deferred(reason)`**. Never silently unreachable, never
> reachable-but-unguarded. `mapped` is a *derived* property (present in every layer's table), so it
> cannot be claimed falsely; `deferred` is an *explicit* declaration carrying a reason.

### The 5-deliverable contract per `mapped` type

1. **Plumbing** — a `spec-to-config` mapper case + a documented CSV shape convention; the mapper
   **fails loud** (throws with a reason naming expected-vs-got shape) when the CSV does not fit the
   type. No silent garbage render.
2. **Guard** — a conformance color resolver case feeding the type's existing check its bespoke-
   signature args; produce **fails hard** (exit 1) on any violation. *Precondition:* audit the type's
   DEFAULT render — a component-intrinsic palette violation (à la the vermillion-text a11y bug) is
   **fixed in the component first**; we never ship a type whose default fails. Config-supplied
   violations (a low-contrast `baseColor`, a title-that-looks-like-a-label) correctly hard-fail — that
   is the guard doing its job.
3. **Brain** — suggester vocabulary in `suggest-chart/SKILL.md` + a native `NATIVE_FAMILY_TYPES`
   entry, and the eval gate validates `nativeType` against the exported canonical list (an
   unknown/unmapped native type fails the deterministic gate, not silently at produce).
4. **KB** — a per-type reference `knowledge/references/chart/types/<id>.md`, sourced (FT Visual
   Vocabulary, data-to-viz, …), cross-referenced to the conformance check.
5. **Render-verify** — actually render the type (static at ≥2 widths + one interactive) and look at
   it before flipping it to `mapped`. "Tests pass" ≠ "the render is right" (the repeated lesson).

### Explicitly rejected

- **All 41 at once / a fat `NativeSpec` up front.** Structural/specialist types (sankey nodes+links,
  chord/heatmap matrices, gantt intervals, candlestick OHLC) need data shapes a journalist's tidy CSV
  rarely yields; mapping them now is dead code and forces a heavy schema. They stay `deferred(reason)`
  and are wired one at a time later if a real story needs them.
- **Explicit role fields on every spec (`seriesFields[]`, `xField`, …).** Rejected in favor of
  per-type CSV *conventions* + a few optional editorial hints — this matches the 4 existing cases
  (`catCol = columns[0]`, `valCol = last numeric`) and keeps `②` (the suggester) lean. Ambiguity is
  replaced by a loud shape error, not by more fields for the agent to get right.
- **A warn escape hatch for conformance.** A type either passes at its default (fix the component if
  not) or it is not wired. Warn is not a shipping state.
- **One giant per-type object coupling all concerns.** Each concern (mapper / resolver / KB / family)
  stays in its own file keyed by the same id; the completeness test is the glue that binds them.

## Design

### 1. `NATIVE_TYPES` — the canonical list (new, exported)

A single exported constant (home: `skills/chart-native/src/native-types.ts`) — the source of truth
that replaces the un-exported `produce.mjs` PREFIX + `mount.tsx` registries duplication. Each entry:

```ts
interface NativeTypeEntry {
  id: string;                                   // "grouped-bar"
  family: "A" | "B";                            // article-realistic vs structural/specialist
  shape: "single" | "wide" | "paired" | "distribution";
  deferred?: string;                            // reason; present ⇔ NOT expected to be mapped yet
}
```

`mapped` is **not** stored — it is derived by the completeness test as "appears in the mapper table ∧
the conformance resolver ∧ has a KB file ∧ is in `NATIVE_FAMILY_TYPES`". `produce.mjs` PREFIX and the
`mount.tsx` registries are reconciled to derive from (or be asserted equal to) this list, closing the
duplicated-truth gap.

### 2. Mapper table — `spec-to-config.ts` becomes table-driven

Replace the 4-case switch with `MAPPERS: Record<id, (parsed: ParsedCsv, spec: NativeSpec) => {type,
config}>`. The 4 existing cases migrate verbatim into entries (back-compat is tested: the 4 produce
byte-identical configs through the table). A shared `validateShape(id, parsed)` runs before each
mapper and throws a labeled error when the CSV does not match the type's declared `shape`. Unknown /
`deferred` id → still `UnsupportedNativeType` → `FALLBACK_TO_DW` (unchanged fallback contract).

`NativeSpec` (today `spec-to-config.ts:7-20`) gains **optional** editorial hints incrementally as
types need them (e.g. `highlightSeries?`, `normalize?`, `seriesColors?` override) — never required
fields; the convention supplies the rest.

### 3. CSV shape conventions (documented, enforced, loud on mismatch)

- **`single`** — `col[0]` = category; last numeric col = value (CSV row order preserved). (bar, pie,
  lollipop, treemap-flat, waffle, histogram, dot-strip, radial-bar, bullet, diverging-bar as a signed
  value, waterfall as ordered signed deltas.)
- **`wide`** — `col[0]` = category (or temporal x); **all** following numeric cols = series.
  (grouped-bar, stacked-bar, multi-line, slope, stacked-area, bump, population-pyramid,
  diverging-stacked, fan.)
- **`paired`** — `col[0]` = category; exactly 2 numeric cols = (start, end) or (x, y). (dumbbell,
  connected-scatter.)
- **`distribution`** — optional `col[0]` = category; 1 numeric col = raw values, many rows per
  category. (boxplot, violin, beeswarm.)

`validateShape` names the expected shape and what it received; the reason is surfaced, never a silent
mis-render.

### 4. Conformance resolver table — `resolve-conformance-colors.ts` + `produce-conformance.ts`

Extend `RESOLVABLE_CONFORMANCE_TYPES` and both switches from 7 → 7+N. Each new case: resolve the REAL
painted palette the component uses (categorical `seriesColors`, `signColors`, `roleColors`,
`sliceColors`, sequential ramps + the text colors), grounded by reading the component (as the 7
existing cases cite theirs); recompute any layout-derived input via the geometry module
(`compute*Layout`, as bar/histogram/lollipop already do); call the type's **existing** check with its
bespoke signature. No new check functions — they exist in `core/conformance.ts`.

### 5. `NATIVE_FAMILY_TYPES` + eval-gate validation

A new native intent→type table mirroring `eval/family-types.ts` (which is DW-only). `score.ts` gains
a native branch: when a routed spec targets the native producer, validate its `nativeType ∈
NATIVE_TYPES` (and, ideally, that the type fits the claimed intent family). `suggest-chart/SKILL.md`'s
"mapped native families" prose (`:139-146`, and the scrolly cap at `:379`) is updated in lockstep as
types become `mapped`, so `②` actually emits the newly-reachable types.

### 6. Completeness test — the invariant, machine-checked

One test asserts, for every `NATIVE_TYPES` entry: **either** `deferred` is set (with a non-empty
reason) **or** the type is present in the mapper table ∧ resolvable by the conformance resolver ∧ has
a `knowledge/references/chart/types/<id>.md` file ∧ is in `NATIVE_FAMILY_TYPES`. Plus:
`NATIVE_TYPES` ids ≡ `produce.mjs` PREFIX keys ≡ `mount.tsx` registry keys (no render-path drift). A
newly-added component can never again be silently unreachable or unguarded.

## Witness (first slice): `grouped-bar`

Chosen because it exercises **both** new mechanisms at once: the `wide` CSV convention (mapper) and a
bespoke `seriesColors` conformance resolver (`checkGroupedBarConformance` takes a series color array,
not the flat `{data,text,bg}` triple). Proving the full 5-deliverable contract on grouped-bar
de-risks every later multi-series type.

## Scope / initial partition (reclassifiable when encountered)

**Family A — target `mapped` (~20)**: stacked-bar, grouped-bar, slope, stacked-area, dumbbell,
diverging-bar, waterfall, lollipop (mapper), population-pyramid, connected-scatter (mapper), boxplot,
bump, beeswarm (mapper), treemap-flat, waffle, violin, dot-strip, radial-bar, bullet, fan,
diverging-stacked. *(bar/line/scatter/pie already mapped.)*

**Family B — `deferred(reason)`**: heatmap (matrix), sankey (nodes/links), chord (matrix), sunburst
(hierarchy), gantt (intervals), calendar (dense date grid), candlestick (OHLC), marimekko (2D), combo
(per-series encoding), streamgraph / radar / parallel (rare-newsroom), lorenz (specialist), arc
(hierarchy), pictogram (stylistic variant of waffle).

The completeness test guarantees the partition is **total** (every type mapped-or-deferred-with-
reason), not that the classification is "correct" — reclassifying a type is an editorial call made
when we reach it.

## What is OUT of this spec (seams noted)

- **map-native conformance parity** — the independent satellite (map produce has zero conformance
  wiring); a `resolveMapConformanceColors` + `runMapProduceConformance` pair mirroring this design.
  Separate plan.
- **Third-party eval-corpus expansion** — the auto-referential-baseline caveat is unchanged here.
- **Export-time hash enforcement / release** — separate tasks.
- **Family B wiring** — deferred; each type is wired one at a time when a real story needs it, via
  the same contract + a schema extension for its structural data.
- **Surfacing accepted secondary proposals** — orchestration backlog item, untouched.

## Testing

- **Completeness test**: the invariant above; fails today (4 of ~25 Family-A-target types mapped) and
  goes green as batches land; also asserts no render-path drift.
- **Per type**: mapper unit tests (valid CSV → expected config; wrong shape → throws with a reason);
  conformance resolver test (default palette passes; a seeded violation fails); render-verify (manual,
  ≥2 static widths + one interactive) recorded in the type's output-proof.
- **Back-compat**: bar/line/scatter/pie produce byte-identical configs through the table vs the old
  switch.
- **Fallback contract**: a `deferred`/unknown native type still exits 2 / `FALLBACK_TO_DW`.
- **Gate**: an unmapped `nativeType` fails `score.ts` deterministically (was invisible before).

## Execution

- **Plan 1** — the mechanism + de-risk: `NATIVE_TYPES` list + partition + completeness test +
  `validateShape`; migrate the 4 existing into the mapper table (back-compat); productionize
  `grouped-bar` end-to-end (all 5 deliverables). Reviewed.
- **Then** — one plan per shape sub-family (`wide` multi-series → `paired` → `distribution` →
  remaining `single`), each batch = code + conformance + KB + render-verify + review. Each landing
  flips its types from `deferred` to `mapped` and turns the completeness test greener.

## Why this is the reliable/best-practice shape

The single bottleneck (one switch) becomes a table whose coverage is a machine-checked invariant, so
the two real bugs (silent degrade, unguarded produce) are fixed structurally, not by diligence.
Reachability and guarding move together by construction — a type cannot be rendable-but-unguarded.
The un-exported duplicated truth collapses to one exported list the render path is asserted against.
`②` stays lean (convention + minimal hints, not a fat schema). And "done" includes looking at the
render — the quality bar this project keeps re-learning. Family B is honestly deferred with reasons,
never silently missing.
