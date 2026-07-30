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

### Task 2: `lib/geo/declaration.ts` — `GeographyInputSchema` (D1, D2)

**Files:**
- Create: `lib/geo/declaration.ts`
- Create: `lib/geo/declaration.test.ts`

**Interfaces:**
- Produces: `GeographyCreditSchema`, `GeographyInputSchema`, and their inferred types
  `GeographyCredit`, `GeographyInput` (`z.infer`). Consumed by Task 9 (manifest wiring) and
  Task 10 (init.ts wiring) — this task does not wire either.

This is the schema quoted verbatim in spec D1. `z.strictObject`, for the exact reason
`lib/source/kinds.ts`'s header states about `SourceLedgerSchema` (verified while writing this
plan): a permissive object lets an unrelated shape parse as "declares nothing", and the refusal
that follows blames a field the caller thinks it supplied.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/geo/declaration.test.ts
import { describe, it, expect } from "bun:test";
import { GeographyInputSchema } from "./declaration";

const valid = {
  path: "communes-haute-savoie.geojson",
  encoding: "geojson" as const,
  crs: "EPSG:4326" as const,
  level: "communes de Haute-Savoie",
  licence: "Licence Ouverte 2.0",
  edition: "2024",
  credit: { name: "IGN — Admin Express" },
};

describe("GeographyInputSchema", () => {
  it("parses a fully declared geography", () => {
    const r = GeographyInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("refuses a declaration with no edition — the field Splash refuses to guess", () => {
    // The spec is explicit this is the field Splash refuses most firmly to invent: three of
    // five real licences read (IGN, ONS, swisstopo) require a year or vintage nowhere in the
    // file, and the mtime cannot supply it (a 2026 re-download of a 2021 edition has a 2026
    // mtime). Omitting it must fail the parse, not silently default to "".
    const { edition, ...withoutEdition } = valid;
    const r = GeographyInputSchema.safeParse(withoutEdition);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "edition")).toBe(true);
  });

  it("refuses an unknown field — strict, like SourceLedgerSchema", () => {
    const r = GeographyInputSchema.safeParse({ ...valid, mapType: "choropleth" });
    expect(r.success).toBe(false);
  });

  it("refuses a crs outside the three accepted values", () => {
    const r = GeographyInputSchema.safeParse({ ...valid, crs: "EPSG:2056" });
    expect(r.success).toBe(false);
  });

  it("accepts a declaration with no joinKey — Splash measures instead of demanding one (R3)", () => {
    const { joinKey, ...withoutJoinKey } = { ...valid, joinKey: "INSEE_COM" };
    const r = GeographyInputSchema.safeParse(withoutJoinKey);
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test geo/declaration.test.ts`
Expected: FAIL — `./declaration` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/geo/declaration.ts
// The geography declaration — quoted verbatim from design spec D1/D2. z.strictObject for the
// reason lib/source/kinds.ts's SourceLedgerSchema is strict: a permissive object would let a
// declaration that names nothing pass, and the refusal that follows would blame a field the
// caller believes it supplied.
import { z } from "zod";

export const GeographyCreditSchema = z.strictObject({
  name: z.string().min(1),
  url: z.string().optional(),
});

export const GeographyInputSchema = z.strictObject({
  path: z.string().min(1),
  encoding: z.enum(["geojson", "topojson"]),
  // The three CRS proj4 models `+towgs84=0,0,0` — indistinguishable from WGS84 (spec D4, R4).
  crs: z.enum(["EPSG:4326", "EPSG:4258", "EPSG:4269"]),
  /** What this file DESCRIBES, in the journalist's own words ("cantons", "communes de
   *  Haute-Savoie", "secteurs scolaires 2025"). Free text on purpose — "ADM1" is a dataset
   *  convention, not a journalistic one (spec D2: Natural Earth counts 101 features for France,
   *  the départements, not the 18 régions a French journalist means by "regions"). */
  level: z.string().min(1),
  licence: z.string().min(1),
  /** The edition or vintage the licence asks to be cited. Not derivable from the file or its
   *  mtime — see the test above. The field Splash refuses most firmly to guess. */
  edition: z.string().min(1),
  credit: GeographyCreditSchema,
  /** The feature property the data joins against, when the journalist already knows it.
   *  Absent ⇒ Splash MEASURES the candidates and asks (D6, R3). Never guessed silently. */
  joinKey: z.string().min(1).optional(),
});

export type GeographyCredit = z.infer<typeof GeographyCreditSchema>;
export type GeographyInput = z.infer<typeof GeographyInputSchema>;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test geo/declaration.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Mutation — prove the `edition` test depends on `.min(1)`, not on the field merely
  existing in the schema**

Temporarily change `edition: z.string().min(1)` to `edition: z.string().optional()`.

Run: `cd lib && bun test geo/declaration.test.ts`
Expected: the "refuses a declaration with no edition" test FAILS (`r.success` is `true`, expected
`false`) — 1/5 reddens. Report that exact number. Revert the mutation before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/geo/declaration.ts lib/geo/declaration.test.ts
git commit -m "feat(geo): GeographyInputSchema — declared, strict, edition never guessed"
```

### Task 3: `lib/geo/policy.ts` — inline policy (D8) and the credit obligation (D7)

**Files:**
- Create: `lib/geo/policy.ts`
- Create: `lib/geo/policy.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (this task's `GeographyLicenceInfo` is its own minimal
  shape — see below for why it does not import `GeographyInput` from Task 2).
- Produces: `geometryMayBeInlined(geography: GeographyLicenceInfo, format: VisualFormat):
  boolean` and `assertGeoCreditPresent(geography: GeographyLicenceInfo | undefined, geoCredit:
  { name: string; url?: string } | undefined): void` (throws). Consumed by Task 18 (produce.mjs
  wiring).

Design call (spec D8 gives only `geometryMayBeInlined`'s signature and says the credit
obligation belongs in this file too, without giving its exact shape): rather than take the full
`GeographyInput` type from Task 2 (which would pull `lib/geo/declaration.ts`'s zod import into
`policy.ts`, and from there — once `policy.ts` is consumed by anything the map-native runtime
bundle can reach — risk repeating the zod-leak `production-brief.ts`'s header already warns
about), `policy.ts` takes the **narrow shape it actually needs**:

```ts
export type GeographyLicenceInfo = { licence: string };
```

`assertGeoCreditPresent` mirrors `assertRenderedSize`'s discipline (`skills/splash/src/
channel.ts:62`, verified while writing this plan: a plain function that **throws**, not a
`VerbResult` — produce's other hard guards already fail this way) rather than the `lib/source`
`SourceResult<T>` pattern: `geometryMayBeInlined` answers a yes/no policy question with no failure
mode of its own (Task 4 below calls it as a plain predicate), while `assertGeoCreditPresent` is a
produce-time gate exactly like `assertRenderedSize`, so it should fail the same way its neighbour
already does.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/geo/policy.test.ts
import { describe, it, expect } from "bun:test";
import { geometryMayBeInlined, assertGeoCreditPresent } from "./policy";

describe("geometryMayBeInlined", () => {
  it("returns true for every format today — Decision 1 (2026-07-28) written in code", () => {
    // The fixture element carrying the claim: an ODbL-declared geometry (French communes) at
    // the format the reserve in spec R1 is about — interactive. Decision 1 says TRUE here;
    // the day the OSMF answers in writing that a self-contained HTML conveys a derived
    // database, THIS is the line that flips to false for interactive/scrolly.
    expect(
      geometryMayBeInlined({ licence: "ODbL 1.0 (OpenStreetMap contributors)" }, "interactive"),
    ).toBe(true);
    expect(geometryMayBeInlined({ licence: "ODbL 1.0 (OpenStreetMap contributors)" }, "scrolly")).toBe(
      true,
    );
    expect(geometryMayBeInlined({ licence: "ODbL 1.0 (OpenStreetMap contributors)" }, "static")).toBe(
      true,
    );
    expect(geometryMayBeInlined({ licence: "ODbL 1.0 (OpenStreetMap contributors)" }, "video")).toBe(
      true,
    );
  });
});

describe("assertGeoCreditPresent", () => {
  it("throws when geometry is declared and geoCredit is missing — the fixture: an OSM-sourced file with no credit threaded", () => {
    expect(() =>
      assertGeoCreditPresent({ licence: "ODbL 1.0 (OpenStreetMap contributors)" }, undefined),
    ).toThrow(/credit/i);
  });

  it("throws when geoCredit.name is blank", () => {
    expect(() =>
      assertGeoCreditPresent({ licence: "ODbL 1.0" }, { name: "   " }),
    ).toThrow(/credit/i);
  });

  it("does not throw when geometry is declared and geoCredit is present", () => {
    expect(() =>
      assertGeoCreditPresent(
        { licence: "ODbL 1.0" },
        { name: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" },
      ),
    ).not.toThrow();
  });

  it("does not throw when no geometry was declared at all (a shipped basemap)", () => {
    expect(() => assertGeoCreditPresent(undefined, undefined)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test geo/policy.test.ts`
Expected: FAIL — `./policy` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/geo/policy.ts
// D8's one predicate, and D7's credit obligation beside it — the spec's own grouping ("un
// prédicat, et un seul" for D8; the credit obligation "à côté" of it for D7).
import type { VisualFormat } from "../core/vocabulary";

/** The narrow shape this file needs — NOT the full GeographyInput (lib/geo/declaration.ts):
 *  importing that here would pull its zod schema into every caller of this file, and this
 *  file is reachable from produce-time code that must stay light. See this task's header. */
export type GeographyLicenceInfo = { licence: string };

/** Decision 1 (design spec, 2026-07-28): a declared geometry file feeds EVERY format, interactive
 *  included, with its credit rendered into the artefact (assertGeoCreditPresent below). Returns
 *  true unconditionally today. The day the OSMF answers in writing that a self-contained HTML
 *  page carrying inline GeoJSON is a "derived database" and not a "Produced Work" — spec R1 — THIS
 *  function is the only place that changes: it starts returning false for `interactive`/`scrolly`
 *  when `geography.licence` is ODbL, and the refusal names `static`/`video` as the paths that stay
 *  open (ODbL §4.5.b is uncontested there). No caller of this function needs to change.
 */
export function geometryMayBeInlined(
  _geography: GeographyLicenceInfo,
  _format: VisualFormat,
): boolean {
  return true;
}

/** The credit is not decorative — spec D7. When a map's geometry came from a DECLARED file, an
 *  empty or missing geoCredit makes produce fail, exactly as loudly as assertRenderedSize
 *  (skills/splash/src/channel.ts) already fails a size mismatch. There is no code path that lets
 *  a newsroom ship a declared-geometry artefact without its credit by omission. */
export function assertGeoCreditPresent(
  geography: GeographyLicenceInfo | undefined,
  geoCredit: { name: string; url?: string } | undefined,
): void {
  if (!geography) return; // no declared geometry (a shipped basemap) — nothing to credit here
  if (!geoCredit || geoCredit.name.trim() === "")
    throw new Error(
      `produce: this map's geometry came from a declared file (licence: "${geography.licence}"), ` +
        `so its credit must be rendered into the artefact — geoCredit is missing or blank`,
    );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test geo/policy.test.ts`
Expected: PASS, 6/6.

- [ ] **Step 5: Mutation — prove the credit tests depend on the throw actually firing**

Temporarily change `assertGeoCreditPresent`'s body to a no-op (`return;` as the first line).

Run: `cd lib && bun test geo/policy.test.ts`
Expected: 2 of the 4 `assertGeoCreditPresent` tests FAIL (the two `.toThrow(...)` cases —
"throws when geometry is declared and geoCredit is missing" and "throws when geoCredit.name is
blank"). Report the exact failing count (2/6 overall). Revert the mutation before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/geo/policy.ts lib/geo/policy.test.ts
git commit -m "feat(geo): inline policy (D8) and mandatory geo-credit assertion (D7)"
```

### Task 4: `lib/geo/ref.ts` — `GeographyRef`, the resolver, and the `basemaps.ts` shim (D10.1)

**Files:**
- Create: `lib/geo/ref.ts`
- Create: `lib/geo/ref.test.ts`
- Modify: `skills/map-native/src/basemaps.ts` — becomes a thin re-export (see Step 5).

**Interfaces:**
- Produces: `GeographyRef` (plain type, per Global Constraints — never `z.infer`), `BasemapMeta`,
  `BASEMAPS`, `BASEMAP_NAMES`, `resolveBasemapMeta(name: string): BasemapMeta` (unchanged
  signature — every existing caller keeps compiling), and new `resolveGeographyRef(name: string):
  GeographyRef`. Consumed by Task 8 (`geo-match.ts`'s inversion) and Task 13
  (`assemble/map-native.ts`'s refusal rewrite).

This task **moves** `skills/map-native/src/basemaps.ts`'s current content
(`BasemapMeta`/`BASEMAPS`/`BASEMAP_NAMES`/`resolveBasemapMeta`, verified in full while writing
this plan — the file is exactly 34 lines today) into `lib/geo/ref.ts`, and turns
`skills/map-native/src/basemaps.ts` into a re-export, the same move
`skills/map-native/src/theme/house-ramp.ts` already made for `lib/core/house-ramp.ts` (verified
while writing this plan: `export * from "../../../../lib/core/house-ramp";` plus one named
re-export for `relativeLuminance`). This keeps `skills/map-native/src/validate-config.ts`'s six
`validateBasemap` call sites (verified while writing this plan: `validate-config.ts:158, 289,
413, 501, 627, 744` — **the spec's own count of "4 sites" is stale; six is the current, grep-
verified number**, run `grep -n "validateBasemap(s.basemap" skills/map-native/src/
validate-config.ts` to reconfirm) and `lib/loop/assemble/map-native.ts:13`'s `import {
BASEMAP_NAMES } from "../../../skills/map-native/src/basemaps"` compiling untouched.

`GeographyRef` is the plain type from spec D10, verbatim:

```ts
export type GeographyRef = {
  origin: "shipped" | "declared";
  set: string;
  scope?: string;
  level: string;
  joinKey: string;
  joinKeyFamily: string;
};
```

Design call (spec D10 does not give the exact `resolveGeographyRef` values for `world`/
`us-states` — only that they "survive as names, resolved by the resolver"): `world` resolves to
`{origin:"shipped", set:"natural-earth-admin-0", level:"country", joinKey:"iso_a3",
joinKeyFamily:"iso_a3"}`; `us-states` resolves to `{origin:"shipped", set:"us-states",
level:"state", joinKey:"postal", joinKeyFamily:"postal"}` — `joinKey` and `joinKeyFamily` are
identical for both today because neither shipped basemap has a "family of candidates" yet (that
distinction becomes real once the ADM1 index of Task 7 offers 9 candidate identifiers per
feature).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/geo/ref.test.ts
import { describe, it, expect } from "bun:test";
import { BASEMAPS, BASEMAP_NAMES, resolveBasemapMeta, resolveGeographyRef } from "./ref";

describe("resolveBasemapMeta — unchanged behaviour, moved source of truth", () => {
  it("resolves 'world' to its existing joinKey/label — regression fixture copied from the pre-move file", () => {
    expect(resolveBasemapMeta("world")).toEqual({
      joinKey: "iso_a3",
      label: "World countries (ISO-A3 codes)",
    });
  });

  it("resolves 'us-states' to its existing joinKey/label", () => {
    expect(resolveBasemapMeta("us-states")).toEqual({
      joinKey: "postal",
      label: "US states (2-letter postal codes)",
    });
  });

  it("throws loudly, naming both valid basemaps, on an unknown name", () => {
    expect(() => resolveBasemapMeta("cantons")).toThrow(/world.*us-states|us-states.*world/);
  });
});

describe("resolveGeographyRef", () => {
  it("resolves 'world' to a GeographyRef whose joinKeyFamily matches its joinKey today", () => {
    const ref = resolveGeographyRef("world");
    expect(ref.origin).toBe("shipped");
    expect(ref.set).toBe("natural-earth-admin-0");
    expect(ref.joinKey).toBe("iso_a3");
    expect(ref.joinKeyFamily).toBe("iso_a3");
  });

  it("resolves 'us-states' with scope absent (global set, not a subset)", () => {
    const ref = resolveGeographyRef("us-states");
    expect(ref.set).toBe("us-states");
    expect(ref.scope).toBeUndefined();
  });

  it("BASEMAP_NAMES still lists exactly the two shipped names", () => {
    expect(BASEMAP_NAMES.sort()).toEqual(["us-states", "world"]);
    expect(Object.keys(BASEMAPS).sort()).toEqual(["us-states", "world"]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test geo/ref.test.ts`
Expected: FAIL — `./ref` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/geo/ref.ts
// The basemap registry — moved here from skills/map-native/src/basemaps.ts (D10), which is now
// a thin re-export of this file, the same move house-ramp.ts already made for lib/core/
// house-ramp.ts. GeographyRef is a PLAIN type (never z.infer) — see this plan's Global
// Constraints on why lib/geo/*'s runtime-reachable exports must stay zod-free.
export interface BasemapMeta {
  joinKey: string; // the geojson feature property region values match against
  label: string;
}

export const BASEMAPS: Record<string, BasemapMeta> = {
  world: { joinKey: "iso_a3", label: "World countries (ISO-A3 codes)" },
  "us-states": { joinKey: "postal", label: "US states (2-letter postal codes)" },
};

export const BASEMAP_NAMES = Object.keys(BASEMAPS);

// Resolve a basemap's metadata, failing LOUDLY (with the valid list) on an unknown
// name — never a silent fallback to world or a mystery render.
export function resolveBasemapMeta(name: string): BasemapMeta {
  const meta = BASEMAPS[name];
  if (!meta)
    throw new Error(
      `unknown basemap "${name}" — valid basemaps: ${BASEMAP_NAMES.join(", ")}`,
    );
  return meta;
}

/** What a resolved geography IS — the descriptor produce needs to subset (Task 6) and the
 *  journalist needs to read ("joint sur ISO 3166-2" vs "joint sur le nom français" — spec D10).
 *  `origin` distinguishes a shipped default from a journalist-declared file (Task 9's
 *  input.geography); `scope` is the ISO-A3 country scope of an admin-1 subset, absent for a
 *  global set. */
export type GeographyRef = {
  origin: "shipped" | "declared";
  set: string;
  scope?: string;
  level: string;
  joinKey: string;
  joinKeyFamily: string;
};

const SHIPPED_REFS: Record<string, GeographyRef> = {
  world: {
    origin: "shipped",
    set: "natural-earth-admin-0",
    level: "country",
    joinKey: "iso_a3",
    joinKeyFamily: "iso_a3",
  },
  "us-states": {
    origin: "shipped",
    set: "us-states",
    level: "state",
    joinKey: "postal",
    joinKeyFamily: "postal",
  },
};

export function resolveGeographyRef(name: string): GeographyRef {
  const ref = SHIPPED_REFS[name];
  if (!ref)
    throw new Error(
      `unknown basemap "${name}" — valid basemaps: ${BASEMAP_NAMES.join(", ")}`,
    );
  return ref;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test geo/ref.test.ts`
Expected: PASS, 6/6.

- [ ] **Step 5: Turn `skills/map-native/src/basemaps.ts` into a thin re-export**

Replace its entire content:

```ts
// skills/map-native/src/basemaps.ts — thin re-export shim. The basemap registry moved to
// lib/geo/ref.ts (geography-anywhere design D10) so it can be shared with the loop's manifest
// and produce-time subset pipeline without a skills/ → skills/ reach. This shim exists only so
// this package's own importers (validate-config.ts's six validateBasemap call sites, geo-match.ts,
// ChoroplethMap.tsx and its siblings) keep their import path unchanged. Same move
// theme/house-ramp.ts already made for lib/core/house-ramp.ts.
export * from "../../../lib/geo/ref";
```

- [ ] **Step 6: Run the map-native suite to confirm nothing that imports `./basemaps` broke**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test`
Expected: PASS, same count as before this task (the shim is a pure re-export; every existing
importer of `BASEMAPS`/`BASEMAP_NAMES`/`resolveBasemapMeta`/`BasemapMeta` resolves identically).
Record the pass count before and after this step as the proof the move is behaviour-preserving.

- [ ] **Step 7: Mutation — prove the "us-states scope absent" test depends on the real value, not
  on `toBeUndefined()` being vacuously true**

Temporarily add `scope: "USA"` to `SHIPPED_REFS["us-states"]`.

Run: `cd lib && bun test geo/ref.test.ts`
Expected: "resolves 'us-states' with scope absent" FAILS (`ref.scope` is `"USA"`, not
`undefined`) — 1/6 reddens. Revert the mutation before continuing.

- [ ] **Step 8: Commit**

```bash
git add lib/geo/ref.ts lib/geo/ref.test.ts skills/map-native/src/basemaps.ts
git commit -m "feat(geo): GeographyRef resolver; basemaps.ts becomes a thin re-export (D10)"
```

### Task 5: `lib/geo/join.ts` — the join ledger and its staleness rule (D6)

**Files:**
- Create: `lib/geo/join.ts`
- Create: `lib/geo/join.test.ts`

**Interfaces:**
- Produces: `GeoJoinDecision`, `GeoJoinLedger` (plain types, per spec D6, with one addition —
  `pending: string[]`, see the design call below), `unresolvedGeoJoins(ledger: GeoJoinLedger |
  undefined): string[]`, `staleGeoJoinDecisions(ledger: GeoJoinLedger | undefined,
  currentGeographySha256: string): boolean`. Consumed by Task 11 (manifest wiring) and Task 15
  (produce refusal).

**Scope note, stated explicitly because it is a call this plan makes, not something the spec
hands over as code:** spec D6 describes a full journalist-facing flow — "Splash measures, shows,
and lets the journalist decide, then remembers the correspondence." That flow is a **host-level
dialogue** (asking a question, recording the answer through a driver), the same shape as CADRAGE's
Gate 1b. Building that dialogue would touch `skills/splash/SKILL.md` and driver/host code — the
former is explicitly contended by another plan in flight (Global Constraints), and the latter is
a different layer of the codebase than "geography enters a run." **This plan delivers the ledger
data structure, the pure functions over it, and the mechanical produce-time gate that blocks on
an unresolved entry — mirroring `unauthoredBeats`'s shape exactly.** Populating `pending` (which
values are still ambiguous) and `decisions` (what the journalist picked) from an actual dialogue
is out of this plan's scope; the gate is ready for that follow-up to call into.

Design call, for the same reason: the spec's `unresolvedGeoJoins(run)` signature takes the whole
`RunManifest`. Taking `RunManifest` directly from `lib/geo/` would create a `lib/geo` → `lib/loop`
dependency the architecture table does not otherwise need (every other `lib/geo/*` file is either
standalone or, like `ref.ts`, consumed BY `lib/loop`, never the reverse). Instead,
`unresolvedGeoJoins` here takes the ledger alone (`GeoJoinLedger | undefined`); Task 11's manifest
wiring adds the `run`-level wrapper `unresolvedGeoJoins` is mirrored from, calling this one with
`run.orient?.geoJoin`, exactly the way `lib/loop/manifest.ts`'s existing `unauthoredBeats(el)`
takes `RunElement`, not the ledger's raw array.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/geo/join.test.ts
import { describe, it, expect } from "bun:test";
import { unresolvedGeoJoins, staleGeoJoinDecisions, type GeoJoinLedger } from "./join";

describe("unresolvedGeoJoins", () => {
  it("returns an empty list when there is no ledger at all (nothing pending yet)", () => {
    expect(unresolvedGeoJoins(undefined)).toEqual([]);
  });

  it("lists the pending values by name — the fixture: 'Buenos Aires', ambiguous between the province and the autonomous city (spec D6, measured)", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "abc123",
      decisions: [],
      pending: ["Buenos Aires"],
    };
    expect(unresolvedGeoJoins(ledger)).toEqual(["Buenos Aires"]);
  });

  it("drops a value once it has a decision recorded", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "abc123",
      decisions: [{ value: "Buenos Aires", featureId: "ARG-buenosaires-city", basis: "journalist" }],
      pending: [],
    };
    expect(unresolvedGeoJoins(ledger)).toEqual([]);
  });
});

describe("staleGeoJoinDecisions", () => {
  it("is false when there is no ledger yet — nothing to be stale", () => {
    expect(staleGeoJoinDecisions(undefined, "abc123")).toBe(false);
  });

  it("is false when the ledger's geographySha256 matches the current file's hash", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "abc123",
      decisions: [],
      pending: [],
    };
    expect(staleGeoJoinDecisions(ledger, "abc123")).toBe(false);
  });

  it("is true when the geometry file changed under an already-decided ledger — the PH-13 fixture (spec D6): a code REASSIGNED to a different region must not silently replay", () => {
    const ledger: GeoJoinLedger = {
      column: "region",
      geographySha256: "hash-of-2019-boundaries",
      decisions: [{ value: "PH-13", featureId: "old-region-13", basis: "journalist" }],
      pending: [],
    };
    expect(staleGeoJoinDecisions(ledger, "hash-of-2024-boundaries")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test geo/join.test.ts`
Expected: FAIL — `./join` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/geo/join.ts
// The join ledger — spec D6. `pending` is this task's addition to the spec's own type sketch:
// the raw values a below-ADM1 join found ambiguous and has not yet resolved. Populating it (and
// `decisions`) from an actual journalist dialogue is out of this task's scope — see this task's
// header in the plan.
export type GeoJoinDecision = {
  value: string; // the raw value in the journalist's column
  featureId: string; // the polygon it was bound to
  basis: "unambiguous" | "journalist";
};

export type GeoJoinLedger = {
  column: string;
  geographySha256: string; // WHICH file these decisions were taken against (D1b)
  decisions: GeoJoinDecision[];
  pending: string[]; // values still awaiting a decision
};

/** Mirrors lib/loop/manifest.ts's unauthoredBeats(el) exactly: a list of what is still owed,
 *  never a count. Empty ⇒ produce may proceed (Task 15's gate). */
export function unresolvedGeoJoins(ledger: GeoJoinLedger | undefined): string[] {
  if (!ledger) return [];
  const decided = new Set(ledger.decisions.map((d) => d.value));
  return ledger.pending.filter((v) => !decided.has(v));
}

/** A decision taken against one file must not be replayed against a different one — spec D6's
 *  PH-13 case: a code reassigned to a different region under a newer boundary release is
 *  EXACTLY the mechanism of a wrong map with no error. True ⇒ the caller re-poses the decisions
 *  as new questions rather than trusting `decisions` as-is. */
export function staleGeoJoinDecisions(
  ledger: GeoJoinLedger | undefined,
  currentGeographySha256: string,
): boolean {
  if (!ledger) return false;
  return ledger.geographySha256 !== currentGeographySha256;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test geo/join.test.ts`
Expected: PASS, 6/6.

- [ ] **Step 5: Mutation — prove `staleGeoJoinDecisions`'s PH-13 test depends on the hash
  comparison actually running**

Temporarily change the function body to `return false;` unconditionally.

Run: `cd lib && bun test geo/join.test.ts`
Expected: the "PH-13 fixture" test FAILS (`staleGeoJoinDecisions(...)` returns `false`, expected
`true`) — 1/6 reddens. Revert the mutation before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/geo/join.ts lib/geo/join.test.ts
git commit -m "feat(geo): join ledger — unresolvedGeoJoins + staleness-by-hash (D6)"
```

### Task 6: `lib/geo/subset.ts` — filter → prune → simplify → encode (D5)

**Files:**
- Create: `lib/geo/subset.ts`
- Create: `lib/geo/subset.test.ts`

**Interfaces:**
- Produces: `toleranceMetersFor(mapExtentMeters: number, renderWidthPx: number): number` (pure)
  and `subsetGeometry(input: SubsetInput): Promise<{ bytes: number }>` (spawns `bunx mapshaper`).
  Consumed by Task 18 (`produce.mjs` wiring).

CLI flags verified against the installed mapshaper while writing this plan (`bunx mapshaper -h
simplify`, `-h filter`, `-h filter-fields`, `-h o`, run 2026-07-30):
`-simplify visvalingam interval=<N>m` takes an ABSOLUTE metre tolerance (not a percentage —
`-simplify 5%` is the exact anti-pattern spec D5 measures moving the Swiss border by 64px);
`-filter '<js-expression>'` deletes features that evaluate to false; `-filter-fields
fields=<comma-list>` retains only the named properties; `-o <path> format=topojson
quantization=<N>` writes TopoJSON. The tolerance rule itself (D5): `tolerance ≈ (map extent in
metres) / (render width in px)` — one pixel, never a percentage.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/geo/subset.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toleranceMetersFor, subsetGeometry } from "./subset";

describe("toleranceMetersFor", () => {
  it("derives an absolute metre tolerance from extent/width — the spec's Swiss-cantons fixture: ~288 m/px at 1200px gives ~100m (measured 1.3px deviation, spec D5)", () => {
    // 345,600 m extent (Switzerland's rough east-west span) at a 1200px render width.
    expect(toleranceMetersFor(345_600, 1200)).toBeCloseTo(288, 0);
  });

  it("is never expressed as a percentage — this function has no percentage branch at all", () => {
    // The point of this test is structural, not numeric: confirm the function's return type is
    // always a plain metre number, so nothing downstream can be handed "5%" instead of "100".
    expect(typeof toleranceMetersFor(100_000, 1000)).toBe("number");
  });
});

describe("subsetGeometry — real bunx mapshaper invocation, no mock (repo convention)", () => {
  const dir = mkdtempSync(join(tmpdir(), "geo-subset-test-"));
  const sourcePath = join(dir, "source.geojson");
  const outPath = join(dir, "out.topojson");

  // Three features, deliberately distinguishable: only "b" and "c" get kept by the filter, and
  // only "keepMe" survives the property prune — "dropMe" is the fixture element that PROVES
  // pruning ran (spec D5's biggest, cheapest win: 253kB → 93kB from property pruning alone).
  const fixture: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "a", keepMe: "A", dropMe: "verbose-a" },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] },
      },
      {
        type: "Feature",
        properties: { id: "b", keepMe: "B", dropMe: "verbose-b" },
        geometry: { type: "Polygon", coordinates: [[[2, 0], [2, 1], [3, 1], [3, 0], [2, 0]]] },
      },
      {
        type: "Feature",
        properties: { id: "c", keepMe: "C", dropMe: "verbose-c" },
        geometry: { type: "Polygon", coordinates: [[[4, 0], [4, 1], [5, 1], [5, 0], [4, 0]]] },
      },
    ],
  };
  writeFileSync(sourcePath, JSON.stringify(fixture));

  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("filters to only the drawn features, prunes to only the kept property, and encodes TopoJSON", async () => {
    const result = await subsetGeometry({
      sourcePath,
      outPath,
      featureIds: ["b", "c"],
      idProperty: "id",
      keepProperties: ["id", "keepMe"],
      toleranceMeters: 1, // near-lossless — this fixture's geometry is tiny, not real-world-scaled
    });
    expect(result.bytes).toBeGreaterThan(0);

    const topo = JSON.parse(readFileSync(outPath, "utf8"));
    expect(topo.type).toBe("Topology");
    const layerKey = Object.keys(topo.objects)[0]!;
    const geoms = topo.objects[layerKey].geometries as { properties: Record<string, unknown> }[];
    expect(geoms.length).toBe(2); // only "b" and "c" — "a" was filtered out
    for (const g of geoms) {
      expect(g.properties.keepMe).toBeDefined();
      expect(g.properties.dropMe).toBeUndefined(); // pruned — the fixture element under test
    }
  }, 30_000);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test geo/subset.test.ts`
Expected: FAIL — `./subset` does not exist yet (the `toleranceMetersFor` tests fail on missing
module; the `subsetGeometry` test would also fail on missing module before it ever reaches
mapshaper).

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/geo/subset.ts
// filter → prune → simplify → encode (D5). Every cut is a real bunx mapshaper invocation — no
// mock, per repo convention (real APIs, real failures). Tolerance is ALWAYS an absolute metre
// value derived from render width, never a percentage: -simplify 5% (a number that "sounds
// prudent") moves the Swiss border by 64px at 1200px width (spec D5, measured).
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";

export function toleranceMetersFor(mapExtentMeters: number, renderWidthPx: number): number {
  return mapExtentMeters / renderWidthPx;
}

export type SubsetInput = {
  sourcePath: string;
  outPath: string;
  featureIds: string[];
  idProperty: string;
  keepProperties: string[];
  toleranceMeters: number;
};

export async function subsetGeometry(input: SubsetInput): Promise<{ bytes: number }> {
  const idList = JSON.stringify(input.featureIds);
  const filterExpr = `${idList}.includes(${input.idProperty})`;
  const args = [
    "mapshaper",
    input.sourcePath,
    "-filter",
    filterExpr,
    "-filter-fields",
    `fields=${input.keepProperties.join(",")}`,
    "-simplify",
    "visvalingam",
    `interval=${input.toleranceMeters}m`,
    "-o",
    input.outPath,
    "format=topojson",
    "quantization=1e5",
    "force",
  ];
  const r = spawnSync("bunx", args, { encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(`subsetGeometry: bunx mapshaper failed (exit ${r.status}): ${r.stderr}`);
  return { bytes: statSync(input.outPath).size };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test geo/subset.test.ts`
Expected: PASS, 3/3. (The `subsetGeometry` test spawns a real subprocess and may take a few
seconds — this is expected, matches the repo's existing live-render test class, not a hang.)

- [ ] **Step 5: Mutation — prove the property-prune assertion depends on `-filter-fields`
  actually running**

Temporarily remove the `"-filter-fields", \`fields=${input.keepProperties.join(",")}\`,` two
array entries from `args`.

Run: `cd lib && bun test geo/subset.test.ts`
Expected: the "filters... prunes... encodes" test FAILS on `expect(g.properties.dropMe
).toBeUndefined()` — `dropMe` is present (`"verbose-b"`/`"verbose-c"`) because nothing pruned it.
1/3 reddens. Revert the mutation before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/geo/subset.ts lib/geo/subset.test.ts
git commit -m "feat(geo): subset pipeline — filter/prune/simplify/encode, metric tolerance only (D5)"
```
