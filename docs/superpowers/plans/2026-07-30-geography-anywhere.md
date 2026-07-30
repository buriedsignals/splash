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

---

## Phase A — `lib/geo/`: pure logic, zero wiring into the loop

Mirrors `lib/source/`'s shape (verified while writing this plan: `lib/source/index.ts` re-exports
`kinds`, `result`, `requirements`, `url`, `furniture`, `prose`, `redact`, `policy` — one file, one
responsibility, a matching `<name>.test.ts` beside each). Every task in this phase is independently
testable with `cd lib && bun test` — nothing here is wired into the manifest, `orient`, or `produce`
yet. That wiring is Phases C–E.

### Task 1: `lib/geo/crs.ts` — the CRS range guard (D4)

**Files:**
- Create: `lib/geo/crs.ts`
- Create: `lib/geo/crs.test.ts`
- Modify: `lib/tsconfig.json` — add `"geo"` to the `include` array (currently `["brain", "core",
  "loop", "host", "delivery", "newsroom", "source", "verify"]`, verified while writing this plan).
  Without this, `cd lib && bunx tsc --noEmit` silently skips the new directory.

**Interfaces:**
- Produces: `coordinateRangeVerdict(geometry: GeoJSON.Geometry | GeoJSON.FeatureCollection):
  CrsVerdict`, and the type `CrsVerdict = { ok: true } | { ok: false; code:
  "coordinate-out-of-range"; message: string }`. Consumed by Task 8 (init-time refusal) — nothing
  in this task calls it from the loop.

Named verdict, never a bare boolean — the spec (D4) is explicit about this, and it mirrors the
established pattern in `lib/source/result.ts` (`SourceResult<T> = { ok: true; value: T } | { ok:
false; code: SourcePolicyCode; message: string }`, verified while writing this plan).

The guard is a **per-coordinate range check**, never a bbox check: RFC 7946 §5.2 makes
`bbox[0] > bbox[2]` legal for an antimeridian-crossing feature, so a bbox-based
`minX < maxX` assertion would reject valid Fiji/Chukotka geometry (spec D4). And it carries
**no winding-order check** — RFC 7946 §3.1.6 says parsers SHOULD NOT reject a polygon for its
ring direction, and geojson-vt/earcut already tolerate either winding (spec D4, "a correction of
the research not to reintroduce").

- [ ] **Step 1: Write the failing tests**

```ts
// lib/geo/crs.test.ts
import { describe, it, expect } from "bun:test";
import { coordinateRangeVerdict } from "./crs";

describe("coordinateRangeVerdict", () => {
  it("accepts a valid WGS84 point (Bern)", () => {
    const geom: GeoJSON.Point = { type: "Point", coordinates: [7.4474, 46.9481] };
    expect(coordinateRangeVerdict(geom)).toEqual({ ok: true });
  });

  it("rejects a Swiss LV95 pair mistaken for WGS84 — the fixture the spec measures", () => {
    // spec D4's own measured case: Bern in LV95 is (2600000, 1200000). Fed as if it were
    // lon/lat, |x| and |y| are both wildly out of range — this is the exact pair that, left
    // unguarded, aliases via sin() periodicity to a plausible-looking ~57°N.
    const geom: GeoJSON.Point = { type: "Point", coordinates: [2600000, 1200000] };
    const verdict = coordinateRangeVerdict(geom);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.code).toBe("coordinate-out-of-range");
      expect(verdict.message).toContain("2600000");
      expect(verdict.message).toContain("re-export");
      expect(verdict.message).toContain("EPSG:4326");
    }
  });

  it("does not flag an antimeridian-crossing polygon (Fiji-shaped) via its bbox", () => {
    // Every individual coordinate is in-range; the bbox alone (minX=-179.9 > maxX=179.5 if
    // computed naively) would look inverted. The guard must walk coordinates, not the bbox.
    const geom: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [179.5, -17],
          [179.9, -16],
          [-179.9, -16],
          [-179.5, -17],
          [179.5, -17],
        ],
      ],
    };
    expect(coordinateRangeVerdict(geom)).toEqual({ ok: true });
  });

  it("does not reject a clockwise (reversed) ring — no winding-order guard", () => {
    // Same ring as a normal square, wound the OTHER way. RFC 7946 §3.1.6: parsers SHOULD NOT
    // reject on ring direction. This fixture is the one a future contributor is most likely to
    // "fix" by adding a signed-area check — that would be the regression this test exists for.
    const geom: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [7.0, 46.0],
          [7.0, 47.0],
          [8.0, 47.0],
          [8.0, 46.0],
          [7.0, 46.0],
        ],
      ],
    };
    expect(coordinateRangeVerdict(geom)).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test geo/crs.test.ts`
Expected: FAIL — `coordinateRangeVerdict` is not defined (module `./crs` does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/geo/crs.ts
// The CRS guard — a range check, never a bbox check, never a winding check. See D4 of the
// design spec for the measurements this shape is built against (6,188 projected CRS scanned;
// exactly 2 pass |x|<=180,|y|<=90; a range check alone cannot catch a bad-datum or a
// non-Greenwich meridian, which is why `crs` stays a DECLARED field, not an inference — that
// declaration is enforced one layer up, in lib/loop/init.ts (Task 8), not here).
export type CrsVerdict =
  | { ok: true }
  | { ok: false; code: "coordinate-out-of-range"; message: string };

function walk(coords: unknown, visit: (pt: [number, number]) => string | undefined): string | undefined {
  if (
    Array.isArray(coords) &&
    coords.length >= 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number"
  ) {
    return visit(coords as [number, number]);
  }
  if (Array.isArray(coords)) {
    for (const c of coords) {
      const bad = walk(c, visit);
      if (bad) return bad;
    }
  }
  return undefined;
}

export function coordinateRangeVerdict(
  geometry: GeoJSON.Geometry | GeoJSON.FeatureCollection,
): CrsVerdict {
  const geometries: GeoJSON.Geometry[] =
    geometry.type === "FeatureCollection"
      ? geometry.features.map((f) => f.geometry).filter((g): g is GeoJSON.Geometry => g != null)
      : [geometry];

  for (const g of geometries) {
    const bad = walk((g as { coordinates?: unknown }).coordinates, ([x, y]) => {
      if (Math.abs(x) > 180 || Math.abs(y) > 90) return `${x}, ${y}`;
      return undefined;
    });
    if (bad)
      return {
        ok: false,
        code: "coordinate-out-of-range",
        message:
          `coordinate ${bad} is outside the physical globe (|lon|<=180, |lat|<=90) — this is ` +
          `almost always a projected CRS mistaken for WGS84; re-export in EPSG:4326`,
      };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test geo/crs.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Mutation — prove the "clockwise ring" test depends on there being no
  winding-order check**

Temporarily ADD a signed-area winding-order rejection to the implementation (the exact
anti-pattern D4 warns a future contributor is likely to add), on top of the Step 3 range check:

```ts
// MUTATION — do not keep this. Insert before the final `return { ok: true };`.
function ringIsClockwise(ring: [number, number][]): boolean {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += (ring[i + 1][0] - ring[i][0]) * (ring[i + 1][1] + ring[i][1]);
  }
  return sum > 0;
}
if (
  geometries.some(
    (g) =>
      g.type === "Polygon" &&
      ringIsClockwise(g.coordinates[0] as [number, number][]),
  )
)
  return { ok: false, code: "coordinate-out-of-range", message: "clockwise ring rejected" };
```

Run: `cd lib && bun test geo/crs.test.ts`
Expected: the "clockwise ring" test FAILS — reports `expected { ok: true }, received { ok: false,
code: "coordinate-out-of-range", message: "clockwise ring rejected" }`. This is the regression
the test exists to catch. Revert the mutation (restore Step 3's implementation exactly) before
continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/geo/crs.ts lib/geo/crs.test.ts lib/tsconfig.json
git commit -m "feat(geo): CRS range guard — per-coordinate, antimeridian-safe, no winding check"
```
