# Map Legibility & Navigation (map-native, slice A+B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the symbol map read and behave like a real map — labels placed BESIDE the symbols (legible, auto-positioned, ratio-scaled) and full navigation (pan/zoom/reset) in the interactive build.

**Architecture:** Labels move from a centred-on-circle `text-anchor:"top"` placement to native MapLibre `text-variable-anchor` + a per-feature `text-radial-offset` (computed from the symbol radius by a pure helper), so the renderer auto-places each label just outside its circle on the first free side. The choropleth's existing `makeResetControl` is extracted to a shared `controls.ts` and reused by the symbol map's interactive build. Render-verified.

**Tech Stack:** Bun, TypeScript, bun:test, React, `@maptiler/sdk` (MapLibre GL), Remotion.

## Global Constraints

- **Bun only** — `bun`, `bunx`, `bun test`. Remotion render via `bunx remotion … --gl=angle --concurrency=1` is the accepted exception.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO an authorship trailer naming an assistant.
- **Code, comments, commit messages in English.**
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never hard-code or log it.
- **Verify at render** — eyeball each format at multiple sizes INCLUDING portrait; verify interactive navigation live in-browser (a static PNG cannot show pan/zoom/reset).

All paths are relative to `skills/map-native/` unless noted.

---

### Task 1: `labelRadialOffset` pure helper

**Files:**
- Modify: `skills/map-native/src/symbol-labels.ts` (append the function)
- Test: `skills/map-native/tests/symbol-labels.test.ts` (append a describe block)

**Interfaces:**
- Produces: `function labelRadialOffset(radius: number, textSize: number, gap?: number): number` — the radial offset in **ems** that places a label just outside a circle of `radius` px, given the label's `textSize` px. `gap` defaults to `6` (px of clearance). Formula: `(radius + gap) / textSize`. Consumed in Tasks 3 & 4 (stored as a per-feature `labelOffset` property feeding `text-radial-offset`).

- [ ] **Step 1: Write the failing test**

Append to `tests/symbol-labels.test.ts`:

```ts
import { labelRadialOffset } from "../src/symbol-labels";

describe("labelRadialOffset", () => {
  it("returns (radius + gap) / textSize in ems", () => {
    expect(labelRadialOffset(40, 13, 6)).toBeCloseTo((40 + 6) / 13, 6);
  });
  it("defaults the gap to 6px", () => {
    expect(labelRadialOffset(20, 10)).toBeCloseTo((20 + 6) / 10, 6);
  });
  it("grows with radius (a bigger circle pushes its label further out)", () => {
    expect(labelRadialOffset(40, 13)).toBeGreaterThan(labelRadialOffset(8, 13));
  });
  it("is deterministic", () => {
    expect(labelRadialOffset(30, 12)).toBe(labelRadialOffset(30, 12));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd skills/map-native && bun test tests/symbol-labels.test.ts`
Expected: FAIL — `labelRadialOffset` is not exported.

- [ ] **Step 3: Implement**

Append to `src/symbol-labels.ts`:

```ts
// Radial offset (in ems) that places a label just OUTSIDE a circle of `radius` px,
// for MapLibre `text-radial-offset` (which is in ems). `text-radial-offset` needs a
// distance from the point centre; the circle edge is `radius` px out, plus a small
// `gap` of clearance, divided by the label's `textSize` to convert px → ems.
export function labelRadialOffset(
  radius: number,
  textSize: number,
  gap = 6,
): number {
  return (radius + gap) / textSize;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd skills/map-native && bun test tests/symbol-labels.test.ts`
Expected: PASS. Then `cd skills/map-native && bun test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/symbol-labels.ts skills/map-native/tests/symbol-labels.test.ts
git commit -m "feat(map-native): labelRadialOffset helper — place labels just outside the circle"
```
(NO Claude-Session trailer.)

---

### Task 2: Extract `makeResetControl` to a shared `controls.ts`

A pure refactor (DRY) — no behaviour change. `ChoroplethMap.tsx` currently defines `makeResetControl(dataBounds)` inline (a minimal `IControl` with a ⌂ button that `fitBounds` back to the data extent). Move it verbatim to a shared module so the symbol map (Task 3) can reuse it.

**Files:**
- Create: `skills/map-native/src/controls.ts`
- Modify: `skills/map-native/src/ChoroplethMap.tsx` (delete the inline `makeResetControl`, import it from `./controls`)

**Interfaces:**
- Produces: `function makeResetControl(dataBounds: [number, number, number, number]): maptilersdk.IControl` — exported from `src/controls.ts`. Consumed by `ChoroplethMap.tsx` (this task) and `SymbolMap.tsx` (Task 3).

- [ ] **Step 1: Create `src/controls.ts`**

Move the existing `makeResetControl` function body **verbatim** out of `ChoroplethMap.tsx` (it is currently the `function makeResetControl(dataBounds: [number, number, number, number]): maptilersdk.IControl { … }` block) into a new file `src/controls.ts`. Add the imports it needs at the top and `export` it:

```ts
import * as maptilersdk from "@maptiler/sdk";

/** Minimal IControl that resets the map to the initial data bounds. */
export function makeResetControl(
  dataBounds: [number, number, number, number],
): maptilersdk.IControl {
  // ... the exact body currently in ChoroplethMap.tsx (onAdd builds a
  // maplibregl-ctrl-group div with a ⌂ button that calls
  // _map.fitBounds(dataBounds, { padding: 48, duration: 600 }); onRemove cleans up).
}
```

Do not change the body — it is a move. Keep the ⌂ button, `aria-label="Reset map view"`, the inline `style.cssText`, the `fitBounds(dataBounds, { padding: 48, duration: 600 })` click handler, and the `onRemove` cleanup exactly as they are.

- [ ] **Step 2: Rewire `ChoroplethMap.tsx`**

Delete the inline `function makeResetControl(…) { … }` from `ChoroplethMap.tsx` and add an import near the other imports:

```ts
import { makeResetControl } from "./controls";
```

Leave every call site (`map.addControl(makeResetControl(bounds), …)`) unchanged.

- [ ] **Step 3: Verify no behaviour change**

Run: `cd skills/map-native && bun test` → full suite green (no test references the control directly; this confirms nothing else broke).
Run: `cd skills/map-native && bunx vite build` → builds with no TypeScript error (confirms the import resolves and `ChoroplethMap` still compiles).
Expected: both succeed. (The control is render-only; the choropleth's existing e2e proof already covers its behaviour and is unaffected by a verbatim move.)

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/controls.ts skills/map-native/src/ChoroplethMap.tsx
git commit -m "refactor(map-native): extract makeResetControl to shared controls.ts"
```
(NO Claude-Session trailer.)

---

### Task 3: `SymbolMap.tsx` — labels beside + interactive navigation

Render-verified. Rework the `symbol-labels` layer to place labels beside each circle, and add the reset control to the interactive build.

**Files:**
- Modify: `skills/map-native/src/SymbolMap.tsx`

**Interfaces:**
- Consumes: `labelRadialOffset` (Task 1), `makeResetControl` (Task 2).

- [ ] **Step 1: Add a per-feature `labelOffset` and a label text-size constant**

Near the top of `SymbolMap.tsx`, add a label text-size constant (bigger than the current 11):

```ts
const LABEL_TEXT_SIZE = 13;
```

Import the helper and the control:

```ts
import { symbolLabels, labelRadialOffset } from "./symbol-labels";
import { makeResetControl } from "./controls";
```

In the `map.addSource("symbols", …)` feature builder, add a `labelOffset` property to each feature's `properties` (alongside the existing `radius`, `labelText`, …):

```ts
labelOffset: labelRadialOffset(s.radius, LABEL_TEXT_SIZE),
```

- [ ] **Step 2: Rework the `symbol-labels` layer to place labels beside the circle**

Replace the current `symbol-labels` layer's `layout` block (which uses `"text-anchor": "top"` + `"text-offset": [0, 0.6]`) with variable-anchor + radial-offset placement. The new layer:

```ts
map.addLayer({
  id: "symbol-labels",
  type: "symbol",
  source: "symbols",
  layout: {
    "text-field": ["get", "labelText"],
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-size": LABEL_TEXT_SIZE,
    // Place the label just OUTSIDE the circle; the renderer picks the first free
    // side (auto anti-collision + edge flipping). radial-offset is per-feature so a
    // big circle pushes its label further out.
    "text-variable-anchor": ["left", "right", "top", "bottom"],
    "text-radial-offset": ["get", "labelOffset"],
    "text-justify": "auto",
    "text-allow-overlap": false,
    "text-optional": true,
    "text-line-height": 1.3,
    "text-max-width": 8,
  },
  paint: {
    "text-color": "#1a1a1a",
    "text-halo-color": "#ffffff",
    "text-halo-width": 1.6,
  },
});
```

Do NOT set `text-anchor` or `text-offset` together with `text-variable-anchor`/`text-radial-offset` — they conflict; the variable-anchor pair replaces them.

- [ ] **Step 3: Add the reset control in interactive mode**

In the `if (interactive) { … }` block (which already adds `NavigationControl`), add the reset control after it:

```ts
map.addControl(new maptilersdk.NavigationControl({}), "top-right");
map.addControl(makeResetControl(geo.bounds), "top-right");
```

(`geo.bounds` is the symbol geometry's `[west, south, east, north]`, already computed.)

- [ ] **Step 4: Produce static + interactive and verify**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/system-test/symbol-map static
```

Read `/tmp/system-test/symbol-map/static.png` and confirm: each label sits BESIDE its circle (not on top), reads clearly ("London 296", "Paris 181", …), white halo legible, labels auto-flipped near the edges, no label buried under a fill. If labels still overlap circles or are clipped, fix and re-run static.

- [ ] **Step 5: Verify interactive navigation live (a PNG cannot show pan/zoom/reset)**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
INTERACTIVE=1 bunx vite build
```

Load `dist/interactive/index.html` in Playwright; confirm: dragging pans the map, scroll zooms, the ⌂ reset control re-frames to the data extent, and the +/- zoom buttons work. Screenshot the map after a pan + reset to `/tmp/system-test/symbol-map/nav-proof.png` and confirm the reset returned to the full extent. (If `snap-proof.mjs` can be reused for the hover, use an inline Playwright snippet for the pan/reset assertions.) Do NOT claim navigation works from a static render.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/SymbolMap.tsx
git commit -m "feat(map-native): labels beside symbols + reset-to-extent navigation (interactive)"
```
(NO Claude-Session trailer.)

---

### Task 4: `SymbolStory.tsx` — labels beside, ratio-scaled + re-render videos

Render-verified. Apply the same beside-placement to the video, and scale the label text size up for the narrower square/portrait frames (the "illegible in portrait" fix).

**Files:**
- Modify: `skills/map-native/src/components/SymbolStory.tsx`
- Append: `skills/map-native/output-proof/symbol/e2e-proof.md`

**Interfaces:**
- Consumes: `labelRadialOffset` (Task 1). (No reset control — video is non-interactive.)

- [ ] **Step 1: Compute a ratio-scaled label size**

In `SymbolStory.tsx`, read the composition dimensions and derive a label size — landscape (wide) stays 13, the narrower square/portrait frames bump to 18 so the text is legible at those aspect ratios:

```ts
const { width, height, durationInFrames } = useVideoConfig();
const labelTextSize = width <= 1080 ? 18 : 13; // square/portrait are narrower → larger text
```

Import the helper:

```ts
import { symbolLabels, labelRadialOffset } from "../symbol-labels";
```

- [ ] **Step 2: Add `labelOffset` to the features using the scaled size**

In `SymbolStory.tsx`'s feature builder, add `labelOffset` computed with the SAME `labelTextSize` (so the offset matches the text size in this composition):

```ts
labelOffset: labelRadialOffset(s.radius, labelTextSize),
```

Ensure each feature also carries `labelText` (city name + value, the same two-line string the web build uses) — if `SymbolStory` only stored `labelText` before, keep it; if it stored separate fields, build the same `"name\nvalue"` string.

- [ ] **Step 3: Rework the video `symbol-labels` layer to match the web placement**

Replace the video's `symbol-labels` layer `layout` with the variable-anchor + radial-offset placement, using `labelTextSize`:

```ts
layout: {
  "text-field": ["get", "labelText"],
  "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
  "text-size": labelTextSize,
  "text-variable-anchor": ["left", "right", "top", "bottom"],
  "text-radial-offset": ["get", "labelOffset"],
  "text-justify": "auto",
  "text-allow-overlap": false,
  "text-optional": true,
  "text-line-height": 1.3,
  "text-max-width": 8,
},
paint: {
  "text-color": "#1a1a1a",
  "text-halo-color": "#ffffff",
  "text-halo-width": 1.6,
},
```

Leave the per-frame `text-opacity` reveal (`setPaintProperty("symbol-labels", "text-opacity", progress)`), the `mapReady` gate, `attributionControl: true`, the circle-radius reveal, and the init-once guard UNCHANGED.

- [ ] **Step 4: Re-render all three videos and verify each ratio**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/system-test/symbol-map all
```

Read `video-landscape-still.png`, `video-square-still.png`, AND `video-portrait-still.png`. Confirm in EACH: labels sit beside the circles, the city+value reads clearly, the portrait/square labels are legibly sized (the whole point — they must NOT be tiny), circles + "© MapTiler © OpenStreetMap" attribution present, title unclipped. Confirm the 3 mp4s re-rendered with non-trivial sizes. If portrait labels are still too small, raise `labelTextSize` for that branch and re-render.

- [ ] **Step 5: Update the proof**

Append to `skills/map-native/output-proof/symbol/e2e-proof.md`: labels now sit beside the symbols (variable-anchor + radial-offset), the portrait/square label size bump, what you READ in each still, and the new mp4 sizes. Record honestly; if a render failed, record the exact error.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/components/SymbolStory.tsx skills/map-native/output-proof/symbol/e2e-proof.md
git commit -m "feat(map-native): beside + ratio-scaled labels in symbol video (legible portrait)"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Tasks 1 is pure TDD (complete code above). Tasks 2 is a verbatim refactor-move. Tasks 3-4 are render-verified MapTiler work — the acceptance is a produced artifact eyeballed across formats (incl. portrait) + live navigation, not a unit test.
- `text-variable-anchor` + `text-radial-offset` MUST be used together and WITHOUT `text-anchor`/`text-offset` (they conflict).
- The per-feature `labelOffset` is what makes `labelRadialOffset` actually used — do not inline the formula into the GL expression instead.
- NEVER print or log the MapTiler key; load it via `set -a && . ../../.env && set +a`.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages.
- After all tasks: `cd skills/map-native && bun test` → full suite green.
