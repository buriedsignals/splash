# map-native choropleth (slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `map-native` engine and prove it on the **choropleth** in three formats (static PNG + interactive HTML + Remotion video), seeded from Tom's `map-explainer` MapTiler+Remotion harness.

**Architecture:** A new `skills/map-native/` mirroring `chart-native`. A framework-free pure core (`choropleth-geo.ts`: join CSV↔preset regions, bins, CVD-safe scale, data bbox/`fitBounds`, no-data) drives a React `ChoroplethMap` rendered by the **MapTiler SDK** (`@maptiler/sdk`). The video format reuses Tom's per-frame harness (`delayRender → setData/setPaintProperty → map.once('idle', continueRender)`, `--gl=angle`, `preserveDrawingBuffer:true`); static = screenshot the settled map; interactive = the same SDK build as single-file HTML. A conformance guard + real-browser audit + `produce` complete the discipline.

**Tech Stack:** Bun, bun:test, TypeScript, React 19, `@maptiler/sdk`, MapLibre (via the SDK), Remotion 4, Vite + vite-plugin-singlefile, Playwright, `@turf/turf`.

## Global Constraints

- Reuse Tom's harness verbatim where it is generic: init the MapTiler map ONCE (ref guard); per video frame `delayRender → setData/setPaintProperty/jumpTo → map.once('idle', continueRender) → triggerRepaint`; `preserveDrawingBuffer:true`; render `--gl=angle --concurrency=1 --timeout=120000`. Reference: `~/Downloads/map-animation/map-explainer/references/architecture.md` §1.
- The colour scale MUST be CVD-safe: a monotonic-luminance **sequential** ramp (reuse `chart-native` BLUES) or a **diverging** pair around a midpoint. Never a rainbow.
- A discrete **bin legend is mandatory** (a choropleth is undecodable without it).
- **No-data** regions render neutral grey AND are named "No data" in the legend — never charted as 0.
- **basemap-fit:** `fitBounds` to the joined-data extent (EU story → Europe, not the world). Enforced by the core's bounds + the audit.
- Each preset declares its canonical join key (`world`→ISO-A3; `fr-departments`→dept code; `us-states`→2-letter postal). Unmatched CSV rows are REPORTED, never silently dropped.
- MapTiler key in `/splash/.env`: `REMOTION_MAPTILER_KEY` (video/server) + `VITE_MAPTILER_KEY` (web). Gitignored; never logged or committed.
- Code/comments/commits in English. No Claude/Anthropic mention in any artifact.

---

### Task 1: Scaffold `map-native` + port and verify Tom's MapTiler+Remotion harness

**Goal:** prove the MapTiler-SDK-in-Remotion harness renders in our repo before building the choropleth on it (the only real integration risk). Deliverable: a rendered mp4 from Tom's sample in `skills/map-native`.

**Files:**
- Create: `skills/map-native/package.json`, `skills/map-native/tsconfig.json`, `skills/map-native/.gitignore`
- Create: `skills/map-native/remotion/` (index.ts, Root.tsx) + `src/components/RiverReveal.tsx`, `src/components/CountryLabel.tsx`, `src/theme/tokens.ts`, `src/geo/{yarlung-flow,country-meta}.json`, `public/geo/borders.geojson` — copied from Tom's assets
- Create: `skills/map-native/scripts/prep-geo.mjs` (copied)

- [ ] **Step 1: Scaffold the package**

```bash
mkdir -p skills/map-native/{src/components,src/theme,src/geo,public/geo,remotion/src,scripts,tests,assets}
cd skills/map-native
cat > package.json <<'JSON'
{
  "name": "map-native",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" },
  "dependencies": {
    "@maptiler/sdk": "3.6.0",
    "@turf/turf": "7.2.0",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "remotion": "4.0.482",
    "@remotion/cli": "4.0.482",
    "@remotion/google-fonts": "4.0.482"
  },
  "devDependencies": {
    "@types/react": "19.2.17",
    "typescript": "6.0.3",
    "vite": "8.1.0",
    "@vitejs/plugin-react": "6.0.3",
    "vite-plugin-singlefile": "2.3.3",
    "playwright": "1.61.1"
  }
}
JSON
printf "node_modules\ndist\nout\n.DS_Store\n" > .gitignore
bun install
```

- [ ] **Step 2: Copy Tom's seed assets verbatim**

Tom's source: `/Users/rmdms/Downloads/map-animation/map-explainer/`. Copy per the four-file contract in its `assets/README.md`:

```bash
SRC=/Users/rmdms/Downloads/map-animation/map-explainer
cp $SRC/assets/RiverReveal.tsx       src/components/RiverReveal.tsx
cp $SRC/assets/CountryLabel.tsx       src/components/CountryLabel.tsx
cp $SRC/assets/tokens.ts              src/theme/tokens.ts
cp $SRC/assets/example-Root.tsx       remotion/src/Root.tsx
cp $SRC/assets/sample-data/yarlung-flow.json   src/geo/yarlung-flow.json
cp $SRC/assets/sample-data/country-meta.json   src/geo/country-meta.json
cp $SRC/scripts/prep-geo.mjs          scripts/prep-geo.mjs
# borders.geojson: if absent in sample-data, generate via prep-geo (see its CONFIG) or copy the sample
cp $SRC/assets/sample-data/borders.geojson public/geo/borders.geojson 2>/dev/null || true
```

Create `remotion/src/index.ts`:

```ts
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";
registerRoot(RemotionRoot);
```

Fix the import paths in `Root.tsx`/`RiverReveal.tsx` so they line up with this layout (the README's "country-key contract": the lowercase keys must match across `prep-geo.mjs` COUNTRIES, `RiverReveal` ORDER, and `tokens.ts`).

- [ ] **Step 3: Set the MapTiler key**

Add to `/splash/.env` (ask the operator for a free MapTiler key if absent):

```
REMOTION_MAPTILER_KEY=<key>
VITE_MAPTILER_KEY=<key>
```

- [ ] **Step 4: Render Tom's sample to verify the harness**

```bash
cd skills/map-native
set -a; source /Users/rmdms/Sites/Professional/splash/.env; set +a
npx remotion render remotion/src/index.ts MapExplainer out/harness-check.mp4 --gl=angle --concurrency=1 --timeout=120000
```
Expected: `out/harness-check.mp4` is written; opening it shows the Yarlung river drawing on with countries lighting up (matches Tom's `assets/preview.png`). If the map is blank, the key or `--gl=angle`/`preserveDrawingBuffer` is wrong — fix before proceeding (this is the de-risk gate).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native
git commit -m "feat(map-native): scaffold engine + port Tom's map-explainer MapTiler+Remotion harness (renders the sample)"
```

---

### Task 2: Pure core `choropleth-geo.ts` (the TDD heart)

**Files:**
- Create: `skills/map-native/src/choropleth-geo.ts`
- Test: `skills/map-native/tests/choropleth-geo.test.ts`

**Interfaces:**
- Produces:
  - `interface ChoroplethData { regionKey: string; valueField: string; rows: Record<string, string|number>[] }`
  - `interface ChoroplethOptions { bins?: number; scaleType?: "sequential"|"diverging"; midpoint?: number }`
  - `computeChoropleth(data, features: GeoJSON.FeatureCollection, joinKey: string, options?) : ChoroplethLayout`
  - `interface ChoroplethLayout { joined: { key: string; value: number|null }[]; bins: { min: number; max: number; color: string }[]; bounds: [number,number,number,number]; noData: string[]; unmatched: string[]; scaleType: "sequential"|"diverging" }`
- Consumes: `@turf/turf` (`bbox`), and a colour ramp from `src/theme/scale.ts` (created here).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "bun:test";
import { computeChoropleth, type ChoroplethData } from "../src/choropleth-geo";

const features = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { iso_a3: "FRA" }, geometry: { type: "Polygon", coordinates: [[[2,48],[3,48],[3,49],[2,49],[2,48]]] } },
    { type: "Feature", properties: { iso_a3: "DEU" }, geometry: { type: "Polygon", coordinates: [[[10,50],[11,50],[11,51],[10,51],[10,50]]] } },
    { type: "Feature", properties: { iso_a3: "ESP" }, geometry: { type: "Polygon", coordinates: [[[-4,40],[-3,40],[-3,41],[-4,41],[-4,40]]] } },
  ],
} as any;
const data: ChoroplethData = {
  regionKey: "code", valueField: "share",
  rows: [{ code: "FRA", share: 25 }, { code: "DEU", share: 58 }, { code: "ESP", share: 44 }],
};

describe("computeChoropleth", () => {
  it("joins rows to features by the join key", () => {
    const l = computeChoropleth(data, features, "iso_a3");
    expect(l.joined.find((j) => j.key === "DEU")!.value).toBe(58);
  });
  it("marks a region with no data as null and lists it in noData", () => {
    const l = computeChoropleth({ ...data, rows: data.rows.slice(0, 2) }, features, "iso_a3");
    expect(l.joined.find((j) => j.key === "ESP")!.value).toBeNull();
    expect(l.noData).toContain("ESP");
  });
  it("reports unmatched CSV rows (a data error, not silent drop)", () => {
    const l = computeChoropleth({ ...data, rows: [...data.rows, { code: "XXX", share: 5 }] }, features, "iso_a3");
    expect(l.unmatched).toContain("XXX");
  });
  it("produces the requested number of sequential bins, ascending", () => {
    const l = computeChoropleth(data, features, "iso_a3", { bins: 3 });
    expect(l.bins).toHaveLength(3);
    for (let i = 1; i < l.bins.length; i++) expect(l.bins[i].min).toBeGreaterThanOrEqual(l.bins[i - 1].max);
  });
  it("computes a non-empty bbox of the joined regions (basemap-fit)", () => {
    const l = computeChoropleth(data, features, "iso_a3");
    expect(l.bounds[2]).toBeGreaterThan(l.bounds[0]);
    expect(l.bounds[3]).toBeGreaterThan(l.bounds[1]);
  });
  it("uses a diverging scale around the midpoint when asked", () => {
    const l = computeChoropleth(data, features, "iso_a3", { scaleType: "diverging", midpoint: 44 });
    expect(l.scaleType).toBe("diverging");
  });
  it("throws on a non-numeric value", () => {
    expect(() => computeChoropleth({ ...data, rows: [{ code: "FRA", share: "n/a" }] }, features, "iso_a3")).toThrow(/invalid/);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd skills/map-native && bun test tests/choropleth-geo.test.ts`
Expected: FAIL — `computeChoropleth` is not defined.

- [ ] **Step 3: Implement `src/theme/scale.ts` then `src/choropleth-geo.ts`**

`src/theme/scale.ts` — the CVD-safe ramps (BLUES from chart-native + a diverging pair):

```ts
// Monotonic-luminance sequential ramp (CVD-safe), 5 anchor steps, light→dark blue.
export const BLUES = ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"];
// Diverging CVD-safe (orange ↔ blue) around a midpoint.
export const DIVERGING = ["#b35806", "#f1a340", "#f7f7f7", "#92c5de", "#2166ac"];
export function rampColor(t: number, ramp: string[]): string {
  const i = Math.max(0, Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1))));
  return ramp[i];
}
```

`src/choropleth-geo.ts`:

```ts
import { bbox } from "@turf/turf";
import { BLUES, DIVERGING } from "./theme/scale";

export interface ChoroplethData { regionKey: string; valueField: string; rows: Record<string, string | number>[] }
export interface ChoroplethOptions { bins?: number; scaleType?: "sequential" | "diverging"; midpoint?: number }
export interface ChoroplethLayout {
  joined: { key: string; value: number | null }[];
  bins: { min: number; max: number; color: string }[];
  bounds: [number, number, number, number];
  noData: string[];
  unmatched: string[];
  scaleType: "sequential" | "diverging";
}

export function computeChoropleth(
  data: ChoroplethData,
  features: GeoJSON.FeatureCollection,
  joinKey: string,
  options: ChoroplethOptions = {},
): ChoroplethLayout {
  const nBins = options.bins ?? 5;
  const scaleType = options.scaleType ?? "sequential";
  const ramp = scaleType === "diverging" ? DIVERGING : BLUES;

  const byKey = new Map<string, number>();
  for (const r of data.rows) {
    const v = Number(r[data.valueField]);
    if (Number.isNaN(v)) throw new Error(`invalid choropleth value: ${r[data.valueField]}`);
    byKey.set(String(r[data.regionKey]), v);
  }
  const featureKeys = new Set(
    features.features.map((f) => String(f.properties?.[joinKey])),
  );
  const unmatched = [...byKey.keys()].filter((k) => !featureKeys.has(k));

  const joined = features.features.map((f) => {
    const key = String(f.properties?.[joinKey]);
    const value = byKey.has(key) ? byKey.get(key)! : null;
    return { key, value };
  });
  const noData = joined.filter((j) => j.value === null).map((j) => j.key);

  const values = joined.map((j) => j.value).filter((v): v is number => v !== null);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const bins = Array.from({ length: nBins }, (_, i) => {
    const lo = min + (span * i) / nBins;
    const hi = min + (span * (i + 1)) / nBins;
    return { min: lo, max: hi, color: ramp[Math.round((i / (nBins - 1)) * (ramp.length - 1))] };
  });

  // bbox of regions that HAVE data → basemap-fit to the story extent
  const withData = {
    type: "FeatureCollection",
    features: features.features.filter((f) => byKey.has(String(f.properties?.[joinKey]))),
  } as GeoJSON.FeatureCollection;
  const bounds = bbox(withData.features.length ? withData : features) as [number, number, number, number];

  return { joined, bins, bounds, noData, unmatched, scaleType };
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd skills/map-native && bun test tests/choropleth-geo.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/choropleth-geo.ts skills/map-native/src/theme/scale.ts skills/map-native/tests/choropleth-geo.test.ts
git commit -m "feat(map-native): choropleth pure core — join, bins, CVD-safe scale, basemap-fit bbox, no-data + unmatched report"
```

---

### Task 3: Conformance `checkChoroplethConformance`

**Files:**
- Create: `skills/map-native/src/conformance.ts`
- Test: `skills/map-native/tests/conformance.test.ts`

**Interfaces:**
- Consumes: WCAG helpers — port `relativeLuminance`/`contrastRatio` from `../../chart-native/src/core/conformance.ts` (copy the two pure functions into this file; do not cross-import across skills).
- Produces: `checkChoroplethConformance(input, textColors): string[]` returning violations (empty = conformant).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "bun:test";
import { checkChoroplethConformance } from "../src/conformance";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const ok = {
  title: "Renewables power most of Europe's north, less of its south",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  scaleColors: ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"],
  scaleType: "sequential" as const,
  hasLegend: true,
  regionsWithData: 24,
  regionsTotal: 27,
  boundsNonEmpty: true,
};

describe("checkChoroplethConformance", () => {
  it("passes a conformant choropleth", () => { expect(checkChoroplethConformance(ok, text)).toEqual([]); });
  it("flags a missing legend", () => {
    expect(checkChoroplethConformance({ ...ok, hasLegend: false }, text).some((m) => m.includes("legend"))).toBe(true);
  });
  it("flags empty bounds (basemap-fit impossible)", () => {
    expect(checkChoroplethConformance({ ...ok, boundsNonEmpty: false }, text).some((m) => m.includes("bounds"))).toBe(true);
  });
  it("flags zero regions with data", () => {
    expect(checkChoroplethConformance({ ...ok, regionsWithData: 0 }, text).some((m) => m.includes("no region"))).toBe(true);
  });
  it("flags a non-CVD-safe (too few) scale", () => {
    expect(checkChoroplethConformance({ ...ok, scaleColors: ["#ff0000"] }, text).some((m) => m.includes("scale"))).toBe(true);
  });
  it("flags a year-range title (not an insight)", () => {
    expect(checkChoroplethConformance({ ...ok, title: "2015–2024" }, text).some((m) => m.includes("insight") || m.includes("year range"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: FAIL — `checkChoroplethConformance` not defined.

- [ ] **Step 3: Implement `src/conformance.ts`**

```ts
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function checkChoroplethConformance(
  input: {
    title: string;
    source: { name?: string; url?: string };
    scaleColors: string[];
    scaleType: "sequential" | "diverging";
    hasLegend: boolean;
    regionsWithData: number;
    regionsTotal: number;
    boundsNonEmpty: boolean;
  },
  textColors: { text: string[]; bg: string },
): string[] {
  const v: string[] = [];
  const title = input.title?.trim() ?? "";
  if (title.length < 12) v.push(`title too short to be an insight: "${title}"`);
  if (/^\d{4}(\s*[–-]\s*\d{4})?$/.test(title)) v.push(`title is a year range, not an insight: "${title}"`);
  if (!input.source?.name?.trim()) v.push("missing source name");
  if (!input.source?.url?.trim()) v.push("missing source url");
  for (const t of textColors.text) {
    const r = contrastRatio(t, textColors.bg);
    if (r < 4.5) v.push(`text colour ${t} contrast ${r.toFixed(2)}:1 on ${textColors.bg} < 4.5:1`);
  }
  if (!input.hasLegend) v.push("choropleth needs a legend (the map is undecodable without it)");
  if (!input.boundsNonEmpty) v.push("empty data bounds — basemap-fit impossible");
  if (input.regionsWithData < 1) v.push("no region has data");
  if (input.scaleColors.length < 3) v.push("scale has too few steps to read as a CVD-safe ramp");
  return v;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `cd skills/map-native && bun test tests/conformance.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "feat(map-native): checkChoroplethConformance — insight title, source, WCAG, legend, basemap-fit, CVD-safe scale"
```

---

### Task 4: `ChoroplethMap` component + interactive single-file HTML

**Goal:** render the choropleth with the MapTiler SDK from the core's layout, with a legend + hover popup; ship it as a single-file interactive HTML. Implement against the LIVE SDK following Tom's harness (`references/architecture.md` §1) — verify by driving the browser, not just a still.

**Files:**
- Create: `skills/map-native/src/ChoroplethMap.tsx`, `skills/map-native/src/mount.tsx`, `skills/map-native/vite.config.ts`
- Create: `skills/map-native/assets/geo/world.geojson` (Natural Earth admin-0 simplified, property `iso_a3`) + `skills/map-native/assets/sample-data/choropleth.json` (the sample config + CSV)
- Create: `skills/map-native/scripts/snap-proof.mjs` (port from chart-native, MapTiler-aware: wait for `map.once('idle')` before screenshot)

**Interfaces:**
- Consumes: `computeChoropleth` (Task 2).
- Produces: `ChoroplethMap({ config, progress, interactive })` — builds a `maptiler.Map`, adds a GeoJSON fill layer painted by the core's `bins` (a `fill-color` step expression keyed on the joined value), greys `noData`, `fitBounds(bounds)`, renders the legend (HTML), and on `interactive` adds a hover popup (region + value).

- [ ] **Step 1: Sample config + world boundaries**

Create `assets/sample-data/choropleth.json`:

```json
{
  "title": "Renewables power most of Europe's north, far less of its south",
  "unit": "share of electricity from renewables, 2024 (%)",
  "basemap": "world",
  "regionKey": "code",
  "valueField": "share",
  "source": { "name": "Ember Global Electricity Review 2025, via Our World in Data", "url": "https://ourworldindata.org/grapher/share-electricity-renewables" },
  "rows": [
    { "code": "NOR", "share": 99 }, { "code": "SWE", "share": 68 }, { "code": "DEU", "share": 59 },
    { "code": "FRA", "share": 27 }, { "code": "ESP", "share": 44 }, { "code": "ITA", "share": 41 },
    { "code": "POL", "share": 21 }, { "code": "GBR", "share": 48 }
  ]
}
```

Download Natural Earth admin-0 (simplified) to `assets/geo/world.geojson`, property `iso_a3` per country (note the source in a `assets/geo/README.md`, crediting Natural Earth). Verify it loads and has `iso_a3`:

```bash
cd skills/map-native && bun -e 'const g=await Bun.file("assets/geo/world.geojson").json(); console.log(g.features.length, "features; sample iso_a3:", g.features[0].properties.iso_a3)'
```
Expected: a feature count > 150 and a 3-letter ISO printed.

- [ ] **Step 2: Implement `ChoroplethMap.tsx` (against the live SDK)**

Build the map with `@maptiler/sdk` (style `MapStyle.DATAVIZ.LIGHT`, `apiKey` from `import.meta.env.VITE_MAPTILER_KEY`). On `load`: add the `world.geojson` source; compute the layout with `computeChoropleth(config, world, "iso_a3", {...})`; add a `fill` layer whose `fill-color` is a `step`/`match` expression mapping each region's joined value to its bin colour and `noData` to grey `#e0e0e0`; `map.fitBounds(layout.bounds, { padding: 24 })`. Render the legend as an HTML `<div>` (the bins + a "No data" swatch). When `interactive`, add `map.on('mousemove', 'choropleth-fill', …)` → a `maptiler.Popup` with the region name + value; `mouseleave` removes it. Follow Tom's init-once ref-guard pattern from `references/architecture.md` §1. Strip clutter on load (remove `symbol` place-label layers) as Tom does.

- [ ] **Step 3: `mount.tsx` + `vite.config.ts` + interactive build**

`mount.tsx` renders `<ChoroplethMap config={sample} interactive />` (reading `__CONFIG__` if injected, else the sample). `vite.config.ts` mirrors chart-native's (the `__CONFIG__`/`__INTERACTIVE__` defines + `viteSingleFile` when `INTERACTIVE=1`, output `dist/interactive`). Build:

```bash
cd skills/map-native && VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY INTERACTIVE=1 bunx vite build
```
Expected: `dist/interactive/index.html` (single file).

- [ ] **Step 4: Verify interactive LIVE (hover), not just a still**

Port `snap-proof.mjs` to: load `dist/interactive/index.html`, `await page.waitForFunction(...)` until the map is idle, move the mouse over a region, assert a `.maplibregl-popup`/`.tooltip` appears with the value, screenshot to `output-proof/choropleth/interactive.png`.

```bash
cd skills/map-native && bun scripts/snap-proof.mjs
```
Expected: logs the hovered region + value; `interactive.png` shows the choropleth + legend + a popup. (The "a PNG can't show a hover" lesson — verify the live behaviour.)

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/ChoroplethMap.tsx skills/map-native/src/mount.tsx skills/map-native/vite.config.ts skills/map-native/assets skills/map-native/scripts/snap-proof.mjs skills/map-native/output-proof/choropleth/interactive.png
git commit -m "feat(map-native): ChoroplethMap (MapTiler SDK) + interactive single-file HTML with legend + hover popup"
```

---

### Task 5: Static screenshot + Remotion choropleth reveal (3 video formats)

**Files:**
- Create: `skills/map-native/remotion/src/ChoroplethReveal.tsx` + add 3 `<Composition>`s to `remotion/src/Root.tsx` (Reveal 1280×720, Square 1080×1080, Portrait 1080×1350)
- Create/modify: `skills/map-native/scripts/snap-static.mjs` (build static, screenshot the settled map)

**Interfaces:**
- Consumes: `ChoroplethMap` (Task 4), the harness pattern from Task 1.
- Produces: `ChoroplethReveal({ scale, config })` — a Remotion composition that drives `progress` (0→1) so the choropleth reveals (bins bloom in by ascending value / regions fade from grey to their bin colour), using Tom's per-frame `delayRender → setPaintProperty('choropleth-fill','fill-opacity',…) → map.once('idle', continueRender)` gate.

- [ ] **Step 1: Static snap (settled map → PNG)**

`snap-static.mjs`: `CHART`-less static build (`bunx vite build`, no `INTERACTIVE`), serve `dist/static` over a tiny http server, Playwright loads it, `waitForFunction` until idle, screenshot `output-proof/choropleth/static.png`.

```bash
cd skills/map-native && VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY bunx vite build && bun scripts/snap-static.mjs
```
Expected: `static.png` — the choropleth at full reveal (all regions in their bin colour, legend, Europe-fit).

- [ ] **Step 2: Implement `ChoroplethReveal.tsx` + Root compositions**

The composition wraps `ChoroplethMap` with `progress = interpolate(frame/(durationInFrames-1), [HOLD_IN, 1-HOLD_OUT], [0,1])`. The reveal: regions ramp `fill-opacity` 0→1 in ascending value order (a stagger), per-frame via the harness gate. Add three `<Composition>`s (Reveal/Square/Portrait) to `Root.tsx` beside `MapExplainer`, `width/height` per format, `defaultProps={{scale}}`.

- [ ] **Step 3: Render the three videos**

```bash
cd skills/map-native && set -a; source /splash/.env; set +a
for C in ChoroplethReveal ChoroplethSquare ChoroplethPortrait; do \
  npx remotion render remotion/src/index.ts $C output-proof/choropleth/$C.mp4 --gl=angle --concurrency=1 --timeout=120000; done
```
Expected: three mp4s; the choropleth regions bloom in ascending-value order, blank at the first frame (reveal-from-nothing).

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/remotion skills/map-native/scripts/snap-static.mjs skills/map-native/output-proof/choropleth
git commit -m "feat(map-native): choropleth static screenshot + Remotion reveal (landscape/square/portrait)"
```

---

### Task 6: Audit + `produce(config, outDir)`

**Files:**
- Create: `skills/map-native/scripts/audit.mjs` + `skills/map-native/scripts/audit-cases.mjs` (sample + a stress: world + a dominant outlier + a no-data region)
- Create: `skills/map-native/scripts/produce.mjs`
- Modify: `skills/map-native/package.json` (`"audit"` script)

**Interfaces:**
- Consumes: the interactive build + `snap` scripts.
- Produces: `produce(config, outDir)` → `{ static, interactive, landscape, square, portrait }`.

- [ ] **Step 1: Audit harness**

Port `chart-native/scripts/audit.mjs`: render the choropleth interactive build × viewports in a real browser (wait for map idle), assert the title/subtitle/source/legend text boxes are in bounds and non-overlapping, AND the rendered map bounds are within the data extent (read the map's `getBounds()` and assert it is not the whole world for a regional dataset — compare to `layout.bounds` ± a zoom-padding tolerance). Add `"audit": "bun scripts/audit.mjs"` to package.json.

```bash
cd skills/map-native && bun run audit
```
Expected: `✓ ALL GREEN` — legend/title/source in bounds, basemap fits the data extent.

- [ ] **Step 2: `produce.mjs`**

Port `chart-native/scripts/produce.mjs`: given `(configPath, outDir)`, inject `CONFIG`, build static + interactive, snap both, render the 3 videos with `--props`, return the paths as `PRODUCE_RESULT` JSON.

```bash
cd skills/map-native && bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/map-out all
```
Expected: 5 outputs written; `PRODUCE_RESULT {...}` printed.

- [ ] **Step 3: Commit**

```bash
git add skills/map-native/scripts/audit.mjs skills/map-native/scripts/audit-cases.mjs skills/map-native/scripts/produce.mjs skills/map-native/package.json
git commit -m "feat(map-native): real-browser audit (in-bounds + basemap-fit) + produce(config, outDir) → 5 outputs"
```

---

### Task 7: `map-native` engine `SKILL.md` (recipe + roadmap)

**Files:**
- Create: `skills/map-native/SKILL.md`

- [ ] **Step 1: Write the SKILL.md**

Mirror `chart-native/SKILL.md`: frontmatter `name: map-native` + a description listing the map-type roadmap; a "Foundation" section (the MapTiler+Remotion harness from Tom's map-explainer, the determinism gate); the recipe (KB-in-header → pure geo-core + tests → component → conformance → audit → produce); the map-type roadmap catalogue (the 9 MapTiler types + Cesium 3D separate, from the design spec); and the three-format/produce notes. Reuse the chart-native recipe wording where it transfers.

- [ ] **Step 2: Verify**

Run: `grep -n "choropleth\|MapTiler\|delayRender\|basemap-fit\|roadmap" skills/map-native/SKILL.md`
Expected: the foundation, recipe, and roadmap terms are present and consistent with the code.

- [ ] **Step 3: Commit**

```bash
git add skills/map-native/SKILL.md
git commit -m "docs(map-native): engine SKILL — foundation (Tom's harness), recipe, and the map-type roadmap"
```

---

## Notes for the implementer

- Paths are relative to `/Users/rmdms/Sites/Professional/splash`.
- Tasks 2 and 3 are pure-core TDD with complete code. Tasks 1, 4, 5, 6 are MapTiler/Remotion integration: implement against the LIVE `@maptiler/sdk` following Tom's `~/Downloads/map-animation/map-explainer/references/architecture.md` §1 (the per-frame `delayRender`/`idle` gate, `--gl=angle`, `preserveDrawingBuffer`), and VERIFY by rendering/driving the browser — not by a unit test that can't exercise WebGL.
- The MapTiler key is a hard prerequisite for Tasks 1, 4, 5, 6 (rendering). If absent, stop and ask the operator (free tier).
- Reuse, don't fork: copy the two WCAG functions into `src/conformance.ts` (Task 3); port the audit/snap/produce scripts from `chart-native/scripts/` rather than re-deriving them.
- Slice 1 ships only the **`world`** boundary preset (ISO-A3). The `fr-departments`, `fr-regions`, `us-states` presets are added later by dropping their GeoJSON into `assets/geo/` and declaring their join key — no engine change.
- Out of scope: the other 8 map types, Cesium 3D, reader-supplied GeoJSON — future slices on this engine.
- Honest limitation: Tasks 1/4/5/6 are live MapTiler+Remotion integration. Their steps give the exact files, the consumed core interface, Tom's reference (`architecture.md` §1), and the render/browser verification that gates them — but the SDK/Remotion code is written against the live library, not transcribed verbatim (specifying unrun WebGL calls would be worse than wrong). The pure-core tasks (2/3) are full TDD.
