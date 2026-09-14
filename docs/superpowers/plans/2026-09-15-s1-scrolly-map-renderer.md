# S1 — Le rendu scrolly du plan de carte — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scrolly map is a live MapTiler map in globe projection whose camera and marks are driven by the reader's scroll through the map plan, with the choropleth scrolly rebuilt on it as the pilot.

**Architecture:** The trunk (`shared/map-beat/`) gains a pure module that turns authored cameras and state-bound paint into numbers `renderScrolly`'s own state interpolation can carry (`scrolly.mjs`), a browser runtime that mounts the plan in a live map and applies a state per frame (`scrolly-live.mjs`), an inliner that ships the runtime into a self-contained page (`inline.mjs`), and a per-card fallback bake. `renderScrolly` gains a `vendor` option to inline MapLibre. The pilot beat declares a plan (MapTiler Countries fills joined by ISO code, symbol layers for words, per-card cameras) and keeps only the out-of-map furniture in React.

**Tech Stack:** Bun, bun:test, maplibre-gl 5.x (globe), MapTiler Cloud (style `dataviz`, tileset Countries), puppeteer-core for heavy/live lanes, React SSR through `skills/scrolly/scripts/render-scrolly.mjs`.

**Spec:** `docs/splash/2026-09-12-maps-through-maptiler-spec.md` and its addendum `docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md` (§2, §3, §7.1). Read both before any task.

## Global Constraints

- Runtime Bun only: `bun`, `bun test`, `bunx` — never `npm`, `node`, `npx`.
- No mention of Claude or Anthropic anywhere (code, comments, commits, docs); no `Co-Authored-By`, no session trailer. After each commit run `git log -1 --format=%B | grep -ci "claude\|anthropic"` and expect `0`.
- `git add` and `git commit` always with an explicit pathspec; never `-A`, never a bare commit.
- No MapTiler key in any committed file. Committed pages carry `__MAPTILER_KEY__` (assemble the literal as `"__MAPTILER" + "_KEY__"` inside files that the delivery substitution rewrites). Keys are read from the environment with `mapTilerKeyIn(process.env)` (`shared/map-beat/glyphs.mjs`); the worktree `.env` (git-ignored) carries `REMOTION_MAPTILER_KEY`.
- `shared/` never imports from `skills/` or `proof/` (`skills/map-beat/test/the-trunk-stands-alone.test.ts`).
- Before the first modification of any file under `shared/map-beat/` or of `package.json`, the other running sessions are told what will change (Task 0).
- Code, comments, test names, commit messages in English; conversation with the owner in French.
- Tests: targeted files only (`bun test <path>`); a new test that launches a browser or MapLibre carries `// LANE: heavy` in its first five lines or is named `*.live.test.ts` when it needs a key or network. Run `bun run test:lanes` after adding test files.
- Owner rules for scrolly maps: the scroll owns time (no `flyTo`, no MapLibre transitions); `interactive: false`, no controls; a close-up camera centres its subject on both axes (no `padding`); every country present; projection `globe`.
- The pilot's choreography is the one the owner validated for `proof/scrolly-choropleth-europe-lowcarbon` (six cards: classes arrive; the floor filters to seven; the six of the north-west named; the camera travels onto Albania with its neighbours; the whole map again with Ukraine named). Its sentences and assertions stay as they are in its `render-directions-scrolly.mjs`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `shared/map-beat/scrolly.mjs` (create) | Pure: Web Mercator ⇄ lon/lat, a card camera → state fields, state → view, state-token substitution in paint values, scrolly plan validation |
| `shared/map-beat/mount.mjs` (modify) | Accept vector sources (`layer.source`, `layer.sourceLayer`) beside GeoJSON `layer.data` |
| `shared/map-beat/scrolly-live.mjs` (create) | Browser runtime: boot the live map (globe, no interaction), register embedded glyphs, sweep the style, mount the plan, warm every camera, apply a state per frame |
| `shared/map-beat/inline.mjs` (create) | Node: concatenate the runtime and the trunk modules it needs into one inlinable script |
| `shared/map-beat/bake.mjs` (modify) | `bakeCards`: one fallback PNG per card camera |
| `skills/scrolly/scripts/render-scrolly.mjs` (modify) | `vendor` option: inline MapLibre's JS and CSS in the page head |
| `skills/scrolly/scripts/verify-live-map-scrolly.mjs` (create) | Live guards: no missing tile after the warm during fast scrubs; no point of the canvas left undrawn at any card camera |
| `skills/map-beat/test/scrolly-camera.test.ts`, `scrolly-bindings.test.ts`, `plan-vector-source.test.ts`, `scrolly-inline.test.ts` (create) | Fast-lane tests of the pure modules |
| `skills/map-beat/test/scrolly-live.test.ts` (create, heavy) | Offline browser test of the runtime on a local style |
| `skills/scrolly/test/render-scrolly.test.ts` (modify) | The `vendor` option |
| `proof/scrolly-choropleth-europe-lowcarbon/*` (rewrite) | The pilot on the plan |
| `docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md` (modify) | The measurements S1 owes (§7.1 globe, §3.2 Countries) |

---

### Task 0: Tell the other sessions

**Files:** none.

- [ ] **Step 1: List the running sessions**

Use the `ListAgents` tool. Note every session whose name or working directory is a splash worktree other than `scrolly`.

- [ ] **Step 2: Send each one the notice**

With `SendMessage`, to each of them:

```
Heads-up from the scrolly worktree (branch quality/scrolly): S1 of the scrolly-maps addendum starts now.
It will change: package.json (maplibre-gl 4.7.1 → 5.x, for the globe projection), shared/map-beat/mount.mjs
(vector sources beside GeoJSON), shared/map-beat/bake.mjs (new bakeCards), and add shared/map-beat/scrolly.mjs,
scrolly-live.mjs, inline.mjs. Existing exports keep their signatures. Spec:
docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md. Tell me if you are editing any of these files.
```

- [ ] **Step 3: Wait for answers or ten minutes, whichever first.** If a session reports a conflicting edit, stop and report to the owner.

---

### Task 1: The globe spike (outside the repository)

Proves, before the dependency moves, that MapLibre 5 in globe renders the MapTiler style headless and what area error remains. Nothing here is committed except the numbers.

**Files:**
- Create (scratchpad, not committed): `$SCRATCH/globe-spike/package.json`, `$SCRATCH/globe-spike/spike.mjs`
- Modify: `docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md` (§7.1)

`$SCRATCH` is the session scratchpad directory.

- [ ] **Step 1: Install MapLibre 5 and puppeteer in the scratch directory**

```bash
mkdir -p "$SCRATCH/globe-spike" && cd "$SCRATCH/globe-spike" && bun init -y >/dev/null && bun add maplibre-gl@5 puppeteer-core@24.43.1
bun -e 'console.log(require("maplibre-gl/package.json").version)'
```
Expected: a version starting with `5.`.

- [ ] **Step 2: Write the spike**

`$SCRATCH/globe-spike/spike.mjs`:

```js
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const key = process.env.MAPTILER_KEY || process.env.REMOTION_MAPTILER_KEY || process.env.VITE_MAPTILER_KEY;
if (!key) throw new Error("no MapTiler key in the environment");
const js = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const css = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({ executablePath: chrome, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.setContent(`<style>${css} html,body,#map{margin:0;height:100%}</style><div id="map"></div><script>${js}</script>`);
const out = await page.evaluate(async (key) => {
  const map = new maplibregl.Map({
    container: "map",
    style: `https://api.maptiler.com/maps/dataviz/style.json?key=${key}`,
    center: [15, 55], zoom: 2.6, interactive: false, attributionControl: false, fadeDuration: 0,
  });
  await new Promise((r) => map.once("style.load", r));
  map.setProjection({ type: "globe" });
  await new Promise((r) => (map.loaded() ? r() : map.once("idle", r)));
  // Screen area of a 1°×1° cell at 45°N and 70°N, centre of the view and its northern edge.
  const cell = (lon, lat) => {
    const a = map.project([lon, lat]), b = map.project([lon + 1, lat]), c = map.project([lon, lat + 1]);
    return Math.abs((b.x - a.x) * (c.y - a.y));
  };
  const ratio = (lat) => cell(15, lat) / (Math.cos((lat * Math.PI) / 180) * cell(15, 45) / Math.cos(Math.PI / 4));
  return { projection: map.getProjection()?.type, at70: ratio(70), at35: ratio(35), zoom: map.getZoom() };
}, key);
await page.screenshot({ path: "globe.png" });
console.log(JSON.stringify(out));
await browser.close();
```

- [ ] **Step 3: Run it**

```bash
cd "$SCRATCH/globe-spike" && set -a && . /Users/rmdms/Sites/Professional/splash/scrolly/.env && set +a && bun spike.mjs
```
Expected: JSON with `"projection":"globe"` and two ratios; `globe.png` shows Europe on a globe with tiles. Read the PNG. A ratio of 1 means a cell's screen area is its true area relative to 45°N; Mercator at 70°N gives ≈ 2.9.

- [ ] **Step 4: Gate.** If `projection` is not `globe`, or the screenshot is blank, stop here and report the output to the owner: the addendum's §7.1 decision cannot be implemented as written.

- [ ] **Step 5: Record the numbers in the addendum**

In `docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md`, replace the sentence starting `*À vérifier dans S1 :` inside §7.1 with:

```markdown
   *Mesuré le <date> (MapLibre <version>, style `dataviz`, 1280 × 800, centre 15° E 55° N, zoom <zoom>) : une cellule
   d'un degré vaut <at70> fois sa surface vraie à 70° N et <at35> fois à 35° N, rapportée à 45° N (Mercator : ≈ 2,9 à
   70° N). Rendu sans navigateur visible : oui.*
```
with the measured values, French decimal commas.

- [ ] **Step 6: Commit**

```bash
git add -- docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md
git commit -m "docs(splash): the globe projection measured before the dependency moves" -- docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md
git log -1 --format=%B | grep -ci "claude\|anthropic"
```
Expected last line: `0`.

---

### Task 2: MapLibre 5 in the repository

**Files:**
- Modify: `package.json` (`"maplibre-gl": "4.7.1"`), `bun.lock`

- [ ] **Step 1: Record the map tests that pass today**

```bash
bun test skills/map-beat/test/plan-contract.test.ts skills/map-beat/test/plan-style.test.ts skills/map-beat/test/plan-expressions.test.ts skills/map-beat/test/plan-geometry.test.ts skills/map-beat/test/plan-tints.test.ts skills/map-beat/test/plan-ranges.test.ts skills/map-beat/test/the-trunk-stands-alone.test.ts skills/map-web/test/live-map.test.ts 2>&1 | tail -5
```
Write the pass/fail counts down.

- [ ] **Step 2: Upgrade, pinned to the version Task 1 measured**

```bash
bun add maplibre-gl@<version from Task 1>
grep '"maplibre-gl"' package.json
```
Expected: the pinned 5.x version, no caret.

- [ ] **Step 3: Re-run the same tests**

Same command as Step 1. Expected: the same counts. A new failure is a v5 break: read the MapLibre 5 changelog entry for the failing API (`bun -e 'console.log(require("maplibre-gl/package.json").version)'`, then the `CHANGELOG.md` inside `node_modules/maplibre-gl`), fix the trunk call site, re-run. After two failed attempts, stop and report the exact error.

- [ ] **Step 4: Commit**

```bash
git add -- package.json bun.lock
git commit -m "chore(deps): maplibre-gl 5 for the globe projection the scrolly maps take" -- package.json bun.lock
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

### Task 3: Cameras and bindings as numbers the scroll can carry

`renderScrolly` interpolates every numeric field of a state linearly between cards. A camera stored as Web Mercator `x`, `y` (0..1) and `zoom` interpolates correctly that way; a paint value carries `{"$state": "field"}` tokens that are replaced by that field's current number.

**Files:**
- Create: `shared/map-beat/scrolly.mjs`
- Test: `skills/map-beat/test/scrolly-camera.test.ts`, `skills/map-beat/test/scrolly-bindings.test.ts`

**Interfaces:**
- Produces:
  - `mercatorOf([lon, lat]) → [x, y]` with `x, y ∈ [0, 1]`
  - `lonLatOf([x, y]) → [lon, lat]`
  - `cameraFields({ center: [lon, lat], zoom, bearing = 0, pitch = 0 }) → { camX, camY, camZoom, camBearing, camPitch }`
  - `viewOf(state) → { center: [lon, lat], zoom, bearing, pitch }`
  - `bindState(value, state) → value` (deep copy, tokens replaced)
  - `stateFieldsIn(value) → string[]`
  - `validateScrollyPlan(plan, states) → string[]` where `plan.layers[i].bindings` is `{ [paintProperty]: value }`

- [ ] **Step 1: Write the failing camera test**

`skills/map-beat/test/scrolly-camera.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { cameraFields, lonLatOf, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";

describe("scrolly cameras as numbers", () => {
  it("should map the null island to the centre of the Mercator square", () => {
    expect(mercatorOf([0, 0])).toEqual([0.5, 0.5]);
  });

  it("should return the place it was given after a round trip", () => {
    const [lon, lat] = lonLatOf(mercatorOf([19.8, 41.3]));
    expect(lon).toBeCloseTo(19.8, 9);
    expect(lat).toBeCloseTo(41.3, 9);
  });

  it("should put the midpoint of two cards on the Mercator midpoint, not the latitude midpoint", () => {
    const a = cameraFields({ center: [10, 40], zoom: 3 });
    const b = cameraFields({ center: [10, 70], zoom: 5 });
    const mid = viewOf({ camX: (a.camX + b.camX) / 2, camY: (a.camY + b.camY) / 2, camZoom: 4, camBearing: 0, camPitch: 0 });
    const expectedY = (mercatorOf([10, 40])[1] + mercatorOf([10, 70])[1]) / 2;
    expect(mercatorOf(mid.center)[1]).toBeCloseTo(expectedY, 9);
    expect(mid.center[1]).not.toBeCloseTo(55, 1);
    expect(mid.zoom).toBe(4);
  });

  it("should refuse a latitude beyond the Mercator limit", () => {
    expect(() => mercatorOf([0, 89])).toThrow(/85\.05/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `bun test skills/map-beat/test/scrolly-camera.test.ts`
Expected: FAIL, `Cannot find module '#shared/map-beat/scrolly.mjs'`.

- [ ] **Step 3: Write the camera half of the module**

`shared/map-beat/scrolly.mjs`:

```js
// twin/shared/map-beat/scrolly.mjs
//
// A SCROLLY MAP IS DRIVEN BY NUMBERS. `renderScrolly` interpolates every numeric field of a state
// linearly between two cards, and that is exactly right for a camera stored in Web Mercator units —
// the plane MapLibre itself moves in — and wrong for one stored in degrees, which would put the
// midpoint between 40°N and 70°N at 55°N instead of where the map's own plane puts it. So a card's
// camera is written as `camX`, `camY` (0..1), `camZoom`, `camBearing`, `camPitch`, and read back here.
//
// Paint is driven the same way: a plan layer's `bindings` are paint values carrying `{"$state": field}`
// tokens, replaced by the field's current number on each frame. The scroll owns time; MapLibre never
// animates anything itself.

const MAX_LAT = 85.0511287798;

export function mercatorOf([lon, lat]) {
  if (!(Math.abs(lat) <= MAX_LAT))
    throw new Error(`latitude ${lat} is beyond the Web Mercator limit of ±85.05° — no camera can centre on it`);
  const x = (lon + 180) / 360;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
  return [x, y];
}

export function lonLatOf([x, y]) {
  const lon = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return [lon, lat];
}

export function cameraFields({ center, zoom, bearing = 0, pitch = 0 }) {
  const [camX, camY] = mercatorOf(center);
  return { camX, camY, camZoom: zoom, camBearing: bearing, camPitch: pitch };
}

export function viewOf(state) {
  return {
    center: lonLatOf([state.camX, state.camY]),
    zoom: state.camZoom,
    bearing: state.camBearing ?? 0,
    pitch: state.camPitch ?? 0,
  };
}
```

- [ ] **Step 4: Run the camera test**

Run: `bun test skills/map-beat/test/scrolly-camera.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing bindings test**

`skills/map-beat/test/scrolly-bindings.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { bindState, stateFieldsIn, validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";

const reveal = ["interpolate", ["linear"], { $state: "classes" }, 0, 0, 1, 1];

describe("scrolly paint bindings", () => {
  it("should replace a state token with the field's current number", () => {
    expect(bindState(reveal, { classes: 0.25 })).toEqual(["interpolate", ["linear"], 0.25, 0, 0, 1, 1]);
  });

  it("should leave the value it was given untouched", () => {
    bindState(reveal, { classes: 0.25 });
    expect(reveal[2]).toEqual({ $state: "classes" });
  });

  it("should list every state field a value reads", () => {
    expect(stateFieldsIn(["*", { $state: "a" }, ["+", { $state: "b" }, 1]]).sort()).toEqual(["a", "b"]);
  });

  it("should refuse a token whose field no state carries", () => {
    const plan = { layers: [{ id: "fills", bindings: { "fill-opacity": { $state: "fade" } } }] };
    expect(validateScrollyPlan(plan, [{ camX: 0.5, camY: 0.5, camZoom: 3, classes: 1 }])).toEqual([
      'layer "fills": "fill-opacity" reads state field "fade", which card 1 does not carry',
    ]);
  });

  it("should refuse a card with no camera", () => {
    expect(validateScrollyPlan({ layers: [] }, [{ classes: 1 }])).toEqual([
      "card 1 carries no camera (camX, camY, camZoom) — the map would stay where the previous card left it",
    ]);
  });

  it("should throw when a token names a field the state does not carry", () => {
    expect(() => bindState({ $state: "gone" }, {})).toThrow(/gone/);
  });
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `bun test skills/map-beat/test/scrolly-bindings.test.ts`
Expected: FAIL, `bindState` is not exported.

- [ ] **Step 7: Append the bindings half**

Append to `shared/map-beat/scrolly.mjs`:

```js
const isToken = (v) => v !== null && typeof v === "object" && !Array.isArray(v) && typeof v.$state === "string";

export function bindState(value, state) {
  if (isToken(value)) {
    const n = state[value.$state];
    if (typeof n !== "number" || !Number.isFinite(n))
      throw new Error(`a paint binding reads state field "${value.$state}" and the state carries ${JSON.stringify(n)}`);
    return n;
  }
  if (Array.isArray(value)) return value.map((v) => bindState(v, state));
  if (value !== null && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bindState(v, state)]));
  return value;
}

export function stateFieldsIn(value, out = new Set()) {
  if (isToken(value)) out.add(value.$state);
  else if (Array.isArray(value)) for (const v of value) stateFieldsIn(v, out);
  else if (value !== null && typeof value === "object") for (const v of Object.values(value)) stateFieldsIn(v, out);
  return [...out];
}

export function validateScrollyPlan(plan, states) {
  const out = [];
  states.forEach((state, i) => {
    if (![state.camX, state.camY, state.camZoom].every((v) => typeof v === "number" && Number.isFinite(v)))
      out.push(`card ${i + 1} carries no camera (camX, camY, camZoom) — the map would stay where the previous card left it`);
  });
  for (const layer of plan.layers ?? [])
    for (const [property, value] of Object.entries(layer.bindings ?? {}))
      for (const field of stateFieldsIn(value))
        states.forEach((state, i) => {
          if (!(field in state))
            out.push(`layer "${layer.id}": "${property}" reads state field "${field}", which card ${i + 1} does not carry`);
        });
  return out;
}
```

- [ ] **Step 8: Run both tests and the trunk isolation test**

Run: `bun test skills/map-beat/test/scrolly-camera.test.ts skills/map-beat/test/scrolly-bindings.test.ts skills/map-beat/test/the-trunk-stands-alone.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -- shared/map-beat/scrolly.mjs skills/map-beat/test/scrolly-camera.test.ts skills/map-beat/test/scrolly-bindings.test.ts
git commit -m "feat(map-beat): a scrolly camera and its paint as numbers the scroll interpolates" -- shared/map-beat/scrolly.mjs skills/map-beat/test/scrolly-camera.test.ts skills/map-beat/test/scrolly-bindings.test.ts
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

### Task 4: Vector sources in the plan

A choropleth's fills come from the same tiles as the basemap (addendum §3.2), so a layer can name a vector source instead of carrying GeoJSON.

**Files:**
- Modify: `shared/map-beat/mount.mjs` (`mountPlan`)
- Test: `skills/map-beat/test/plan-vector-source.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: a plan layer may carry `source: { type: "vector", url: string }` and `sourceLayer: string` instead of `data`; `mountPlan(map, plan)` keeps its signature. Layers that share a `source.url` share one MapLibre source whose id is `sourceIdOf(layer)`.
- Produces: `sourceIdOf(layer) → string` exported from `mount.mjs`.

- [ ] **Step 1: Write the failing test**

`skills/map-beat/test/plan-vector-source.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { mountPlan, sourceIdOf } from "#shared/map-beat/mount.mjs";

function fakeMap() {
  const sources = new Map<string, unknown>();
  const layers: Array<Record<string, unknown>> = [];
  return {
    sources,
    layers,
    getSource: (id: string) => sources.get(id),
    addSource: (id: string, spec: unknown) => sources.set(id, spec),
    addLayer: (spec: Record<string, unknown>) => layers.push(spec),
    getZoom: () => 3,
  };
}

const countries = { type: "vector", url: "https://api.maptiler.com/tiles/countries/tiles.json?key=__MAPTILER" + "_KEY__" };

describe("vector sources in a map plan", () => {
  it("should add one source for two layers reading the same tiles", () => {
    const map = fakeMap();
    mountPlan(map, {
      degreesPerPixel: 1,
      layers: [
        { id: "fills", type: "fill", source: countries, sourceLayer: "administrative", paint: {} },
        { id: "edges", type: "line", source: countries, sourceLayer: "administrative", paint: {} },
      ],
    });
    expect(map.sources.size).toBe(1);
    expect(map.layers.map((l) => l.source)).toEqual([sourceIdOf({ source: countries }), sourceIdOf({ source: countries })]);
    expect(map.layers[0]["source-layer"]).toBe("administrative");
  });

  it("should keep a GeoJSON layer on a source of its own id", () => {
    const map = fakeMap();
    mountPlan(map, { degreesPerPixel: 1, layers: [{ id: "seats", type: "symbol", data: { type: "FeatureCollection", features: [] } }] });
    expect(map.layers[0].source).toBe("seats");
    expect(map.layers[0]["source-layer"]).toBeUndefined();
  });

  it("should refuse a vector layer with no source layer", () => {
    expect(() => mountPlan(fakeMap(), { degreesPerPixel: 1, layers: [{ id: "fills", type: "fill", source: countries }] })).toThrow(
      /source layer/,
    );
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `bun test skills/map-beat/test/plan-vector-source.test.ts`
Expected: FAIL, `sourceIdOf` is not exported.

- [ ] **Step 3: Implement**

In `shared/map-beat/mount.mjs`, replace the whole `mountPlan` function with:

```js
/** One MapLibre source per distinct vector URL, so two layers reading the same tiles fetch them once;
 *  a GeoJSON layer keeps a source named after itself, as before. */
export function sourceIdOf(layer) {
  if (layer.source && layer.source.url) return `src:${layer.source.url.replace(/[?#].*$/, "")}`;
  return layer.id;
}

/** Run inside the page. Sources first, then layers in plan order — a leader drawn over its own word
 *  is a scratch.
 *
 *  A layer that declares a `radius` strategy gets its `circle-radius` from `radiusPaintOf` rather
 *  than from its own paint. Adding a circle layer with NO radius at all would draw MapLibre's own
 *  default 5px for one frame, which is a visible flash of the wrong circle — so the strategy is
 *  applied at mount, and a camera-scaled layer is re-derived once the camera has actually fitted.
 *
 *  A layer that reads a VECTOR source must name its source layer: without one MapLibre adds a layer
 *  that matches no feature and draws nothing, silently — the empty-layer shape again. */
export function mountPlan(map, plan) {
  for (const layer of plan.layers) {
    const id = sourceIdOf(layer);
    if (map.getSource(id)) continue;
    if (layer.source) {
      if (!layer.sourceLayer)
        throw new Error(`layer "${layer.id}" reads a vector source and names no source layer — it would draw nothing`);
      map.addSource(id, { type: layer.source.type, url: layer.source.url });
    } else map.addSource(id, { type: "geojson", data: layer.data });
  }
  for (const layer of plan.layers) {
    const paint = { ...(layer.paint || {}) };
    if (layer.radius) paint["circle-radius"] = radiusPaintOf(layer, plan, cameraScale(plan, map));
    map.addLayer({
      id: layer.id,
      type: layer.type,
      source: sourceIdOf(layer),
      ...(layer.sourceLayer ? { "source-layer": layer.sourceLayer } : {}),
      ...(layer.filter ? { filter: layer.filter } : {}),
      ...(layer.minzoom === undefined ? {} : { minzoom: layer.minzoom }),
      ...(layer.maxzoom === undefined ? {} : { maxzoom: layer.maxzoom }),
      ...(layer.layout ? { layout: layer.layout } : {}),
      ...(Object.keys(paint).length ? { paint } : {}),
    });
  }
}
```

- [ ] **Step 4: Run the new test and the existing mount/expression tests**

Run: `bun test skills/map-beat/test/plan-vector-source.test.ts skills/map-beat/test/plan-expressions.test.ts skills/map-web/test/live-map.test.ts`
Expected: PASS. `skills/map-web/assets/mount.mjs` is a byte copy held by a test: if `the-trunk-stands-alone.test.ts` or `canon.test.ts` reports the copy out of step, copy `shared/map-beat/mount.mjs` over `skills/map-web/assets/mount.mjs` and re-run.

- [ ] **Step 5: Commit**

```bash
git add -- shared/map-beat/mount.mjs skills/map-beat/test/plan-vector-source.test.ts skills/map-web/assets/mount.mjs
git commit -m "feat(map-beat): a plan layer can read the basemap's own vector tiles, and names its source layer" -- shared/map-beat/mount.mjs skills/map-beat/test/plan-vector-source.test.ts skills/map-web/assets/mount.mjs
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

### Task 5: The live runtime

**Files:**
- Create: `shared/map-beat/scrolly-live.mjs`
- Create: `shared/map-beat/inline.mjs`
- Test: `skills/map-beat/test/scrolly-inline.test.ts` (fast), `skills/map-beat/test/scrolly-live.test.ts` (heavy)

**Interfaces:**
- Consumes: `viewOf`, `bindState` (Task 3); `mountPlan` (Task 4); `applyLiveStyle`, `assertLiveStyleAnswered` (`shared/map-beat/style.mjs`).
- Produces (browser globals once inlined):
  - `initScrollyMap(root, plan, options) → handle | null` — `plan` is `{ styleUrl, layers, cameras: state[], referenceWidth?: number, warmSamples: number, tints, keepLabels?: string[], glyphs?: { [stack]: { [range]: base64 } }, projection: "globe" }`; cameras are authored for `referenceWidth` and shifted by `log2(stageWidth / referenceWidth)` zoom levels; `options` is `{ window, onReady?, warmTimeoutMs? }`. Returns null when the key placeholder is still in `styleUrl`, when `maplibregl` is absent, or when `[data-part="live"]` is missing.
  - `applyScrollyMap(handle, state)` — `jumpTo(viewOf(state))`, then `setPaintProperty` for every binding, then publishes `root.dataset.liveView`.
- Produces (node): `scrollyMapScript() → Promise<string>` from `inline.mjs`.

- [ ] **Step 1: Write the failing inline test**

`skills/map-beat/test/scrolly-inline.test.ts`:

```ts
import { describe, expect, it } from "bun:test";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";

describe("the scrolly map runtime, inlined", () => {
  it("should define the runtime's two entry points in one script with no module syntax", async () => {
    const script = await scrollyMapScript();
    expect(script).not.toMatch(/^\s*(import|export)\s/m);
    const scope = new Function(`${script}; return { initScrollyMap, applyScrollyMap, viewOf, bindState, mountPlan };`)();
    expect(typeof scope.initScrollyMap).toBe("function");
    expect(typeof scope.applyScrollyMap).toBe("function");
    expect(scope.viewOf({ camX: 0.5, camY: 0.5, camZoom: 2 }).center).toEqual([0, 0]);
  });

  it("should never carry a real key, only the placeholder the delivery substitutes", async () => {
    const script = await scrollyMapScript();
    expect(script).not.toMatch(/key=[A-Za-z0-9]{16,}/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `bun test skills/map-beat/test/scrolly-inline.test.ts`
Expected: FAIL, `Cannot find module '#shared/map-beat/inline.mjs'`.

- [ ] **Step 3: Write the runtime**

`shared/map-beat/scrolly-live.mjs`:

```js
// twin/shared/map-beat/scrolly-live.mjs
//
// THE LIVE MAP UNDER A SCROLLY, DRIVEN BY THE PLAN. Inlined into the page by `inline.mjs` together
// with the trunk modules it calls (`scrolly.mjs`, `mount.mjs`, `style.mjs`), so it imports nothing:
// every name it uses is defined in the same script.
//
// Rulings it carries: the scroll pilots and nothing else does (`interactive: false`, no controls);
// MapLibre animates nothing (`fadeDuration: 0`, `jumpTo`, paint set per frame); the projection is the
// owner's globe; every card camera and the samples between them are warmed through MapLibre's own
// tile cache before the live layer is revealed; the per-card fallback images stay underneath.

const KEY_PLACEHOLDER = "__MAPTILER" + "_KEY__";

function warmScrollyCameras(map, cameras, samples, win, timeoutMs, zoomOffset) {
  const views = [];
  const shifted = function (view) {
    view.zoom += zoomOffset || 0;
    return view;
  };
  for (let i = 0; i < cameras.length; i++) {
    views.push(shifted(viewOf(cameras[i])));
    if (i + 1 < cameras.length)
      for (let s = 1; s <= samples; s++) {
        const t = s / (samples + 1);
        const mix = {};
        for (const k of ["camX", "camY", "camZoom", "camBearing", "camPitch"])
          mix[k] = (cameras[i][k] ?? 0) + ((cameras[i + 1][k] ?? 0) - (cameras[i][k] ?? 0)) * t;
        views.push(shifted(viewOf(mix)));
      }
  }
  let i = 0;
  const started = win.performance.now();
  return new Promise(function (resolve) {
    function next() {
      if (i >= views.length) return resolve({ warmed: views.length, ms: win.performance.now() - started });
      const view = views[i++];
      let done = false;
      const finish = function () {
        if (done) return;
        done = true;
        map.off("idle", finish);
        next();
      };
      map.once("idle", finish);
      map.jumpTo(view);
      win.setTimeout(finish, timeoutMs);
    }
    next();
  });
}

function registerEmbeddedGlyphs(maplibregl, glyphs) {
  if (!glyphs) return null;
  maplibregl.addProtocol("splash-glyphs", async function (params) {
    const match = /^splash-glyphs:\/\/([^/]+)\/(\d+-\d+)\.pbf$/.exec(params.url);
    const stack = match && glyphs[decodeURIComponent(match[1])];
    const b64 = stack && stack[match[2]];
    if (!b64) throw new Error(`no embedded glyphs for ${params.url}`);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    return { data: bytes.buffer };
  });
  return "splash-glyphs://{fontstack}/{range}.pbf";
}

function initScrollyMap(root, plan, options) {
  const win = (options && options.window) || root.ownerDocument.defaultView;
  if (!plan || !plan.styleUrl || plan.styleUrl.indexOf(KEY_PLACEHOLDER) >= 0) return null;
  if (!win.maplibregl) return null;
  const container = root.querySelector('[data-part="live"]');
  if (!container) return null;

  const glyphsUrl = registerEmbeddedGlyphs(win.maplibregl, plan.glyphs);
  const map = new win.maplibregl.Map({
    container: container,
    style: plan.styleUrl,
    ...viewOf(plan.cameras[0]),
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    maxTileCacheSize: 800,
  });
  // Cameras are authored for `plan.referenceWidth`; a narrower stage sees the same ground one
  // log2(width ratio) zoom level further out, so a phone keeps the card's whole subject in view.
  const handle = { map: map, plan: plan, root: root, ready: false, pending: null };
  handle.zoomOffset = function () {
    return plan.referenceWidth ? Math.log2(container.clientWidth / plan.referenceWidth) : 0;
  };

  map.once("style.load", function () {
    if (plan.projection) map.setProjection({ type: plan.projection });
    if (glyphsUrl) map.setGlyphs(glyphsUrl);
    assertLiveStyleAnswered(applyLiveStyle(map, { tints: plan.tints, keepLabels: (plan.keepLabels || []).map((s) => new RegExp(s, "i")) }), plan.styleName || plan.styleUrl);
    mountPlan(map, plan);
  });

  map.once("load", function () {
    const samples = plan.warmSamples === undefined ? 3 : plan.warmSamples;
    warmScrollyCameras(map, plan.cameras, samples, win, (options && options.warmTimeoutMs) || 4000, handle.zoomOffset()).then(function (warm) {
      root.dataset.liveWarm = warm.warmed + ":" + Math.round(warm.ms);
      container.style.opacity = "1";
      handle.ready = true;
      if (handle.pending) applyScrollyMap(handle, handle.pending);
      if (options && options.onReady) options.onReady(map);
    });
  });

  map.on("error", function (event) {
    root.dataset.liveError = (event && event.error && event.error.message) || "map error";
  });
  return handle;
}

function applyScrollyMap(handle, state) {
  if (!handle) return;
  if (!handle.ready) {
    handle.pending = state;
    return;
  }
  const view = viewOf(state);
  view.zoom += handle.zoomOffset();
  handle.map.jumpTo(view);
  for (const layer of handle.plan.layers)
    for (const property in layer.bindings || {})
      handle.map.setPaintProperty(layer.id, property, bindState(layer.bindings[property], state), { validate: false });
  handle.root.dataset.liveView = view.center[0].toFixed(4) + "," + view.center[1].toFixed(4) + "@" + view.zoom.toFixed(3);
}
```

`map.setGlyphs` exists in MapLibre 5 (`Map#setGlyphs`); if Task 2's version lacks it, set `glyphs` on the style document before construction instead: fetch `plan.styleUrl`, set `doc.glyphs = glyphsUrl`, pass the object as `style`.

- [ ] **Step 4: Write the inliner**

`shared/map-beat/inline.mjs`:

```js
// twin/shared/map-beat/inline.mjs
//
// ONE SCRIPT FOR A SELF-CONTAINED PAGE. The runtime and the trunk modules it calls are read as text,
// their `import` lines dropped and their `export` keywords stripped, and concatenated in dependency
// order — the same inlining `renderScrolly` does for a beat's driver, applied to the map trunk.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ORDER = ["scrolly.mjs", "mount.mjs", "style.mjs", "scrolly-live.mjs"];

export async function scrollyMapScript() {
  const parts = [];
  for (const file of ORDER) {
    const text = await readFile(join(HERE, file), "utf8");
    parts.push(
      `// ── ${file} ──\n` +
        text
          .split("\n")
          .filter((line) => !/^\s*import\s/.test(line))
          .join("\n")
          .replace(/^export\s+/gm, ""),
    );
  }
  const script = parts.join("\n");
  if (/<\/script/i.test(script)) throw new Error("the map runtime contains a closing script tag and cannot be inlined");
  return script;
}
```

- [ ] **Step 5: Run the inline test**

Run: `bun test skills/map-beat/test/scrolly-inline.test.ts skills/map-beat/test/the-trunk-stands-alone.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the heavy offline runtime test**

`skills/map-beat/test/scrolly-live.test.ts` — a local style with a GeoJSON background, no network, no key; the placeholder check is bypassed by a style URL that carries no placeholder (a `data:` URL):

```ts
// LANE: heavy
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";
import { cameraFields } from "#shared/map-beat/scrolly.mjs";

const require = createRequire(import.meta.url);
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const style = {
  version: 8,
  sources: { land: { type: "geojson", data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-30, 30], [50, 30], [50, 72], [-30, 72], [-30, 30]]] } }] } } },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#ffffff" } },
    { id: "Water", type: "fill", source: "land", paint: { "fill-color": "#cccccc" } },
  ],
};
const plan = {
  styleUrl: `data:application/json,${encodeURIComponent(JSON.stringify(style))}`,
  projection: "globe",
  tints: { water: "#aaccee", land: "#f4f1ea" },
  warmSamples: 1,
  cameras: [cameraFields({ center: [10, 50], zoom: 3 }), cameraFields({ center: [20, 41], zoom: 6 })],
  degreesPerPixel: 1,
  layers: [
    {
      id: "square",
      type: "fill",
      data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[15, 40], [25, 40], [25, 45], [15, 45], [15, 40]]] } }] },
      paint: { "fill-color": "#000000", "fill-opacity": 0 },
      bindings: { "fill-opacity": { $state: "reveal" } },
    },
  ],
};

let browser: puppeteer.Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({ executablePath: CHROME, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
});
afterAll(async () => browser?.close());

describe("the scrolly map runtime in a browser", () => {
  it("should follow the state's camera and paint once the warm is done", async () => {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 600 });
    const js = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
    const css = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
    const runtime = await scrollyMapScript();
    await page.setContent(
      `<style>${css} html,body{margin:0} #root,[data-part=live]{position:absolute;inset:0}</style>` +
        `<div id="root"><div data-part="live" style="opacity:0"></div></div><script>${js}</script><script>${runtime}</script>`,
    );
    const result = await page.evaluate(async (plan) => {
      const root = document.getElementById("root")!;
      const handle = await new Promise<any>((resolve) => {
        const h = (window as any).initScrollyMap(root, { ...plan, referenceWidth: 800 }, { window, onReady: () => resolve(h), warmTimeoutMs: 2000 });
      });
      (window as any).applyScrollyMap(handle, { ...plan.cameras[1], reveal: 0.75 });
      return {
        projection: handle.map.getProjection()?.type,
        center: handle.map.getCenter().toArray(),
        zoom: handle.map.getZoom(),
        opacity: handle.map.getPaintProperty("square", "fill-opacity"),
        warm: root.dataset.liveWarm,
        live: (root.querySelector("[data-part=live]") as HTMLElement).style.opacity,
      };
    }, plan);
    expect(result.projection).toBe("globe");
    expect(result.center[0]).toBeCloseTo(20, 4);
    expect(result.center[1]).toBeCloseTo(41, 4);
    expect(result.zoom).toBeCloseTo(6, 6);
    expect(result.opacity).toBe(0.75);
    expect(result.warm?.startsWith("3:")).toBe(true);
    expect(result.live).toBe("1");
  }, 60_000);
});
```

- [ ] **Step 7: Run it**

Run: `bun test skills/map-beat/test/scrolly-live.test.ts`
Expected: PASS. If `assertLiveStyleAnswered` throws because the fixture's layer ids do not match the sweep, check `styleDecisionFor` in `shared/map-beat/style.mjs`: a `fill` whose id matches `/water/i` is re-tinted, so `"Water"` must be counted — fix the fixture, not the trunk.

- [ ] **Step 8: Check the lanes and commit**

```bash
bun run test:lanes
git add -- shared/map-beat/scrolly-live.mjs shared/map-beat/inline.mjs skills/map-beat/test/scrolly-inline.test.ts skills/map-beat/test/scrolly-live.test.ts
git commit -m "feat(map-beat): the live scrolly runtime — globe, no interaction, every camera warmed, state applied per frame" -- shared/map-beat/scrolly-live.mjs shared/map-beat/inline.mjs skills/map-beat/test/scrolly-inline.test.ts skills/map-beat/test/scrolly-live.test.ts
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

### Task 6: MapLibre inlined by `renderScrolly`

**Files:**
- Modify: `skills/scrolly/scripts/render-scrolly.mjs` (signature and `<head>`)
- Test: `skills/scrolly/test/render-scrolly.test.ts`

**Interfaces:**
- Produces: `renderScrolly({ ..., vendor = [] })` where each entry is `{ css?: string, js?: string }`; CSS is inlined in `<head>` before the page's own style, JS in `<head>` after it, both before the reveal script runs.

- [ ] **Step 1: Read how the existing test renders a page**

Run: `grep -n "renderScrolly(" skills/scrolly/test/render-scrolly.test.ts | head -3` and read the first call with its arguments; the new test reuses that call.

- [ ] **Step 2: Write the failing test**

Append to `skills/scrolly/test/render-scrolly.test.ts`, inside a new `describe`, using the arguments of the call read in Step 1 (named `baseArgs` below; declare it by copying that call's object literal):

```ts
describe("vendor scripts", () => {
  it("should inline a vendor script in the head, before the reveal driver runs", async () => {
    const { outPath } = await renderScrolly({ ...baseArgs, name: "vendor-probe.html", vendor: [{ css: ".vendor-probe{}", js: "window.__vendorProbe = 1;" }] });
    const html = readFileSync(outPath, "utf8");
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).toContain("window.__vendorProbe = 1;");
    expect(head).toContain(".vendor-probe{}");
  });

  it("should refuse a vendor script that closes its own script tag", async () => {
    await expect(renderScrolly({ ...baseArgs, name: "vendor-bad.html", vendor: [{ js: "</script>" }] })).rejects.toThrow(/closing script tag/);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `bun test skills/scrolly/test/render-scrolly.test.ts -t "vendor"`
Expected: FAIL, the head does not contain the probe.

- [ ] **Step 4: Implement**

In `skills/scrolly/scripts/render-scrolly.mjs`, add `vendor = [],` to the destructured parameters after `reveal = null,`. After the `if (reveal) { … }` validation block add:

```js
  for (const v of vendor)
    if (/<\/script/i.test(v.js ?? "") || /<\/style/i.test(v.css ?? ""))
      throw new Error("a vendor asset contains a closing script tag and cannot be inlined");
  const vendorHead = vendor
    .map((v) => `${v.css ? `<style>${v.css}</style>` : ""}${v.js ? `<script>${v.js}</script>` : ""}`)
    .join("\n");
```

In the `page` template, directly after the opening `<head>` line, insert `${vendorHead}`.

- [ ] **Step 5: Run the scrolly render tests**

Run: `bun test skills/scrolly/test/render-scrolly.test.ts skills/scrolly/test/directed-and-revealed.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -- skills/scrolly/scripts/render-scrolly.mjs skills/scrolly/test/render-scrolly.test.ts
git commit -m "feat(scrolly): a page can inline a vendor library in its head, for the live map" -- skills/scrolly/scripts/render-scrolly.mjs skills/scrolly/test/render-scrolly.test.ts
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

### Task 7: One fallback image per card

**Files:**
- Modify: `shared/map-beat/bake.mjs`
- Test: `skills/map-beat/test/bake-cards.live.test.ts`

**Interfaces:**
- Consumes: `transformStyle` (`style.mjs`), `viewOf` (Task 3), `window.__mountPlan` in the bake page (as `bakePlan` already expects).
- Produces: `bakeCards({ page, plan, cameras, size, glyphsUrl, tints, keepLabels, statesForCards, outDir, stem }) → Promise<{ png: string, card: number }[]>` — for card `k` it sets `viewOf(cameras[k])`, applies `bindState` of every binding with `statesForCards[k]`, waits for `idle`, screenshots `${outDir}/${stem}-${k + 1}.png` at `deviceScaleFactor: 2`.

- [ ] **Step 1: Write the failing live test**

`skills/map-beat/test/bake-cards.live.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import puppeteer from "puppeteer-core";
import { bakeCards } from "#shared/map-beat/bake.mjs";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { cameraFields } from "#shared/map-beat/scrolly.mjs";

const require = createRequire(import.meta.url);
const key = mapTilerKeyIn(process.env);
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
let browser: puppeteer.Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({ executablePath: CHROME, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
});
afterAll(async () => browser?.close());

describe.skipIf(!key)("per-card fallback bake", () => {
  it("should write one PNG per card at twice the published size", async () => {
    const style = await (await fetch(`https://api.maptiler.com/maps/dataviz/style.json?key=${key}`)).json();
    const page = await browser.newPage();
    const js = readFileSync(require.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
    await page.setContent(`<div id="map" style="position:absolute;inset:0"></div><script>${js}</script><script>window.__mountPlan=()=>{}</script>`);
    const outDir = mkdtempSync(join(tmpdir(), "cards-"));
    const cameras = [cameraFields({ center: [10, 50], zoom: 3 }), cameraFields({ center: [20, 41.3], zoom: 6 })];
    const out = await bakeCards({
      page, plan: { style, layers: [], projection: "globe" }, cameras, size: { width: 400, height: 300 },
      glyphsUrl: style.glyphs, tints: { water: "#aaccee", land: "#f4f1ea" }, keepLabels: [], statesForCards: cameras, outDir, stem: "probe",
    });
    expect(out.map((o) => o.card)).toEqual([0, 1]);
    const head = readFileSync(out[1].png).subarray(16, 24);
    expect([head.readUInt32BE(0), head.readUInt32BE(4)]).toEqual([800, 600]);
  }, 120_000);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `set -a && . ./.env && set +a && bun test skills/map-beat/test/bake-cards.live.test.ts`
Expected: FAIL, `bakeCards` is not exported.

- [ ] **Step 3: Implement**

Append to `shared/map-beat/bake.mjs` (and add `import { bindState, viewOf } from "./scrolly.mjs";` under the existing import):

```js
/** ONE FALLBACK PER CARD. A scrolly's cameras are authored, so the picture a reader without a live map
 *  gets on each card can be baked: the same plan, the same tints, the card's own camera and the card's
 *  own state applied to every binding. Baked at the size the layout publishes, like `bakePlan`. */
export async function bakeCards({ page, plan, cameras, size, glyphsUrl, tints, keepLabels, statesForCards, outDir, stem }) {
  const style = transformStyle(plan.style, { tints, glyphs: glyphsUrl, keepLabels });
  // The same zoom shift the live runtime applies: cameras are authored for `plan.referenceWidth`.
  const shiftedView = (k) => {
    const view = viewOf(cameras[k]);
    view.zoom += plan.referenceWidth ? Math.log2(size.width / plan.referenceWidth) : 0;
    return view;
  };
  await page.setViewport({ ...size, deviceScaleFactor: 2 });
  await page.evaluate(
    async (style, plan, first) => {
      const map = new maplibregl.Map({ container: "map", style, ...first, interactive: false, attributionControl: false, fadeDuration: 0 });
      await new Promise((r) => map.once("style.load", r));
      if (plan.projection) map.setProjection({ type: plan.projection });
      window.__mountPlan(map, plan);
      window.__cardsMap = map;
      await new Promise((r) => (map.loaded() ? r() : map.once("idle", r)));
    },
    style,
    plan,
    shiftedView(0),
  );
  const out = [];
  for (let k = 0; k < cameras.length; k++) {
    const paints = [];
    for (const layer of plan.layers)
      for (const property in layer.bindings || {}) paints.push([layer.id, property, bindState(layer.bindings[property], statesForCards[k])]);
    await page.evaluate(
      async (view, paints) => {
        const map = window.__cardsMap;
        map.jumpTo(view);
        for (const [id, property, value] of paints) map.setPaintProperty(id, property, value);
        await new Promise((r) => map.once("idle", r));
      },
      shiftedView(k),
      paints,
    );
    const png = join(outDir, `${stem}-${k + 1}.png`);
    await page.screenshot({ path: png });
    out.push({ png, card: k });
  }
  return out;
}
```

- [ ] **Step 4: Run the live test and the trunk tests**

Run: `set -a && . ./.env && set +a && bun test skills/map-beat/test/bake-cards.live.test.ts skills/map-beat/test/the-trunk-stands-alone.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
bun run test:lanes
git add -- shared/map-beat/bake.mjs skills/map-beat/test/bake-cards.live.test.ts
git commit -m "feat(map-beat): one fallback image per scrolly card, baked from the card's own camera and state" -- shared/map-beat/bake.mjs skills/map-beat/test/bake-cards.live.test.ts
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

### Task 8: The live guards

Addendum §2.6 (no frame with a missing tile after the warm) and §3.3 (no point of the canvas left undrawn at any card camera).

**Files:**
- Create: `skills/scrolly/scripts/verify-live-map-scrolly.mjs`

**Interfaces:**
- Consumes: a rendered scrolly page whose `styleUrl` carries `__MAPTILER_KEY__`; the key from the environment; the scaffold's scroll container `.scrolly-steps` and root `[data-progress]`.
- Produces: CLI `bun skills/scrolly/scripts/verify-live-map-scrolly.mjs <page.html> [--viewports 1280x800,375x812]`, exit 0 when both guards hold on every viewport, exit 1 with one line per failure.

- [ ] **Step 1: Write the script**

`skills/scrolly/scripts/verify-live-map-scrolly.mjs`:

```js
// THE TWO GUARDS A LIVE SCROLLY MAP OWES (addendum §2.6, §3.3), run on a real page with a real key.
//
//   1. After the warm, a scrub at 30, 120 and 400 px per animation frame meets no frame whose tiles
//      are not all loaded (`map.areTilesLoaded()` sampled every frame).
//   2. At every card's camera, no sampled point of the canvas is left undrawn — the page's own ground
//      or transparent — which is what a missing country or the space around the globe looks like.
//
// The key is substituted into a temporary copy of the page, never into the committed file.
//
// Usage: bun skills/scrolly/scripts/verify-live-map-scrolly.mjs <page.html> [--viewports 1280x800,375x812]

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";

const [pagePath, ...rest] = process.argv.slice(2);
if (!pagePath) throw new Error("usage: verify-live-map-scrolly.mjs <page.html> [--viewports WxH,…]");
const viewports = (rest[rest.indexOf("--viewports") + 1] || "1280x800,375x812").split(",").map((v) => v.split("x").map(Number));
const key = mapTilerKeyIn(process.env);
if (!key) throw new Error("no MapTiler key in the environment");

const placeholder = "__MAPTILER" + "_KEY__";
const html = readFileSync(resolve(pagePath), "utf8");
if (!html.includes(placeholder)) throw new Error(`${pagePath} carries no key placeholder — is it a live map page?`);
const dir = mkdtempSync(join(tmpdir(), "live-scrolly-"));
const keyed = join(dir, "page.html");
writeFileSync(keyed, html.split(placeholder).join(key));

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const failures = [];

for (const [width, height] of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`file://${keyed}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector("[data-live-warm]") || document.querySelector("[data-live-error]"), { timeout: 60_000 });
  const error = await page.evaluate(() => document.querySelector("[data-live-error]")?.getAttribute("data-live-error"));
  if (error) {
    failures.push(`${width}x${height}: the live map reported "${error}"`);
    continue;
  }

  for (const speed of [30, 120, 400]) {
    const missing = await page.evaluate(async (speed) => {
      const scroller = document.querySelector(".scrolly-steps") || document.scrollingElement;
      const map = window.__scrollyMap?.map;
      if (!map) return -1;
      scroller.scrollTop = 0;
      let missing = 0;
      await new Promise((resolve) => {
        const step = () => {
          if (!map.areTilesLoaded()) missing += 1;
          if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1) return resolve();
          scroller.scrollTop += speed;
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      return missing;
    }, speed);
    if (missing !== 0) failures.push(`${width}x${height}: ${missing === -1 ? "no window.__scrollyMap handle" : `${missing} frames with a missing tile`} at ${speed}px/frame`);
  }

  // Land is tinted `mix(ground, ink, 0.045)` and water by `plateTints`, so the page's own ground colour
  // appears in the canvas only where nothing is drawn: a country missing from the tiles, or space
  // around the globe's limb. Either is a defect a real map does not have.
  const bare = await page.evaluate(async () => {
    const handle = window.__scrollyMap;
    const ground = getComputedStyle(document.body).backgroundColor.match(/\d+/g).slice(0, 3).map(Number);
    const out = [];
    for (let k = 0; k < handle.plan.cameras.length; k++) {
      window.applyScrollyMap(handle, { ...handle.plan.cameras[k], ...handle.plan.statesForCards[k] });
      await new Promise((r) => handle.map.once("idle", r));
      const canvas = handle.map.getCanvas();
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      let bareCount = 0;
      const px = new Uint8Array(4);
      for (let x = 2; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 48)))
        for (let y = 2; y < canvas.height; y += Math.max(1, Math.floor(canvas.height / 48))) {
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (px[3] === 0 || Math.abs(px[0] - ground[0]) + Math.abs(px[1] - ground[1]) + Math.abs(px[2] - ground[2]) < 3) bareCount += 1;
        }
      out.push(bareCount);
    }
    return out;
  });
  bare.forEach((n, k) => {
    if (n > 0) failures.push(`${width}x${height}: card ${k + 1} leaves ${n} sampled points of the canvas undrawn (page ground or transparent)`);
  });
  await page.close();
}

await browser.close();
if (failures.length) {
  console.log(failures.join("\n"));
  process.exit(1);
}
console.log(`live map guards hold on ${viewports.map((v) => v.join("x")).join(", ")}`);
```

The runtime must expose the handle for this script: in Task 9 the beat's driver sets `window.__scrollyMap = handle` and the plan carries `statesForCards` (the six card states). `readPixels` needs `preserveDrawingBuffer`; Task 9's driver passes it through `initScrollyMap` — add to the `Map` options in `scrolly-live.mjs` the line `canvasContextAttributes: { preserveDrawingBuffer: !!(options && options.preserveDrawingBuffer) },` and have the driver pass `preserveDrawingBuffer: /[?&]verify/.test(location.search)`; the script then loads `file://${keyed}?verify`.

- [ ] **Step 2: Apply the two runtime additions**

In `shared/map-beat/scrolly-live.mjs`, inside the `new win.maplibregl.Map({ … })` options, after `maxTileCacheSize: 800,` add:

```js
    canvasContextAttributes: { preserveDrawingBuffer: !!(options && options.preserveDrawingBuffer) },
```

In `verify-live-map-scrolly.mjs`, change `page.goto(\`file://${keyed}\`` to `page.goto(\`file://${keyed}?verify\``.

- [ ] **Step 3: Re-run the runtime tests**

Run: `bun test skills/map-beat/test/scrolly-inline.test.ts skills/map-beat/test/scrolly-live.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit** (the script is exercised on the pilot in Task 9)

```bash
git add -- skills/scrolly/scripts/verify-live-map-scrolly.mjs shared/map-beat/scrolly-live.mjs
git commit -m "feat(scrolly): the live map guards — no missing tile after the warm, no land left in the page's ground" -- skills/scrolly/scripts/verify-live-map-scrolly.mjs shared/map-beat/scrolly-live.mjs
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

### Task 9: The choropleth scrolly on the plan (pilot)

**Files:**
- Modify: `proof/scrolly-choropleth-europe-lowcarbon/render-directions-scrolly.mjs`
- Modify: `proof/scrolly-choropleth-europe-lowcarbon/DirectedChoroplethScrolly.tsx`
- Rewrite: `proof/scrolly-choropleth-europe-lowcarbon/choropleth-drive.mjs`
- Delete: `proof/scrolly-choropleth-europe-lowcarbon/choropleth-geometry.mjs`, `proof/scrolly-choropleth-europe-lowcarbon/shapes.geojson` (only once nothing imports them)
- Create: `proof/scrolly-choropleth-europe-lowcarbon/plan.mjs`, `proof/scrolly-choropleth-europe-lowcarbon/fallback/<direction>-<card>.png`
- Modify: `proof/scrolly-choropleth-europe-lowcarbon/BRIEF.md`, `renders/*.html`

**Interfaces:**
- Consumes: everything above; `plateTints(direction)` (`shared/map-beat/tints.mjs`); the runner's existing assertions and words.
- Produces: `choroplethPlan({ tints, classFills, shares, breaks, top, odd, neighbours, cameras, statesForCards, words, fonts, glyphs, referenceWidth }) → plan` from `plan.mjs`, where `shares` is `{ [iso2]: number | null }`, `top` is `iso2[]`, `odd` and each of `neighbours` / `words.top` is `{ text, seat: [lon, lat] }`, `fonts` is `{ axis: stack, axisSize: px, ink, accentInk }`.

- [ ] **Step 1: Measure the Countries tileset**

```bash
set -a && . ./.env && set +a
bun -e '
const key = process.env.MAPTILER_KEY || process.env.REMOTION_MAPTILER_KEY || process.env.VITE_MAPTILER_KEY;
const tj = await (await fetch(`https://api.maptiler.com/tiles/countries/tiles.json?key=${key}`)).json();
console.log(JSON.stringify({ maxzoom: tj.maxzoom, layers: tj.vector_layers.map((l) => ({ id: l.id, fields: l.fields })) }, null, 1));
'
```
Expected: a `vector_layers` entry (the addendum names `administrative`) with a level field and an ISO A2 field. Write the exact layer id and field names into `plan.mjs` below; if no ISO A2 field exists, stop and report to the owner (addendum §3.2 cannot be met).

- [ ] **Step 2: Write the plan builder**

`proof/scrolly-choropleth-europe-lowcarbon/plan.mjs` — replace `LAYER`, `LEVEL`, `ISO` with the names measured in Step 1:

```js
// THE CHOROPLETH SCROLLY AS A MAP PLAN. Every mark inside the map is a MapLibre layer: the class fills
// read MapTiler Countries (the basemap's own tiles, joined by ISO A2 code), the names are symbol layers
// placed at the beat's seats, the odd one's ring is a line layer. The scroll drives the camera and
// every paint through `$state` tokens (`shared/map-beat/scrolly.mjs`).

const LAYER = "administrative";
const LEVEL = "level";
const ISO = "iso_a2";
const KEY = "__MAPTILER" + "_KEY__";

export function choroplethPlan({ tints, classFills, shares, breaks, top, odd, neighbours, cameras, statesForCards, words, fonts, glyphs, referenceWidth }) {
  const classOf = (v) => breaks.filter((b) => v >= b).length;
  const classMatch = ["match", ["get", ISO]];
  const topMatch = ["match", ["get", ISO]];
  for (const [iso2, value] of Object.entries(shares)) {
    if (value === null) continue;
    classMatch.push(iso2, classOf(value));
    topMatch.push(iso2, top.includes(iso2) ? 1 : 0);
  }
  classMatch.push(-1);
  topMatch.push(0);
  const n = classFills.length;
  // A class is reached when `classes · n` passes its index: opacity climbs from 0 to 1 over one step.
  const reached = ["min", 1, ["max", 0, ["-", ["*", { $state: "classes" }, n], classMatch]]];
  const kept = ["-", 1, ["*", { $state: "filter" }, ["-", 1, topMatch]]];
  const seats = (entries, role) => ({
    type: "FeatureCollection",
    features: entries.map((e) => ({ type: "Feature", properties: { text: e.text, role }, geometry: { type: "Point", coordinates: e.seat } })),
  });
  const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "globe",
    tints,
    cameras,
    statesForCards,
    referenceWidth,
    glyphs,
    oddSeat: odd.seat,
    warmSamples: 3,
    degreesPerPixel: 1,
    layers: [
      {
        id: "classes",
        type: "fill",
        source: countries,
        sourceLayer: LAYER,
        filter: ["all", ["==", ["get", LEVEL], 0], ["!=", classMatch, -1]],
        paint: { "fill-color": ["step", classMatch, ...classFills.flatMap((c, i) => (i === 0 ? [c] : [i, c]))], "fill-opacity": 0 },
        bindings: { "fill-opacity": ["*", reached, kept] },
      },
      {
        id: "top-names",
        type: "symbol",
        data: seats(words.top, "top"),
        layout: { "text-field": ["get", "text"], "text-font": [fonts.axis], "text-size": fonts.axisSize, "text-allow-overlap": true, "text-ignore-placement": true },
        paint: { "text-color": fonts.accentInk, "text-halo-color": tints.land, "text-halo-width": 1.5, "text-opacity": 0 },
        bindings: { "text-opacity": ["*", { $state: "top" }, { $state: "atRest" }] },
      },
      {
        id: "neighbour-names",
        type: "symbol",
        data: seats(neighbours, "neighbour"),
        layout: { "text-field": ["get", "text"], "text-font": [fonts.axis], "text-size": fonts.axisSize, "text-allow-overlap": true, "text-ignore-placement": true },
        paint: { "text-color": fonts.ink, "text-halo-color": tints.land, "text-halo-width": 1.5, "text-opacity": 0 },
        bindings: { "text-opacity": ["*", { $state: "odd" }, { $state: "arrived" }] },
      },
      {
        id: "odd-ring",
        type: "circle",
        data: seats([odd], "odd"),
        paint: { "circle-radius": 22, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": fonts.accentInk, "circle-stroke-width": 2, "circle-stroke-opacity": 0 },
        bindings: { "circle-stroke-opacity": { $state: "odd" } },
      },
    ],
  };
}
```

The odd one's name stays an HTML chip lifted above the card (the validated gesture, addendum §2.3): it is page furniture tied to the card, not a word placed on the geography.

- [ ] **Step 3: Change the runner**

In `render-directions-scrolly.mjs`:

1. Remove the imports of `choropleth-geometry.mjs` and the reading of `shapes.geojson`; keep every data assertion and every sentence unchanged.
2. Build per-card cameras in degrees from the beat's own facts, then convert. `referenceWidth = 1280`. Cards 1–3 and 6 frame the study window: `cameraFields({ center: [10, 52], zoom: Math.log2((1280 / 512) * (360 / 75)) })` (75° is the window's longitude span); cards 4–5 are the close-up centred on Albania's seat: `cameraFields({ center: oddSeat, zoom: Math.log2((1280 / 512) * (360 / 75)) + 2.3 })`. Pass `referenceWidth` to `choroplethPlan`. Store them with each state: `STATES[k] = { ...STATES[k], ...cameras[k], arrived: k === 3 || k === 4 ? 1 : 0, atRest: k === 3 || k === 4 ? 0 : 1 }`.
3. Seats: keep the seats the current component computed (the label anchor inside each country), exported as `[lon, lat]` from the static beat `proof/static-choropleth-europe-lowcarbon` (its `render-directions.mjs` computes them from `shapes.geojson` in degrees; import that function rather than re-deriving). ISO3 → ISO2: add a `ISO2` map beside the existing `NAMES` for every country in `data.csv`, and throw when one is missing.
4. Glyphs: bake the direction's axis face with `bakeGlyphs` (`shared/map-beat/glyphs.mjs`) for `rangesNeededBy(allWords)` and pass them base64-encoded as `plan.glyphs = { [stack]: { [range]: base64 } }`; `fonts.axis` is that stack name.
5. For each direction: `choroplethPlan(...)`, `validateScrollyPlan(plan, STATES)` must return `[]` (throw with the list otherwise); bake the six fallbacks with `bakeCards` into `fallback/<direction>-<card>.png` only when the file is absent or the plan's JSON hash changed (store the hash beside them in `fallback/<direction>.hash`); render with `renderScrolly({ …, vendor: [{ js: maplibreJs, css: maplibreCss }], reveal: { element, states: STATES, driver, apply: "applyChoroplethState" } })` where `driver` is `(await scrollyMapScript()) + "\n" + (await readFile(join(HERE, "choropleth-drive.mjs"), "utf8"))`.

- [ ] **Step 4: Rewrite the component's stage**

In `DirectedChoroplethScrolly.tsx` keep the header counter, the key and the odd chip; replace the SVG stage by:

```tsx
<div data-part="stage" style={{ position: "relative", minHeight: 0, overflow: "hidden" }}>
  {fallbacks.map((src, k) => (
    <img key={k} data-fallback={k} src={src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: k === fallbacks.length - 1 ? 1 : 0 }} />
  ))}
  <div data-part="live" style={{ position: "absolute", inset: 0, opacity: 0 }} />
  <script type="application/json" data-part="plan" dangerouslySetInnerHTML={{ __html: JSON.stringify(plan).replace(/</g, "\\u003c") }} />
  {/* the odd chip and its leader, as today */}
</div>
```

`fallbacks` are `data:` URIs of the six PNGs (`toDataUri` from `skills/scrolly/scripts/inline-asset.mjs`).

- [ ] **Step 5: Rewrite the driver**

`choropleth-drive.mjs`:

```js
// The painting function for the choropleth scrolly, inlined after the map runtime. The runtime owns
// the camera and every paint; this file owns the out-of-map furniture: the header counter, the key's
// swatches, the fallback image for the nearest card, and the odd one's chip lifted above the card.

export function applyChoroplethState(root, state, context) {
  if (!root.__plan) {
    root.__plan = JSON.parse(root.querySelector('[data-part="plan"]').textContent);
    root.__handle = initScrollyMap(root, root.__plan, { window, preserveDrawingBuffer: /[?&]verify/.test(location.search) });
    window.__scrollyMap = root.__handle;
  }
  applyScrollyMap(root.__handle, state);

  const card = Math.round(state.card);
  root.querySelectorAll("[data-fallback]").forEach((img) => {
    img.style.opacity = Number(img.dataset.fallback) === card ? "1" : "0";
  });
  // Header counter, key swatches, odd chip and leader: carry over the existing code of this file for
  // `topCount`, `swatches`/`key`, and the lifted odd label (`panel` measurement, `lifted`, `leader`),
  // positioning the chip at `root.__handle.map.project(root.__plan.oddSeat)` when the handle is ready
  // and at the fallback's own pixel seat (`root.__plan.oddPixelByCard[card]`) when it is not.
}
```

Add `card: k` to every state in the runner (Step 3) so the nearest fallback is known, and `oddSeat` / `oddPixelByCard` to the plan (the pixel seat of Albania in each fallback, read back with `map.project` during `bakeCards` — extend the bake call with a `page.evaluate` that returns `map.project(oddSeat)` per card).

- [ ] **Step 6: Render and look**

```bash
set -a && . ./.env && set +a
bun proof/scrolly-choropleth-europe-lowcarbon/render-directions-scrolly.mjs
grep -c "__MAPTILER_KEY__" proof/scrolly-choropleth-europe-lowcarbon/renders/creme.html
grep -Ec "key=[A-Za-z0-9]{16,}" proof/scrolly-choropleth-europe-lowcarbon/renders/creme.html
```
Expected: three renders written; the placeholder count ≥ 2; the real-key count `0`.

Then capture the six cards at 1280×800 and 375×812 with the key substituted in a temporary copy (the same substitution as `verify-live-map-scrolly.mjs`) and read the contact sheets. Check against the validated choreography, and that Libya, Egypt, Israel and Kazakhstan are drawn as land.

- [ ] **Step 7: Run the guards and the page verifier**

```bash
set -a && . ./.env && set +a
for d in creme nocturne rapport; do bun skills/scrolly/scripts/verify-live-map-scrolly.mjs proof/scrolly-choropleth-europe-lowcarbon/renders/$d.html; done
for d in creme nocturne rapport; do bun skills/scrolly/scripts/verify-scrolly.mjs $PWD/proof/scrolly-choropleth-europe-lowcarbon/renders/$d.html | tail -1; done
```
Expected: `live map guards hold on 1280x800, 375x812` three times; `0 failures` three times.

- [ ] **Step 8: Mutation**

Copy `data.csv` aside, set Albania's hydro to a value that puts it under 94 %, run the runner, expect it to throw `the headline says seven countries clear 94 %`, restore the file, `cmp` it against the copy. If it does not throw, re-render after restoring.

- [ ] **Step 9: BRIEF and commit**

Rewrite the BRIEF's precision section: live MapTiler in globe, fills from MapTiler Countries joined by ISO A2, names as symbol layers at the beat's seats, per-card fallbacks, the two live guards and their result. Remove `choropleth-geometry.mjs` and `shapes.geojson` once `grep -rn "choropleth-geometry\|shapes.geojson" proof/scrolly-choropleth-europe-lowcarbon` returns nothing.

```bash
F=proof/scrolly-choropleth-europe-lowcarbon
git rm -q -- $F/choropleth-geometry.mjs $F/shapes.geojson
git add -- $F/BRIEF.md $F/plan.mjs $F/choropleth-drive.mjs $F/DirectedChoroplethScrolly.tsx $F/render-directions-scrolly.mjs $F/fallback $F/renders/creme.html $F/renders/nocturne.html $F/renders/rapport.html
git commit -m "feat(scrolly-choropleth-europe-lowcarbon): the choropleth scrolly on a live MapTiler globe — fills from the basemap's own country tiles, names as map layers, the scroll driving camera and paint" -- $F
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

- [ ] **Step 10: Owner validation.** Open the three pages with the key substituted in temporary copies (never the committed files), report in French what each card shows and what the guards measured, and ask for validation. Do not tick the catalogue until the owner validates.

---

### Task 10: The addendum records what S1 measured

**Files:**
- Modify: `docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md`

- [ ] **Step 1: Fill §3.2 and §2.6 with the measurements**

In §3.2 replace `*Reste à mesurer avant le plan : …*` by the tileset's measured layer and field names (Task 9 Step 1) and the tile request count the guard's scrub produced. In §2.6 add the warm's `liveWarm` value (views and ms) at both viewports.

- [ ] **Step 2: Commit**

```bash
git add -- docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md
git commit -m "docs(splash): what the pilot measured — the Countries tileset joined, the warm and the guards" -- docs/splash/2026-09-15-scrolly-maps-through-maptiler-addendum.md
git log -1 --format=%B | grep -ci "claude\|anthropic"
```

---

## Self-review

- **Spec coverage.** Addendum §2.1 cameras by card → Tasks 3, 5; §2.2 paint states → Tasks 3, 5, 9; §2.3 subject centred, chip lifted → Task 9 (camera centred on the seat, chip carried over); §2.4 words per camera → Task 9 (`arrived` / `atRest` bindings on symbol layers); §2.5 per-card fallback and key placeholder → Tasks 7, 9; §2.6 warm and guard → Tasks 5, 8; §3.1 whole-world geography → Task 9 (no extract, basemap land) and the §3.3 guard → Task 8; §3.2 fills from the same tiles → Tasks 4, 9; §7.1 globe → Tasks 1, 2, 5. §4 (detail level) is S2 and §5 (cartogram, hex grid) is S3: out of this plan by the addendum's own split.
- **Placeholder scan.** Task 9 Steps 3–5 describe carry-over of existing beat code (seats, counter, chip) by pointing at the exact functions to import or keep instead of repeating them; the new code they need is written out.
- **Type consistency.** `cameraFields` / `viewOf` / `bindState` / `validateScrollyPlan` (Task 3) are the names used in Tasks 5, 7, 9; `initScrollyMap` / `applyScrollyMap` (Task 5) in Tasks 8, 9; `sourceIdOf` (Task 4) only in `mount.mjs`; `plan.statesForCards` is set in Task 9 and read in Tasks 7, 8.
