# Geography Anywhere Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** let Splash draw a choropleth/region map of ANY declared geography — not just the two
shipped basemaps (`world`, `us-states`) — while shrinking every artefact instead of growing it,
and while carrying every required licence credit inside the produced file.

**Architecture:** a new `lib/geo/` package (mirroring `lib/source/`'s shape: vocabulary +
consequences table + assertions that throw) holds the CRS guard, the geography declaration
schema, the inline/credit policy, the `GeographyRef` resolver (replacing the closed `BASEMAPS`
enum), the join ledger, the subset pipeline, and the offline ADM1 index. The manifest gains a
declared, frozen `input.geography`; `orient` gains a `geoJoin` ledger; `provenanceHash` gains
both. `assembleMapNative`/`produce()` refuse on an unresolved join or a missing credit, mirroring
the existing `unauthoredBeats` gate. `produce.mjs` resolves a geometry descriptor to bytes at
render time and injects them through the existing `__CONFIG__` seam — the nine `?raw` static
geojson imports across `skills/map-native` and `skills/scrolly` disappear.

**Tech Stack:** Bun, TypeScript, zod, mapshaper (via `bunx`, MPL-2.0 — see Global Constraints),
MapLibre GL JS, bun:test.

**Spec:** `docs/superpowers/specs/2026-07-28-geography-anywhere-design.md`. The licensing
research it rests on: `docs/splash/geography-anywhere-research-2026-07-28.md`.

## Global Constraints

- **Bun only.** Never `npm`, never `node`. Run tests with `bun test`, typecheck with
  `bunx tsc --noEmit`.
- **English throughout.** Code, comments, identifiers, commit messages, branch names — all
  English, even though this plan and the spec are in French. Non-negotiable.
- **No mention of Claude, Anthropic, or any AI tool** in any commit, doc, or artifact produced by
  this plan. Non-negotiable, applies to every commit message and every file this plan touches.
- **The licensing decisions are SETTLED, do not reopen them:** Natural Earth is public domain but
  **ADM1 only** (nothing deeper ships pre-baked); geoBoundaries is licensed **per file** (ODbL
  touches, among others, Thai provinces and French communes); GADM and Eurostat GISCO are
  **disqualified** — non-commercial terms, MIT-incompatible. Everything permitted is allowed, on
  the condition that **the OSM credit is carried IN the produced file** — never a README, never
  optional. A task that drops or defaults the credit is wrong regardless of how clean the diff
  looks.
- **Locate by SYMBOL, not by line number.** Every citation below gives a symbol name plus the
  line number it sat at when this plan was written (2026-07-30, against `main` @ `dd388574`).
  Line numbers drift; symbols are what to grep for.
- **Mapshaper's licence is MPL-2.0** (`npm view mapshaper license`, checked 2026-07-30 while
  writing this plan — this discharges spec risk R5, which asked for exactly this one-minute
  check before the dependency enters). MPL-2.0 is file-level copyleft on mapshaper's OWN source;
  Splash invokes it as an external CLI via `bunx mapshaper` (arm's-length subprocess, never
  linked into Splash's own source), which does not trigger MPL's copyleft on Splash's code and
  is compatible with shipping Splash under MIT. No task needs to re-verify this.
- **Every guard task ships a mutation step.** Write the failing test first, watch it fail for the
  right reason, implement, watch it pass — then put the exact buggy behaviour back (not a
  different bug), rerun, and report the test count that reddens. A guard whose mutation stays
  green is not proven.
- **State which fixture element carries the failure**, per guard. A fixture whose values are all
  interchangeable (e.g. two arbitrary numbers) proves nothing — the fixture must contain the
  SPECIFIC case that used to slip through (e.g. `Buenos Aires` colliding across two Argentine
  features, or a `2600000, 1200000` LV95 pair that alias-wraps to a plausible latitude).
- **`bun test` run from inside a package directory does NOT read the repo-root `.env`.**
  Confirmed against the existing pattern: `skills/map-native/tests/produce-single-format.test.ts`
  self-skips with a printed warning when `process.env.VITE_MAPTILER_KEY` is unset, and
  `skills/map-native/scripts/produce.mjs` (`skills/map-native/scripts/produce.mjs:49-58`) loads
  `VITE_MAPTILER_KEY`/`REMOTION_MAPTILER_KEY` from the monorepo root `.env` by hand because `bun
  test` does not do it for you. A green `bun test` count in this plan's per-task verification
  proves NOTHING about a live MapTiler-backed path — the honest proof, wherever a task touches
  that path, is a **skip-count diff**: run once with the key unset (self-skip, note the skip
  message and count), then once with `VITE_MAPTILER_KEY` exported into the shell (the suite
  actually runs, note the new pass count). Only the diff is evidence.
- **Scoped verification per task**: `cd <dir> && bunx tsc --noEmit` and `bun test` from that same
  directory. The full `bun run check` gate (`bun scripts/check.mjs` at the repo root — typechecks
  `lib`, `skills/splash`, `skills/map-native`, `skills/scrolly` among others, then runs `bun test`
  in the same set of `TEST_DIRS`, verified in `package.json`/`scripts/check.mjs` while writing
  this plan) is ONE task, the last one, never repeated per-task.
- **Contended files — do not touch without sequencing.** `skills/splash/src/producer-spec.ts`,
  `skills/splash/SKILL.md`, and `skills/splash/tests/skill-doc-parity.test.ts` are being edited by
  another plan in flight in a sibling worktree right now. No task in this plan touches them. If a
  future task turns out to need one of them, STOP and flag it to whoever is sequencing the two
  plans — do not edit speculatively.
- **`lib/geo/*` must stay zod-free where it is imported into `lib/core/production-brief.ts` or
  any `skills/map-native`/`skills/scrolly` runtime component.** `lib/core/production-brief.ts`
  (top-of-file comment, verified while writing this plan) explains why: `geo-match.ts`'s
  `import type { GeoMatch }` from `production-brief.ts` already puts that file on the map-native
  **runnable bundle's** traced closure (`skills/splash/scripts/bundle-source.mjs` does not
  distinguish a type-only import from a real one), so a zod-carrying import there would ship the
  zod dependency into every exported "code source" bundle that never runs it. `production-brief.ts`
  already hand-mirrors `ImageInputSchema`'s shape as a plain `ImageInput` type instead of
  importing zod's inferred type, for exactly this reason — the same discipline applies to
  `GeographyRef`: it is defined as a **plain TypeScript type**, never a `z.infer<...>`, in
  `lib/geo/ref.ts`, and `lib/geo/declaration.ts` (the zod schemas) is never imported from
  `production-brief.ts` or from any `.tsx` component.
- **`lib/tsconfig.json`'s `include` array is a closed list of subpackages** (`brain`, `core`,
  `loop`, `host`, `delivery`, `newsroom`, `source`, `verify` — verified while writing this plan).
  The first `lib/geo/` task MUST add `"geo"` to that list or `bunx tsc --noEmit` run from `lib/`
  will silently skip the new package.
