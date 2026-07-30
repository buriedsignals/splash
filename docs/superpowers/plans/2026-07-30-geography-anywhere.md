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

### Task 7: `lib/geo/index-build.ts` — the offline ADM1 index (D6), plus the one-time fetch script

**Files:**
- Create: `lib/geo/index-build.ts`
- Create: `lib/geo/index-build.test.ts`
- Create: `lib/geo/scripts/fetch-natural-earth-admin1.mjs` (one-time build script, NOT part of
  `bun run check` — see Step 6, and R6 in the spec: "a refresh cadence would be theatre" because
  the source has been frozen since 2022).
- Create (committed build artifacts, produced by Step 6, sizes will differ from the spec's
  measurements — see the note there): `skills/map-native/assets/geo/natural-earth-admin-1.
  topojson`, `lib/geo/adm1-index.json`.

**Interfaces:**
- Produces: `buildAdm1Index(features: GeoJSON.Feature[]): Adm1Index`, where `Adm1Index = Record<
  string, { featureId: string; family: string }[]>` — a NORMALIZED key to every feature that
  claims it (an array, not a single winner, so ambiguity is visible rather than silently
  first-wins). Pure, no network, no filesystem — the download/convert/write is a separate,
  un-tested one-time script (Step 6). Consumed by Task 8 (`matchGeography`'s inversion).

**Design calls this task makes, spelled out because the spec describes the index's CONTENT (9
identifier fields + 12 name fields + `name_alt` aliases, normalized: NFD, uppercase, dash/
apostrophe → space) without giving `buildAdm1Index`'s exact signature:**
1. **`featureId`** — Natural Earth's admin-1 layer has no field that is both globally unique and
   always non-empty (the spec's own admin-0 example: 6 features carry `iso_a3 = "-99"`). This
   task uses `adm1_code` when present (Natural Earth's own per-feature identifier, e.g.
   `"USA-3510"`) and falls back to a synthetic `${properties.adm0_a3}-${index}` when it is
   blank — same "fail loud only when nothing usable exists" posture `resolveBasemapMeta` already
   uses.
2. **Collision preserved as an array**, not resolved to a "best" match — resolving it here would
   be exactly the silent mis-join D6 exists to prevent one layer up.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/geo/index-build.test.ts
import { describe, it, expect } from "bun:test";
import { buildAdm1Index } from "./index-build";

function feature(props: Record<string, string | undefined>): GeoJSON.Feature {
  return { type: "Feature", properties: props, geometry: { type: "Point", coordinates: [0, 0] } };
}

describe("buildAdm1Index", () => {
  it("indexes iso_3166_2 under its own family, normalized to uppercase", () => {
    const idx = buildAdm1Index([
      feature({ adm1_code: "CHE-159", adm0_a3: "CHE", iso_3166_2: "ch-ge", name: "Genève" }),
    ]);
    expect(idx["CH-GE"]).toEqual([{ featureId: "CHE-159", family: "iso_3166_2" }]);
  });

  it("indexes the accented French name and its unaccented form under the SAME normalized key — the fixture: 'Genève' vs 'Geneve'", () => {
    const idx = buildAdm1Index([
      feature({ adm1_code: "CHE-159", adm0_a3: "CHE", name: "Genève" }),
    ]);
    // NFD-decompose + strip diacritics + uppercase: "Genève" -> "GENEVE".
    expect(idx["GENEVE"]).toBeDefined();
    expect(idx["GENEVE"]!.some((m) => m.featureId === "CHE-159")).toBe(true);
  });

  it("keeps BOTH features under a colliding key — the fixture: two 'Buenos Aires' (spec D6, measured)", () => {
    const idx = buildAdm1Index([
      feature({ adm1_code: "ARG-buenosaires-prov", adm0_a3: "ARG", name: "Buenos Aires" }),
      feature({ adm1_code: "ARG-caba", adm0_a3: "ARG", name: "Buenos Aires" }),
    ]);
    expect(idx["BUENOS AIRES"]).toHaveLength(2);
    const ids = idx["BUENOS AIRES"]!.map((m) => m.featureId).sort();
    expect(ids).toEqual(["ARG-buenosaires-prov", "ARG-caba"]);
  });

  it("falls back to a synthetic id when adm1_code is blank, rather than dropping the feature", () => {
    const idx = buildAdm1Index([feature({ adm0_a3: "XYZ", adm1_code: "", name: "Somewhere" })]);
    expect(idx["SOMEWHERE"]![0]!.featureId).toBe("XYZ-0");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test geo/index-build.test.ts`
Expected: FAIL — `./index-build` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/geo/index-build.ts
// The offline ADM1 index — built ONCE (Step 6's fetch script), committed, never inlined (spec
// D6/R6: the source is frozen since 2022, so a refresh cadence would be theatre). This file is
// the PURE indexing logic only; the download/convert/write is a separate script.
export type Adm1IndexEntry = { featureId: string; family: string };
export type Adm1Index = Record<string, Adm1IndexEntry[]>;

// The identifier families the spec measured (D6): 5 codes + 12 name fields + every name_alt
// alias. Field names as Natural Earth's admin_1 shapefile ships them.
const CODE_FAMILIES = ["iso_3166_2", "code_hasc", "postal", "fips", "wikidataid"] as const;
const NAME_FIELDS = [
  "name", "name_alt", "name_local", "name_en", "name_fr", "name_de", "name_es",
  "name_it", "name_pt", "name_ru", "name_zh", "name_ar",
] as const;

function normalize(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics after NFD decomposition
    .toUpperCase()
    .replace(/[-']/g, " ")
    .trim();
}

function add(index: Adm1Index, rawKey: string | undefined, entry: Adm1IndexEntry): void {
  if (!rawKey) return;
  const key = normalize(rawKey);
  if (!key) return;
  const existing = index[key] ?? (index[key] = []);
  if (!existing.some((e) => e.featureId === entry.featureId)) existing.push(entry);
}

export function buildAdm1Index(features: GeoJSON.Feature[]): Adm1Index {
  const index: Adm1Index = {};
  features.forEach((f, i) => {
    const p = (f.properties ?? {}) as Record<string, string | undefined>;
    const featureId = p.adm1_code && p.adm1_code.trim() !== ""
      ? p.adm1_code
      : `${p.adm0_a3 ?? "UNK"}-${i}`;

    for (const family of CODE_FAMILIES) add(index, p[family], { featureId, family });
    for (const field of NAME_FIELDS) add(index, p[field], { featureId, family: field });
    // name_alt is a pipe-delimited alias list on Natural Earth's real files — split it, but the
    // family stays "name_alt" for every alias (the spec reports it as one family).
    if (p.name_alt)
      for (const alias of p.name_alt.split("|"))
        add(index, alias, { featureId, family: "name_alt" });
  });
  return index;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test geo/index-build.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Mutation — prove the accent-fold test depends on NFD normalization actually
  running**

Temporarily change `normalize` to skip the NFD/diacritic-strip step:

```ts
// MUTATION
function normalize(raw: string): string {
  return raw.toUpperCase().replace(/[-']/g, " ").trim();
}
```

Run: `cd lib && bun test geo/index-build.test.ts`
Expected: the "accented French name" test FAILS — `idx["GENEVE"]` is `undefined` because
`"Genève".toUpperCase()` is `"GENÈVE"` (the `È` never folds to plain `E`), so the key the test
looks up was never written. 1/4 reddens. Revert the mutation before continuing.

- [ ] **Step 6: The one-time fetch + build script (NOT unit-tested, NOT part of `bun run check`)**

Write `lib/geo/scripts/fetch-natural-earth-admin1.mjs`. This is a manual, one-time build step —
R6 in the spec is explicit that an automatic refresh cadence would be theatre, since the source
(Natural Earth v5.1.1/v5.1.2, last commit 2022-06-02) is frozen. The script:

1. Downloads `https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip`
   (the URL cited in the research doc's measurement appendix — verify it still resolves before
   relying on it; Natural Earth's CDN has been stable but this plan does not re-verify it today).
2. Unzips it to a scratch directory and converts the shapefile to GeoJSON with
   `bunx mapshaper ne_10m_admin_1_states_provinces.shp -o admin1.geojson format=geojson`.
3. Reads `admin1.geojson`, calls `buildAdm1Index` (this task's function) on its features, and
   writes the result to `lib/geo/adm1-index.json`.
4. Subsets/re-encodes the same source to TopoJSON with `subsetGeometry`-equivalent flags at
   500m Visvalingam tolerance (spec D10's ~500m figure for the whole-world natural-earth-admin-1
   set) via `bunx mapshaper admin1.geojson -simplify visvalingam interval=500m -o
   skills/map-native/assets/geo/natural-earth-admin-1.topojson format=topojson
   quantization=1e5`.
5. **Prints, and does not assert, the resulting counts** — distinct keys, keys with more than one
   feature, byte size of both committed files. **Do not hardcode the spec's own measured numbers
   (47,231 keys / 1,651 ambiguous / 1,369,563 B) as a pass/fail assertion anywhere in this
   repo.** Those numbers came from Natural Earth v5.1.1 fetched during the spec's research; this
   script's own run is the one true measurement for what actually gets committed, and it may
   differ by a handful of features if the CDN serves a patched point release. Report the real
   numbers this script prints in the task's completion note instead.

Run it once by hand: `bun lib/geo/scripts/fetch-natural-earth-admin1.mjs`. Confirm both output
files exist and are non-empty, and that `lib/geo/adm1-index.json` parses as valid JSON with
`buildAdm1Index`'s shape (a spot check: `jq '.["CH-GE"]' lib/geo/adm1-index.json` should list a
Geneva-shaped entry).

- [ ] **Step 7: Commit**

```bash
git add lib/geo/index-build.ts lib/geo/index-build.test.ts lib/geo/scripts/fetch-natural-earth-admin1.mjs \
  lib/geo/adm1-index.json skills/map-native/assets/geo/natural-earth-admin-1.topojson
git commit -m "feat(geo): offline ADM1 index — pure builder + one-time Natural Earth fetch (D6)"
```

---

## Phase B — invert `matchGeography` (D10.2)

**Plan-wide design call, stated once here because every later task depends on it:** the spec
widens the assembler's `GeoMatch` from `{column, basemap: string, matched, total, unmatched}` to
carry a `GeographyRef`, but does not give the exact field name. This plan renames `basemap` to
`geography: GeographyRef` on `GeoMatch` (both the zod `GeoMatchSchema` in `lib/loop/manifest.ts`
and the hand-mirrored plain type in `lib/core/production-brief.ts` — Task 9). Every downstream
consumer that currently reads `geo.basemap` (six spots across
`lib/loop/assemble/map-native.ts`, verified while writing this plan) moves to `geo.geography`
(Phase D). The map-native **config** surface (`ChoroplethConfig.basemap?: string` and its
siblings on `CartogramConfig`/`DotDensityConfig`/`RouteMap`'s point-family configs) keeps
`basemap?: string` for the two shipped names — nothing that already renders `"world"`/
`"us-states"` needs to change — and gains an **additive** `geography?: GeographyRef` field that,
when present, is what the component resolves geometry from (Tasks 16–17); `basemap` alone remains
meaningful only for the two legacy names. This is the same "new field wins, old field stays for
back-compat" shape the manifest already uses for `deliverable` defaulting (`materializeDeliverables`,
verified in `lib/loop/migrate.ts` while writing this plan).

### Task 8: invert `matchGeography` to index-based lookup, add the ADM1 candidate (D10.2)

**Files:**
- Modify: `skills/map-native/src/geo-match.ts` (currently 93 lines, verified in full while
  writing this plan — `keysOf` at `:19-49`, `matchGeography` at `:68-92`).
- Modify: `skills/map-native/tests/` — find the existing test file for `geo-match.ts` (run `grep
  -rl "matchGeography" skills/map-native/tests` to confirm its exact name before editing; do not
  assume a filename).

**Interfaces:**
- Consumes: `Adm1Index`, `buildAdm1Index` (Task 7, via the committed `lib/geo/adm1-index.json`),
  `GeographyRef`, `resolveGeographyRef` (Task 4).
- Produces: `matchGeography(columns, rows, dir?, basemaps?, adm1Index?): GeoMatch | undefined`,
  same call signature shape as today (every optional parameter still defaults to the real shipped
  assets/registry/index) but its return type's `basemap: string` field becomes `geography:
  GeographyRef` (per the design call above), and it now ALSO tries the ADM1 index as a third
  candidate — this is what makes a Swiss-cantons or French-communes-at-ADM1 column matchable at
  all, closing the capability gap spec §1.1 names ("une choroplèthe cantonale suisse — le sujet
  du pilote — n'est pas dans la matrice"). Consumed by Task 13 (`assemble/map-native.ts`'s
  refusal rewrite) — `lib/loop/orient.ts:43` (verified while writing this plan: `const geo =
  matchGeography(columns, rows);`) calls this with no `try`/`catch`, so invariant I1 (never
  throws) still applies without any change at that call site.

**Both existing invariants are preserved, not just described** (spec: "ses deux invariants
survivent intacts"): **I1, never throws** — a corrupt/missing index or asset is caught and
skipped exactly like `keysOf`'s existing `catch` already does for a broken `us-states.geojson`;
**always names the orphans** — `unmatched` keeps listing raw values, never just a count, and this
task ADDS the "level" label spec D10.2 rule 3 asks for (`"Suisse"` finding nothing in an ADM1
index is not an orphan bug, it is an ADM0 name asked of an ADM1 index — the orphan report must
say which level it looked in).

- [ ] **Step 1: Write the failing tests**

```ts
// (append to the existing geo-match test file found above)
import { describe, it, expect } from "bun:test";
import { matchGeography } from "../src/geo-match";
import type { Adm1Index } from "../../../lib/geo/index-build";

// A tiny, hand-built ADM1 index fixture — Swiss cantons — standing in for the real committed
// lib/geo/adm1-index.json (Task 7), so this test does not depend on the one-time fetch having
// run. "Genève" is the exact worked example the spec's own text resolves (D6): "Genève, CH-GE,
// Geneva, Genf, Ginevra → tous CHE-159".
const swissFixture: Adm1Index = {
  "GENEVE": [{ featureId: "CHE-159", family: "name" }],
  "CH-GE": [{ featureId: "CHE-159", family: "iso_3166_2" }],
  "VAUD": [{ featureId: "CHE-160", family: "name" }],
};

describe("matchGeography — ADM1 index candidate (D10.2)", () => {
  it("matches a Swiss-cantons column against the ADM1 index, reporting scope+level", () => {
    const columns = ["canton", "value"];
    const rows = [
      { canton: "Genève", value: "1" },
      { canton: "Vaud", value: "2" },
    ];
    const match = matchGeography(columns, rows, undefined, undefined, swissFixture);
    expect(match).toBeDefined();
    expect(match!.column).toBe("canton");
    expect(match!.geography.set).toBe("natural-earth-admin-1");
    expect(match!.geography.level).toBe("canton"); // echoes the ADM1 index's own level, not a guess
    expect(match!.matched).toBe(2);
    expect(match!.unmatched).toEqual([]);
  });

  it("still resolves the shipped 'world' basemap unchanged when a country column is given", () => {
    // Regression: the world/us-states path must not have moved. Uses the REAL shipped
    // assets/registry (no override args) exactly as the pre-existing test suite already does.
    const columns = ["country", "value"];
    const rows = [{ country: "FRA", value: "1" }];
    const match = matchGeography(columns, rows);
    expect(match?.geography.set).toBe("natural-earth-admin-0");
  });

  it("names the orphan WITH its level when a country name is asked of the ADM1 index — 'Suisse' fixture (spec D10.2 rule 3)", () => {
    const columns = ["place"];
    const rows = [{ place: "Suisse" }]; // an ADM0 name — absent from any ADM1 index by construction
    const match = matchGeography(columns, rows, undefined, undefined, swissFixture);
    // No ADM1 candidate wins (0 matched), so this column is not returned as the best geography
    // match from the ADM1 side at all — orient.ts's caller sees `undefined` for this candidate
    // and geoRefusal (Task 13) is where the "no geography Splash can place" message lands. This
    // test only asserts the ADM1 branch does not crash and does not silently claim a match.
    expect(match).toBeUndefined();
  });

  it("never throws on a missing/corrupt ADM1 index — invariant I1", () => {
    expect(() =>
      matchGeography(["canton"], [{ canton: "Genève" }], undefined, undefined, undefined),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/map-native && bun test tests/<the file found above>`
Expected: FAIL — `match!.geography` is `undefined` (current `GeoMatch` has `basemap`, not
`geography`), and the ADM1 fixture parameter does not exist in the current signature.

- [ ] **Step 3: Rewrite `matchGeography`**

```ts
// skills/map-native/src/geo-match.ts
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GeoMatch } from "../../../lib/core/production-brief";
import { BASEMAPS, type BasemapMeta, resolveGeographyRef } from "./basemaps";
import type { Adm1Index } from "../../../lib/geo/index-build";

const assetsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../assets/geo");
const adm1IndexPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../lib/geo/adm1-index.json",
);

const keyCache = new Map<string, Map<string, Set<string> | undefined>>();

function keysOf(dir: string, basemap: string, joinKey: string): Set<string> | undefined {
  let perDir = keyCache.get(dir);
  if (!perDir) {
    perDir = new Map();
    keyCache.set(dir, perDir);
  }
  if (perDir.has(basemap)) return perDir.get(basemap);
  let keys: Set<string> | undefined;
  try {
    const fc = JSON.parse(
      readFileSync(join(dir, `${basemap}.geojson`), "utf8"),
    ) as GeoJSON.FeatureCollection;
    keys = new Set(
      fc.features
        .map((f) => f.properties?.[joinKey])
        .filter((v): v is string => typeof v === "string")
        .map((v) => v.trim().toUpperCase()),
    );
  } catch {
    keys = undefined;
  }
  perDir.set(basemap, keys);
  return keys;
}

let cachedAdm1Index: Adm1Index | undefined | null = null; // null = "tried and failed"
function loadAdm1Index(): Adm1Index | undefined {
  if (cachedAdm1Index !== null) return cachedAdm1Index ?? undefined;
  try {
    cachedAdm1Index = JSON.parse(readFileSync(adm1IndexPath, "utf8")) as Adm1Index;
  } catch {
    cachedAdm1Index = null;
  }
  return cachedAdm1Index ?? undefined;
}

function normalizeValue(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[-']/g, " ")
    .trim();
}

/** The shipped-basemap candidate — unchanged behaviour from before this task, just returning the
 *  new GeographyRef-shaped GeoMatch instead of a bare `basemap: string`. */
function matchShippedBasemaps(
  columns: string[],
  rows: Record<string, string | number>[],
  dir: string,
  basemaps: Record<string, BasemapMeta>,
): GeoMatch | undefined {
  let best: GeoMatch | undefined;
  for (const name of Object.keys(basemaps)) {
    const keys = keysOf(dir, name, basemaps[name]!.joinKey);
    if (!keys) continue;
    for (const column of columns) {
      const values = rows.map((r) => String(r[column] ?? "").trim());
      const unmatched = values.filter((v) => v !== "" && !keys.has(v.toUpperCase()));
      const matched = values.filter((v) => v !== "" && keys.has(v.toUpperCase())).length;
      if (matched === 0) continue;
      if (!best || matched > best.matched)
        best = { column, geography: resolveGeographyRef(name), matched, total: values.length, unmatched };
    }
  }
  return best;
}

/** The ADM1-index candidate (D10.2, new in this task) — the mechanism that makes a Swiss-canton
 *  or French-département column matchable at all. Only a WIN (matched > 0) is returned; a column
 *  that finds nothing here (e.g. an ADM0 name like "Suisse" — spec's own rule-3 fixture) is not
 *  reported as a failed ADM1 match, it simply does not win this candidate — geoRefusal (Task 13)
 *  is where "no geography at all" is said. */
function matchAdm1Index(
  columns: string[],
  rows: Record<string, string | number>[],
  index: Adm1Index | undefined,
): GeoMatch | undefined {
  if (!index) return undefined;
  let best: GeoMatch | undefined;
  for (const column of columns) {
    const values = rows.map((r) => String(r[column] ?? "").trim());
    const families = new Map<string, number>(); // which family won, and how many times
    const unmatched: string[] = [];
    let matched = 0;
    for (const v of values) {
      if (v === "") continue;
      const hits = index[normalizeValue(v)];
      if (!hits || hits.length === 0) {
        unmatched.push(v);
        continue;
      }
      matched++;
      const family = hits[0]!.family;
      families.set(family, (families.get(family) ?? 0) + 1);
    }
    if (matched === 0) continue;
    const winningFamily = [...families.entries()].sort((a, b) => b[1] - a[1])[0]![0];
    const candidate: GeoMatch = {
      column,
      geography: {
        origin: "shipped",
        set: "natural-earth-admin-1",
        level: column, // no per-feature "level" name is threaded to this fixture-free path yet —
        // Task 13 refines this with the real per-country admin level label carried by the index.
        joinKey: winningFamily,
        joinKeyFamily: winningFamily,
      },
      matched,
      total: values.length,
      unmatched,
    };
    if (!best || candidate.matched > best.matched) best = candidate;
  }
  return best;
}

/**
 * WHICH COLUMN IS THE GEOGRAPHY, AND AGAINST WHICH GEOGRAPHY. Tries the shipped basemaps AND
 * the ADM1 index, keeps the best join across both. Never throws (I1); always names the orphans.
 */
export function matchGeography(
  columns: string[],
  rows: Record<string, string | number>[],
  dir: string = assetsDir,
  basemaps: Record<string, BasemapMeta> = BASEMAPS,
  adm1Index: Adm1Index | undefined = loadAdm1Index(),
): GeoMatch | undefined {
  const shipped = matchShippedBasemaps(columns, rows, dir, basemaps);
  const adm1 = matchAdm1Index(columns, rows, adm1Index);
  if (!shipped) return adm1;
  if (!adm1) return shipped;
  return adm1.matched > shipped.matched ? adm1 : shipped;
}
```

**Note on the test fixture's `level`**: the hand-written `swissFixture` test above asserts
`match!.geography.level === "canton"`, but the Step 3 implementation as written sets `level:
column` (the CSV column name, e.g. `"canton"` — coincidentally identical for that fixture's
column name, which is why the test as written passes; do not read more into the coincidence than
that). This is a genuine open edge the real Task 7 index (which carries no per-country "this is
called a canton/dép./comté" label — Natural Earth's `type_en` field is the honest source for that,
not modelled in Task 7) will need a real answer for. Flag this explicitly to whoever reviews this
task; do not silently paper over it by renaming the test's CSV column to force a coincidental
match.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/map-native && bun test tests/<the file found above>`
Expected: PASS, all cases including the pre-existing tests already in that file (this task
rewrites the function body but must not remove or weaken any existing test — run the WHOLE file,
not just the new `describe` block, and confirm the total count is the old count plus 4).

- [ ] **Step 5: Mutation — prove the "never throws on a missing index" test depends on the
  try/catch in `loadAdm1Index`, not on the fixture file happening to exist**

Temporarily change `loadAdm1Index`'s `catch` block to `throw` instead of setting
`cachedAdm1Index = null`.

Run: `cd skills/map-native && bun test tests/<the file found above>` with the real
`lib/geo/adm1-index.json` TEMPORARILY renamed out of the way (`mv lib/geo/adm1-index.json
lib/geo/adm1-index.json.bak`).
Expected: the "never throws on a missing/corrupt ADM1 index" test FAILS (an uncaught exception
propagates out of `matchGeography`). Report the failing count. Restore the file
(`mv lib/geo/adm1-index.json.bak lib/geo/adm1-index.json`) and revert the mutation before
continuing.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/geo-match.ts skills/map-native/tests/
git commit -m "feat(geo): matchGeography tries the ADM1 index alongside shipped basemaps (D10.2)"
```

---

## Phase C — manifest / init / migrate wiring (schemaVersion 4 → 5)

**Sequencing hazard, stated up front:** `GeoMatchSchema` (`lib/loop/manifest.ts:197-203`, verified
while writing this plan — currently `z.object({column, basemap: z.string(), matched, total,
unmatched})`) drops `basemap` for a required `geography: GeographyRefSchema` in this phase. That
is NOT an additive change — an existing on-disk v4 manifest with `orient.geo.basemap = "world"`
would fail to parse the moment the schema changes, unless the migration lands in the SAME commit.
Task 9 below therefore bundles the schema change and `migrateV4toV5` into one task — do not split
them across two commits, and do not merge Task 9 to `main` without both halves passing together.
Tasks 10 and 11 (`init.ts`, `provenanceHash`) ARE purely additive/optional and are safe as
standalone commits.

### Task 9: `RunManifestSchema` v5 — `input.geography`, `GeoMatchSchema` → `GeographyRef`, `orient.geoJoin`, and `migrateV4toV5`

**Files:**
- Modify: `lib/loop/manifest.ts` — `GeoMatchSchema` (`:197-203`), the `input` object
  (`:361-365`), the `orient` object (`:374-381`), `schemaVersion: z.literal(4)` (`:332`),
  `readManifest`'s version gate (`raw.schemaVersion !== 4`, `:595`).
- Modify: `lib/loop/migrate.ts` — `migrate()` dispatcher (`:17-30`), add `migrateV4toV5`.
- Modify: `lib/core/production-brief.ts` — `GeoMatch` plain type (`:32-38`): `basemap: string` →
  `geography: GeographyRef` (imported type-only from `lib/geo/ref.ts` — zod-free, per Global
  Constraints).
- Find and modify: existing manifest test fixtures that construct an `orient.geo` object with a
  `basemap` field — run `grep -rln "basemap:" lib/loop/*.test.ts lib/loop/**/*.test.ts` to find
  them before editing (do not assume which files these are; the spec does not name them and this
  plan has not enumerated them by hand).
- Test: `lib/loop/manifest.test.ts` (append), `lib/loop/migrate.test.ts` (append — confirm this
  file exists with `ls lib/loop/migrate.test.ts` before assuming its name).

**Interfaces:**
- Consumes: `GeographyRef` (Task 4), `GeographyCreditSchema` (Task 2), `GeoJoinLedger`'s shape
  (Task 5, hand-mirrored as a zod schema here — see design call below).
- Produces: `GeographyRecordSchema` (new, this task — see design call), the widened
  `RunManifestSchema` (schemaVersion 5), `migrateV4toV5(raw: unknown): unknown`. Consumed by Task
  10 (`init.ts`), Task 11 (`provenanceHash`), Task 15 (produce refusal).

**Design call — `GeographyRecordSchema` is not `GeographyInputSchema` (Task 2) reused verbatim.**
Spec D1b says the geography file is FROZEN like `data`/`article` (a `HashRef`), unlike `images`
(never frozen). So the manifest's `input.geography` needs `path`+`sha256` (the frozen copy) PLUS
the editorial facts `GeographyInputSchema` carries (`encoding`, `crs`, `level`, `licence`,
`edition`, `credit`, `joinKey`) — but NOT `GeographyInputSchema`'s own `path` field, which named
the journalist's ORIGINAL location, discarded once frozen (exactly like `data`/`article`'s
original path is discarded in favour of `HashRef.path`, the frozen relative path). This task
defines a second, manifest-local schema rather than reusing `GeographyInputSchema` for the
frozen record — the same relationship `HashRef` already has to the declaration schemas in
`lib/loop/init.ts`.

**Design call — `GeoMatchSchema.geography` and `orient.geoJoin` are hand-written zod schemas,
not `z.infer` reuse of the Task 4/Task 5 plain types.** Reusing them via import would create a
`lib/loop` → `lib/geo` zod dependency that is fine here (manifest.ts already imports zod
directly), but the PLAIN types in `lib/geo/ref.ts`/`lib/geo/join.ts` must stay independently
importable by `production-brief.ts` without zod riding along (Global Constraints) — keeping the
zod schema's definition local to `manifest.ts`, hand-synced by comment, is the same discipline
`ImageFrameSchema`/`ImageInput` already use for exactly this reason (verified while writing this
plan, `manifest.ts:109-119`'s own comment on `ImageFrameSchema`).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/loop/manifest.test.ts (append)
import { describe, it, expect } from "bun:test";
import { parseManifest, RunManifestSchema } from "./manifest"; // adjust to this file's real exports

function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    runId: "r1",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "abc" } },
    elements: [],
    events: [],
    ...overrides,
  };
}

describe("RunManifestSchema v5 — geography", () => {
  it("parses a manifest declaring input.geography with every required editorial fact", () => {
    const m = baseManifest({
      input: {
        data: { path: "input/data-abc.csv", sha256: "abc" },
        geography: {
          path: "input/geography-def.geojson",
          sha256: "def",
          encoding: "geojson",
          crs: "EPSG:4326",
          level: "communes de Haute-Savoie",
          licence: "Licence Ouverte 2.0",
          edition: "2024",
          credit: { name: "IGN — Admin Express" },
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(true);
  });

  it("refuses input.geography missing edition — same discipline as GeographyInputSchema", () => {
    const m = baseManifest({
      input: {
        geography: {
          path: "input/geography-def.geojson",
          sha256: "def",
          encoding: "geojson",
          crs: "EPSG:4326",
          level: "communes",
          licence: "Licence Ouverte 2.0",
          credit: { name: "IGN" },
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(false);
  });

  it("orient.geo carries a GeographyRef, not a bare basemap string", () => {
    const m = baseManifest({
      orient: {
        profile: { columns: ["canton"], numericColumns: [], rowCount: 2 },
        supportsPoint: false,
        geo: {
          column: "canton",
          geography: {
            origin: "shipped",
            set: "natural-earth-admin-1",
            scope: "CHE",
            level: "canton",
            joinKey: "name",
            joinKeyFamily: "name",
          },
          matched: 2,
          total: 2,
          unmatched: [],
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(true);
  });

  it("orient.geoJoin carries a GeoJoinLedger — the fixture: one unresolved 'Buenos Aires'", () => {
    const m = baseManifest({
      orient: {
        profile: { columns: ["region"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
        geoJoin: {
          column: "region",
          geographySha256: "def",
          decisions: [],
          pending: ["Buenos Aires"],
        },
      },
    });
    expect(RunManifestSchema.safeParse(m).success).toBe(true);
  });
});
```

```ts
// lib/loop/migrate.test.ts (append)
import { describe, it, expect } from "bun:test";
import { migrate } from "./migrate";

describe("migrateV4toV5", () => {
  it("translates orient.geo.basemap 'world' into a GeographyRef — the exact translation the spec names", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data: { path: "input/data-abc.csv", sha256: "abc" } },
      orient: {
        profile: { columns: ["country"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
        geo: { column: "country", basemap: "world", matched: 1, total: 1, unmatched: [] },
      },
      elements: [],
      events: [],
    };
    const migrated = migrate(v4, "/tmp/does-not-matter");
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.orient?.geo?.geography).toEqual({
      origin: "shipped",
      set: "natural-earth-admin-0",
      level: "country",
      joinKey: "iso_a3",
      joinKeyFamily: "iso_a3",
    });
    expect((migrated.orient?.geo as unknown as { basemap?: string }).basemap).toBeUndefined();
  });

  it("translates 'us-states' the same way", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: {},
      orient: {
        profile: { columns: ["state"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
        geo: { column: "state", basemap: "us-states", matched: 1, total: 1, unmatched: [] },
      },
      elements: [],
      events: [],
    };
    const migrated = migrate(v4, "/tmp/does-not-matter");
    expect(migrated.orient?.geo?.geography.set).toBe("us-states");
  });

  it("passes through a v4 manifest with no orient.geo at all, unaltered but at v5", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: {},
      elements: [],
      events: [],
    };
    const migrated = migrate(v4, "/tmp/does-not-matter");
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.orient).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test loop/manifest.test.ts loop/migrate.test.ts`
Expected: FAIL — `schemaVersion: z.literal(4)` rejects `5`; `GeoMatchSchema` has no `geography`
key; `migrateV4toV5` does not exist.

- [ ] **Step 3: Implement**

In `lib/loop/manifest.ts`, replace `GeoMatchSchema` (`:197-203`):

```ts
const GeographyRefSchema = z.strictObject({
  origin: z.enum(["shipped", "declared"]),
  set: z.string(),
  scope: z.string().optional(),
  level: z.string(),
  joinKey: z.string(),
  joinKeyFamily: z.string(),
});
const GeoMatchSchema = z.object({
  column: z.string(),
  geography: GeographyRefSchema,
  matched: z.number(),
  total: z.number(),
  unmatched: z.array(z.string()),
});
const GeoJoinDecisionSchema = z.object({
  value: z.string(),
  featureId: z.string(),
  basis: z.enum(["unambiguous", "journalist"]),
});
const GeoJoinLedgerSchema = z.object({
  column: z.string(),
  geographySha256: z.string(),
  decisions: z.array(GeoJoinDecisionSchema),
  pending: z.array(z.string()),
});
const GeographyRecordSchema = z.strictObject({
  path: z.string(),
  sha256: z.string(),
  encoding: z.enum(["geojson", "topojson"]),
  crs: z.enum(["EPSG:4326", "EPSG:4258", "EPSG:4269"]),
  level: z.string().min(1),
  licence: z.string().min(1),
  edition: z.string().min(1),
  credit: z.strictObject({ name: z.string().min(1), url: z.string().optional() }),
  joinKey: z.string().min(1).optional(),
});
```

Change `schemaVersion: z.literal(4)` (`:332`) to `z.literal(5)`.

Change `input` (`:361-365`):

```ts
  input: z.object({
    data: HashRef.optional(),
    article: HashRef.optional(),
    images: ImageInputSchema.optional(),
    geography: GeographyRecordSchema.optional(),
  }),
```

Change `orient` (`:374-381`):

```ts
  orient: z
    .object({
      profile: DataProfileSchema,
      supportsPoint: z.boolean(),
      note: z.string().optional(),
      geo: GeoMatchSchema.optional(),
      geoJoin: GeoJoinLedgerSchema.optional(),
    })
    .optional(),
```

Change `readManifest`'s gate (`:595`): `(raw as { schemaVersion?: number }).schemaVersion !== 5`.

In `lib/loop/migrate.ts`, add (mirroring `migrateV3toV4`'s shape exactly, verified in full while
writing this plan):

```ts
const SHIPPED_GEOGRAPHY_REFS: Record<string, unknown> = {
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

// v4's orient.geo carried a bare `basemap: string`; v5 carries a GeographyRef (geography-anywhere
// design D10). Translates the two shipped names the same way lib/geo/ref.ts's
// resolveGeographyRef does — duplicated here (not imported) because migrate.ts must keep working
// against every past schema shape even if lib/geo/ref.ts's own defaults ever change; a migration
// is a snapshot of what a name meant AT THAT VERSION, not a live lookup.
function migrateV4toV5(v4: unknown): unknown {
  const m = v4 as { orient?: { geo?: { basemap?: string } & Record<string, unknown> } };
  if (!m.orient?.geo) return { ...(v4 as object), schemaVersion: 5 };
  const { basemap, ...rest } = m.orient.geo;
  const geography = basemap ? SHIPPED_GEOGRAPHY_REFS[basemap] : undefined;
  return {
    ...(v4 as object),
    schemaVersion: 5,
    orient: { ...m.orient, geo: { ...rest, ...(geography ? { geography } : {}) } },
  };
}
```

Wire it into `migrate()` (`:17-30`):

```ts
export function migrate(raw: unknown, runDir: string): RunManifest {
  if (!raw || typeof raw !== "object")
    throw new Error("migrate: manifest is not an object");
  const obj = raw as { schemaVersion?: number };
  if (obj.schemaVersion === 5) return parseManifest(raw);
  if (obj.schemaVersion === 4) return parseManifest(migrateV4toV5(raw));
  if (obj.schemaVersion === 3) return parseManifest(migrateV4toV5(migrateV3toV4(raw)));
  if (obj.schemaVersion === 2)
    return parseManifest(migrateV4toV5(migrateV3toV4(migrateV2toV3(raw))));
  if (obj.schemaVersion !== 1)
    throw new Error(`migrate: unsupported schemaVersion ${obj.schemaVersion}`);
  return parseManifest(
    migrateV4toV5(migrateV3toV4(migrateV2toV3(migrateV1toV2(raw as V1Manifest, runDir)))),
  );
}
```

In `lib/core/production-brief.ts`, change `GeoMatch` (`:32-38`):

```ts
import type { GeographyRef } from "../geo/ref";
// ...
export type GeoMatch = {
  column: string;
  geography: GeographyRef;
  matched: number;
  total: number;
  unmatched: string[];
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test loop/manifest.test.ts loop/migrate.test.ts`
Expected: PASS, all cases (7 new: 4 in manifest.test.ts, 3 in migrate.test.ts).

- [ ] **Step 5: Fix every fixture the schema change broke**

Run: `cd lib && bunx tsc --noEmit && bun test`
Any pre-existing fixture literal with `orient.geo.basemap` will now fail to typecheck or to parse
(this is the "sequencing hazard" named above, now made concrete). Update each to the new
`geography: GeographyRef` shape, or — if the fixture is deliberately exercising OLD-shape input
through `migrate()` — leave it as raw `unknown` input to `migrate()`, not to `parseManifest()`
directly. Report the exact count of fixtures touched (do not guess a number in advance; this plan
does not know it without running the command).

- [ ] **Step 6: Mutation — prove `migrateV4toV5`'s test depends on the real translation table, not
  on the fixture happening to already be v5-shaped**

Temporarily change `SHIPPED_GEOGRAPHY_REFS.world.joinKey` to `"wrong"`.

Run: `cd lib && bun test loop/migrate.test.ts`
Expected: "translates orient.geo.basemap 'world'..." FAILS (`joinKey` mismatch in the `toEqual`).
1/3 reddens in that file. Revert the mutation before continuing.

- [ ] **Step 7: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/migrate.ts lib/core/production-brief.ts \
  lib/loop/manifest.test.ts lib/loop/migrate.test.ts
git commit -m "feat(manifest): schemaVersion 5 — input.geography, GeoMatch.geography, orient.geoJoin, migrateV4toV5"
```

### Task 10: `init.ts` — declare and freeze `input.geography` (D1, D1b)

**Files:**
- Modify: `lib/loop/init.ts` — `RunDeclarationSchema` (`:52-75`), `initRun`'s freeze block
  (`:209-222`).
- Modify: `lib/loop/freeze.ts` — `freezeInput`'s `kind` parameter (currently `"data" | "article"`,
  `:11`, and its extension fallback at `:18`, `ext = sourceExt || (kind === "data" ? "csv" :
  "txt")`).
- Test: `lib/loop/init.test.ts`, `lib/loop/freeze.test.ts` (confirm both exist with `ls` before
  editing).

**Interfaces:**
- Consumes: `GeographyInputSchema` (Task 2).
- Produces: `RunDeclarationSchema` accepting `input.geography: GeographyInputSchema.optional()`;
  `freezeInput(runDir, srcPath, kind: "data" | "article" | "geography")`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/loop/freeze.test.ts (append)
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";

describe("freezeInput — geography kind", () => {
  it("freezes a .geojson file under input/geography-<hash>.geojson", () => {
    const runDir = mkdtempSync(join(tmpdir(), "freeze-geo-test-"));
    const src = join(runDir, "cantons.geojson");
    writeFileSync(src, '{"type":"FeatureCollection","features":[]}');
    const frozen = freezeInput(runDir, src, "geography");
    expect(frozen.path).toMatch(/^input\/geography-[0-9a-f]{16}\.geojson$/);
    expect(frozen.sha256).toHaveLength(64);
  });

  it("falls back to a .geojson extension when the source file has none", () => {
    const runDir = mkdtempSync(join(tmpdir(), "freeze-geo-test-"));
    const src = join(runDir, "cantons"); // no extension
    writeFileSync(src, '{"type":"FeatureCollection","features":[]}');
    const frozen = freezeInput(runDir, src, "geography");
    expect(frozen.path).toMatch(/\.geojson$/);
  });
});
```

```ts
// lib/loop/init.test.ts (append) — adjust the exact call shape to this file's own
// existing pattern for calling initRun once you have read it; this snippet shows the
// declaration and the assertion, not necessarily the exact scaffolding (temp dirs, etc.)
// that the surrounding file already sets up for its other initRun tests — copy that
// scaffolding rather than reinventing it.
it("accepts a run declaring input.geography and freezes it", () => {
  // ... build a real geojson fixture file on disk, then:
  const result = initRun(runDir, {
    runId: "r1",
    input: {
      data: dataPath,
      geography: {
        path: geoFixturePath,
        encoding: "geojson",
        crs: "EPSG:4326",
        level: "cantons",
        licence: "swisstopo",
        edition: "2024",
        credit: { name: "swisstopo" },
      },
    },
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.input.geography?.sha256).toBeDefined();
    expect(result.value.input.geography?.level).toBe("cantons");
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test loop/freeze.test.ts loop/init.test.ts`
Expected: FAIL — `freezeInput`'s `kind` type rejects `"geography"`; `RunDeclarationSchema` has no
`input.geography`.

- [ ] **Step 3: Implement**

`lib/loop/freeze.ts`:

```ts
export function freezeInput(
  runDir: string,
  srcPath: string,
  kind: "data" | "article" | "geography",
): { path: string; sha256: string } {
  if (!existsSync(srcPath))
    throw new Error(`freezeInput: source not found: ${srcPath}`);
  const bytes = readFileSync(srcPath);
  const hash = Buffer.from(sha256(bytes)).toString("hex");
  const sourceExt = extname(srcPath).slice(1).toLowerCase();
  const ext = sourceExt || (kind === "data" ? "csv" : kind === "geography" ? "geojson" : "txt");
  const rel = join("input", `${kind}-${hash.slice(0, 16)}.${ext}`);
  const dest = join(runDir, rel);
  mkdirSync(join(runDir, "input"), { recursive: true });
  if (!existsSync(dest)) writeFileSync(dest, bytes);
  return { path: rel, sha256: hash };
}
```

`lib/loop/init.ts` — add to `RunDeclarationSchema`'s `input` (`:58-69`):

```ts
    geography: GeographyInputSchema.optional(),
```

(import `GeographyInputSchema` from `../geo/declaration`). In the freeze block (`:211-222`), add:

```ts
      ...(decl.input.geography
        ? {
            geography: {
              ...freezeInput(runDir, decl.input.geography.path, "geography"),
              encoding: decl.input.geography.encoding,
              crs: decl.input.geography.crs,
              level: decl.input.geography.level,
              licence: decl.input.geography.licence,
              edition: decl.input.geography.edition,
              credit: decl.input.geography.credit,
              ...(decl.input.geography.joinKey ? { joinKey: decl.input.geography.joinKey } : {}),
            },
          }
        : {}),
```

Also extend Step 5 of `initRun` (the existence/is-a-file check at `:190-207`) to loop over
`["data", decl.input.data], ["article", decl.input.article], ["geography",
decl.input.geography?.path]` instead of just the first two — a declared geography path that does
not exist must refuse the SAME way a missing data/article path already does, before any byte is
frozen (mirrors the CRS guard's own "before a single byte is frozen" ordering from Task 1 — wire
`coordinateRangeVerdict` here too: parse the file's JSON, run the guard, and `fail(
"invalid-request", verdict.message)` on a bad verdict, in the SAME step, before the freeze call).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test loop/freeze.test.ts loop/init.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation — prove the geography-extension fallback test depends on the new branch**

Temporarily change the fallback to `kind === "data" ? "csv" : "txt"` (dropping the `geography`
branch, restoring the pre-task behaviour).

Run: `cd lib && bun test loop/freeze.test.ts`
Expected: "falls back to a .geojson extension..." FAILS — the frozen path ends in `.txt`, not
`.geojson`. Report the count. Revert before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/init.ts lib/loop/freeze.ts lib/loop/init.test.ts lib/loop/freeze.test.ts
git commit -m "feat(loop): declare and freeze input.geography, CRS-guarded before freezing (D1, D1b)"
```

### Task 11: `provenanceHash` gains `geography` and `geoJoin` (D9)

**Files:**
- Modify: `lib/loop/manifest.ts` — `provenanceHash` (`:518-561`, verified in full while writing
  this plan — the `canonicalHash({...})` object literal).
- Test: `lib/loop/manifest.test.ts` (append).

**Interfaces:**
- Consumes: `run.input.geography` and `run.orient?.geoJoin` (Task 9's schema fields).
- Produces: no new exported symbol — `provenanceHash`'s signature is unchanged, only its hashed
  payload widens. Consumed indirectly by every existing caller of `provenanceHash`/`stalenessOf`.

Two lines added, per the spec's own reasoning (D9, which reuses `sources`' existing rationale
verbatim): the declared credit/edition are RENDERED into the artefact, so correcting a credit
must invalidate a stale artefact's freshness; the join decisions decide which polygon receives
which value, the single most determining fact about the map.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/loop/manifest.test.ts (append)
import { describe, it, expect } from "bun:test";
import { provenanceHash } from "./manifest";
// import whatever this file's existing tests use to build a minimal RunManifest/RunElement —
// copy that scaffolding rather than reinventing it.

describe("provenanceHash — geography (D9)", () => {
  it("changes when input.geography's credit changes, even though the frozen file's sha256 does not", () => {
    const runWithoutCredit = /* minimal run fixture, run.input.geography.credit.name = "IGN" */;
    const runWithFixedCredit = {
      ...runWithoutCredit,
      input: {
        ...runWithoutCredit.input,
        geography: { ...runWithoutCredit.input.geography, credit: { name: "IGN — corrected" } },
      },
    };
    const el = /* the fixture's element */;
    expect(provenanceHash(runWithoutCredit, el)).not.toBe(provenanceHash(runWithFixedCredit, el));
  });

  it("is null-stable (unchanged) for a run declaring no geography at all — the migration-neutral property D9 requires", () => {
    const run = /* minimal run fixture with no input.geography and no orient.geoJoin */;
    const el = /* the fixture's element */;
    // Calling twice must be stable, and must not throw on the absent fields.
    expect(provenanceHash(run, el)).toBe(provenanceHash(run, el));
  });

  it("changes when orient.geoJoin's decisions change", () => {
    const base = /* minimal run fixture */;
    const withDecision = {
      ...base,
      orient: {
        ...base.orient,
        geoJoin: {
          column: "region",
          geographySha256: "abc",
          decisions: [{ value: "Buenos Aires", featureId: "ARG-caba", basis: "journalist" }],
          pending: [],
        },
      },
    };
    const el = /* the fixture's element */;
    expect(provenanceHash(base, el)).not.toBe(provenanceHash(withDecision, el));
  });
});
```

(The three fixtures above are written as comments describing intent because this file's exact
`RunManifest`/`RunElement` fixture-building helper is not yet read at plan-writing time — before
implementing, run `grep -n "function.*[Rr]un\(Fixture\|Manifest\)\|minimalRun\|makeRun" lib/loop/
manifest.test.ts` to find the existing helper this file already uses for its other
`provenanceHash` tests, verified while writing this plan to exist — `provenanceHash` already has
tests in this file, per its own doc comment about `channel`/`sources`/`narrative` being hashed —
and reuse it rather than hand-building a `RunManifest` literal from scratch.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test loop/manifest.test.ts`
Expected: FAIL — the two hashes are currently EQUAL (geography/geoJoin are not yet part of the
hashed payload), so the `.not.toBe(...)` assertions fail.

- [ ] **Step 3: Implement**

In `provenanceHash`'s `canonicalHash({...})` call (`:520-560`), add two entries:

```ts
    // The declared geography's credit/edition are RENDERED into the artefact (D7) — without
    // this line, correcting a credit leaves a stale one on an artefact that reports itself
    // fresh, the exact defect `sources` already closes for data attribution (see the comment
    // above). The WHOLE record, not just the credit: the licence and edition are just as
    // artefact-determining. `null` when a run declares no geography, so the value stays stable.
    geography: run.input.geography ?? null,
    // The join decisions decide which polygon receives which value — the single most
    // determining fact about a below-ADM1 map (D9). `null` when nothing has been decided yet.
    geoJoin: run.orient?.geoJoin ?? null,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test loop/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm migration-neutrality explicitly**

Run a manual check: build a v4-migrated `RunManifest` (via `migrate()`, Task 9) with an
`orient.geo` but no `input.geography`/`orient.geoJoin`, compute `provenanceHash` on it, then
compute it again with the object spread through `JSON.parse(JSON.stringify(...))` (simulating a
disk round-trip). Confirm the two hashes match — this is the property `manifest.ts:501-507`
(verified while writing this plan) already protects for the v3→v4 migration, extended here to
v4→v5. Add this as a fourth test case, not just a manual check, before moving on: `it("hashes
identically before and after a JSON round-trip for a migrated v4 manifest", ...)`.

- [ ] **Step 6: Mutation — prove the credit test depends on `geography` actually being hashed**

Temporarily remove the `geography: run.input.geography ?? null,` line.

Run: `cd lib && bun test loop/manifest.test.ts`
Expected: "changes when input.geography's credit changes..." FAILS (`provenanceHash` returns the
same value for both runs). Report the count. Revert before continuing.

- [ ] **Step 7: Commit**

```bash
git add lib/loop/manifest.ts lib/loop/manifest.test.ts
git commit -m "feat(manifest): provenanceHash hashes geography + geoJoin (D9)"
```

---

## Phase D — refusal rewrite: `assemble/map-native.ts` and `produce.ts`

**Design call on where D6's "below ADM1, the guard becomes 'joined on an unambiguous key'" lands:**
the ADM1 index (Task 7/8) is 96.5% unambiguous BY CONSTRUCTION (spec D6: 1,651 of 47,231 keys
collide) — it is not the layer where per-value ambiguity needs a human decision. That layer is a
DECLARED file's join, below ADM1, where no global key exists at all — exactly the domain of
`GeoJoinLedger` (Task 5) and its `unresolvedGeoJoins` gate. So this plan implements D6's guard
change as TWO separate, already-existing-shaped mechanisms rather than one rewritten threshold:
`geoRefusal`'s row-count threshold (Task 12) stays exactly what it is (it is sound at ADM0/ADM1,
per spec D6's own words — "ce seuil est sain à l'ADM0/ADM1"), and the NEW per-value ambiguity
check is `produce()`'s `unresolvedGeoJoins` refusal (Task 14), which blocks on any pending value
regardless of how healthy the overall match RATE looks. Together they are the "count stays, stops
being the only question" the spec asks for.

### Task 12: `geoRefusal` speaks to the ADM1 index too, not just the two shipped names

**Files:**
- Modify: `lib/loop/assemble/map-native.ts` — `geoRefusal` (`:116-128`, verified in full while
  writing this plan), and every branch in `assembleMapNative` that reads `geo.basemap` (`:202,
  205-207, 215, 218, 232` — six occurrences, verified by `grep -n "geo\.basemap" lib/loop/
  assemble/map-native.ts` while writing this plan).
- Test: `lib/loop/assemble/map-native.test.ts` (confirm exact filename with `ls` before editing).

**Interfaces:**
- Consumes: `GeoMatch.geography: GeographyRef` (Task 9).
- Produces: no new exported symbol — `geoRefusal`'s signature and `assembleMapNative`'s output
  shape are otherwise unchanged; only the wording of the refusal message and the source of the
  `basemap` value written into the emitted config change.

**Design call on the emitted config's `basemap` field:** per Phase B's plan-wide design call,
map-native's `ChoroplethConfig`/`CartogramConfig`/`DotDensityConfig` keep `basemap?: string` for
back-compat and gain `geography?: GeographyRef`. This task emits BOTH: `basemap:
geo.geography.set` (a readable string a legacy consumer can still log) AND `geography:
geo.geography` (what Tasks 16–17's de-inlined components actually resolve geometry from).

- [ ] **Step 1: Write the failing tests**

```ts
// lib/loop/assemble/map-native.test.ts (append)
import { describe, it, expect } from "bun:test";
import { assembleMapNative } from "./map-native";
// reuse this file's existing ProductionBrief-building helper — find it before writing new
// fixtures from scratch (grep -n "function.*[Bb]rief" lib/loop/assemble/map-native.test.ts).

describe("geoRefusal — ADM1-aware wording", () => {
  it("does not claim only 'world'/'us-states' are the shipped basemaps when geo is undefined", () => {
    const brief = /* choropleth brief with brief.geo undefined */;
    const result = assembleMapNative(brief);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // the old wording named exactly "world and us-states" — the ADM1 index is a third,
      // real candidate now, and the message must not claim otherwise.
      expect(result.message).not.toMatch(/the shipped basemaps are world and us-states/);
    }
  });

  it("emits geo.geography.set as the config's basemap string, and geography wholesale, for an ADM1 match", () => {
    const brief = /* choropleth brief whose brief.geo.geography = {
      origin: "shipped", set: "natural-earth-admin-1", scope: "CHE", level: "canton",
      joinKey: "name", joinKeyFamily: "name",
    }, matched=2, total=2, unmatched=[] */;
    const result = assembleMapNative(brief);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const cfg = result.value as { basemap: string; geography: unknown };
      expect(cfg.basemap).toBe("natural-earth-admin-1");
      expect(cfg.geography).toEqual(brief.geo!.geography);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test loop/assemble/map-native.test.ts`
Expected: FAIL — `geo.basemap` does not exist on the new `GeoMatch` shape (typecheck error
surfaces as a test failure once the fixture is built against the real type), and the emitted
config carries no `geography` key yet.

- [ ] **Step 3: Implement**

Replace `geoRefusal` (`:116-128`):

```ts
function geoRefusal(geo: GeoMatch | undefined): string | undefined {
  if (!geo)
    return (
      `this data carries no geography Splash can place — tried the shipped basemaps ` +
      `(${BASEMAP_NAMES.join(", ")}) and the built-in admin-1 index, and no column matched any of them`
    );
  if (geo.matched * 2 < geo.total)
    return (
      `only ${geo.matched} of ${geo.total} rows match ${geo.geography.set}` +
      `${geo.geography.scope ? ` (${geo.geography.scope})` : ""} — unmatched: ${geo.unmatched.join(", ")}`
    );
  return undefined;
}
```

Replace every `geo.basemap` read in the three region-type branches (`choropleth`, `cartogram`,
`dot-density`) with `geo.geography.set`, and ADD `geography: geo.geography` to each emitted
config object literal, e.g. for `choropleth` (`:227-243`):

```ts
  return ok({
    type: "choropleth",
    regionKey: geo.column,
    valueField,
    rows: typedRows(rows, numeric),
    basemap: geo.geography.set,
    geography: geo.geography,
    title,
    // ...unchanged below
```

Apply the same two-line change (`basemap: geo.geography.set` + `geography: geo.geography`) to the
`cartogram` branch (which today does NOT emit `basemap` at all, per the file's actual content
verified while writing this plan — `cartogram`'s `ok({...})` at `:182-190` has no `basemap` key;
ADD `geography: geo.geography` there, do not invent a `basemap` field it never had) and the
`dot-density` branch (`:209-224`, which does emit `basemap: geo.basemap` twice — at `boundaries:
geo.basemap` and `basemap: geo.basemap` — both become `geo.geography.set`, plus add `geography:
geo.geography`). The `dot-density`-specific refusal at `:202-208` (`if (geo.basemap !== "world")`)
is Task 13's job, not this one — leave it reading `geo.basemap` for now; Task 13 fixes it next
and this task's typecheck will show it as the one remaining compile error to hand off.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test loop/assemble/map-native.test.ts`
Expected: PASS for the two new tests. `bunx tsc --noEmit` from `lib/` will still show ONE error
in the `dot-density` refusal (`:202`) — expected, Task 13 fixes it next; do not paper over it in
this task.

- [ ] **Step 5: Mutation — prove the "does not claim only world/us-states" test depends on the
  message actually changing, not on a coincidence**

Temporarily revert `geoRefusal`'s undefined-branch message to the original wording (`` `this data
carries no geography Splash can place — the shipped basemaps are ${BASEMAP_NAMES.join(" and
")}, and no column matched either of them` ``).

Run: `cd lib && bun test loop/assemble/map-native.test.ts`
Expected: "does not claim only 'world'/'us-states'..." FAILS (the message DOES match the excluded
pattern). Report the count. Revert the mutation before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/assemble/map-native.ts lib/loop/assemble/map-native.test.ts
git commit -m "feat(assemble): geoRefusal and emitted config speak GeographyRef, not a bare basemap string"
```

### Task 13: dot-density's refusal re-derived against the injected-geometry reality (D10, end note)

**Files:**
- Modify: `lib/loop/assemble/map-native.ts` — the `dot-density` refusal (`:202-208`, verified
  while writing this plan; the comment there cites "task-7-report.md" and "verified 2026-07-28,
  task-7" as the prior investigation that `DotDensityMap.tsx` hard-imports `world.geojson` and
  hard-codes `iso_a3` — that hard-coding is what Task 17/20 (Phase E) removes).
- Test: `lib/loop/assemble/map-native.test.ts`.

**Interfaces:**
- Consumes: nothing new — this task only re-derives an existing refusal against Task 17's
  post-condition.

**This task is SEQUENCED AFTER Task 17** (`DotDensityMap.tsx` stops hard-importing
`world.geojson`), even though it is written here for narrative order alongside its sibling
refusal-rewrite tasks. Do not implement this task until Task 17 has landed — the refusal this
task re-derives is only re-derivable once the component it describes has actually changed. The
spec is explicit about this shape: "ce refus... devient mort ou faux dès que la géométrie arrive
par la configuration... il doit être ré-écrit contre la nouvelle réalité, pas effacé au passage."

- [ ] **Step 1: Write the failing test** (write this now; it will fail for the RIGHT reason —
  "not yet re-derived" — until Task 17 lands, then fail for the WRONG reason if left unimplemented,
  which is the signal to come back and finish this task)

```ts
// lib/loop/assemble/map-native.test.ts (append)
it("dot-density accepts a non-world geography once DotDensityMap.tsx reads injected config (post Task 17)", () => {
  const brief = /* dot-density brief with brief.geo.geography.set = "us-states" */;
  const result = assembleMapNative(brief);
  // Pre-Task-17: this MUST still fail (the component cannot render it yet) — this assertion is
  // written to hold POST-Task-17. If Task 17 has not landed, this test is expected red; that is
  // the correct state, not a bug in this task.
  expect(result.ok).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails for the documented reason**

Run: `cd lib && bun test loop/assemble/map-native.test.ts`
Expected (pre-Task-17): FAIL — `result.ok` is `false`, refusal message names the old
`world.geojson`-hardcoding reason. This is the expected, correct failure at this point in the
plan's sequencing.

- [ ] **Step 3: Implement (only once Task 17 has landed)**

Replace the refusal (`:193-208`):

```ts
  if (brief.nativeType === "dot-density") {
    // Task 17 (skills/map-native geometry de-inlining) made DotDensityMap.tsx read its geometry
    // from the injected config's `geography` descriptor instead of a hard-imported
    // world.geojson + hard-coded "iso_a3" — this refusal is dead now, and removing it (rather
    // than leaving a permanently-true no-op check) is what the spec's own end-note demands.
    return ok({
      type: "dot-density",
      regionKey: geo.column,
      boundaries: geo.geography.set,
      rows: typedRows(rows, numeric),
      valueField,
      basemap: geo.geography.set,
      geography: geo.geography,
      title,
      description,
      source,
      ...(brief.lang ? { lang: brief.lang } : {}),
      ...(unit ? { valueUnit: unit } : {}),
    });
  }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd lib && bun test loop/assemble/map-native.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation — prove the test depends on the refusal actually being gone**

Temporarily restore the old `if (geo.geography.set !== "world") return fail(...)` guard (adapted
to the new field name).

Run: `cd lib && bun test loop/assemble/map-native.test.ts`
Expected: the dot-density test FAILS again (`result.ok` is `false`). Report the count. Revert
before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/assemble/map-native.ts lib/loop/assemble/map-native.test.ts
git commit -m "feat(assemble): dot-density re-derived — no longer hard-refuses non-world geography"
```

### Task 14: `produce()` refuses on an unresolved geo-join, mirroring `unauthoredBeats` (D6)

**Files:**
- Modify: `lib/loop/produce.ts` — insert right after the existing `unauthoredBeats` refusal block
  (`:172-178`, verified in full while writing this plan).
- Modify: `lib/loop/manifest.ts` — `nextActionsForElement` (the `unauthoredBeats(el).length > 0`
  check at `:688`, verified while writing this plan) gains the mirrored `resolve-geo-join`
  `NextAction`, in the same position relative to `produce`/`author-beats` that `unauthoredBeats`
  already occupies.
- Test: `lib/loop/produce.test.ts`, `lib/loop/manifest.test.ts`.

**Interfaces:**
- Consumes: `unresolvedGeoJoins(ledger)` (Task 5).
- Produces: no new exported symbol on `produce.ts`'s side; `manifest.ts` gains
  `"resolve-geo-join"` as a member of the `NextAction` union.

As stated in Phase D's header, this is the mechanical half of D6's "below ADM1, the guard becomes
'joined on an unambiguous key'": whatever earlier step populates `run.orient.geoJoin.pending`
(out of this plan's scope — see Task 5's own scope note), THIS gate is what makes an unresolved
entry actually block a build, exactly as `unauthoredBeats` already blocks an unwritten beat.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/loop/produce.test.ts (append) — reuse this file's existing run/element fixture helper
import { describe, it, expect } from "bun:test";
import { produce } from "./produce"; // adjust to this file's real export name/signature

it("refuses to produce while a geo-join value is unresolved — the fixture: 'Buenos Aires' pending", () => {
  const run = /* minimal run fixture, choropleth element, chosen+narrative all satisfied,
    orient.geoJoin = { column: "region", geographySha256: "abc", decisions: [], pending: ["Buenos Aires"] } */;
  const result = produce(run, /* runDir */, /* elementId */);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.message).toContain("Buenos Aires");
});

it("produces normally once the pending value has a decision", () => {
  const run = /* same fixture, but geoJoin.decisions has the Buenos Aires entry and pending is empty */;
  const result = produce(run, /* runDir */, /* elementId */);
  expect(result.ok).toBe(true);
});
```

```ts
// lib/loop/manifest.test.ts (append)
it("nextActionsForElement returns 'resolve-geo-join' when a geo-join value is unresolved", () => {
  const run = /* fixture with orient.geoJoin.pending = ["Buenos Aires"], element otherwise ready to produce */;
  const el = run.elements[0]!;
  expect(nextActionsForElement(run, el)).toEqual(["resolve-geo-join"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd lib && bun test loop/produce.test.ts loop/manifest.test.ts`
Expected: FAIL — `produce()` currently ignores `orient.geoJoin` entirely, so both fixtures return
`ok: true`/the un-gated next action.

- [ ] **Step 3: Implement**

In `lib/loop/manifest.ts`, add to the `NextAction` union (near `"author-beats"`):

```ts
  | "resolve-geo-join"
```

In `nextActionsForElement` (`:688`), add immediately after the `unauthoredBeats` check, same
position/ordering rationale as the existing comment there (a form nothing can build must not be
told "resolve your geo-join" before it is told it cannot be built at all — so this stays AFTER
the beats gate, mirroring the same ordering `produce.ts` itself uses):

```ts
  if (unauthoredBeats(el).length > 0) return ["author-beats"];
  if (unresolvedGeoJoins(run.orient?.geoJoin).length > 0) return ["resolve-geo-join"];
  if (!el.artifact || stalenessOf(run, el)) return ["produce"];
```

(import `unresolvedGeoJoins` from `../geo/join`.)

In `lib/loop/produce.ts`, right after the `unauthoredBeats` block (`:172-178`):

```ts
  const pendingGeoJoins = unresolvedGeoJoins(run.orient?.geoJoin);
  if (pendingGeoJoins.length)
    return fail(
      "invalid-request",
      `produce: ${pendingGeoJoins.join(", ")} of this map's geography ${pendingGeoJoins.length === 1 ? "is" : "are"} not resolved to a polygon — ` +
        `Splash measures the candidates and the journalist decides, and an unresolved value is not published`,
    );
```

(import `unresolvedGeoJoins` from `../geo/join`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd lib && bun test loop/produce.test.ts loop/manifest.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation — prove the refusal actually gates `produce()`, not just the reported
  next action**

Temporarily comment out the `pendingGeoJoins` block in `produce.ts` (keep the `manifest.ts` gate
in place).

Run: `cd lib && bun test loop/produce.test.ts`
Expected: "refuses to produce while a geo-join value is unresolved" FAILS (`result.ok` is `true`
— produce ran anyway). This is the exact failure mode the mutation-testing rule in Global
Constraints is written against: a `nextActionsForElement`-only gate that LOOKS like a produce
refusal but does not actually block the verb. Report the count. Revert before continuing.

- [ ] **Step 6: Commit**

```bash
git add lib/loop/produce.ts lib/loop/manifest.ts lib/loop/produce.test.ts lib/loop/manifest.test.ts
git commit -m "feat(produce): refuse an unresolved geo-join, mirroring unauthoredBeats (D6)"
```

---

## Phase E — the credit renders, and the nine `?raw` imports disappear

### Task 15: `MapFrame.tsx` — `geoCredit`, rendered beside `source`, always (D7)

**Files:**
- Modify: `skills/map-native/src/core/MapFrame.tsx` — `MapFrameProps` (`:17-30`) and the source
  band JSX (`:171-201`, verified while writing this plan — `data-testid="map-source"`).
- Test: find the existing test file for `MapFrame.tsx` (`grep -rl "MapFrame" skills/map-native/
  tests` — confirm its name before editing).

**Interfaces:**
- Produces: `MapFrameProps.geoCredit?: { name: string; url?: string }`, rendered under
  `data-testid="map-geo-credit"` whenever present. Consumed by Task 17 (Cartogram/DotDensity/
  Route + Choropleth threading) and Task 20 (produce.mjs assembling the config that reaches this
  prop).

- [ ] **Step 1: Write the failing tests**

```ts
// (append to the MapFrame test file found above — adjust render harness to match its existing
// pattern; this file already renders MapFrame with a `source` prop for its own tests, copy that
// scaffolding)
it("renders geoCredit under its own testid, beside the data source, when present", () => {
  const { getByTestId, queryByTestId } = renderMapFrame({
    source: { name: "INSEE" },
    geoCredit: { name: "© OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright" },
  });
  expect(getByTestId("map-geo-credit").textContent).toContain("OpenStreetMap contributors");
});

it("renders nothing under map-geo-credit when geoCredit is absent — the shipped-basemap case", () => {
  const { queryByTestId } = renderMapFrame({ source: { name: "INSEE" } });
  expect(queryByTestId("map-geo-credit")).toBeNull();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/map-native && bun test tests/<the MapFrame test file>`
Expected: FAIL — `MapFrameProps` has no `geoCredit`, and no `data-testid="map-geo-credit"` exists.

- [ ] **Step 3: Implement**

Add to `MapFrameProps` (`:17-30`):

```ts
  /** The geography file's own credit — spec D7. Rendered beside `source`, never merged into it:
   *  a data attribution and a boundary-file attribution are two different facts, and a
   *  newsroom correcting one must not silently touch the other. Absent for a shipped basemap
   *  (world/us-states) — those carry no attribution obligation (Natural Earth is public
   *  domain, "crediting is unnecessary"). */
  geoCredit?: { name: string; url?: string };
```

Add, immediately after the existing source band (`:171-201`, inside the same returned fragment):

```tsx
      {geoCredit && (
        <div
          data-testid="map-geo-credit"
          style={{
            position: "absolute",
            bottom: m,
            right: m,
            zIndex: 10,
            opacity: furnitureOpacity,
            fontSize: frame.type.source,
            color: colors.muted,
            ...pillStyle,
          }}
        >
          {responsive && geoCredit.url ? (
            <a
              href={geoCredit.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.muted }}
            >
              {geoCredit.name}
            </a>
          ) : (
            geoCredit.name
          )}
        </div>
      )}
```

(Destructure `geoCredit` from `props` alongside the existing `source` at this component's top —
find the exact destructuring line while implementing; it is not shown in the excerpt read while
writing this plan.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/map-native && bun test tests/<the MapFrame test file>`
Expected: PASS.

- [ ] **Step 5: Mutation — prove the "renders nothing when absent" test depends on the
  conditional, not on a coincidence**

Temporarily change `{geoCredit && (...)}` to always render (drop the `geoCredit &&` guard, using
`geoCredit ?? { name: "" }` as a fallback so the JSX still type-checks).

Run: `cd skills/map-native && bun test tests/<the MapFrame test file>`
Expected: "renders nothing under map-geo-credit when geoCredit is absent" FAILS
(`queryByTestId("map-geo-credit")` is no longer `null`). Report the count. Revert before
continuing.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/core/MapFrame.tsx skills/map-native/tests/
git commit -m "feat(map-native): MapFrame renders geoCredit beside source, ALWAYS incl. video (D7)"
```

### Task 16: `ChoroplethMap.tsx` — geometry from injected config, join via feature-state not properties (D5 + D8's second point)

**Files:**
- Modify: `skills/map-native/src/choropleth-geo.ts` — add `applyChoroplethJoin` beside
  `computeChoropleth` (verified in full while writing this plan, `:72-191`).
- Modify: `skills/map-native/src/choropleth-paint.ts` — `choroplethFillColor`/
  `choroplethFillOpacity` (verified in full while writing this plan, the whole file: currently
  read `["get", "__hasData"]`/`["get", "__value"]` — its own header says it is "the SINGLE source
  of truth... used by BOTH the interactive/video ChoroplethMap and the scrolly ScrollyMap", so
  this one file's change propagates to both engines automatically).
- Modify: `skills/map-native/src/ChoroplethMap.tsx` — remove the `?raw` imports (`:10-11`) and
  `GEOJSON_BY_BASEMAP` (`:19-22`); replace the basemap-resolution/join block (`:245-289`,
  verified in full while writing this plan — `coloredWorld`'s properties-merge is exactly D8's
  second point, located here, NOT in `computeChoropleth` as spec D8 cites — flag this as a spec
  citation correction: `computeChoropleth` (`choropleth-geo.ts:110-114`) never touches feature
  properties at all, it only returns a `joined` table; the actual merge the spec describes
  happens downstream, in this component, at `ChoroplethMap.tsx:263-284`).
- Modify: `skills/map-native/package.json` — add `topojson-client` (dependency) and
  `@types/topojson-client` (devDependency); none of the shipped dependencies today decode
  TopoJSON (verified with `grep -rn topojson skills/map-native/package.json` while writing this
  plan — no hits).
- Test: `skills/map-native/tests/choropleth-geo.test.ts` (append; confirm exact filename first),
  a new `skills/map-native/tests/choropleth-map-imports.test.ts` (structural, grep-based).

**Interfaces:**
- Consumes: `Topology` (from `topojson-client`), config's new `geometry: Topology` field
  (produced by Task 20's `produce.mjs`), `GeographyRef` (Task 4/9).
- Produces: `applyChoroplethJoin(features, layout, joinKey): { features: GeoJSON.
  FeatureCollection; states: ChoroplethFeatureState }` (pure). Consumed directly by
  `ChoroplethMap.tsx`; `ScrollyMap.tsx` (Task 18) reuses the SAME function and the SAME
  `choropleth-paint.ts` expressions, since both currently share `computeChoropleth` too.

**Spec citation correction, stated because Global Constraints require verifying every citation
against the tree:** spec D8's second point cites `skills/map-native/src/choropleth-geo.
ts:110-114` as where `computeChoropleth` "builds a FeatureCollection by merging the journalist's
values into the features' properties." Read in full while writing this plan, `computeChoropleth`
does no such thing — it returns `{ joined: {key,value}[], bins, bounds, noData, unmatched,
scaleType, labels? }`, never touching `features.properties`. The merge the spec describes is real,
but it lives in `ChoroplethMap.tsx`'s `coloredWorld` construction (`:263-284`), the component that
CALLS `computeChoropleth` and then does its own merge before calling `map.addSource`. This task
targets the real location.

- [ ] **Step 1: Write the failing tests**

```ts
// skills/map-native/tests/choropleth-geo.test.ts (append)
import { describe, it, expect } from "bun:test";
import { computeChoropleth, applyChoroplethJoin } from "../src/choropleth-geo";

describe("applyChoroplethJoin — table alongside geometry, never merged into properties (D8)", () => {
  const features: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { iso_a3: "CHE" }, geometry: { type: "Point", coordinates: [0, 0] } },
      { type: "Feature", properties: { iso_a3: "FRA" }, geometry: { type: "Point", coordinates: [1, 1] } },
    ],
  };
  const data = { regionKey: "iso_a3", valueField: "v", rows: [{ iso_a3: "CHE", v: 5 }] };
  const layout = computeChoropleth(data, features, "iso_a3");

  it("returns features with NO extra properties beyond the source's own", () => {
    const { features: out } = applyChoroplethJoin(features, layout, "iso_a3");
    for (const f of out.features) {
      // The fixture element carrying the claim: CHE has a joined value (5) — if the merge
      // regressed to the old properties-mutation, CHE's properties would gain __value/__hasData.
      expect(Object.keys(f.properties ?? {})).toEqual(Object.keys(
        features.features.find((s) => s.properties?.iso_a3 === f.properties?.iso_a3)!.properties!,
      ));
    }
  });

  it("puts the joined value/hasData in a SEPARATE states table, keyed by the join value", () => {
    const { states } = applyChoroplethJoin(features, layout, "iso_a3");
    expect(states["CHE"]).toEqual({ value: 5, hasData: true });
    expect(states["FRA"]).toEqual({ value: null, hasData: false });
  });
});
```

```ts
// skills/map-native/tests/choropleth-map-imports.test.ts (new)
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

// Structural, not behavioural — but real: the nine `?raw` geojson imports (spec §1.2) are the
// thing this whole phase removes. This test targets the four files Task 16-18 close, one at a
// time; only ChoroplethMap.tsx's two are asserted here, the rest join as their own tasks land.
describe("no static geojson import in ChoroplethMap.tsx", () => {
  it("ChoroplethMap.tsx does not import world.geojson or us-states.geojson as ?raw", () => {
    const src = readFileSync("skills/map-native/src/ChoroplethMap.tsx", "utf8");
    expect(src).not.toMatch(/\.geojson\?raw/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/map-native && bun test tests/choropleth-geo.test.ts tests/choropleth-map-imports.test.ts`
Expected: FAIL — `applyChoroplethJoin` does not exist; `ChoroplethMap.tsx` still imports
`world.geojson?raw`/`us-states.geojson?raw`.

- [ ] **Step 3: Implement**

`choropleth-geo.ts` — add:

```ts
export type ChoroplethFeatureState = Record<
  string,
  { value: number | null; hasData: boolean; label?: string }
>;

/** The join, kept OUT of the geometry's own properties (D8's second point) — spec's own
 *  reasoning: under an ODbL-licensed geometry, the OSMF's "Collective Database" guidance ties
 *  share-alike only to what stays structurally separate; merging a journalist's values into an
 *  OSM feature's properties is exactly the act that would extend it. The returned `states` table
 *  is applied to the map via MapLibre `setFeatureState` (ChoroplethMap.tsx), never written back
 *  onto `features`. */
export function applyChoroplethJoin(
  features: GeoJSON.FeatureCollection,
  layout: ChoroplethLayout,
  joinKey: string,
): { features: GeoJSON.FeatureCollection; states: ChoroplethFeatureState } {
  const states: ChoroplethFeatureState = {};
  features.features.forEach((f, i) => {
    const joined = layout.joined[i]!;
    const key = String(f.properties?.[joinKey]);
    states[key] = {
      value: joined.value,
      hasData: joined.value !== null,
      ...(layout.labels?.[joined.key] ? { label: layout.labels[joined.key]! } : {}),
    };
  });
  return { features, states }; // features returned UNCHANGED — no properties merge
}
```

`choropleth-paint.ts` — change both expressions from `["get", "__hasData"]`/`["get", "__value"]`
to `["feature-state", "hasData"]`/`["feature-state", "value"]` (two occurrences each, four total
edits across `choroplethFillColor` and `choroplethFillOpacity`). Update the file's own header
comment (`:9-11`) to describe feature-state instead of "enriched-feature contract" properties.

`ChoroplethMap.tsx` — remove lines `10-11` (the two `?raw` imports) and `19-22`
(`GEOJSON_BY_BASEMAP`); add `import { feature as topoFeature } from "topojson-client";` and
`import type { Topology } from "topojson-specification";`. Replace the basemap-resolution block
(`:245-289`):

```ts
      // Geometry arrives through the injected config now (produce.mjs, Task 20) — never a
      // static bundle import. `config.geography` names WHICH set/scope/joinKey this is
      // (GeographyRef); `config.geometry` is the actual subset TopoJSON, decoded here.
      const geography = config.geography ?? { joinKey: resolveBasemapMeta(config.basemap ?? "world").joinKey };
      const joinKey = geography.joinKey;
      const topology = config.geometry as Topology;
      const objectName = Object.keys(topology.objects)[0]!;
      const world = topoFeature(topology, topology.objects[objectName]!) as GeoJSON.FeatureCollection;

      const layout = computeChoropleth(config, world, joinKey, {
        bins: NUM_BINS,
        scaleType: config.scaleType ?? "sequential",
        palette: config.palette,
        labelField: config.labelField,
      });

      const { features: sourceFeatures, states } = applyChoroplethJoin(world, layout, joinKey);

      map.addSource("choropleth-world", {
        type: "geojson",
        data: sourceFeatures,
        promoteId: joinKey, // required for setFeatureState below — MapLibre needs a stable id
      });
      for (const [key, state] of Object.entries(states))
        map.setFeatureState({ source: "choropleth-world", id: key }, state);
```

(Import `applyChoroplethJoin` from `./choropleth-geo` alongside the existing `computeChoropleth`
import at `:23`. Remove the now-unused `resolveBasemapMeta` import if the fallback branch above
ends up unneeded once Task 20 always supplies `config.geometry` — decide this once Task 20's
exact config shape is implemented; leave the fallback in if any test fixture still constructs a
`basemap`-only config without `geometry`.)

Add to `skills/map-native/package.json`'s `dependencies`: `"topojson-client": "3.1.0"`; to
`devDependencies`: `"@types/topojson-client": "3.1.5"`, `"topojson-specification": "1.0.2"`
(verify these are the current published versions with `npm view topojson-client version` /
`npm view @types/topojson-client version` before pinning — do not assume the plan's numbers are
still current when this task is implemented).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/map-native && bun install && bunx tsc --noEmit && bun test tests/choropleth-geo.test.ts tests/choropleth-map-imports.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation — prove the "no extra properties" test depends on `applyChoroplethJoin`
  actually staying pure**

Temporarily add `f.properties = { ...f.properties, __value: joined.value };` inside the
`forEach` in `applyChoroplethJoin` (the exact regression this task removes).

Run: `cd skills/map-native && bun test tests/choropleth-geo.test.ts`
Expected: "returns features with NO extra properties..." FAILS (`Object.keys(f.properties)` now
includes `__value` for CHE, which the source feature never had). Report the count. Revert before
continuing.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/choropleth-geo.ts skills/map-native/src/choropleth-paint.ts \
  skills/map-native/src/ChoroplethMap.tsx skills/map-native/package.json \
  skills/map-native/tests/choropleth-geo.test.ts skills/map-native/tests/choropleth-map-imports.test.ts
git commit -m "feat(map-native): ChoroplethMap reads injected geometry; join via feature-state, never properties (D5, D8)"
```

### Task 17: `CartogramMap.tsx`, `DotDensityMap.tsx`, `RouteMap.tsx` — the same de-inlining, three files

**Files:**
- Modify: `skills/map-native/src/CartogramMap.tsx` (`?raw` import at `:10`, verified while
  writing this plan).
- Modify: `skills/map-native/src/DotDensityMap.tsx` (`?raw` import at `:10`).
- Modify: `skills/map-native/src/RouteMap.tsx` (`?raw` import at `:4`).
- Modify: `lib/loop/assemble/map-native.ts` — the `route` branch of `assemblePointFamily`
  (`:276-290`, verified while writing this plan) gains `geography: resolveGeographyRef("world")`.
  The `symbol`/`hex-grid`/`locator` branches do NOT change — grep confirms (`grep -n
  "geojson" skills/map-native/src/SymbolMap.tsx skills/map-native/src/HexGridMap.tsx
  skills/map-native/src/LocatorMap.tsx`, run while writing this plan, zero hits) that none of
  the three imports a basemap geojson at all; they plot directly onto the MapLibre tile
  basemap and are correctly named out of scope by spec §6 ("ils ne joignent aucun polygone, ils
  ne sont pas concernés — à ceci près que leur basemap = 'world' en dur bénéficiera du
  ré-encodage de D10 sans rien changer d'autre" — that re-encoding benefit is automatic once
  Task 7's smaller `world` TopoJSON exists; no code in those three files reads it).
- Test: `skills/map-native/tests/choropleth-map-imports.test.ts` (rename to
  `no-static-geojson-imports.test.ts` if you prefer — but EXTEND the existing file from Task 16
  rather than duplicating it; three more `it(...)` blocks, one per file).

**Interfaces:**
- Consumes: `applyChoroplethJoin`-adjacent pattern is NOT reused here — Cartogram/DotDensity
  neither one needs a feature-state table (Cartogram distorts SHAPES by joined value, it does not
  paint a fill; DotDensity scatters POINTS inside a matched polygon, it never paints the polygon
  itself) — only the geometry-decoding half of Task 16's pattern applies. `resolveGeographyRef`
  (Task 4).
- Produces: nothing new exported. Consumed by Task 19 (bundle-source.mjs must trace
  `topojson-client` into these three components' closures too, not just ChoroplethMap's).

- [ ] **Step 1: Write the failing tests**

```ts
// skills/map-native/tests/choropleth-map-imports.test.ts (extend from Task 16)
it("CartogramMap.tsx does not import world.geojson as ?raw", () => {
  const src = readFileSync("skills/map-native/src/CartogramMap.tsx", "utf8");
  expect(src).not.toMatch(/\.geojson\?raw/);
});
it("DotDensityMap.tsx does not import world.geojson as ?raw", () => {
  const src = readFileSync("skills/map-native/src/DotDensityMap.tsx", "utf8");
  expect(src).not.toMatch(/\.geojson\?raw/);
});
it("RouteMap.tsx does not import world.geojson as ?raw", () => {
  const src = readFileSync("skills/map-native/src/RouteMap.tsx", "utf8");
  expect(src).not.toMatch(/\.geojson\?raw/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/map-native && bun test tests/choropleth-map-imports.test.ts`
Expected: FAIL — all three still import `?raw`.

- [ ] **Step 3: Implement**

`lib/loop/assemble/map-native.ts` — in the `route` branch of `assemblePointFamily` (`:276-290`),
add one line to the emitted config:

```ts
  if (brief.nativeType === "route") {
    const route = rows.map(
      (row) =>
        [Number(row[coords.lon]), Number(row[coords.lat])] as [number, number],
    );
    return ok({
      type: "route",
      route,
      basemap,
      geography: resolveGeographyRef(basemap), // basemap is the literal "world" set above
      title,
      // ...unchanged below
```

(import `resolveGeographyRef` from `../../../skills/map-native/src/basemaps` alongside the
existing `BASEMAP_NAMES` import at `:13`.)

`CartogramMap.tsx` — remove `:10-11` (the `?raw` import + `JSON.parse` line). Add
`import { feature as topoFeature } from "topojson-client";` and `import type { Topology } from
"topojson-specification";`. Find this component's own use of `worldGeoJson` (inside its render
effect, likely near where `computeCartogram` is called — read the file's full render effect
before editing, it was not read in full while writing this plan) and replace it with:

```ts
      const topology = config.geometry as Topology;
      const objectName = Object.keys(topology.objects)[0]!;
      const world = topoFeature(topology, topology.objects[objectName]!) as GeoJSON.FeatureCollection;
```

`DotDensityMap.tsx` — identical replacement (remove `:10-11`, add the same two imports, replace
its own `worldGeoJson` usage the same way — again, read this component's render effect in full
before editing; this task only verified the import lines, not the body).

`RouteMap.tsx` — identical replacement (remove `:4-5`, add the same two imports, replace its own
`worldGeoJson` usage). Since `route`'s config now carries `geography` (Step 3's assemble change),
this component can read `config.geography` the same way `ChoroplethMap.tsx` does, defaulting to
the `"world"` shipped ref when `config.geography` is absent (a config built before this task).

Add `"topojson-client"`/`"@types/topojson-client"`/`"topojson-specification"` to
`skills/map-native/package.json` if Task 16 has not already landed them (it should have — this
task does not re-add them, just confirm with `grep topojson skills/map-native/package.json`
before assuming they are missing).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/map-native && bunx tsc --noEmit && bun test tests/choropleth-map-imports.test.ts`
Expected: PASS, all 4 (the one from Task 16 plus these 3).

- [ ] **Step 5: Mutation — prove the RouteMap test depends on the import actually being gone,
  not on a filename coincidence**

Temporarily re-add `import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";` as a dead,
unused line at the top of `RouteMap.tsx`.

Run: `cd skills/map-native && bun test tests/choropleth-map-imports.test.ts`
Expected: "RouteMap.tsx does not import world.geojson as ?raw" FAILS (the regex matches the
re-added dead import). Report the count. Revert before continuing.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/CartogramMap.tsx skills/map-native/src/DotDensityMap.tsx \
  skills/map-native/src/RouteMap.tsx lib/loop/assemble/map-native.ts \
  skills/map-native/tests/choropleth-map-imports.test.ts
git commit -m "feat(map-native): Cartogram/DotDensity/Route read injected geometry, no static geojson import"
```

### Task 18: `skills/scrolly/` — the four cross-skill `?raw` imports, same treatment

**Files:**
- Modify: `skills/scrolly/src/ScrollyDotDensityMap.tsx` (`:33`, verified while writing this plan).
- Modify: `skills/scrolly/src/ScrollyCartogramMap.tsx` (`:20`).
- Modify: `skills/scrolly/src/ScrollyMap.tsx` (`:38` — this is the choropleth-scrolly component;
  it shares `computeChoropleth`/`choropleth-paint.ts` with `ChoroplethMap.tsx`, so it gets Task
  16's `applyChoroplethJoin` + feature-state paint change for free, but its OWN `map.addSource`
  call site still needs the `promoteId`/`setFeatureState` wiring — that call is local to this
  file, not shared).
- Modify: `skills/scrolly/src/Scrolly.tsx` (`:45`).
- Modify: `skills/scrolly/vite-env.d.ts` — confirm the `declare module "*.geojson?raw"` block
  (`:3`, verified while writing this plan) becomes dead once all four imports are gone; leave the
  ambient declaration in place (harmless if unused) rather than deleting it speculatively — a
  future geojson `?raw` import elsewhere in this skill would silently lose its type otherwise.
- Test: extend `skills/map-native/tests/choropleth-map-imports.test.ts`'s pattern into a NEW file
  `skills/scrolly/tests/no-static-geojson-imports.test.ts` (skills/scrolly has its own `tests/`
  directory and its own `bun test` run in `TEST_DIRS` — confirm with `ls skills/scrolly/tests`
  before writing).

**Interfaces:**
- Consumes: everything Task 16/17 already built — this task does not add new `lib/geo/` surface,
  it applies the identical pattern across the skill boundary the spec names explicitly (D5: "les
  quatre imports de skills/scrolly/ traversent la frontière de skill, donc les deux skills
  bougent ensemble").

- [ ] **Step 1: Write the failing tests**

```ts
// skills/scrolly/tests/no-static-geojson-imports.test.ts (new)
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";

describe("no static geojson import in skills/scrolly", () => {
  for (const f of [
    "src/ScrollyDotDensityMap.tsx",
    "src/ScrollyCartogramMap.tsx",
    "src/ScrollyMap.tsx",
    "src/Scrolly.tsx",
  ]) {
    it(`${f} does not import world.geojson as ?raw`, () => {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/\.geojson\?raw/);
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd skills/scrolly && bun test tests/no-static-geojson-imports.test.ts`
Expected: FAIL, 4/4 — every file still imports `../../map-native/assets/geo/world.geojson?raw`.

- [ ] **Step 3: Implement**

For each of the four files, apply Task 16/17's identical pattern: remove the
`../../map-native/assets/geo/world.geojson?raw` import + its `JSON.parse` line, add
`import { feature as topoFeature } from "topojson-client";` + `import type { Topology } from
"topojson-specification";` (add `topojson-client`/`@types/topojson-client`/
`topojson-specification` to `skills/scrolly/package.json` too — it is a SEPARATE package from
`skills/map-native`, verified while writing this plan that each `skills/*` directory has its own
`package.json`; do not assume Task 16's dependency addition to `skills/map-native/package.json`
covers this skill), and replace each file's own `worldGeoJson` usage with the same
`topoFeature(topology, topology.objects[objectName])` decode — read each file's render/beat logic
in full before editing (none of the four was read in full while writing this plan; only their
import lines were grepped).

`ScrollyMap.tsx` additionally needs the `promoteId`/`setFeatureState` wiring from Task 16 at its
own `map.addSource` call site (find it with `grep -n "addSource" skills/scrolly/src/
ScrollyMap.tsx`) — it is a SEPARATE MapLibre map instance from `ChoroplethMap.tsx`'s, so the
source/feature-state calls must be made here too, even though the paint EXPRESSIONS come for
free from Task 16's shared `choropleth-paint.ts` change.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/scrolly && bunx tsc --noEmit && bun test tests/no-static-geojson-imports.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Mutation — prove the loop-generated tests actually target distinct files, not
  one shared string check**

Temporarily re-add the `?raw` import to ONLY `Scrolly.tsx` (leave the other three fixed).

Run: `cd skills/scrolly && bun test tests/no-static-geojson-imports.test.ts`
Expected: exactly 1 of 4 FAILS (`Scrolly.tsx does not import world.geojson as ?raw`), the other 3
still PASS. This proves the four `it()` blocks check four independent files, not a single
repo-wide grep that would flip all four together. Report the exact 1/4 split. Revert before
continuing.

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/src/ScrollyDotDensityMap.tsx skills/scrolly/src/ScrollyCartogramMap.tsx \
  skills/scrolly/src/ScrollyMap.tsx skills/scrolly/src/Scrolly.tsx skills/scrolly/package.json \
  skills/scrolly/tests/no-static-geojson-imports.test.ts
git commit -m "feat(scrolly): four cross-skill geojson ?raw imports removed, same de-inlining as map-native"
```

### Task 19: `bundle-source.mjs` — verify the exported "code source" bundle still ships its map, document why no code change is needed

**Files:**
- Modify: `skills/splash/scripts/bundle-source.mjs` — ONE comment added (see Step 3); NO
  functional change (see the finding below).
- Create: `skills/splash/scripts/bundle-source-geometry.test.ts` (a real, if slow, integration
  test — no mock, per repo convention).

**Finding, established while writing this plan by reading `bundle-source.mjs` in full — this
changes what this task does, and it must not be skipped when implementing:** the spec (D5's last
paragraph) worries that `bundle-source.mjs` "treats `.geojson` as a leaf import (`:30`
`RESOLVE_EXTS`, `:87` the `.geojson`/`.json`/`.css` skip) and must learn geometry is no longer a
static import, or the exported bundle will build without its map." Reading the file in full: it
does NOT discover `config.json` by tracing imports at all — `config.json` is an explicit CLI
argument (`bun bundle-source.mjs <source-manifest.json> <config.json> <destDir>`, verified at
`:15`), copied into the bundle verbatim (`:357`) and baked into the Vite build via `define: {
__CONFIG__: JSON.stringify(injectedConfig) }` reading `./config.json` (`:163-168`, explicitly
NOT `process.env.CONFIG` — the comment there says so). **Once Task 20 makes `produce.mjs` write
the resolved `geometry` bytes INTO `config.json` (the same file this mechanism already ships
verbatim), the map travels with the bundle automatically — `RESOLVE_EXTS`'s `.geojson` entry and
the `:87` leaf-skip branch become dead for this concern (nothing imports `.geojson` any more,
after Tasks 16-18), not broken.** This task is therefore a VERIFICATION, not a rewrite — do not
invent a code change bundle-source.mjs does not need.

- [ ] **Step 1: Write the failing test — an end-to-end proof, not a unit test**

```ts
// skills/splash/scripts/bundle-source-geometry.test.ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

describe("bundle-source.mjs ships a DECLARED (non-shipped) geography inside config.json", () => {
  it("the exported bundle's config.json carries real geometry bytes, and `bun install && bun run build` succeeds", () => {
    // A tiny, hand-built Topology standing in for Task 20's real produce.mjs output — the
    // fixture element under test: `geometry` is a real Topology object, not a string reference
    // to a file path (which would be exactly the "builds without its map" failure this task
    // guards against — an exported bundle has no access to the original run's frozen input dir).
    const config = {
      type: "choropleth",
      regionKey: "canton",
      valueField: "v",
      rows: [{ canton: "Genève", v: 1 }],
      geography: {
        origin: "declared", set: "declared", level: "canton",
        joinKey: "name", joinKeyFamily: "name",
      },
      geometry: {
        type: "Topology",
        objects: { data: { type: "GeometryCollection", geometries: [] } },
        arcs: [],
      },
      title: "t", description: "d", source: { name: "s" },
    };
    const runDir = mkdtempSync(join(tmpdir(), "bundle-source-geo-test-"));
    const configPath = join(runDir, "config.json");
    writeFileSync(configPath, JSON.stringify(config));
    // ...build/point at a minimal real source-manifest.json for choropleth (find the fixture
    // this script's OWN existing tests already use — grep -rn "source-manifest" skills/splash/
    // scripts/*.test.ts before writing this fixture from scratch) and run:
    const destDir = join(runDir, "bundle");
    const r = spawnSync("bun", ["skills/splash/scripts/bundle-source.mjs", "<the fixture manifest>", configPath, destDir], { encoding: "utf8" });
    expect(r.status).toBe(0);
    const bundledConfig = JSON.parse(readFileSync(join(destDir, "config.json"), "utf8"));
    expect(bundledConfig.geometry.type).toBe("Topology"); // the map travelled with the bundle
    const build = spawnSync("bun", ["install"], { cwd: destDir, encoding: "utf8" });
    expect(build.status).toBe(0);
    const built = spawnSync("bun", ["run", "build"], { cwd: destDir, encoding: "utf8" });
    expect(built.status).toBe(0);
  }, 180_000); // real installs + a real Vite build — slow, expected
});
```

- [ ] **Step 2: Run the test to verify it fails BEFORE Task 20 has landed**

Run: `cd skills/splash && bun test scripts/bundle-source-geometry.test.ts`
Expected (pre-Task-20): the config fixture above is hand-built to already include `geometry` —
so this specific test may already pass once bundle-source.mjs's existing passthrough is
confirmed. If it passes without any code change, that IS this task's finding — do not force a
code change to make a test "fail first" when the honest answer is "this already works." Record
the actual result rather than assuming red.

- [ ] **Step 3: Add the documentation comment (the one real edit this task makes)**

At `bundle-source.mjs:30` (`RESOLVE_EXTS`) and `:87` (the leaf-skip), add:

```js
// `.geojson` stays in this list for any FUTURE static geojson import this repo might add, but
// as of the geography-anywhere design (D5), no map-native/scrolly component imports one any
// more — a map's geometry arrives already-resolved inside config.json (an explicit CLI arg,
// copied verbatim at writeFileSync below, never discovered by import-tracing). This comment
// exists so a future reader does not "fix" an apparent dead branch without checking config.json
// first.
```

- [ ] **Step 4: Confirm the test passes**

Run: `cd skills/splash && bun test scripts/bundle-source-geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation — prove the test depends on `config.json` actually being copied, not on
  a coincidence of the fixture**

Temporarily comment out the `writeFileSync(join(abs, "config.json"), ...)` line (`:357`).

Run: `cd skills/splash && bun test scripts/bundle-source-geometry.test.ts`
Expected: FAILS — `readFileSync(join(destDir, "config.json"))` throws ENOENT (the file was never
written). Report the failure. Revert before continuing.

- [ ] **Step 6: Commit**

```bash
git add skills/splash/scripts/bundle-source.mjs skills/splash/scripts/bundle-source-geometry.test.ts
git commit -m "test(splash): prove the exported code-source bundle ships resolved geometry via config.json"
```

### Task 20: `produce.mjs` resolves the geometry descriptor to bytes, and refuses a missing credit (D5, D7)

**Files:**
- Modify: `skills/map-native/scripts/produce.mjs` — insert after `mediaSize = renderSize(channel)`
  (`:132`, verified while writing this plan), before the config is finalized and handed to Vite
  (find that exact hand-off point by reading the file's full config-assembly section — only
  lines `44-79` and `~122-132` were read while writing this plan; the config-write/Vite-invoke
  section past line 132 was not, and this task's implementer must read it before inserting code,
  not guess the insertion point from this plan alone).
- Test: `skills/map-native/tests/produce-geometry.test.ts` (new).

**Interfaces:**
- Consumes: `subsetGeometry`, `toleranceMetersFor` (Task 6), `assertGeoCreditPresent` (Task 3),
  `renderSize` (already imported at `produce.mjs:44`, verified while writing this plan).
- Produces: no new exported symbol — `produce.mjs` is a script, not a module others import. Its
  OBSERVABLE contract widens: the config object it writes to `config.json` (and bakes into
  `__CONFIG__`) gains a `geometry: Topology` field whenever `config.geography` is present.

**Design call — where the "which features are actually drawn" feature-id list comes from,**
since D5 says the assembler already decides this but `assembleMapNative` (Task 12/13) does not
currently emit an explicit `featureIds` array: derive it from the config's own data at this
point, per shape —
`choropleth`/`dot-density`: `config.rows.map(r => String(r[config.regionKey]))`;
`cartogram`: `config.values.map(v => v.id)`.
This mirrors exactly what `computeChoropleth`/the cartogram equivalent already do internally to
find which polygons have data — recomputing it here from the same config fields, rather than
threading a NEW field back through `ProductionBrief`/`GeoMatch` (which would touch the
already-landed Task 9 manifest schema again), is the smaller, self-contained change.

- [ ] **Step 1: Write the failing tests**

```ts
// skills/map-native/tests/produce-geometry.test.ts
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// This suite runs produce.mjs directly, on a config that declares a geography — no mock, per
// repo convention. It does NOT need VITE_MAPTILER_KEY (the geometry-resolution step this task
// adds runs BEFORE the MapLibre render, and this test only exercises that step, not a full
// render) — confirm this ordering assumption once the exact insertion point (Step 3) is chosen;
// if geometry resolution ends up needing to run AFTER a MapTiler-gated step for some reason not
// visible from the lines read while writing this plan, this suite's self-skip condition must be
// widened to match Global Constraints' skip-count-diff discipline.

describe("produce.mjs resolves a declared geography's subset into config.geometry", () => {
  it("writes a Topology into config.json for a choropleth against a declared file — the fixture: 2 Swiss cantons out of a 3-canton source", () => {
    const runDir = mkdtempSync(join(tmpdir(), "produce-geo-test-"));
    const sourcePath = join(runDir, "cantons.geojson");
    writeFileSync(
      sourcePath,
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: { name: "Genève" }, geometry: { type: "Polygon", coordinates: [[[6, 46], [6, 47], [7, 47], [7, 46], [6, 46]]] } },
          { type: "Feature", properties: { name: "Vaud" }, geometry: { type: "Polygon", coordinates: [[[6.5, 46.5], [6.5, 47.5], [7.5, 47.5], [7.5, 46.5], [6.5, 46.5]]] } },
          { type: "Feature", properties: { name: "Zurich" }, geometry: { type: "Polygon", coordinates: [[[8, 47], [8, 48], [9, 48], [9, 47], [8, 47]]] } },
        ],
      }),
    );
    const config = {
      type: "choropleth",
      regionKey: "canton",
      valueField: "v",
      rows: [{ canton: "Genève", v: 1 }, { canton: "Vaud", v: 2 }], // Zurich NOT drawn
      geography: {
        origin: "declared", set: "declared", level: "canton",
        joinKey: "name", joinKeyFamily: "name",
        sourcePath, // this task's own addition to the config shape — the produce-time-only
        // field naming WHERE to read the frozen file from; never sent to the browser.
      },
      geoCredit: { name: "swisstopo" },
      title: "t", description: "d", source: { name: "s" },
    };
    // ... invoke produce.mjs's geometry-resolution step directly, or via its CLI, per the
    // exact call shape found once Step 3's insertion point is read — this test asserts on
    // config.json's FINAL written content, not on produce.mjs's internals.
    const outDir = join(runDir, "out");
    mkdirSync(outDir, { recursive: true });
    // <call the resolution step here, writing outDir/config.json>
    const written = JSON.parse(readFileSync(join(outDir, "config.json"), "utf8"));
    expect(written.geometry.type).toBe("Topology");
    const objName = Object.keys(written.geometry.objects)[0];
    expect(written.geometry.objects[objName].geometries).toHaveLength(2); // Zurich excluded
  }, 30_000);

  it("refuses (throws) when config.geography is present and config.geoCredit is missing — D7", () => {
    const config = {
      type: "choropleth",
      geography: { origin: "declared", set: "declared", level: "canton", joinKey: "name", joinKeyFamily: "name", sourcePath: "/does/not/matter/for/this/assertion" },
      // geoCredit deliberately omitted
    };
    // <call the same resolution entry point> — expect it to throw/exit non-zero, naming "credit"
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd skills/map-native && bun test tests/produce-geometry.test.ts`
Expected: FAIL — `produce.mjs` does not yet resolve `config.geography` into `config.geometry` at
all, and does not call `assertGeoCreditPresent`.

- [ ] **Step 3: Implement**

Read `produce.mjs` from line 132 to its config-write/Vite-invoke call (not shown in full here —
read it before writing this step's real code). Insert, once `mediaSize` is known (needed for
`toleranceMetersFor`) and before the config is finalized:

```js
import { subsetGeometry, toleranceMetersFor } from "../../../lib/geo/subset.mjs"; // or .ts per
  // this repo's actual module resolution for scripts — confirm .ts vs a built .mjs by checking
  // how produce.mjs already imports OTHER lib/ TypeScript modules (it does — e.g. channel.ts at
  // :44 — so lib/geo/subset.ts should import the same way, adjust the extension accordingly).
import { assertGeoCreditPresent } from "../../../lib/geo/policy.ts";

if (config.geography) {
  assertGeoCreditPresent(config.geography, config.geoCredit);

  const featureIds =
    config.type === "cartogram"
      ? config.values.map((v) => String(v.id))
      : config.rows.map((r) => String(r[config.regionKey]));

  // Rough map-extent estimate for the tolerance rule (D5): the channel's own render width is
  // known (mediaSize.width); the map's real geographic extent in metres is not measured here —
  // use a documented, named placeholder constant until a real per-geography extent is
  // threaded through (a genuine follow-up, not invented by this plan): WORLD-SCALE fallback
  // 40,075,000m (Earth's circumference) for a "world"/"natural-earth-admin-0" set, and a
  // country-scale fallback of 1,000,000m otherwise. This is a coarser tolerance than the
  // spec's own per-country measurements (D5's Swiss-cantons 288 m/px was computed against the
  // REAL Swiss extent), so simplification will be slightly more conservative (more vertices
  // kept) than optimal until that follow-up lands — never LESS conservative, which is the safe
  // direction to be wrong in.
  const extentMeters = config.geography.set.startsWith("natural-earth-admin-0")
    ? 40_075_000
    : 1_000_000;
  const toleranceMeters = toleranceMetersFor(extentMeters, mediaSize.width);

  const geomOutPath = join(outDir, "geometry.topojson");
  await subsetGeometry({
    sourcePath: config.geography.sourcePath, // Task 10's frozen path, or the shipped asset path
    outPath: geomOutPath,
    featureIds,
    idProperty: config.geography.joinKey,
    keepProperties: [config.geography.joinKey],
    toleranceMeters,
  });
  config.geometry = JSON.parse(readFileSync(geomOutPath, "utf8"));
  delete config.geography.sourcePath; // produce-time-only field — never reaches the browser
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd skills/map-native && bun test tests/produce-geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Mutation — prove the credit refusal test depends on `assertGeoCreditPresent`
  actually being called from `produce.mjs`, not just existing in `lib/geo/policy.ts`**

Temporarily comment out the `assertGeoCreditPresent(config.geography, config.geoCredit);` call.

Run: `cd skills/map-native && bun test tests/produce-geometry.test.ts`
Expected: "refuses (throws) when config.geography is present and config.geoCredit is missing"
FAILS (no throw). This is exactly the class of gap Global Constraints warns about — a guard that
exists as a function but is never called from the path that matters. Report the count. Revert
before continuing.

- [ ] **Step 6: Live-render skip-count diff (Global Constraints — required whenever a task
  touches the MapTiler-gated path)**

Run `cd skills/map-native && bun test tests/produce-geometry.test.ts` twice: once with
`VITE_MAPTILER_KEY` unset (record the skip message/count, if this suite ends up needing the key
after Step 3's real insertion point is read), once with it exported from the root `.env`. Report
both counts as the diff — do not report only the keyless run as "green."

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/scripts/produce.mjs skills/map-native/tests/produce-geometry.test.ts
git commit -m "feat(map-native): produce.mjs resolves declared geography to a metric-tolerance subset (D5, D7)"
```

---

## Phase F — the full gate

### Task 21: `bun run check` — the one full-repo gate run

**Files:** none modified — this task only runs and reports.

- [ ] **Step 1: Run the full gate from the repo root**

Run: `bun run check`
Expected: every entry in `TSC_DIRS`/`TEST_DIRS` (`scripts/check.mjs`, verified while writing this
plan) reports PASS, including `lib`, `skills/map-native`, `skills/scrolly`, `skills/splash`. Do
not hand-wave this — paste the actual `<passed>/<total> checks passed.` line into the task's
completion note.

- [ ] **Step 2: Live-MapTiler skip-count diff, repo-wide**

Per Global Constraints: run `bun run check` once with `VITE_MAPTILER_KEY` unset (the default,
clean-checkout state — record which suites self-skip and their printed skip messages), then once
with `VITE_MAPTILER_KEY`/`REMOTION_MAPTILER_KEY` exported from the root `.env` into the shell
before invoking `bun run check` again. Report the pass-count diff between the two runs — this is
the only honest evidence that Task 20's geometry-resolution step (and every existing
MapTiler-gated map-native/produce suite) actually exercises a live render, not just a self-skip
that happens to exit 0.

- [ ] **Step 3: Confirm no stray `?raw` geojson import remains anywhere in the repo**

Run: `grep -rn "\.geojson?raw\|\.geojson\"?raw" --include="*.tsx" --include="*.ts" . | grep -v node_modules`
Expected: zero hits outside `skills/splash/scripts/bundle-source.test.ts`'s own unit test fixture
string (verified while writing this plan that this one hit is a test fixture, not a real import
— `stripQuery("../assets/world.geojson?raw")`, exercising the query-stripping helper itself, not
importing anything). Any other hit means a task in this plan was not fully applied.

- [ ] **Step 4: Confirm no mention of Claude, Anthropic, or any AI tool was introduced**

Run: `git log main..HEAD --oneline` then `git diff main...HEAD | grep -in "claude\|anthropic"`
Expected: zero hits. Per Global Constraints, this is non-negotiable.

- [ ] **Step 5: Commit** (only if Step 1-4 produced any final cleanup — otherwise this task is a
  report, not a diff, and there is nothing to commit)

```bash
git status --short  # confirm clean or list what Step 1-4 touched
```

---

## Self-review notes (kept for whoever executes this plan)

- **Spec coverage:** D1 (Task 9/10), D1b (Task 10), D2 (Task 2), D3 (no task — GeoJSON/TopoJSON
  acceptance is enforced by `GeographyInputSchema`'s `encoding` enum, Task 2; Shapefile/GeoPackage/
  KML are explicitly deferred by the spec itself, no task needed), D4 (Task 1, wired at Task 10
  Step 3), D5 (Tasks 6, 20), D6 (Tasks 5, 7, 8, 14), D7 (Tasks 3, 15, 20), D8 (Tasks 3, 16), D9
  (Task 11), D10 (Tasks 4, 8, 9, 12, 13).
- **Contended files:** none of the 21 tasks touches `skills/splash/src/producer-spec.ts`,
  `skills/splash/SKILL.md`, or `skills/splash/tests/skill-doc-parity.test.ts` — confirmed by
  re-reading every task's Files section above. Task 5's scope note explicitly avoids `SKILL.md`
  for exactly this reason.
- **Known gap, stated rather than hidden:** Task 5 (join ledger) delivers the DATA STRUCTURE and
  the produce-time GATE, not the journalist-facing dialogue that POPULATES `pending`/`decisions`
  (spec D6's "Splash measures, shows, and lets the journalist decide"). That dialogue is host/
  driver-layer work this plan does not scope — flagged explicitly in Task 5 and repeated here so
  it is not mistaken for an oversight during review.
- **Known gap, Task 20:** the map-extent-in-metres input to `toleranceMetersFor` is a coarse
  world/country-scale constant, not the spec's own per-geography measured extent — documented in
  Task 20 as a safe-direction approximation (more vertices kept than strictly needed, never
  fewer) with a named follow-up, not silently invented as if it were the spec's precise figure.
