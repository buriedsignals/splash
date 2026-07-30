# Geography repair — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the seven regressions the final whole-branch review found on `feat/geography-anywhere`, and close the three mechanisms that let them ship.

**Architecture:** The ~155-line geometry-resolution block currently inlined in `skills/map-native/scripts/produce.mjs` is extracted into `lib/geo/resolve-for-produce.ts`, which both native producers call. Every repair ships with the lever that would have caught it, and those levers run **without a MapTiler key** — the two worst Criticals crash before any render, so a keyless resolve-only pass over the shipped fixtures catches them in seconds.

**Tech Stack:** Bun, TypeScript, `bun:test`, `bunx mapshaper`, `topojson-client`, Playwright snaps, Remotion.

## Global Constraints

- Runtime is **Bun**. Never `npm`, never `node`.
- Code, comments, identifiers, commit messages, branch names: **English**. Non-negotiable.
- **No mention of any AI tool** (Claude, Anthropic, or otherwise) in commits, code, docs or generated output.
- Read `lib` tests **only** as `cd lib && bun test` — from the repo root the invocation is cwd-sensitive and fabricates five false "declared render limit" failures.
- **Never commit regenerated `output-proof/` PNGs** (337 tracked files, rewritten by the snap scripts). Run `git status --short` before every commit and confirm nothing under `output-proof/` is staged.
- **Commit before any long verification.** Every real loss on this project has been an uncommitted tree; no commit has ever been lost.
- A full `bun run check` needs a **calm machine** — two concurrent gates invalidate each other, and a `map-native` run under contention fabricates a false failure. Only Task 13 runs it.
- **Mutation verification is mandatory for every lever added here.** Break the fix, watch the lever redden, restore it, watch it go green. Record both outcomes in the task's completion note. A lever that does not redden is not a lever — that is the lesson this branch paid for seven times.
- The OSM/Natural Earth credit is carried **in the produced artefact**, never in a README, never optional.
- Source of truth for what is being repaired: `docs/splash/geography-final-review-2026-07-30.md`. Design calls: `docs/superpowers/specs/2026-07-30-geography-repair-design.md`.

---

## File Structure

**Created**

- `lib/geo/resolve-for-produce.ts` — the shared resolution step: descriptor → credit assertion → feature ids → subset → resolved config. Called by both native producers. One responsibility: turn a config carrying a geography descriptor into the same config carrying real geometry bytes.
- `lib/geo/resolve-for-produce.test.ts` — unit coverage for the resolver, including the type-gating that fixes C1.
- `skills/map-native/tests/resolve-all-fixtures.test.ts` — the keyless lever: every shipped `assets/sample-data/*.json` through the resolver, no render, no MapTiler key.
- `lib/loop/map-scrolly-e2e.test.ts` — the loop-level map-track scrolly build, from an **assembled** config, never from `sample-data/scrolly.json`.
- `skills/map-native/tests/geo-credit-call-sites.test.ts` — source scan: every component that renders `MapFrame` passes `geoCredit`.
- `lib/geo/static-geojson-imports.test.ts` — the reshaped `?raw` guard: tree walk, explicit exemptions, non-empty-scan assertion.

**Modified**

- `lib/geo/subset.ts` — two-pass subset; measured extent replaces the placeholder constants; `keep-shapes`; the two post-conditions.
- `skills/map-native/scripts/produce.mjs:173-311` — the block leaves, a call takes its place.
- `skills/scrolly/scripts/produce.mjs` — gains the same call.
- `lib/geo/ref.ts` — the ADM1 shipped ref, its file extension, `BASEMAPS` widened.
- `skills/map-native/src/validate-config.ts` — the cartogram validator calls `validateBasemap`.
- `skills/map-native/src/core/MapFrame.tsx` call sites (7 components) — `geoCredit` threaded.
- `lib/host/state.ts:74-92` — in-memory migration instead of a dead-end refusal.
- `skills/map-native/tests/choropleth-map-imports.test.ts`, `skills/scrolly/tests/no-static-geojson-imports.test.ts` — replaced by the tree walk.
- `docs/splash/guardrails.md`, `skills/map-native/SKILL.md`, `skills/scrolly/SKILL.md`, `skills/map-native/src/geo-match.ts` — the prose defects.

**Deleted**

- Nothing.

---

### Task 1: Extract the resolution step into `lib/geo/resolve-for-produce.ts`

Behaviour-preserving refactor. It changes no output; it makes the step callable from the scrolly producer (Task 4) and testable without a render (Task 2). Do not fix any defect here — the defects are Tasks 2, 3, 6. A task that refactors *and* fixes cannot be reviewed.

**Files:**
- Create: `lib/geo/resolve-for-produce.ts`
- Create: `lib/geo/resolve-for-produce.test.ts`
- Modify: `skills/map-native/scripts/produce.mjs:173-311`

**Interfaces:**
- Consumes: `subsetGeometry`, `toleranceMetersFor` (`lib/geo/subset.ts`); `assertGeoCreditPresent` (`lib/geo/policy.ts`); `basemapKeyFor`, `resolveGeographyRef` (`lib/geo/ref.ts`).
- Produces:
  ```ts
  export type ResolveForProduceInput = {
    config: Record<string, unknown>;   // parsed config, MUTATED in place
    assetsGeoDir: string;              // absolute path to the skill's assets/geo
    renderWidthPx: number;
  };
  /** Resolves config.geography into config.geometry. Returns true when it wrote geometry,
   *  false when the config carries no geography to resolve. Never writes to disk. */
  export async function resolveGeometryForProduce(
    input: ResolveForProduceInput,
  ): Promise<boolean>;
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/geo/resolve-for-produce.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { resolveGeometryForProduce } from "./resolve-for-produce";

const ASSETS = join(import.meta.dir, "../../skills/map-native/assets/geo");

describe("resolveGeometryForProduce", () => {
  it("should resolve a legacy shipped-basemap choropleth into real geometry", async () => {
    const config: Record<string, unknown> = {
      type: "choropleth",
      basemap: "world",
      regionKey: "code",
      rows: [{ code: "FRA", value: 1 }, { code: "DEU", value: 2 }],
    };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    expect(wrote).toBe(true);
    expect((config.geometry as { type: string }).type).toBe("Topology");
    expect((config.geography as { origin: string }).origin).toBe("shipped");
  });

  it("should return false and leave the config alone when there is no geography", async () => {
    const config: Record<string, unknown> = { type: "line", rows: [] };
    const wrote = await resolveGeometryForProduce({
      config,
      assetsGeoDir: ASSETS,
      renderWidthPx: 1200,
    });
    expect(wrote).toBe(false);
    expect(config.geometry).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd lib && bun test geo/resolve-for-produce.test.ts`
Expected: FAIL — `Cannot find module './resolve-for-produce'`.

- [ ] **Step 3: Move the block, verbatim, into the new module**

Create `lib/geo/resolve-for-produce.ts`. Move `skills/map-native/scripts/produce.mjs:173-298` (from the `const geography =` line through `parsedConfig.geography = geography;`) **unchanged apart from renames**: `parsedConfig` → `input.config`, `mediaSize.width` → `input.renderWidthPx`, and the `join(root, "assets", "geo", …)` path → `join(input.assetsGeoDir, …)`. Keep every comment: they record decisions, and several are the only written trace of why a branch exists. Return `true` inside the `if (geography)` arm, `false` otherwise.

The file writing (`resolvedConfigPath`, `writeFileSync`) stays in `produce.mjs` — it is a producer concern, not a resolver one, and keeping it out is what lets Task 2 call the resolver with no filesystem side effects.

- [ ] **Step 4: Make `produce.mjs` call it**

Replace `produce.mjs:173-311` with:

```js
const wroteGeometry = await resolveGeometryForProduce({
  config: parsedConfig,
  assetsGeoDir: join(root, "assets", "geo"),
  renderWidthPx: mediaSize.width,
});
if (wroteGeometry) {
  // Persist the resolved config to outDir/config.json — never back to the caller's own
  // configPath (see the comment on resolvedConfigPath above) — and repoint
  // resolvedConfigPath there so vite.config.ts's CONFIG= re-read below picks up the
  // resolved geometry for every build.
  resolvedConfigPath = join(outDir, "config.json");
  writeFileSync(resolvedConfigPath, JSON.stringify(parsedConfig, null, 2) + "\n");
}
```

Add `import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce.ts";` beside the existing `lib/geo` imports at `produce.mjs:45-47`, and drop the imports that moved (`subsetGeometry`, `toleranceMetersFor`, `assertGeoCreditPresent`, `basemapKeyFor`, `resolveGeographyRef`) if nothing else in the file uses them — check with grep, do not assume.

- [ ] **Step 5: Run the new test and the existing geometry suite**

Run: `cd lib && bun test geo/resolve-for-produce.test.ts`
Expected: 2 pass.

Run: `cd skills/map-native && bun test tests/produce-geometry.test.ts`
Expected: same pass count as before this task (record the number in the completion note — a *changed* count means this was not behaviour-preserving).

- [ ] **Step 6: Commit**

```bash
git status --short   # confirm nothing under output-proof/ is staged
git add lib/geo/resolve-for-produce.ts lib/geo/resolve-for-produce.test.ts skills/map-native/scripts/produce.mjs
git commit -m "refactor(geo): the geometry-resolution step becomes a module both producers can call"
```

---

### Task 2: The keyless fixture lever, and the point-family crash it catches (C1)

**Files:**
- Create: `skills/map-native/tests/resolve-all-fixtures.test.ts`
- Modify: `lib/geo/resolve-for-produce.ts`

**Interfaces:**
- Consumes: `resolveGeometryForProduce` (Task 1).
- Produces: nothing new. The type gate is internal to the resolver.

- [ ] **Step 1: Write the failing test**

Create `skills/map-native/tests/resolve-all-fixtures.test.ts`:

```ts
// The lever that would have caught the point-family crash and the vanished small
// countries: both fail during CONFIG RESOLUTION, before any render, so this needs no
// MapTiler key, no network and no browser. A suite that self-skips without a key is
// exactly the blindness this repair exists to close — this one never skips.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce";

const SAMPLES = join(import.meta.dir, "..", "assets", "sample-data");
const ASSETS = join(import.meta.dir, "..", "assets", "geo");
const fixtures = readdirSync(SAMPLES).filter((f) => f.endsWith(".json"));

describe("every shipped fixture resolves", () => {
  it("should find fixtures at all (an empty scan must never pass)", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(7);
  });

  for (const name of fixtures) {
    it(`should resolve ${name} without throwing`, async () => {
      const config = JSON.parse(readFileSync(join(SAMPLES, name), "utf8"));
      await resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
      });
    });
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd skills/map-native && bun test tests/resolve-all-fixtures.test.ts`
Expected: FAIL on `symbol.json`, `locator-few.json`, `hex-grid-count.json` with
`TypeError: undefined is not an object (evaluating 'parsedConfig.rows.map')` — the exact crash reproduced on the branch.

- [ ] **Step 3: Gate the resolver on types that actually join geometry**

The point family (`symbol`, `locator`, `hex-grid`) draws markers at coordinates. It joins nothing, and its components never read `config.geometry` (`HexGridMap.tsx:189` says so in as many words). In `lib/geo/resolve-for-produce.ts`, immediately after the `const geography = …` fallback and before the `if (geography)` arm, add:

```ts
// WHICH TYPES JOIN GEOMETRY. The point family (symbol, locator, hex-grid) draws markers at
// coordinates and reads no geometry at all, but it still carries `basemap: "world"` — so a
// gate on the presence of `geography` alone entered this block for it and then assumed
// `config.rows`, which the point family does not have. Listed as an allow-list of the types
// that DO join, never as a deny-list of the ones that do not: a new point-family type must
// be opted IN to resolution deliberately, not discovered by a crash.
const JOINING_TYPES = new Set(["choropleth", "cartogram", "dot-density", "route"]);
const joins = JOINING_TYPES.has(String(input.config.type));
if (!joins) return false;
```

- [ ] **Step 4: Run the test again**

Run: `cd skills/map-native && bun test tests/resolve-all-fixtures.test.ts`
Expected: all fixtures pass.

- [ ] **Step 5: Mutation-verify the lever**

Change `JOINING_TYPES.has(...)` to `true`, re-run the suite, confirm the three point fixtures redden with the original `TypeError`. Restore, confirm green. **Record both counts in the completion note.**

- [ ] **Step 6: Commit**

```bash
git status --short
git add skills/map-native/tests/resolve-all-fixtures.test.ts lib/geo/resolve-for-produce.ts
git commit -m "fix(geo): symbol, locator and hex-grid join no geometry — resolve only the types that do"
```

---

### Task 3: Measured extent, `keep-shapes`, and two post-conditions (C2)

The placeholder constants over-simplify by 10× to 80×: `tolerance = extent / width` in metres per pixel, so a placeholder *larger* than the real extent simplifies *harder*. Measured on the shipped world basemap, 62 of 241 features simplify to `geometry: null`; `computeChoropleth` and `computeRoute` then throw on `.type` of null, and what the journalist sees is a 30-second Playwright timeout.

**Files:**
- Modify: `lib/geo/subset.ts`
- Modify: `lib/geo/resolve-for-produce.ts`
- Modify: `lib/geo/subset.test.ts`
- Modify: `skills/map-native/tests/resolve-all-fixtures.test.ts`

**Interfaces:**
- Produces: `SubsetInput` loses `toleranceMeters` and gains `renderWidthPx: number`. `subsetGeometry` returns `{ bytes: number; featureCount: number }`.

- [ ] **Step 1: Write the failing assertion into the lever**

In `skills/map-native/tests/resolve-all-fixtures.test.ts`, replace the body of the per-fixture `it` with:

```ts
      const config = JSON.parse(readFileSync(join(SAMPLES, name), "utf8"));
      const wrote = await resolveGeometryForProduce({
        config,
        assetsGeoDir: ASSETS,
        renderWidthPx: 1200,
      });
      if (!wrote) return;
      // A simplification that annihilates a shape hands the renderer `geometry: null`, and
      // every consumer reads `.type` on it. Assert the absence here, where the message can
      // name the geography — three layers down it is a bare TypeError, and one layer further
      // it is an unexplained 30s browser timeout.
      const topo = config.geometry as { objects: Record<string, { geometries: unknown[] }> };
      const geometries = Object.values(topo.objects).flatMap((o) => o.geometries);
      expect(geometries.length).toBeGreaterThan(0);
      const nulls = geometries.filter(
        (g) => (g as { type?: string }).type === undefined,
      );
      expect(nulls).toHaveLength(0);
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd skills/map-native && bun test tests/resolve-all-fixtures.test.ts`
Expected: FAIL on the world-basemap fixtures — `expected length 0, received 62` on `route.json`, and a non-zero count on the choropleth/cartogram/dot-density fixtures.

- [ ] **Step 3: Rewrite `subsetGeometry` as two passes with a measured extent**

Replace the body of `lib/geo/subset.ts` with:

```ts
// filter → measure → simplify → encode (D5). Every cut is a real bunx mapshaper invocation —
// no mock, per repo convention (real APIs, real failures). Tolerance is ALWAYS an absolute
// metre value derived from render width, never a percentage: -simplify 5% (a number that
// "sounds prudent") moves the Swiss border by 64px at 1200px width (spec D5, measured).
//
// The extent is MEASURED, not guessed. A placeholder constant shipped once and cost 62 of the
// world basemap's 241 features: tolerance is metres per pixel, so a placeholder LARGER than
// the real extent simplifies HARDER, which is the unsafe direction — the opposite of what the
// placeholder's own comment claimed.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function toleranceMetersFor(
  mapExtentMeters: number,
  renderWidthPx: number,
): number {
  return mapExtentMeters / renderWidthPx;
}

/** The larger of a lon/lat bbox's two sides, in metres. Equirectangular, which is ample for
 *  choosing a simplification threshold — this number picks a tolerance, it does not project a
 *  map. Longitude degrees are scaled by the cosine of the mid-latitude, which is what makes a
 *  Swiss extent read as ~350 km rather than ~500 km. */
export function extentMetersFor(bbox: {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}): number {
  const M_PER_DEG_LAT = 111_320;
  const midLat = ((bbox.minLat + bbox.maxLat) / 2) * (Math.PI / 180);
  const height = (bbox.maxLat - bbox.minLat) * M_PER_DEG_LAT;
  const width =
    (bbox.maxLon - bbox.minLon) * M_PER_DEG_LAT * Math.max(Math.cos(midLat), 0.01);
  return Math.max(width, height);
}

/** Walks GEOMETRY ONLY and returns the bbox of every coordinate in it. Geometry only, never
 *  the whole feature: a properties table can legitimately hold an array of two numbers, and a
 *  naive whole-object walk would read it as a coordinate and blow the extent out. Throws when
 *  the input holds no coordinate at all — an empty bbox would silently produce a nonsense
 *  tolerance, and "the filter matched nothing" is the far more useful thing to say. */
export function bboxOf(geometries: unknown[]): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      if (typeof node[0] === "number" && typeof node[1] === "number") {
        minLon = Math.min(minLon, node[0]); maxLon = Math.max(maxLon, node[0]);
        minLat = Math.min(minLat, node[1]); maxLat = Math.max(maxLat, node[1]);
        return;
      }
      for (const child of node) walk(child);
      return;
    }
    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) walk(v);
    }
  };
  for (const g of geometries) walk(g);
  if (!Number.isFinite(minLon))
    throw new Error("bboxOf: the input holds no coordinate — nothing was retained");
  return { minLon, minLat, maxLon, maxLat };
}

export type SubsetInput = {
  sourcePath: string;
  outPath: string;
  featureIds: string[];
  idProperty: string;
  keepProperties: string[];
  renderWidthPx: number;
};

function mapshaper(args: string[]): void {
  const r = spawnSync("bunx", ["mapshaper", ...args], { encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(
      `subsetGeometry: bunx mapshaper failed (exit ${r.status}): ${r.stderr}`,
    );
}

export async function subsetGeometry(
  input: SubsetInput,
): Promise<{ bytes: number; featureCount: number }> {
  const idList = JSON.stringify(input.featureIds);
  // The property is addressed, never interpolated as a bare identifier: a join key is
  // ordinary shapefile prose ("code insee", "NUTS-2 code") and a bare identifier makes those
  // a SyntaxError inside mapshaper's expression evaluator.
  const filterExpr = `${idList}.includes(String(this.properties[${JSON.stringify(
    input.idProperty,
  )}]))`;
  const tmp = mkdtempSync(join(tmpdir(), "geo-subset-"));
  try {
    // Pass 1 — filter and prune, no simplification, to GeoJSON we can measure.
    const filtered = join(tmp, "filtered.geojson");
    mapshaper([
      input.sourcePath,
      "-filter", filterExpr,
      "-filter-fields", `fields=${input.keepProperties.join(",")}`,
      "-o", filtered, "format=geojson", "force",
    ]);
    const parsed = JSON.parse(readFileSync(filtered, "utf8")) as {
      features?: { properties?: Record<string, unknown>; geometry?: unknown }[];
    };
    const features = parsed.features ?? [];
    // POST-CONDITION 1 — every id the data asked for came back. A silently-dropped region the
    // data has a value for is a hole in the map; it must be a named refusal here, not a blank
    // area the journalist has to notice.
    const got = new Set(
      features.map((f) => String(f.properties?.[input.idProperty])),
    );
    const missing = input.featureIds.filter((id) => !got.has(id));
    if (missing.length)
      throw new Error(
        `subsetGeometry: ${missing.length} of ${input.featureIds.length} requested regions ` +
          `are absent from ${input.sourcePath} on join key "${input.idProperty}" — ` +
          `first missing: ${missing.slice(0, 5).join(", ")}`,
      );
    const toleranceMeters = toleranceMetersFor(
      extentMetersFor(bboxOf(features.map((f) => f.geometry))),
      input.renderWidthPx,
    );
    // Pass 2 — simplify and encode. `keep-shapes` is what stops a small polygon (Luxembourg,
    // Malta, Singapore, every island state) from being annihilated into `geometry: null`.
    mapshaper([
      filtered,
      "-simplify", "visvalingam", `interval=${toleranceMeters}m`, "keep-shapes",
      "-o", input.outPath, "format=topojson", "quantization=1e5", "force",
    ]);
    // POST-CONDITION 2 — nothing was annihilated. Belt as well as braces: keep-shapes is the
    // fix, this is the guard that tells us when it stops being enough.
    const topo = JSON.parse(readFileSync(input.outPath, "utf8")) as {
      objects: Record<string, { geometries: { type?: string }[] }>;
    };
    const geometries = Object.values(topo.objects).flatMap((o) => o.geometries);
    const nulls = geometries.filter((g) => g.type === undefined);
    if (nulls.length)
      throw new Error(
        `subsetGeometry: ${nulls.length} of ${geometries.length} shapes were simplified out ` +
          `of existence at ${Math.round(toleranceMeters)} m/px — every consumer reads .type ` +
          `on these and will throw`,
      );
    return { bytes: statSync(input.outPath).size, featureCount: geometries.length };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Update the caller**

In `lib/geo/resolve-for-produce.ts`, delete the `extentMeters` placeholder block and the `toleranceMeters` local entirely, and pass `renderWidthPx: input.renderWidthPx` to `subsetGeometry` in place of `toleranceMeters`.

- [ ] **Step 5: Run the lever and the unit suite**

Run: `cd skills/map-native && bun test tests/resolve-all-fixtures.test.ts`
Expected: all fixtures pass, zero null geometries.

Run: `cd lib && bun test geo/`
Expected: `subset.test.ts` fails where it still passes `toleranceMeters` — update those call sites to `renderWidthPx: 1200`, and add one test for `extentMetersFor` (a 1°×1° box at the equator is ~111 km; the same box at 60°N is ~111 km tall and ~56 km wide, so the function returns the height) and one for `bboxOf` throwing on a coordinate-free input.

- [ ] **Step 6: Mutation-verify**

Remove `keep-shapes` from pass 2, re-run `tests/resolve-all-fixtures.test.ts`, confirm the null-count assertion reddens. Restore. Then replace the measured extent with the old `40_075_000` constant and confirm it reddens too. Restore. **Record both in the completion note.**

- [ ] **Step 7: Commit**

```bash
git status --short
git add lib/geo/subset.ts lib/geo/subset.test.ts lib/geo/resolve-for-produce.ts skills/map-native/tests/resolve-all-fixtures.test.ts
git commit -m "fix(geo): measure the extent, keep the shapes, and refuse a subset that lost a region"
```

---

### Task 4: The scrolly producer resolves geometry, and a loop-level map-scrolly proves it (C3)

Commit `7532fdc7` removed the four `?raw` imports from the scrolly map components and replaced them with hard throws, but `skills/scrolly/scripts/produce.mjs` never gained a resolution step. The only thing keeping the suite green is that the same commit inlined a 9 304-line TopoJSON into `skills/scrolly/assets/sample-data/scrolly.json` — the fixture was edited to contain what production stopped supplying.

**Files:**
- Modify: `skills/scrolly/scripts/produce.mjs`
- Create: `lib/loop/map-scrolly-e2e.test.ts`
- Modify: `skills/scrolly/assets/sample-data/scrolly.json`

**Interfaces:**
- Consumes: `resolveGeometryForProduce` (Task 1).

- [ ] **Step 1: Write the failing test**

Create `lib/loop/map-scrolly-e2e.test.ts`. Build a map-track scrolly element through the assembler — **never** by reading `sample-data/scrolly.json`, which is the fixture that hid this defect — and assert the assembled-then-produced config carries geometry. Mirror the setup of the existing `lib/loop/scrolly-e2e.test.ts` (which builds `nativeType: "line"`, the chart track — that is precisely why the map track was untested) and change the element to `nativeType: "choropleth"`, `builder: "map-native"`, `format: "scrolly"`. Assert `config.geometry` is a `Topology` in the produced output directory's `config.json`.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd lib && bun test loop/map-scrolly-e2e.test.ts`
Expected: FAIL — either the produced `config.json` has no `geometry`, or the build throws `scrolly choropleth: config.geometry is required`.

- [ ] **Step 3: Call the resolver from the scrolly producer**

In `skills/scrolly/scripts/produce.mjs`, after the config is parsed and before any build step, add the same call Task 1 put in the map-native producer, writing the resolved config to the producer's own output directory and never back to the caller's path:

```js
import { resolveGeometryForProduce } from "../../../lib/geo/resolve-for-produce.ts";
// … after parsing the config, before the build:
const wroteGeometry = await resolveGeometryForProduce({
  config: parsedConfig,
  assetsGeoDir: join(here, "..", "..", "map-native", "assets", "geo"),
  renderWidthPx: mediaWidth,
});
if (wroteGeometry) {
  resolvedConfigPath = join(outDir, "config.json");
  writeFileSync(resolvedConfigPath, JSON.stringify(parsedConfig, null, 2) + "\n");
}
```

Read the file first: it takes `(configPath, outDir)` and its own width source may be named differently. Use the width the scrolly build already uses; do not introduce a second one.

- [ ] **Step 4: Remove the inlined geometry from the fixture**

Strip the top-level `geometry` key from `skills/scrolly/assets/sample-data/scrolly.json`. It must not be there: as long as it is, the skill's own smoke passes for a reason production does not have. The fixture keeps `basemap` / `regionKey` / `rows`, and the producer now resolves from those.

- [ ] **Step 5: Run both suites**

Run: `cd lib && bun test loop/map-scrolly-e2e.test.ts` — Expected: PASS.
Run: `cd skills/scrolly && bun test` — Expected: PASS, and confirm the smoke now exercises real resolution (the run's own output `config.json` carries a `Topology`).

- [ ] **Step 6: Mutation-verify**

Comment out the `resolveGeometryForProduce` call in the scrolly producer; confirm **both** the loop e2e and the skill smoke redden. Restore. Record both.

- [ ] **Step 7: Commit**

```bash
git status --short
git add skills/scrolly/scripts/produce.mjs skills/scrolly/assets/sample-data/scrolly.json lib/loop/map-scrolly-e2e.test.ts
git commit -m "fix(scrolly): the scrolly producer resolves geometry, and the fixture stops standing in for it"
```

---

### Task 5: The geo credit reaches the artefact (C5)

`assertGeoCreditPresent` refuses to build without a credit and then the credit is thrown away: `geoCredit` is declared and rendered by `MapFrame` but **no component passes the prop**. The plan's own Global Constraints forbade exactly this: "a task that drops or defaults the credit is wrong regardless of how clean the diff looks."

**Files:**
- Modify: `skills/map-native/src/components/ChoroplethMap.tsx`, `CartogramMap.tsx`, `DotDensityMap.tsx`, `RouteMap.tsx`, `SymbolMap.tsx`, `LocatorMap.tsx`, `HexGridMap.tsx` (confirm the exact set with `grep -rln "<MapFrame" skills/map-native/src`)
- Create: `skills/map-native/tests/geo-credit-call-sites.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// A component test can never see a MISSING call site — map-frame-locale.test.tsx "proves" the
// credit renders by passing the prop itself. This is a source scan, because the defect is
// structural: MapFrame is rendered somewhere that does not hand it the credit.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "src");

function tsxFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

describe("every MapFrame call site passes the geo credit", () => {
  const files = tsxFilesUnder(SRC).filter((f) => !f.endsWith(".test.tsx"));
  const callers = files.filter((f) =>
    /<MapFrame[\s>]/.test(readFileSync(f, "utf8")) && !f.endsWith("MapFrame.tsx"),
  );

  it("should find MapFrame call sites at all (an empty scan must never pass)", () => {
    expect(callers.length).toBeGreaterThanOrEqual(4);
  });

  for (const f of callers) {
    it(`should pass geoCredit in ${f.split("/").pop()}`, () => {
      expect(readFileSync(f, "utf8")).toMatch(/geoCredit=\{/);
    });
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd skills/map-native && bun test tests/geo-credit-call-sites.test.ts`
Expected: FAIL for every caller.

- [ ] **Step 3: Thread the prop**

In each caller, add `geoCredit={config.geoCredit}` to the `<MapFrame …>` element, beside the existing `source={…}`. Add `geoCredit?: { name: string; url?: string }` to each component's config type where it is not already inherited.

- [ ] **Step 4: Run the test, then look at an artefact**

Run: `cd skills/map-native && bun test tests/geo-credit-call-sites.test.ts` — Expected: PASS.

Then produce one real static map with a declared credit in its config and **open the PNG**. The credit must be legible beside the source. Record what you read on the image — not that the test passed, but the words you saw.

- [ ] **Step 5: Mutation-verify**

Remove `geoCredit={config.geoCredit}` from one caller; confirm that caller's test reddens and the others stay green (the scan must isolate, not fire wholesale). Restore.

- [ ] **Step 6: Commit**

```bash
git status --short   # the produced PNG must NOT be staged
git add skills/map-native/src/components skills/map-native/tests/geo-credit-call-sites.test.ts
git commit -m "fix(map-native): the credit produce refuses to build without is now on the artefact"
```

---

### Task 6: Keep the human label in the pruned geometry (C7)

`keepProperties: [geography.joinKey]` prunes every property but the join key, so `properties.name` disappears and seven consumers degrade to a raw code — a hover popup reads `FRA`, a video callout reads `ITA`. Both geometry fixtures declare `joinKey: "name"`, the one value that preserves `name` by coincidence, which is why no test saw it.

**Files:**
- Modify: `lib/geo/resolve-for-produce.ts`
- Modify: `skills/map-native/tests/produce-geometry.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `skills/map-native/tests/produce-geometry.test.ts` a fixture whose join key is **not** `name` — a world choropleth on `iso_a3` — and assert that the resolved geometry's features still carry `name`:

```ts
it("should keep the human label when the join key is not the label", async () => {
  const config: Record<string, unknown> = {
    type: "choropleth", basemap: "world", regionKey: "code",
    rows: [{ code: "FRA", value: 1 }, { code: "DEU", value: 2 }],
  };
  await resolveGeometryForProduce({ config, assetsGeoDir: ASSETS, renderWidthPx: 1200 });
  const topo = config.geometry as {
    objects: Record<string, { geometries: { properties?: Record<string, unknown> }[] }>;
  };
  const props = Object.values(topo.objects).flatMap((o) => o.geometries)[0]!.properties!;
  expect(props.iso_a3).toBeDefined();
  expect(props.name).toBeDefined();   // the popup, the callout and the route label all read this
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd skills/map-native && bun test tests/produce-geometry.test.ts`
Expected: FAIL — `expect(props.name).toBeDefined()` receives `undefined`.

- [ ] **Step 3: Widen `keepProperties`**

In `lib/geo/resolve-for-produce.ts`, replace `keepProperties: [geography.joinKey]` with:

```ts
    // The join key alone is not enough: seven consumers read `properties.name` for the label a
    // reader actually sees (hover popup, video callout, cartogram cell, route territory). Both
    // of this suite's fixtures happened to join ON `name`, which is why pruning to the join key
    // alone looked harmless. `labelField` joins the list when the config names one.
    keepProperties: [
      ...new Set(
        [
          geography.joinKey,
          "name",
          typeof input.config.labelField === "string"
            ? input.config.labelField
            : undefined,
        ].filter((k): k is string => Boolean(k)),
      ),
    ],
```

Note: mapshaper's `-filter-fields` fails when a named field is absent from the table. If the shipped ADM1 or a declared file has no `name` column, that becomes a hard failure — so the field list must be intersected with the fields actually present. Read the filtered output's first feature in pass 1 of `subsetGeometry` if needed, or pass `-filter-fields` only the intersection. Verify against **both** shipped assets before calling this done.

- [ ] **Step 4: Run the suite**

Run: `cd skills/map-native && bun test tests/produce-geometry.test.ts` — Expected: PASS.
Run: `cd skills/map-native && bun test tests/resolve-all-fixtures.test.ts` — Expected: still PASS.

- [ ] **Step 5: Mutation-verify**

Restore `keepProperties: [geography.joinKey]`; confirm the new test reddens. Restore the fix.

- [ ] **Step 6: Commit**

```bash
git status --short
git add lib/geo/resolve-for-produce.ts skills/map-native/tests/produce-geometry.test.ts
git commit -m "fix(geo): pruning kept the join key and threw away the name every reader sees"
```

---

### Task 7: A declared geography with `format: video` refuses, loudly

The video family reads `staticFile("geo/world.geojson")` and keys on a hardcoded `iso_a3`; it never reads `config.geometry`. It is not regressed and this plan does not wire it. But a **declared** geography currently renders Natural Earth in silence, while the credit assertion passes on an artefact showing an uncredited file. Wiring video is a separate chantier; lying is not acceptable in the meantime.

**Files:**
- Modify: `lib/geo/resolve-for-produce.ts`
- Modify: `lib/geo/resolve-for-produce.test.ts`

**Interfaces:**
- Produces: `ResolveForProduceInput` gains `format?: string` — **optional**, so the call sites
  written in Tasks 1-3 keep type-checking unchanged. Absent means "not a video", which is the
  behaviour every existing caller already had.

- [ ] **Step 1: Write the failing test**

```ts
it("should refuse a declared geography in the video format rather than render another map", async () => {
  const config: Record<string, unknown> = {
    type: "choropleth", regionKey: "code", rows: [{ code: "GE", value: 1 }],
    geography: {
      origin: "declared", set: "ch-cantons", level: "canton",
      joinKey: "name", joinKeyFamily: "name", sourcePath: "/tmp/nope.geojson",
    },
    geoCredit: { name: "swisstopo" },
  };
  await expect(
    resolveGeometryForProduce({ config, assetsGeoDir: ASSETS, renderWidthPx: 1200, format: "video" }),
  ).rejects.toThrow(/video/i);
});
```

- [ ] **Step 2: Run it and watch it fail** — Expected: it resolves (or fails for an unrelated reason), not a video refusal.

- [ ] **Step 3: Add the refusal**

Inside the `if (geography)` arm, before the credit assertion:

```ts
  // The video family reads staticFile("geo/world.geojson") directly and never looks at
  // config.geometry (grep: zero hits for config.geometry under src/components). For a SHIPPED
  // basemap that is merely redundant. For a DECLARED geometry it renders a different map than
  // the one the credit names — the worst available outcome — so it refuses here, by name,
  // until the video path reads injected geometry.
  if (geography.origin === "declared" && input.format === "video")
    throw new Error(
      `produce: a declared geography ("${geography.set}") cannot be rendered as video yet — ` +
        `the video compositions read the shipped world basemap directly, so the output would ` +
        `show a different map from the one the credit names. Choose static, interactive or ` +
        `scrolly for this geography`,
    );
```

Thread `format` from both producers (each already has the format as its CLI argument).

- [ ] **Step 4: Run the tests** — Expected: PASS, and `tests/resolve-all-fixtures.test.ts` unaffected (its fixtures are all shipped-origin).

- [ ] **Step 5: Commit**

```bash
git status --short
git add lib/geo/resolve-for-produce.ts lib/geo/resolve-for-produce.test.ts skills/map-native/scripts/produce.mjs skills/scrolly/scripts/produce.mjs
git commit -m "feat(geo): a declared geography refuses video by name instead of rendering another map"
```

---

### Task 8: The ADM1 path resolves, validates, and renders (C6)

The branch's headline capability is dead at two independent points: `basemapKeyFor` falls through to `ref.set`, so produce derives `natural-earth-admin-1.geojson` while the committed asset is `natural-earth-admin-1.**topojson**`; and `validateBasemap` still refuses the name because `BASEMAPS` was never widened — except for cartogram, the one validator that never calls `validateBasemap` at all, which is how a cartogram sails past validation into a mapshaper ENOENT.

**This task's exit condition is a rendered, inspected image.** This path has never produced one, and the last time a sibling component received real data at full scale for the first time it produced what was misfiled for a day as a "vendor WebGL crash".

**Files:**
- Modify: `lib/geo/ref.ts`
- Modify: `lib/geo/ref.test.ts`
- Modify: `skills/map-native/src/validate-config.ts`
- Modify: `lib/geo/resolve-for-produce.ts`

- [ ] **Step 1: Write the failing tests**

In `lib/geo/ref.test.ts`, assert `basemapKeyFor({ …, set: "natural-earth-admin-1" })` returns a key that names a **file that exists** in `skills/map-native/assets/geo`, and assert `BASEMAPS` contains the ADM1 entry with its real join key. In the validate-config suite, assert a cartogram config with an unknown basemap is refused (it is not today).

- [ ] **Step 2: Run and watch them fail.**

- [ ] **Step 3: Give the shipped ref its real file**

Add an ADM1 entry to `SHIPPED_REFS` and `BASEMAPS` in `lib/geo/ref.ts`, and give `GeographyRef` a `fileExtension` field (`"geojson" | "topojson"`) rather than letting the resolver guess — the guess is what produced the ENOENT. Default `"geojson"` for the existing two entries so nothing else changes. In `lib/geo/resolve-for-produce.ts`, build the path from that field.

- [ ] **Step 4: Make the cartogram validator call `validateBasemap`**

In `skills/map-native/src/validate-config.ts:875` (`validateCartogramConfig`), add the `validateBasemap` call every sibling validator already makes.

- [ ] **Step 5: Run the suites** — `cd lib && bun test geo/` and `cd skills/map-native && bun test src/validate-config.test.ts`.

- [ ] **Step 6: Render an ADM1 map and look at it**

Build a real choropleth config over Swiss cantons (or French departments) against the shipped ADM1 asset, run `bun scripts/produce.mjs <config> <out> static` with the real MapTiler key from `.env`, and **open the PNG**. Confirm: the right territories are drawn, the colours match the legend, the furniture and the credit are present, and no territory is missing. Record what you saw. If it does not render, that is this task's finding — report it, do not paper over it.

- [ ] **Step 7: Commit**

```bash
git status --short   # the rendered PNG must NOT be staged
git add lib/geo/ref.ts lib/geo/ref.test.ts lib/geo/resolve-for-produce.ts skills/map-native/src/validate-config.ts
git commit -m "fix(geo): the admin-1 geography names its real file, and a cartogram can no longer skip basemap validation"
```

---

### Task 9: An existing run directory is readable again (C4)

`schemaVersion` 5 makes every v4 `run.json` unreachable through the **entire** host façade — `state`, `next`, `advanceRun`, `phraseOfferIn`, `authorBeatsIn`, `decide` — and the refusal names a migration command that does not exist. `migrateV4toV5` is a pure object transform that writes nothing.

**Files:**
- Modify: `lib/host/state.ts:74-92`
- Modify: `lib/host/state.test.ts`

- [ ] **Step 1: Write the failing test**

Write a v4 `run.json` into a temp run directory and assert `loadRun` succeeds and reports `schemaVersion` 5 in memory, with the on-disk file left untouched.

- [ ] **Step 2: Run and watch it fail** — Expected: `stale-schema`.

- [ ] **Step 3: Migrate in memory**

Replace the blanket refusal with: when `declared < CURRENT_SCHEMA_VERSION` **and** every migration between them is write-free, run them in memory and continue; otherwise keep the refusal, and make its message name a real remedy. Keep the refusal for a *newer* declared version — that one genuinely cannot be handled.

- [ ] **Step 4: Run the suite** — `cd lib && bun test host/state.test.ts`.

- [ ] **Step 5: Mutation-verify** — revert the in-memory migration, confirm the new test reddens.

- [ ] **Step 6: Commit**

```bash
git status --short
git add lib/host/state.ts lib/host/state.test.ts
git commit -m "fix(host): a run written before the schema bump can be read again"
```

---

### Task 10: The `?raw` guards become a tree walk (D6)

Today they ban one spelling across a hardcoded list of seven files, so they are blind to the non-`?raw` import already in the tree (`RouteReveal.tsx:22`, `RouteScrolly.tsx:22`), to the runtime `fetch(staticFile("geo/world.geojson"))` in eight files, and to any new file. The correct shape already exists in this repo: `lib/loop/schema-version-drift.test.ts` walks the tree, exempts by explicit class, and asserts the scan was non-empty.

**Files:**
- Create: `lib/geo/static-geojson-imports.test.ts`
- Delete the superseded assertions in `skills/map-native/tests/choropleth-map-imports.test.ts` and `skills/scrolly/tests/no-static-geojson-imports.test.ts`

- [ ] **Step 1: Write the test**, modelled line-for-line on `lib/loop/schema-version-drift.test.ts`: walk `lib/**` and `skills/**` excluding `node_modules`, match `/\.geojson(\?raw)?["']/` and `/staticFile\(["'][^"']*\.geojson/`, assert the scan saw more than 500 files, and compare the hits against an **explicit exemption list** naming each currently-allowed file with the reason (the video family, which this plan deliberately leaves reading the shipped asset — Task 7).

- [ ] **Step 2: Run it** and expect it to list the real hits. Move each into the exemption list **only** with a written reason. Anything without a reason is a defect to report, not to exempt.

- [ ] **Step 3: Delete the two superseded suites' geojson assertions** (keep any unrelated assertions in those files).

- [ ] **Step 4: Mutation-verify** — add a `?raw` geojson import to a scratch file under `skills/`, confirm the walk catches it, delete the scratch file.

- [ ] **Step 5: Commit**

```bash
git status --short
git add lib/geo/static-geojson-imports.test.ts skills/map-native/tests/choropleth-map-imports.test.ts skills/scrolly/tests/no-static-geojson-imports.test.ts
git commit -m "test(geo): the static-geometry guard walks the tree instead of naming seven files"
```

---

### Task 11: The prose that no longer matches the code (D8)

**Files:**
- Modify: `docs/splash/guardrails.md`, `skills/map-native/SKILL.md`, `skills/scrolly/SKILL.md`, `skills/splash/SKILL.md:667`, `skills/map-native/src/geo-match.ts`

- [ ] **Step 1: `docs/splash/guardrails.md` gains its three missing rows** — `assertGeoCreditPresent`, the unresolved-geo-join refusal (`lib/loop/produce.ts:186`), the missing-geometry guard. The page opens by promising every row was verified against its named file: verify each against the file, then write the row.
- [ ] **Step 2: `skills/map-native/SKILL.md:131`** — "three pieces of furniture" becomes four, and `geoCredit` is documented (it appears in no `.md` in the repo today).
- [ ] **Step 3: `skills/map-native/SKILL.md:328-333`** — remove `fr-departments` / `fr-regions` and the "just drop the GeoJSON into `assets/geo/`" recipe. They are sourced from Eurostat NUTS, which this project's own settled constraint disqualifies as MIT-incompatible. For a repo whose deliverable is an MIT release to newsrooms, the doc must not invite it.
- [ ] **Step 4: `skills/map-native/SKILL.md:206-207`** — keep the rule, replace the justification that is now false (the `?raw`-into-Remotion hazard is gone). A justification an orchestrator can verify as false is a rule it will "fix" away.
- [ ] **Step 5: `skills/scrolly/SKILL.md:141`** — stop listing `assets/geo/world.geojson` as reused; the suite now pins its absence and the directory holds only `sample-data`.
- [ ] **Step 6: `skills/splash/SKILL.md:667`** — the closed list of `initRun` refusals gains the four geography refusals, including the CRS coordinate-range one (`lib/loop/init.ts:248`), the most journalist-visible refusal the branch adds.
- [ ] **Step 7: `skills/map-native/src/geo-match.ts:127,162`** and `geo-match.test.ts:142` — correct the task attributions (`geoRefusal` is Task 12, not 13) and remove the "Task 13 refines this" pointer to a task that is now out of scope, replacing it with what is actually true about the field.
- [ ] **Step 8: Commit**

```bash
git status --short
git add docs/splash/guardrails.md skills/map-native/SKILL.md skills/scrolly/SKILL.md skills/splash/SKILL.md skills/map-native/src/geo-match.ts skills/map-native/src/geo-match.test.ts
git commit -m "docs(geo): the prose catches up with the code, and stops advertising data we cannot ship"
```

---

### Task 12: The join key stops being an identifier, and ids stop being compared stringly (I2, I3)

Written as a task rather than left as ledger prose, because ledger prose is how these disappear. Task 3 already replaced the interpolation in `subsetGeometry`; this task proves it and closes the numeric-id half.

**Files:**
- Modify: `lib/geo/subset.test.ts`

- [ ] **Step 1: Write the tests** — a source whose join-key field is `code insee` (a space in the name, which broke the old bare-identifier expression with a mapshaper `SyntaxError`), and a source whose ids are **numeric** in the file while `featureIds` are strings. Both must retain the right features.
- [ ] **Step 2: Run them.** Task 3's `String(this.properties[...])` should already satisfy both. If not, fix it here.
- [ ] **Step 3: Mutation-verify** — revert to the bare-identifier interpolation, confirm the space-in-name test reddens.
- [ ] **Step 4: Commit**

```bash
git status --short
git add lib/geo/subset.test.ts lib/geo/subset.ts
git commit -m "test(geo): a join key with a space, and a numeric id, both survive the subset"
```

---

### Task 13: The gate run the plan never had, and the measurement of what it cannot see

**Files:** none modified unless Steps 1-3 surface something to fix.

- [ ] **Step 1: Run the full gate, on a calm machine**

Confirm no other agent, test run or gate is running (`pgrep -fl "bun test"` must be empty). Run `bun run check` from the repo root. Paste the actual `<passed>/<total> checks passed.` line into the completion note. The only acceptable failure is the ambient `lib/brain/eligibility.test.ts` empty-reason check, which predates this branch (`git log -1 lib/brain/eligibility.test.ts` shows a pre-branch commit).

- [ ] **Step 2: Measure what the gate cannot see**

Run `bun run check` once with `VITE_MAPTILER_KEY` unset (record which suites print a skip message, and the total pass count), then again with `VITE_MAPTILER_KEY` and `REMOTION_MAPTILER_KEY` exported from the root `.env`. **Report the diff.** This is the measurement the original Task 21 briefed and never ran, and it is the only honest statement of how much of this branch a clean-checkout gate actually exercises. Write the numbers into `docs/splash/geography-final-review-2026-07-30.md` under a new "What the gate sees" section.

- [ ] **Step 3: Confirm no vendor mention and no stray geometry import**

```bash
git log main..HEAD --format='%s%n%b' | grep -in "claude\|anthropic\|co-authored" || echo "clean"
git diff main...HEAD | grep -in "claude\|anthropic" || echo "clean"
```
Expected: `clean` for both. The `?raw` sweep is Task 10's tree walk and needs no separate grep here.

- [ ] **Step 4: Commit the measurement**

```bash
git status --short
git add docs/splash/geography-final-review-2026-07-30.md
git commit -m "docs(review): what a keyless gate actually exercises on this branch, measured"
```

---

## After the plan

A **fresh whole-branch review** — not a per-task one — before the merge. That is the step this branch skipped, and it is what found all seven of these. Its brief should be the four lenses recorded in `docs/splash/geography-final-review-2026-07-30.md`, with the seven Criticals named as things to re-verify closed rather than as things to rediscover.

---

### Task 14: `us-states` — the shipped basemap that cannot be resolved at all

Found by this repair, missed by all four review lenses, and invisible to every existing test because
**every fixture in `assets/sample-data` uses `basemap: "world"`** — not one exercises the other shipped
basemap.

Controller-reproduced:

```
us-states.geojson  lon range −188.90 … −65.63   lat 17.93 … 71.35   no `crs` member
resolveGeometryForProduce({ basemap: "us-states" })
  → subsetGeometry: bunx mapshaper failed (exit 1):
    [simplify] Unable to convert meters to unknown coordinates
```

Alaska's Aleutians are encoded **past the antimeridian** (−188.9°) so the state stays contiguous
rather than being split across the map. mapshaper sees coordinates outside ±180, concludes the
dataset is not lat-long, and refuses a metre-denominated tolerance. This predates Task 3 —
`-simplify interval=<N>m` has been there since the original plan's Task 20 — so `us-states` has
been dead for the whole branch.

Note the internal contradiction this exposes, and record it in the report: `lib/geo/crs.ts`'s
`coordinateRangeVerdict` refuses coordinates outside ±180, so **the shipped asset violates the guard
this same branch introduced**. Do not "fix" the asset to satisfy the guard — wrapping the longitudes
would split Alaska in two, which is exactly what the −188.9 encoding exists to prevent. The guard's
scope (a journalist's *declared* file) and the shipped asset's encoding are simply different
concerns; say so where the guard is defined.

**Two candidates were probed by the controller before this task was written. Do not re-litigate them:**

```
A  bunx mapshaper us-states.geojson -simplify visvalingam interval=0.3 keep-shapes -o out.topojson
   → WROTE the file.  (0.3 is 33395 m / 111320 — the metre tolerance expressed in degrees)
B  bunx mapshaper us-states.geojson -proj wgs84 -simplify … interval=33395m
   → Error: [proj] Unable to project -- source coordinate system is unknown
```

So the fix is A: when the source is one mapshaper will not read as lat-long, express the tolerance in
**source units** instead of metres.

**Files:**
- Modify: `lib/geo/subset.ts`
- Modify: `lib/geo/subset.test.ts`
- Modify: `skills/map-native/tests/resolve-all-fixtures.test.ts` (or add a sibling) so a `us-states`
  config is exercised at all

**Interfaces:** no signature change. The unit decision is internal to `subsetGeometry`.

- [ ] **Step 1: Write the failing test**

Add a case that resolves a `us-states` choropleth (`rows` with `AK`, `CA`, `NY` on `regionKey: "code"`,
joining on `postal`) through `resolveGeometryForProduce`, asserting real geometry with zero null
shapes — the same shape as the existing world assertions.

**Also assert `properties.name` survives on that case.** This carries a finding routed here from
Task 6's review: the brief for Task 6 required verifying the property-pruning fix against **both**
shipped assets, and only `world.geojson` ended up with committed, reproducible coverage — the
`us-states` check existed as an uncommitted ad-hoc script that was deleted after use. That is the
same shape of gap Task 6 was created to close for the first asset ("no test caught this because both
fixtures joined on `name`"), reproduced on the second. It could not be closed inside Task 6 because
this asset does not resolve at all until Step 3 below lands. So it closes here, in the one test that
is about to make `us-states` resolvable — and `us-states`' real join key is `postal`, so the
assertion genuinely breaks the `joinKey: "name"` coincidence rather than passing by accident.

- [ ] **Step 2: Run it and watch it fail**

Run: `cd skills/map-native && bun test tests/resolve-all-fixtures.test.ts`
Expected: FAIL with `[simplify] Unable to convert meters to unknown coordinates`.

- [ ] **Step 3: Express the tolerance in the source's own units**

`subsetGeometry` already measures the bbox in pass 1 to derive the extent. Derive the tolerance
**in degrees directly from that same bbox** rather than converting metres back:

```ts
// Tolerance in the SOURCE's own units. mapshaper only accepts a metre-denominated interval for a
// dataset it can read as lat-long, and it refuses any file whose coordinates fall outside ±180 —
// which the shipped us-states asset does, deliberately: Alaska's Aleutians are encoded past the
// antimeridian (−188.9°) so the state stays contiguous instead of being split across the map.
// Deriving degrees from the bbox we already measured avoids the unit conversion entirely and is
// exactly equivalent: extentMetersFor is that same span scaled by metres-per-degree.
const spanDegrees = Math.max(bbox.maxLon - bbox.minLon, bbox.maxLat - bbox.minLat);
const toleranceDegrees = spanDegrees / input.renderWidthPx;
```

Pass `interval=${toleranceDegrees}` (no `m` suffix) to pass 2. Decide and **document in a comment**
whether this replaces the metre path everywhere or only for out-of-range sources; prefer replacing it
everywhere if the rendered results match, because one code path cannot drift against another.

- [ ] **Step 4: Run the test** — Expected: PASS, zero null shapes.

- [ ] **Step 5: Prove the world basemap did not regress**

Run the full `tests/resolve-all-fixtures.test.ts` (15 cases, all world) and confirm they still pass
with the same feature counts. If the counts move, the unit change altered simplification for the
world path too — report the before/after numbers rather than accepting them.

- [ ] **Step 6: Mutation-verify**

Revert to `interval=${toleranceMeters}m` and confirm the new `us-states` case reddens with the real
mapshaper error; restore; confirm green. Record both.

- [ ] **Step 7: Commit**

```bash
git status --short
git add lib/geo/subset.ts lib/geo/subset.test.ts skills/map-native/tests/resolve-all-fixtures.test.ts
git commit -m "fix(geo): us-states could not be simplified at all — express the tolerance in source units"
```

---

### Task 15: an admin-1 join colours the wrong country's territory

Found by Task 8 **while looking at a rendered map** — the exit condition that exists precisely because
this class of defect is invisible to tests. A 26-canton Swiss choropleth was produced, opened and
inspected; a Swiss row named `Jura` also coloured **France's Jura département**. Confirmed
programmatically afterwards and isolated with a 25-canton control render.

The mechanism: the admin-1 join matches on a bare `name`, with no country scoping. `natural-earth-admin-1`
is a world-wide admin-1 set, so any name shared across borders collides — `Jura` (CH/FR) is the case
that surfaced, and it will not be the only one.

Why nothing caught it: the subset's post-conditions ask whether every requested id came back, never
whether **more** came back than were asked for. A superset passes both.

**The fix is already reachable.** `GeographyRef` carries `scope?: string` — "the ISO-A3 country scope of
an admin-1 subset, absent for a global set" (`lib/geo/ref.ts:38-43`). `lib/geo/subset.ts` does not
mention `scope` at all (grep: zero hits). So the descriptor already knows the country; the filter simply
never asks.

**Files:**
- Modify: `lib/geo/subset.ts` (thread the scope into the filter expression)
- Modify: `lib/geo/resolve-for-produce.ts` (pass `geography.scope` through)
- Modify: `lib/geo/subset.test.ts`
- Verify: `skills/map-native/src/geo-match.ts` actually populates `scope` on an ADM1 match — **check this
  first**; if it does not, populating it is part of this task and the fix is worthless without it.

- [ ] **Step 1: Establish whether `scope` is populated**

Read `matchAdm1Index` (`skills/map-native/src/geo-match.ts:129-175`) and confirm whether the returned ref
sets `scope`. Report what you find before changing anything — the rest of this task depends on it.

- [ ] **Step 2: Write the failing test**

A subset request for a Swiss `Jura` against the ADM1 asset, scoped to `CHE`, must retain **exactly one**
feature. Assert the count *and* the identity — a count alone would pass on the wrong single feature.

- [ ] **Step 3: Run it and watch it fail** — expected: two features, or the French one.

- [ ] **Step 4: Add the scope to the filter, and a post-condition for the superset case**

Thread `scope` into `subsetGeometry` and add it to the mapshaper filter expression, addressed the same
bracketed way the join key is (`this.properties[…]`) so a country column with a space in its name cannot
break it. Then add the missing post-condition: **the retained count must not exceed the requested count**.
That guard is the general form of this defect — it catches every future name collision, not just this one.

- [ ] **Step 4b: A drift guard on the degrees path too** (routed here from Task 14's review)

Task 14 split the tolerance into two paths: metres for sources mapshaper reads as lat-long, degrees for
sources whose coordinates fall outside ±180. The metre path is defended by the Norway vertex floor
(`lib/geo/subset.test.ts`, baseline 1238, floor 800). **The degrees path is defended by nothing** — the
`us-states` case asserts only a feature count and zero null shapes, so short of total annihilation,
silent drift there fails no test. The +60% divergence that drove Task 14's narrow ruling was itself
measured by an ad-hoc script that was deleted, so that number is neither reproducible nor re-checked.

Add a vertex-count floor for the `us-states` case, in the same shape as the Norway one: measure the real
baseline, choose the floor with recorded headroom, and write both numbers and the reasoning into the
test's comment. While you are in that comment, add the line Task 12's review asked for and did not get —
that the Norway floor is tied to the shipped `world.geojson`'s exact geometry and must be re-measured if
that asset is regenerated. A maintainer reading the test alone currently cannot know that.

- [ ] **Step 5: Prove the world path is untouched**

`cd skills/map-native && bun test tests/resolve-all-fixtures.test.ts` — the world fixtures carry no
`scope`, so the filter must be byte-identical for them. Report the vertex floor's number alongside.

- [ ] **Step 6: Mutation-verify** — drop the scope from the filter, confirm the Jura test reddens; restore.

- [ ] **Step 7: Re-render the Swiss choropleth and look at it.** The French Jura must be gone. Report what
you saw, not that a test passed.

- [ ] **Step 8: Commit**

```bash
git status --short
git add lib/geo/subset.ts lib/geo/resolve-for-produce.ts lib/geo/subset.test.ts
git commit -m "fix(geo): an admin-1 join is scoped to its country, and a subset may no longer return more than it asked for"
```
