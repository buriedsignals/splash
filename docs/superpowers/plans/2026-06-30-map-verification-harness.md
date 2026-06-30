# Map Verification Harness (map-native parity slice 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the chart engine's render-verification harness to maps — a responsive multi-width snap and an a11y snap — wired into `produce.mjs`, so blank-map / off-frame / missing-furniture / a11y regressions fail the pipeline loudly.

**Architecture:** Two new Playwright scripts mirror chart-native's `snap-responsive.mjs`/`snap-a11y.mjs`, adapted for the MapTiler GL canvas: they key off `window.__map__` + the data layer (`choropleth-fill`||`symbol-circles`) instead of SVG marks, and assert the shared `MapFrame` furniture via stable `data-testid` hooks. `produce.mjs` runs both after the interactive build. A small fix adds the missing `role="region"`/`aria-label` to `SymbolMap`.

**Tech Stack:** Bun, Playwright (existing dep), the Vite singlefile interactive build, React.

## Global Constraints

- **Bun only** — scripts run via `bun scripts/...`.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO `Co-Authored-By: Claude`.
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** — the interactive build needs `VITE_MAPTILER_KEY` at build time (`set -a && . ../../.env && set +a` from `skills/map-native/`); never hard-code or log it.
- **Shared scripts work for BOTH map types** — layer detection (`choropleth-fill`||`symbol-circles`) keeps them type-agnostic; verify on both.
- **Verify by running** — the harness is proven by executing it on real symbol + choropleth interactive builds, not by unit tests.

All paths are relative to `skills/map-native/`.

---

### Task 1: `snap-responsive.mjs` + testid hooks + produce wiring

**Files:**
- Modify: `skills/map-native/src/core/MapFrame.tsx` (add `data-testid` to title + source)
- Modify: `skills/map-native/src/SymbolMap.tsx` (add `data-testid="map-legend"` to the legend div)
- Modify: `skills/map-native/src/ChoroplethMap.tsx` (add `data-testid="map-legend"` to the legend div)
- Create: `skills/map-native/scripts/snap-responsive.mjs`
- Modify: `skills/map-native/scripts/produce.mjs` (run the responsive snap)

**Interfaces:**
- Produces: stable selectors `[data-testid="map-title"]`, `[data-testid="map-source"]`, `[data-testid="map-legend"]` used by both snaps (Task 2 reuses them).

- [ ] **Step 1: Add the testid hooks to the furniture**

In `src/core/MapFrame.tsx`, add `data-testid="map-title"` to the title block's outer `<div>` (the one with `top: m, left: m`) and `data-testid="map-source"` to the source `<div>` (the one with `bottom: m, left: m`). Example (the title div opening tag):

```tsx
      <div
        data-testid="map-title"
        style={{
          position: "absolute",
          top: m,
          left: m,
          // …unchanged…
```

and the source div:

```tsx
      <div
        data-testid="map-source"
        style={{
          position: "absolute",
          bottom: m,
          left: m,
          // …unchanged…
```

In `src/SymbolMap.tsx` and `src/ChoroplethMap.tsx`, add `data-testid="map-legend"` to the legend container `<div>` (the one holding the `legendRef`). Example:

```tsx
      <div ref={legendRef} data-testid="map-legend" style={{ /* unchanged */ }} />
```

- [ ] **Step 2: Write `snap-responsive.mjs`**

Create `scripts/snap-responsive.mjs` (the interactive build is a Vite singlefile HTML, so load it via `file://` like the chart script; key off `window.__map__` + the data layer like `snap-static.mjs`):

```js
// Responsive proof for maps: the same interactive embed re-laid-out at several container
// widths. A static PNG can't show that the furniture (title / source / legend) stays
// visible and nothing overflows at narrow widths. Mirrors chart-native's snap-responsive.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? process.argv[2] ?? "/tmp";
const url = pathToFileURL(join(root, "dist", "interactive", "index.html")).href;

const browser = await chromium.launch();
const failures = [];

for (const w of [360, 768, 1100, 1600]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 560 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const m = window.__map__;
      return (
        m &&
        m.getLayer &&
        (m.getLayer("choropleth-fill") || m.getLayer("symbol-circles"))
      );
    },
    { timeout: 30_000 },
  );
  await page.waitForTimeout(2500); // let tiles + reveal settle

  await page
    .locator("#root > div")
    .first()
    .screenshot({ path: join(outDir, `responsive-${w}.png`) });

  const checks = await page.evaluate(() => {
    const inView = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.left >= -1 &&
        r.top >= -1 &&
        r.right <= window.innerWidth + 1 &&
        r.bottom <= window.innerHeight + 1
      );
    };
    return {
      scrollOk:
        document.documentElement.scrollWidth <= window.innerWidth + 1,
      titleOk: inView('[data-testid="map-title"]'),
      sourceOk: !!document.querySelector(
        '[data-testid="map-source"] a[href], [data-testid="map-source"]',
      ),
      legendOk: inView('[data-testid="map-legend"]'),
    };
  });

  console.log(JSON.stringify({ w, ...checks }));
  for (const [k, ok] of Object.entries(checks))
    if (!ok) failures.push(`${w}px: ${k}`);
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error("RESPONSIVE FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("responsive: all widths pass");
```

- [ ] **Step 3: Wire into `produce.mjs`**

In `scripts/produce.mjs`, after the existing `snap-proof.mjs` run, add the responsive snap (same `run(...)` helper + `OUTDIR`):

```js
console.log(`[produce map] snapping responsive…`);
run("bun", ["scripts/snap-responsive.mjs"], { OUTDIR: outDir });
```

- [ ] **Step 4: Run on BOTH types + eyeball the narrowest width**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/system-test/symbol-map static
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/system-test/choropleth-map static
```

Expected: each produce run prints the per-width JSON lines with all checks `true` and "responsive: all widths pass" (a failure exits non-zero and fails produce). READ `/tmp/system-test/symbol-map/responsive-360.png` AND `/tmp/system-test/choropleth-map/responsive-360.png` — confirm at 360px the title, source, and legend are visible and not clipped, and the map fills the frame. If an assertion FAILS or the eyeball shows furniture clipping at 360px, that is a REAL responsive bug — fix it in `MapFrame`/the component (e.g. constrain the title `maxWidth`, reposition the legend) and re-run until green. Do not weaken the assertion to pass.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/MapFrame.tsx skills/map-native/src/SymbolMap.tsx skills/map-native/src/ChoroplethMap.tsx skills/map-native/scripts/snap-responsive.mjs skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): responsive multi-width snap + furniture testids + produce wiring"
```
(NO Claude-Session trailer.)

---

### Task 2: `snap-a11y.mjs` + `SymbolMap` region a11y + produce wiring

**Files:**
- Modify: `skills/map-native/src/SymbolMap.tsx` (add `role="region"` + `aria-label` to the map container)
- Create: `skills/map-native/scripts/snap-a11y.mjs`
- Modify: `skills/map-native/scripts/produce.mjs` (run the a11y snap)

**Interfaces:**
- Consumes: the `data-testid` hooks (Task 1); `window.__map__`; the layer detection.

- [ ] **Step 1: Add the region role to `SymbolMap`**

`ChoroplethMap` already sets `role="region"` + `aria-label` on its map container; `SymbolMap` does not. Add them to `SymbolMap`'s map container `<div>` (the one with `ref={containerRef}`):

```tsx
      <div
        ref={containerRef}
        role="region"
        aria-label={config.title ?? "map"}
        style={{ /* unchanged */ }}
      />
```

(If the container is wrapped by `<MapFrame>`, put the role/aria-label on the same map-host `<div>` that receives `containerRef`, matching `ChoroplethMap`.)

- [ ] **Step 2: Write `snap-a11y.mjs`**

Create `scripts/snap-a11y.mjs`:

```js
// a11y proof for maps: the map is a labelled region, the source is a real link, and the
// zoom/reset controls are real keyboard-reachable buttons. (Per-data-mark keyboard focus
// is N/A on a GL canvas — region-level a11y is the map standard.) Mirrors chart-native's
// snap-a11y, adapted for the MapTiler canvas.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? process.argv[2] ?? "/tmp";
const url = pathToFileURL(join(root, "dist", "interactive", "index.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1000, height: 640 },
  deviceScaleFactor: 2,
});
await page.goto(url);
await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return (
      m &&
      m.getLayer &&
      (m.getLayer("choropleth-fill") || m.getLayer("symbol-circles"))
    );
  },
  { timeout: 30_000 },
);
await page.waitForTimeout(2000);

const a11y = await page.evaluate(() => {
  const region = document.querySelector('[role="region"]');
  const link = document.querySelector('[data-testid="map-source"] a[href], a[href]');
  const ctrlButtons = [...document.querySelectorAll(".maplibregl-ctrl button")];
  return {
    regionRole: !!region,
    regionLabel: (region && region.getAttribute("aria-label")) || "",
    sourceHref: (link && link.getAttribute("href")) || "",
    controlButtons: ctrlButtons.length, // zoom in/out + reset ⌂ → expect >= 2
    allButtons: ctrlButtons.every((b) => b.tagName === "BUTTON"), // tab-reachable by default
  };
});

// tooltip on hover: hover the centre of a rendered data feature → a popup appears
let tooltipOk = false;
try {
  const pt = await page.evaluate(() => {
    const m = window.__map__;
    const layer = m.getLayer("symbol-circles") ? "symbol-circles" : "choropleth-fill";
    const feats = m.queryRenderedFeatures({ layers: [layer] });
    if (!feats.length) return null;
    // project the first feature's location to screen
    const f = feats[0];
    const c =
      f.geometry.type === "Point"
        ? f.geometry.coordinates
        : m.getCenter().toArray();
    const p = m.project(c);
    return { x: p.x, y: p.y };
  });
  if (pt) {
    await page.mouse.move(pt.x, pt.y);
    await page.waitForSelector(".maplibregl-popup", { timeout: 4000 });
    tooltipOk = true;
  }
} catch {
  tooltipOk = false;
}

await page.locator("#root > div").first().screenshot({ path: join(outDir, "a11y.png") });
await browser.close();

const result = { ...a11y, tooltipOk };
console.log(JSON.stringify(result, null, 2));

const failures = [];
if (!result.regionRole) failures.push("map container missing role=region");
if (!result.regionLabel.trim()) failures.push("region missing aria-label");
if (!result.sourceHref.trim()) failures.push("source link missing href");
if (result.controlButtons < 2) failures.push("missing zoom/reset control buttons");
if (!result.allButtons) failures.push("a control is not a <button> (not keyboard-reachable)");
if (!result.tooltipOk) failures.push("no popup appeared on hovering a feature");
if (failures.length) {
  console.error("A11Y FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("a11y: all checks pass");
```

- [ ] **Step 3: Wire into `produce.mjs`**

In `scripts/produce.mjs`, after the responsive snap (Task 1), add:

```js
console.log(`[produce map] snapping a11y…`);
run("bun", ["scripts/snap-a11y.mjs"], { OUTDIR: outDir });
```

- [ ] **Step 4: Run on BOTH types**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/system-test/symbol-map static
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/system-test/choropleth-map static
```

Expected: each prints the a11y JSON with `regionRole:true`, a non-empty `regionLabel`, a non-empty `sourceHref`, `controlButtons >= 2`, `allButtons:true`, `tooltipOk:true`, and "a11y: all checks pass" (failure exits non-zero). If `regionRole` is false for symbol, the Step-1 fix wasn't applied to the host div — fix it. Confirm BOTH types pass.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/SymbolMap.tsx skills/map-native/scripts/snap-a11y.mjs skills/map-native/scripts/produce.mjs
git commit -m "feat(map-native): a11y snap (region/source/controls/tooltip) + SymbolMap region role"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Both tasks are render-verified Playwright scripts — the deliverable is the script passing on REAL symbol + choropleth interactive builds. No unit tests.
- The interactive build is a Vite singlefile HTML → load via `file://` (`pathToFileURL`), no HTTP server needed (unlike `snap-static.mjs` which serves the multi-asset static build).
- An assertion failure must be fixed at the source (furniture clip → MapFrame; missing role → the component), never by weakening the assertion.
- NEVER print or log the MapTiler key; load it via `set -a && . ../../.env && set +a`.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages.
- After both tasks: `produce.mjs` runs static → interactive → snap-static → snap-proof → snap-responsive → snap-a11y, failing loudly on any responsive/a11y regression, for both map types.
