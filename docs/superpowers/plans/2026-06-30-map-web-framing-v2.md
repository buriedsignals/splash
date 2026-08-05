# Map Web Framing v2 (dézoom-to-fit-all + controls z-index) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web maps always show the full data extent (centred, never cropped), the corner furniture overlays the margin not the data, and the interactive controls sit above the title.

**Architecture:** Unify the load + resize fit into one `fitToData()` that recomputes the frame and the `minZoom` at the CURRENT size (fixing the 360px crop); measure the real wrapped-title height in `MapFrame` and feed it as the top band; raise the controls' z-index above the furniture. Full-bleed overlay kept; each fix ships code + conformance/harness + KB.

**Tech Stack:** Bun, TypeScript, bun:test, React, `@maptiler/sdk`, Playwright, Markdown.

## Global Constraints

- **Bun only**; **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO an authorship trailer naming an assistant.
- **English** throughout.
- **Every fix ships four artifacts** — code + conformance-or-harness + KB at the right layer (`map/formats/{static,interactive}.md`) + render verification on BOTH map types (static + interactive, incl. 360px).
- **Grounded KB**, sourced by name (Datawrapper Academy, NN/g, FT Visual Vocabulary), no fabricated URLs.
- **Verify at render on BOTH types, SEQUENTIALLY.**

All paths relative to `skills/map-native/`.

---

### Task 1: Centered fit + recompute minZoom on every fit (full extent always visible)

**Files:**
- Modify: `src/SymbolMap.tsx`, `src/ChoroplethMap.tsx`
- Modify: `knowledge/references/map/formats/static.md`, `knowledge/references/map/formats/interactive.md`
- Modify: `scripts/snap-responsive.mjs`

- [ ] **Step 1: Unify load + resize into one `fitToData()` that recomputes minZoom**

In BOTH `src/SymbolMap.tsx` and `src/ChoroplethMap.tsx`, the map currently (a) `fitBounds(clampBounds(bounds), { padding: frame.pad })` on load, (b) on `map.once("idle")` sets `setMinZoom(map.getZoom())` + `setMaxBounds(...)`, and (c) a `ResizeObserver` re-fits. The bug: `minZoom` is locked to the BUILD-size fit zoom, so at 360px the map can't zoom out enough → the extent is cropped.

Replace this with a single `fitToData()` used by BOTH load and resize:

```ts
// Fit the data to the CURRENT container size, then pin minZoom to that fit zoom so the
// full extent is always visible (never cropped) and bounded for free-pan. Called on load
// AND on every resize, so minZoom always matches the current size (no build-time lock).
function fitToData() {
  const map = mapRef.current;
  const el = containerRef.current;
  if (!map || !el) return;
  const frame = resolveMapFrame(el.clientWidth, el.clientHeight, FRAME_OPTS); // same opts used at init
  const b = clampBounds(DATA_BOUNDS); // geo.bounds (symbol) / layout.bounds (choropleth)
  map.fitBounds(b, { padding: frame.pad, duration: 0 });
  map.once("idle", () => {
    map.setMinZoom(map.getZoom());     // current-size fit zoom — recomputed every fit
    const pad = 0.15;
    const [w, s, e, n] = b;
    const dx = (e - w) * pad, dy = (n - s) * pad;
    map.setMaxBounds([[w - dx, s - dy], [e + dx, n + dy]]);
  });
}
```

- On `load`: call `fitToData()` (replacing the inline initial fitBounds + the once-idle minZoom/maxBounds block).
- In the `ResizeObserver`: `map.resize(); fitToData();` (replacing the inline re-fit). Reset `setMinZoom` first if needed (`map.setMinZoom(0)` before `fitBounds` so a stale higher minZoom can't block the new fit), then `fitToData()` re-pins it.

`FRAME_OPTS` = the exact opts object each component already passes to `resolveMapFrame` (symbol: `{ titleLines: 2, hasDescription, labelOverhang: 80, legendHeight }`; choropleth: its existing opts). `DATA_BOUNDS` = `geo.bounds` / `layout.bounds`.

IMPORTANT: before each `fitBounds` in `fitToData`, call `map.setMinZoom(0)` so a previously-pinned minZoom (from the last fit) cannot prevent the new, more-zoomed-out fit at a smaller size. (Order: `setMinZoom(0)` → `fitBounds` → idle → `setMinZoom(fitZoom)`.)

- [ ] **Step 2: KB — both format layers**

In `knowledge/references/map/formats/static.md` and `interactive.md` add: "The FULL data extent is always visible — the map fits all data centred, with margin; at extreme ratios it letterboxes (extra margin on the long axis), it NEVER crops the data. The furniture (title, legend, source) overlays the surrounding margin, never the data." Interactive adds: "minZoom is the current-size fit zoom (recomputed on resize) so the reader can never lose the full extent." Source by name (Datawrapper Academy, NN/g, FT Visual Vocabulary) — no fabricated URLs.

- [ ] **Step 3: Harness — data centred + within the safe area**

In `scripts/snap-responsive.mjs`, at each width, in addition to the existing centre check, assert the rendered data bbox is WITHIN the inner safe area (top edge below the title band, bottom edge above the legend band): query the data layer's rendered features, project their extent to screen, and assert `extent.top >= frame.pad.top` and `extent.bottom <= innerHeight - frame.pad.bottom` (tolerance ~8px). If the data overruns a band, fail. (Reuse the `window.__map__` + the existing centre-tolerance helper; for the band heights, read them from the page or recompute with the same constants.)

- [ ] **Step 4: Verify at render (BOTH types, incl. 360px)**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/verify/choropleth static
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/verify/symbol static
```

READ `/tmp/verify/symbol/responsive-360.png` and `/tmp/verify/choropleth/responsive-360.png`: ALL data must be visible (all 6 cities / all data regions — nothing cropped at the edges), data centred, and the title/legend over the margin. The snaps (incl. the new within-safe-area assertion) must pass. If data is still cropped at 360px, the minZoom reset isn't taking — debug `fitToData`.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/SymbolMap.tsx skills/map-native/src/ChoroplethMap.tsx skills/map-native/scripts/snap-responsive.mjs knowledge/references/map/formats/static.md knowledge/references/map/formats/interactive.md
git commit -m "fix(map-native): recompute minZoom per fit so the full extent is always visible (no crop)"
```
(NO Claude-Session trailer.)

---

### Task 2: Measure the real wrapped-title height (title never covers data)

**Files:**
- Modify: `src/core/map-format.ts` (`resolveMapFrame` accepts `titleHeightPx`), `src/core/MapFrame.tsx` (measure the title node), `src/SymbolMap.tsx`, `src/ChoroplethMap.tsx`, `src/conformance.ts` (`checkMapFraming` forwards `titleHeightPx`)
- Test: `tests/map-format.test.ts`, `tests/conformance.test.ts`

- [ ] **Step 1: `resolveMapFrame` honours a measured title height (failing test)**

Append to `tests/map-format.test.ts`:

```ts
it("uses a supplied measured title height for the top band when larger than the estimate", () => {
  const est = resolveMapFrame(1280, 720, { titleLines: 2 });
  const tall = resolveMapFrame(1280, 720, { titleLines: 2, titleHeightPx: 220 });
  expect(tall.pad.top).toBeGreaterThanOrEqual(220);
  expect(tall.pad.top).toBeGreaterThan(est.pad.top);
});
it("keeps the estimate when no measured height is supplied", () => {
  const a = resolveMapFrame(1280, 720, { titleLines: 2 });
  const b = resolveMapFrame(1280, 720, { titleLines: 2, titleHeightPx: 0 });
  expect(b.pad.top).toBe(a.pad.top);
});
```

Run `bun test tests/map-format.test.ts` → FAIL.

- [ ] **Step 2: Implement in `resolveMapFrame`**

Add `titleHeightPx?: number` to the opts. After computing `titleBand` (the line-estimate), take the larger of the estimate and the measured height:

```ts
  const titleHeightPx = opts.titleHeightPx ?? 0;
  // …existing titleBand estimate…
  const topBand = Math.max(titleBand, titleHeightPx + MARGIN * scale);
  // pad.top:
      top: Math.round(topBand),
```

Run the test → PASS.

- [ ] **Step 3: `MapFrame` measures the title block height**

In `src/core/MapFrame.tsx`, attach a `ref` to the title block `<div data-testid="map-title">`, and in a layout effect (`useLayoutEffect` + a `ResizeObserver` on that node) measure its `offsetHeight`, store it in state, and call an `onTitleHeight?(px: number)` callback prop so the parent component can feed it back into `resolveMapFrame` and re-fit. (The measured height includes the wrapped title + description + pill padding.)

- [ ] **Step 4: Components feed the measured height back**

In `src/SymbolMap.tsx` and `src/ChoroplethMap.tsx`: hold a `titleHeightPx` state; pass `onTitleHeight={setTitleHeightPx}` to `<MapFrame>`; include `titleHeightPx` in `FRAME_OPTS` (so `resolveMapFrame` reserves the real height); and when `titleHeightPx` changes, call `fitToData()` (Task 1) so the map re-fits with the correct top band. (First render uses the estimate; after the measure, the top band is exact and the map re-fits.)

- [ ] **Step 5: Conformance — `checkMapFraming` honours the measured title height (failing test → implement)**

In `tests/conformance.test.ts`, add a case that `checkMapFraming` accepts an optional `titleHeightPx` and flags when the resolved `pad.top` does not reserve it:

```ts
it("flags framing where the measured title height is not reserved by pad.top", () => {
  const ok = checkMapFraming({ width: 360, height: 640, titleLines: 2, titleHeightPx: 90 });
  expect(ok.violations.find(v => v.id === "title-band-covers-data")).toBeUndefined();
});
```

Run → FAIL (option not threaded). Then in `src/conformance.ts`, add `titleHeightPx?: number` to `checkMapFraming`'s input and forward it into the `resolveMapFrame(...)` call (alongside the existing `legendHeight` forward), so the title-band check compares against the REAL reserved height, not the line estimate. Run → PASS.

- [ ] **Step 6: Verify (BOTH types, narrow width)**

`produce … static` for both; READ `responsive-360.png` for each — the title wraps to 2–3 lines and the topmost data (London circle / Norway) sits BELOW the title pill, never under it. `bun test` green.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/core/map-format.ts skills/map-native/src/core/MapFrame.tsx skills/map-native/src/SymbolMap.tsx skills/map-native/src/ChoroplethMap.tsx skills/map-native/src/conformance.ts skills/map-native/tests/map-format.test.ts skills/map-native/tests/conformance.test.ts
git commit -m "fix(map-native): reserve the measured wrapped-title height so the title never covers data"
```
(NO Claude-Session trailer.)

---

### Task 3: Controls z-index above the furniture

**Files:**
- Modify: `src/core/MapFrame.tsx` (and/or the components' control-add)
- Modify: `scripts/snap-a11y.mjs`
- Modify: `knowledge/references/map/formats/interactive.md`

- [ ] **Step 1: Raise the controls above the furniture**

The `MapFrame` furniture overlays use `zIndex: 10`. The MapTiler control containers (`.maplibregl-ctrl`) sit in the map canvas's own stacking context, which can render below the furniture pill. Ensure the controls win: inject a style so `.maplibregl-ctrl-top-right` / `.maplibregl-ctrl` have a `z-index` ABOVE the furniture (e.g. `z-index: 20`), OR lower the furniture overlays to `z-index: 5` and keep controls default — pick whichever is robust in the singlefile build. The title pill must NOT occlude the +/−/reset.

- [ ] **Step 2: KB — interactive.md**

Add to `knowledge/references/map/formats/interactive.md`: "Interactive map controls (zoom / reset) render ABOVE the furniture overlays — never occluded by the title or legend." Source: NN/g (control visibility / affordance).

- [ ] **Step 3: Harness — controls not occluded**

In `scripts/snap-a11y.mjs`, after load, for a control button assert it is the topmost element at its centre point: `document.elementFromPoint(cx, cy)` is the control button (or a descendant), NOT the title pill. Fail otherwise.

- [ ] **Step 4: Verify (interactive, both types)**

Build the interactive for each type; in Playwright (or read `interactive.png` / `responsive-360.png`) confirm the +/−/reset controls render fully on top of the title pill (not half-hidden behind it). `bun test` green (no logic change).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/core/MapFrame.tsx skills/map-native/scripts/snap-a11y.mjs knowledge/references/map/formats/interactive.md
git commit -m "fix(map-native): interactive controls render above the furniture (z-index) + harness assertion"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Task 2's `resolveMapFrame` change is pure TDD (complete code above). Tasks 1 & 3 and the rest of Task 2 are render-verified — the acceptance is the produced artifacts eyeballed on BOTH map types at 360px (full extent visible, data centred, title/legend off the data, controls on top).
- Keep `clampBounds` (from the prior slice) on every bounds→MapTiler call.
- Run `produce` ONE type at a time.
- NEVER print or log the MapTiler key.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages.
- After all tasks: `bun test` green; `responsive-360.png` for both types shows the whole data extent, centred, furniture clear of data, controls on top.
