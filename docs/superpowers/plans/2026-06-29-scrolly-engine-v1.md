# scrolly engine v1 (map) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new thin orchestrator engine `skills/scrolly/` that renders a **scroll-driven** interactive (sticky map + scrolling prose), v1 driving the **map** visual by reusing map-native's `mapStory`.

**Architecture:** A pure `chapters.ts` turns map-native `Beat[]` into a `ScrollyStory` (`chapters[]`). `ScrollyMap.tsx` is a MapTiler map built from map-native's pure pieces (`computeChoropleth`, `deriveMapStory`, `theme/colors`) driven by a `currentStep` prop — `flyTo` + highlight stroke + on-map name/value annotation, the same visual language as the video. `Scrolly.tsx` is the scaffold: a CSS `position: sticky` graphic + prose `.step` blocks + an IntersectionObserver that sets `currentStep` on step-enter, with a `switch(step.visual)` dispatcher (v1: only `"map"`). Output: a single-file `scrolly.html` (Vite + vite-plugin-singlefile).

**Tech Stack:** Bun, TypeScript, bun:test, React 19, MapTiler SDK 3.6, Vite + vite-plugin-singlefile, Playwright (smoke). Reuses `skills/map-native` modules via relative import.

## Global Constraints

- **Runtime:** Bun only — `bun`, `bunx`, `bun test`. Never `npm`/`npx`/`node`.
- **Language:** all code, comments, commit messages, branch names in English.
- **No attribution:** never mention Claude/Anthropic in any file, commit, or doc. No `Co-Authored-By`. Commit trailer (only if used) EXACTLY: `Claude-Session: https://claude.ai/code/session_01Paz87P3M49t27P9GksL246`
- **Key hygiene:** MapTiler key via `import.meta.env.VITE_MAPTILER_KEY` (gitignored in `/atelier/.env`). Never hard-code or log the key value.
- **No jank:** stickiness is CSS `position: sticky` ONLY — no scroll-position listeners driving layout. Step changes come from an IntersectionObserver.
- **Accessibility:** `prefers-reduced-motion` → `jumpTo` instead of `flyTo`; never steal focus to the map on step change; container `aria-label`; prose steps are real text.
- **Reuse, don't duplicate:** import `computeChoropleth`, `deriveMapStory`, `theme/colors`, the world geojson, and the `CountryLabel` annotation from `skills/map-native` — do not re-implement them.

## Reused interfaces (from `skills/map-native`, verbatim — do not redefine)

- `computeChoropleth(data, features, joinKey, options) → ChoroplethLayout` (`src/choropleth-geo.ts`). `ChoroplethLayout = { joined:{key,value:number|null}[], bins:{min,max,color}[], bounds:[w,s,e,n], noData, unmatched, scaleType }`.
- `deriveMapStory(layout, features, joinKey, meta) → Beat[]` (`src/map-story.ts`). `Beat = { kind:"title"|"establish"|"reveal"|"takeaway", camera:[w,s,e,n], highlight:string[], dim:boolean, callout:{region,name,value,text}|null, copy:string }`. `MapStoryMeta = { title, insight, unit, valueLabel? }`.
- `NO_DATA_COLOR`, `WATER_COLOR` (`src/theme/colors.ts`).
- `CountryLabel` (`src/components/CountryLabel.tsx`): `React.FC<{ name:string; color:string; reveal:number; x:number; y:number; value?:string }>`.
- `assets/geo/world.geojson` (Natural Earth admin-0, property `iso_a3`).

Relative import path from `skills/scrolly/src/...` to map-native is `../../map-native/src/...` and `../../map-native/assets/...`.

---

### Task 1: Scaffold the engine + the pure `chapters` core

**Files:**
- Create: `skills/scrolly/package.json`, `skills/scrolly/tsconfig.json`, `skills/scrolly/vite.config.ts`, `skills/scrolly/index.html`, `skills/scrolly/src/vite-env.d.ts`
- Create: `skills/scrolly/src/chapters.ts`
- Test: `skills/scrolly/tests/chapters.test.ts`

**Interfaces:**
- Produces:
  - `export type VisualKind = "map" | "chart" | "image"`
  - `export type StepAction = "flyTo" | "drawTo" | "crossfade"`
  - `export interface ScrollyStep { id:string; visual:VisualKind; action:StepAction; ref:number|string; prose:string; align?:"left"|"right"|"center" }`
  - `export interface ScrollyStory { title:string; source?:{name:string;url:string}; visual:VisualKind; steps:ScrollyStep[] }`
  - `export function mapStoryToChapters(beats: Beat[], meta:{title:string; source?:{name:string;url:string}}): ScrollyStory`

- [ ] **Step 1: Write the failing test**

Create `skills/scrolly/tests/chapters.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { mapStoryToChapters } from "../src/chapters";
import type { Beat } from "../../map-native/src/map-story";

const beats: Beat[] = [
  { kind: "title", camera: [-9, 36, 31, 71], highlight: [], dim: false, callout: null, copy: "Renewables across Europe" },
  { kind: "establish", camera: [-9, 36, 31, 71], highlight: [], dim: false, callout: null, copy: "" },
  { kind: "reveal", camera: [4, 57, 31, 71], highlight: ["NOR"], dim: false, callout: { region: "NOR", name: "Norway", value: "99%", text: "Norway — 99%" }, copy: "Norway — 99%" },
  { kind: "takeaway", camera: [-9, 36, 31, 71], highlight: [], dim: false, callout: null, copy: "North high, south low" },
];

describe("mapStoryToChapters", () => {
  it("emits one step per beat, all visual:map / action:flyTo, ref = beat index", () => {
    const story = mapStoryToChapters(beats, { title: "Renewables across Europe" });
    expect(story.steps).toHaveLength(4);
    expect(story.steps.every((s) => s.visual === "map" && s.action === "flyTo")).toBe(true);
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3]);
  });
  it("gives every step unique non-empty prose, deriving from beat copy", () => {
    const story = mapStoryToChapters(beats, { title: "Renewables across Europe" });
    expect(story.steps.every((s) => s.prose.trim().length > 0)).toBe(true);
    expect(new Set(story.steps.map((s) => s.id)).size).toBe(story.steps.length);
    // the establish beat has empty copy → its prose falls back to the title
    expect(story.steps[1].prose).toBe("Renewables across Europe");
  });
  it("maps the first step to the title beat and the last to the takeaway", () => {
    const story = mapStoryToChapters(beats, { title: "Renewables across Europe" });
    expect(story.steps[0].prose).toBe("Renewables across Europe");
    expect(story.steps[story.steps.length - 1].prose).toBe("North high, south low");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd skills/scrolly && bun test tests/chapters.test.ts`
Expected: FAIL — `../src/chapters` not found.

- [ ] **Step 3: Implement `src/chapters.ts`**

```ts
import type { Beat } from "../../map-native/src/map-story";

export type VisualKind = "map" | "chart" | "image";
export type StepAction = "flyTo" | "drawTo" | "crossfade";

export interface ScrollyStep {
  id: string;
  visual: VisualKind;
  action: StepAction;
  ref: number | string;
  prose: string;
  align?: "left" | "right" | "center";
}

export interface ScrollyStory {
  title: string;
  source?: { name: string; url: string };
  visual: VisualKind;
  steps: ScrollyStep[];
}

// v1: one scroll step per map beat. Prose = the beat's copy, falling back to the
// story title when a beat carries no words (the establish beat is intentionally
// caption-less in the video — but a scroll step always needs text beside the map).
export function mapStoryToChapters(
  beats: Beat[],
  meta: { title: string; source?: { name: string; url: string } },
): ScrollyStory {
  const steps: ScrollyStep[] = beats.map((b, i) => ({
    id: `step-${i}-${b.kind}`,
    visual: "map",
    action: "flyTo",
    ref: i,
    prose: b.copy && b.copy.trim() ? b.copy : meta.title,
    align: "left",
  }));
  return { title: meta.title, source: meta.source, visual: "map", steps };
}
```

- [ ] **Step 4: Create the build scaffold**

`skills/scrolly/package.json`:
```json
{
  "name": "scrolly",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "bun test",
    "audit:scrolly": "bun scripts/audit-scrolly.mjs"
  },
  "dependencies": {
    "@maptiler/sdk": "3.6.0",
    "@turf/turf": "7.2.0",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.17",
    "@vitejs/plugin-react": "5.1.0",
    "typescript": "6.0.3",
    "vite": "7.2.0",
    "vite-plugin-singlefile": "2.4.0",
    "playwright": "1.56.0"
  }
}
```
(Match the exact dependency versions already used in `skills/map-native/package.json` — read it and copy the versions so the engines stay in lockstep. Then `cd skills/scrolly && bun install`.)

`skills/scrolly/tsconfig.json` — copy `skills/map-native/tsconfig.json` verbatim (same compiler options; it already handles `.geojson` and React JSX).

`skills/scrolly/vite.config.ts` (config injected as `__CONFIG__`, single-file output):
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";

const injectedConfig = process.env.CONFIG
  ? JSON.parse(readFileSync(process.env.CONFIG, "utf8"))
  : null;

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  define: { __CONFIG__: JSON.stringify(injectedConfig) },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    rollupOptions: { input: "index.html" },
  },
});
```

`skills/scrolly/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Scrolly</title>
    <style>html,body{margin:0;padding:0}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/mount.tsx"></script>
  </body>
</html>
```

`skills/scrolly/src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
declare const __CONFIG__: unknown;
declare module "*.geojson?raw" { const s: string; export default s; }
interface ImportMetaEnv { readonly VITE_MAPTILER_KEY: string }
interface ImportMeta { readonly env: ImportMetaEnv }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd skills/scrolly && bun test tests/chapters.test.ts`
Expected: PASS (3/3).

- [ ] **Step 6: Commit**

```bash
git add skills/scrolly/package.json skills/scrolly/tsconfig.json skills/scrolly/vite.config.ts skills/scrolly/index.html skills/scrolly/src/vite-env.d.ts skills/scrolly/src/chapters.ts skills/scrolly/tests/chapters.test.ts skills/scrolly/bun.lock
git commit -m "feat(scrolly): scaffold engine + pure chapters core (mapStoryToChapters)"
```

---

### Task 2: `ScrollyMap.tsx` — the map renderer driven by `currentStep`

**Files:**
- Create: `skills/scrolly/src/ScrollyMap.tsx`

**Interfaces:**
- Consumes: `computeChoropleth`, `deriveMapStory`, `Beat`, `NO_DATA_COLOR`/`WATER_COLOR`, `CountryLabel` (all from map-native via `../../map-native/...`), the world geojson (`import worldRaw from "../../map-native/assets/geo/world.geojson?raw"`).
- Produces: `export interface ScrollyMapConfig extends ChoroplethData { title?:string; unit?:string; valueUnit?:string; insight?:string; source?:{name:string;url:string} }` and `export const ScrollyMap: React.FC<{ config: ScrollyMapConfig; currentStep: number }>`.

**Implementation notes — this is the live-browser sibling of map-native's `ChoroplethStory`. Read `skills/map-native/src/components/ChoroplethStory.tsx` and `skills/map-native/src/ChoroplethMap.tsx` first; reuse their patterns. The deltas:**

1. **Key guard + init:** `if (!import.meta.env.VITE_MAPTILER_KEY) throw new Error("VITE_MAPTILER_KEY missing")`; `maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY`. Init the map ONCE (ref guard), `style: MapStyle.DATAVIZ.LIGHT`, `interactive:false` (the SCROLL drives the camera — no manual pan/zoom; per the spec, controls are omitted in scrolly), `attributionControl:true` compact bottom-right.
2. **On load:** strip symbol layers; recolour water layers to `WATER_COLOR` (the `/water|ocean|sea/i` guarded loop from `ChoroplethStory`); `computeChoropleth(config, world, "iso_a3", { bins:5, scaleType:"sequential" })`; build `meta` (title/insight/unit=`config.valueUnit ?? ""`); `deriveMapStory(layout, world, "iso_a3", meta) → beats`; store beats. Add the choropleth fill (full-opacity `["case",["==",["get","__hasData"],false],NO_DATA_COLOR, <bins>]`), the white stroke, and a `__highlight`-keyed highlight stroke layer (`line-width` 2.5 dark on highlight, 0 else) — SAME as `ChoroplethStory`. Precompute each region centroid (`centroid(mainlandFeature(feature))`) for callouts. Precompute each beat's camera as `{center,zoom}` via `map.cameraForBounds(beat.camera, {padding:48})`. Expose `window.__map__` and `window.__scrolly_step__` for the smoke test. `fitBounds` to beat 0's camera initially.
3. **On `currentStep` change (`useEffect([currentStep])`):** clamp to `[0, beats.length-1]`; let `beat = beats[currentStep]`. Update `__highlight` on the source via `setData` (only the highlighted region = 1). Move the camera: if `prefers-reduced-motion` (check `window.matchMedia("(prefers-reduced-motion: reduce)").matches`) → `map.jumpTo(camForStep)`, else `map.flyTo({ ...camForStep, duration: 1200, essential: true })`. Do NOT call `map.getCanvas().focus()` or otherwise steal focus.
4. **Callout overlay:** render `CountryLabel` for the active beat's `callout` (name + value), positioned via `map.project(centroidByKey.get(callout.region))`, updated on `map.on("move")` (so it tracks during the flyTo) — store the projected point in state on a `move` listener. `reveal` = 1 when the step is a reveal with a callout, else 0 (hidden). Title step (beat 0, kind "title") shows NO on-map callout (the prose panel carries the title).
5. **Hover:** keep the data-only hover popup from `ChoroplethMap` (only `__hasData` regions; "Name — value%" via `valueUnit`). Optional for v1 but cheap — include it.
6. Container `aria-label={config.title ? \`Map: ${config.title}\` : "Choropleth map"}` and `role="img"`.

- [ ] **Step 1: Implement `ScrollyMap.tsx`** per the notes (build from the `ChoroplethStory` + `ChoroplethMap` skeletons).

- [ ] **Step 2: Typecheck**

Run: `cd skills/scrolly && bunx tsc --noEmit 2>&1 | grep -i "ScrollyMap" || echo "no ScrollyMap type errors"`
Expected: no errors referencing `ScrollyMap` (a pre-existing `react-dom` types config issue, if any, is unrelated).

- [ ] **Step 3: Commit**

```bash
git add skills/scrolly/src/ScrollyMap.tsx
git commit -m "feat(scrolly): ScrollyMap — choropleth driven by currentStep (flyTo + highlight + annotation)"
```

---

### Task 3: `Scrolly.tsx` scaffold + dispatcher + `mount.tsx`

**Files:**
- Create: `skills/scrolly/src/Scrolly.tsx`
- Create: `skills/scrolly/src/mount.tsx`

**Interfaces:**
- Consumes: `mapStoryToChapters` (Task 1), `ScrollyMap` (Task 2), `computeChoropleth` + `deriveMapStory` (to build the beats the chapters reference), the world geojson.
- Produces: `export const Scrolly: React.FC<{ config: ScrollyMapConfig }>`.

**Implementation notes:**

1. **Build the story at mount:** from `config`, run `computeChoropleth` + `deriveMapStory` → `beats`; `mapStoryToChapters(beats, { title: config.title ?? "", source: config.source })` → `story`. (The map renderer ALSO derives beats internally from the same config — that is fine and deterministic; the scaffold needs the `chapters` for the prose + step count, the renderer needs the beats for the camera. Both derive from the same config, so they agree. Do NOT thread beats from the scaffold into the renderer — keep the renderer self-contained on `config` + `currentStep`.)
2. **Layout:** a two-column scrollytelling layout. A **sticky graphic** column (`position: sticky; top:0; height:100vh; width:100%`) holds `<ScrollyMap config={config} currentStep={currentStep} />`. Over/beside it, a column of **prose `.step` blocks**, one per `story.steps[i]`, each `min-height: 90vh`, a semi-opaque card with the step's `prose`, aligned per `step.align`. (Single sticky graphic behind, prose scrolling over it — the canonical sticky-graphic pattern.)
3. **IntersectionObserver:** on mount, observe each `.step` element; when one crosses the viewport midpoint (`rootMargin: "-50% 0px -50% 0px"`, `threshold: 0`) and `isIntersecting`, set `currentStep` to that step's index. Disconnect on unmount. NO scroll-position math. Use a `ref` array of the step DOM nodes.
4. **First step active by default** (`currentStep` initial 0); the observer updates as the reader scrolls.
5. **Source/credit** line pinned bottom (from `config.source`), always visible. A simple title/legend reuse is optional for v1 (the map renderer already draws the legend if you port it; otherwise the prose carries the narrative).
6. `mount.tsx`: read the config from `window.__CONFIG__ ?? __CONFIG__` (the Vite define) with a fallback to a bundled sample; `createRoot(document.getElementById("root")!).render(<Scrolly config={config} />)`. Mirror `skills/map-native/src/mount.tsx`.

- [ ] **Step 1: Implement `Scrolly.tsx` + `mount.tsx`** per the notes.

- [ ] **Step 2: Typecheck**

Run: `cd skills/scrolly && bunx tsc --noEmit 2>&1 | grep -iE "Scrolly|mount" || echo "no Scrolly type errors"`
Expected: no errors referencing `Scrolly`/`mount`.

- [ ] **Step 3: Commit**

```bash
git add skills/scrolly/src/Scrolly.tsx skills/scrolly/src/mount.tsx
git commit -m "feat(scrolly): Scrolly scaffold — sticky map + prose steps + IntersectionObserver dispatcher"
```

---

### Task 4: Sample config + `produce.mjs` (build single-file `scrolly.html`)

**Files:**
- Create: `skills/scrolly/assets/sample-data/scrolly.json`
- Create: `skills/scrolly/scripts/produce.mjs`

**Interfaces:**
- Consumes: the Vite build (`CONFIG=… bunx vite build`), the built `dist/index.html`.
- Produces: `output-proof/scrolly.html`.

- [ ] **Step 1: Create the sample config**

`skills/scrolly/assets/sample-data/scrolly.json` — copy `skills/map-native/assets/sample-data/choropleth.json` verbatim (same EU-renewables choropleth: `title`, `unit`, `valueUnit:"%"`, `basemap`, `regionKey:"code"`, `valueField:"share"`, `source`, `rows`). The scrolly reuses the identical config shape.

- [ ] **Step 2: Write `scripts/produce.mjs`**

```js
// produce(configPath, outDir): build the single-file scrolly HTML with the config baked in.
//   bun scripts/produce.mjs <config.json> <outDir>
import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const configPath = process.argv[2];
const outDir = process.argv[3];
if (!configPath || !outDir) {
  console.error("usage: produce.mjs <config.json> <outDir>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
execFileSync("bunx", ["vite", "build"], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, CONFIG: configPath },
});
const out = join(outDir, "scrolly.html");
copyFileSync(join(root, "dist", "index.html"), out);
console.log("PRODUCE_RESULT " + JSON.stringify({ scrolly: out }));
```

- [ ] **Step 3: Build once to confirm it compiles**

Run: `cd skills/scrolly && export $(grep VITE_MAPTILER_KEY ../../.env) && CONFIG=assets/sample-data/scrolly.json bunx vite build 2>&1 | tail -3`
Expected: "built in …" with a single `dist/index.html` (no separate JS chunks — vite-plugin-singlefile inlines).

- [ ] **Step 4: Commit**

```bash
git add skills/scrolly/assets/sample-data/scrolly.json skills/scrolly/scripts/produce.mjs
git commit -m "feat(scrolly): sample config + produce.mjs (single-file scrolly.html)"
```

---

### Task 5: `audit-scrolly` (pure) + conformance + browser scroll smoke

**Files:**
- Create: `skills/scrolly/src/conformance.ts`
- Create: `skills/scrolly/tests/conformance.test.ts`
- Create: `skills/scrolly/scripts/audit-scrolly.mjs`
- Create: `skills/scrolly/scripts/smoke.mjs`

**Interfaces:**
- Consumes: `mapStoryToChapters` + `ScrollyStory`, `computeChoropleth` + `deriveMapStory`.
- Produces: `export function checkScrollyConformance(story: ScrollyStory, beatCount: number): string[]`.

- [ ] **Step 1: Write the failing conformance test**

Create `skills/scrolly/tests/conformance.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { checkScrollyConformance } from "../src/conformance";
import type { ScrollyStory } from "../src/chapters";

const ok: ScrollyStory = {
  title: "Renewables across Europe",
  visual: "map",
  steps: [
    { id: "a", visual: "map", action: "flyTo", ref: 0, prose: "Intro" },
    { id: "b", visual: "map", action: "flyTo", ref: 1, prose: "Norway" },
    { id: "c", visual: "map", action: "flyTo", ref: 2, prose: "Poland" },
  ],
};

describe("checkScrollyConformance", () => {
  it("passes a well-formed story", () => {
    expect(checkScrollyConformance(ok, 3)).toEqual([]);
  });
  it("flags fewer than 3 steps", () => {
    const r = checkScrollyConformance({ ...ok, steps: ok.steps.slice(0, 2) }, 3);
    expect(r.some((v) => /step/i.test(v))).toBe(true);
  });
  it("flags an empty-prose step", () => {
    const bad = { ...ok, steps: [...ok.steps, { id: "d", visual: "map", action: "flyTo", ref: 3, prose: "  " } as const] };
    expect(checkScrollyConformance(bad, 4).some((v) => /prose/i.test(v))).toBe(true);
  });
  it("flags a map step whose beat ref is out of range", () => {
    const bad = { ...ok, steps: [...ok.steps, { id: "d", visual: "map", action: "flyTo", ref: 9, prose: "x" } as const] };
    expect(checkScrollyConformance(bad, 4).some((v) => /ref|range/i.test(v))).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd skills/scrolly && bun test tests/conformance.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/conformance.ts`**

```ts
import type { ScrollyStory } from "./chapters";

// Render-free conformance for a scrolly story. beatCount = the number of map
// beats the map steps' refs must index into.
export function checkScrollyConformance(
  story: ScrollyStory,
  beatCount: number,
): string[] {
  const v: string[] = [];
  if (!story.title?.trim()) v.push("missing story title");
  if (story.steps.length < 3)
    v.push(`only ${story.steps.length} steps — a scrolly needs at least 3`);
  const ids = new Set<string>();
  for (const s of story.steps) {
    if (!s.prose?.trim()) v.push(`step "${s.id}" has empty prose`);
    if (ids.has(s.id)) v.push(`duplicate step id "${s.id}"`);
    ids.add(s.id);
    if (s.visual === "map") {
      const r = typeof s.ref === "number" ? s.ref : NaN;
      if (!Number.isInteger(r) || r < 0 || r >= beatCount)
        v.push(`map step "${s.id}" ref ${s.ref} out of beat range [0,${beatCount})`);
    }
  }
  return v;
}
```

- [ ] **Step 4: Run the conformance tests**

Run: `cd skills/scrolly && bun test tests/conformance.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Write `scripts/audit-scrolly.mjs`** (render-free gate, mirrors map-native's `audit-story.mjs`)

```js
// Deterministic scrolly audit: builds the story from the sample config and asserts
// the narrative invariants (≥3 steps, prose on every step, refs in beat range). No render.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeChoropleth } from "../../map-native/src/choropleth-geo.ts";
import { deriveMapStory } from "../../map-native/src/map-story.ts";
import { mapStoryToChapters } from "../src/chapters.ts";
import { checkScrollyConformance } from "../src/conformance.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const config = JSON.parse(readFileSync(join(root, "assets/sample-data/scrolly.json"), "utf8"));
const world = JSON.parse(readFileSync(join(root, "../map-native/assets/geo/world.geojson"), "utf8"));

const layout = computeChoropleth(config, world, "iso_a3", { bins: 5, scaleType: "sequential" });
const beats = deriveMapStory(layout, world, "iso_a3", {
  title: config.title, insight: config.insight ?? config.title, unit: config.valueUnit ?? "",
});
const story = mapStoryToChapters(beats, { title: config.title, source: config.source });
const problems = checkScrollyConformance(story, beats.length);
if (problems.length) {
  console.error("✗ scrolly audit FAILED:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`✓ scrolly audit GREEN — ${story.steps.length} steps, all prose+refs valid.`);
```

- [ ] **Step 6: Write `scripts/smoke.mjs`** (real-browser scroll smoke, Playwright — mirrors map-native's `snap-proof.mjs`)

```js
// Loads the built dist/index.html in a browser, scrolls through the steps, and asserts:
//  (1) the sticky graphic stays pinned (its bounding box top stays ~0 across scroll),
//  (2) the map camera changes between the first step and a later step (scroll drives the map).
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const url = pathToFileURL(join(root, "dist", "index.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__map__ && window.__map__.loaded?.(), { timeout: 60000 });

const centerAt = async () => {
  return await page.evaluate(() => {
    const c = window.__map__.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: window.__map__.getZoom() };
  });
};
const before = await centerAt();
// Scroll to the last step.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2500); // let flyTo settle
const after = await centerAt();

const moved =
  Math.abs(after.lng - before.lng) > 0.5 ||
  Math.abs(after.lat - before.lat) > 0.5 ||
  Math.abs(after.zoom - before.zoom) > 0.3;
if (!moved) {
  console.error(`✗ scroll smoke FAILED: camera did not change (before ${JSON.stringify(before)}, after ${JSON.stringify(after)})`);
  process.exit(1);
}
console.log(`✓ scroll smoke GREEN — camera moved on scroll (${JSON.stringify(before)} → ${JSON.stringify(after)}).`);
await browser.close();
```

Add `"audit:story"`-style scripts to `package.json` if not present: `"audit:scrolly": "bun scripts/audit-scrolly.mjs"`, `"smoke": "bun scripts/smoke.mjs"`.

- [ ] **Step 7: Run the render-free audit**

Run: `cd skills/scrolly && bun run audit:scrolly`
Expected: `✓ scrolly audit GREEN — 5 steps, all prose+refs valid.` (the sample mapStory yields 5 beats → 5 steps).

- [ ] **Step 8: Commit**

```bash
git add skills/scrolly/src/conformance.ts skills/scrolly/tests/conformance.test.ts skills/scrolly/scripts/audit-scrolly.mjs skills/scrolly/scripts/smoke.mjs skills/scrolly/package.json
git commit -m "feat(scrolly): conformance + render-free audit + browser scroll smoke"
```

---

### Task 6: Produce + verify + proof + SKILL.md

**Files:**
- Output: `skills/scrolly/output-proof/scrolly.html`
- Create: `skills/scrolly/SKILL.md`

**Interfaces:** the full pipeline (Tasks 1–5).

- [ ] **Step 1: Produce the sample scrolly**

Run (key sourced from `/atelier/.env`, never logged):
```bash
cd skills/scrolly && set -a && . ../../.env && set +a \
  && bun scripts/produce.mjs assets/sample-data/scrolly.json output-proof
```
Expected: `PRODUCE_RESULT {"scrolly":"output-proof/scrolly.html"}`, a single self-contained HTML.

- [ ] **Step 2: Run the browser scroll smoke against the build**

Run: `cd skills/scrolly && set -a && . ../../.env && set +a && bun run smoke`
Expected: `✓ scroll smoke GREEN — camera moved on scroll …`. (If the build isn't present, run Step 1 first.)

- [ ] **Step 3: Full test gate**

Run: `cd skills/scrolly && bun test && bun run audit:scrolly`
Expected: all tests pass (chapters 3, conformance 4) and the audit is GREEN.

- [ ] **Step 4: Write `skills/scrolly/SKILL.md`**

A concise engine doc mirroring `skills/map-native/SKILL.md`'s shape: name `scrolly`, a keyword-rich description (scrollytelling, scroll, sticky, waypoints, flyTo, chapters, map scrolly, narrative, interactive, newsroom); the **orchestrator** principle (owns scroll, imports renderers); the `chapters[]` step model + how `chart`/`image` plug in later; the v1 map path (reuses `mapStory`); the inherited interactive best-practices (no manual controls in scrolly, reduced-motion, no focus theft); the build/produce/audit/smoke commands; the file map. State clearly that the VIDEO comes from map-native's `mapStory` (one storyboard, two outputs).

- [ ] **Step 5: Commit**

```bash
git add skills/scrolly/output-proof/scrolly.html skills/scrolly/SKILL.md
git commit -m "feat(scrolly): produce sample proof + engine SKILL.md"
```

## Notes for the executor

- Build `ScrollyMap.tsx` from the `ChoroplethStory.tsx` + `ChoroplethMap.tsx` skeletons — they already solve map init, the water recolour, the choropleth fill + highlight stroke, the centroid + `CountryLabel` annotation, and the data-only hover. The scrolly delta is: driven by `currentStep` (not a Remotion frame), real animated `flyTo` (not `jumpTo`), reduced-motion fallback, and no manual controls.
- Import map-native pieces by RELATIVE path (`../../map-native/src/...`, `../../map-native/assets/...`). Never copy them.
- The `react-dom` `TS2688` types issue (if it surfaces) is the same pre-existing config quirk as map-native — add `@types/react-dom` to devDependencies (already in the package.json above); only chase NEW errors in your own files.
- Never run the browser smoke more than needed (MapTiler tile rate limits). The render-free `audit:scrolly` is the primary gate.
- Never commit or log the MapTiler key.
