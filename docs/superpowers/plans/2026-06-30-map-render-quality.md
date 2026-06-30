# Map Render Quality (Group A — 7 grounded fixes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seven production-quality map fixes, each shipped as code + conformance/harness + a grounded KB best-practice at the correct layer (global / per-type / per-format), verified at render on both map types.

**Architecture:** Targeted fixes across the map engine (build pipeline, MapFrame/resolveMapFrame, SymbolMap/ChoroplethMap, conformance) plus a NEW per-format KB layer (`knowledge/references/map/formats/{static,interactive,video}.md`) and harness assertions that gate the produce pipeline.

**Tech Stack:** Bun, TypeScript, bun:test, React, `@maptiler/sdk`, Playwright, Vite, Markdown.

## Global Constraints

- **Bun only**; **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`) — never hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO `Co-Authored-By: Claude`.
- **English** throughout.
- **Every fix ships four coupled artifacts** — code + conformance-or-harness + KB at the RIGHT layer (global `map/design-conformance.md` / per-type `map/types/*.md` / per-format `map/formats/*.md`) + verification. A fix missing its KB-layer line or its harness assertion is incomplete.
- **Grounded KB** — each best-practice line cites a real source by name (data-to-viz, FT Visual Vocabulary, Datawrapper Academy, NN/g for interactive, WCAG); no fabricated URLs, no invented conformance rule names.
- **Verify at render on BOTH map types, SEQUENTIALLY** (`produce` historically shared `dist/` — Task 1 isolates it, but still run produce one type at a time).

All paths are relative to `skills/map-native/` unless noted.

---

### Task 1: Build isolation + static no-controls guard + `formats/static.md`

**Files:**
- Modify: `vite.config.ts`, `scripts/produce.mjs`, `scripts/snap-static.mjs`, `scripts/snap-proof.mjs`, `scripts/snap-responsive.mjs`, `scripts/snap-a11y.mjs`
- Create: `knowledge/references/map/formats/static.md` (repo root)

- [ ] **Step 1: Make Vite's output dir overridable**

In `vite.config.ts`, where the build `outDir` is set (currently `interactive ? "dist/interactive" : "dist/static"`), allow an env override:

```ts
const outDir =
  process.env.BUILD_OUT ?? (interactive ? "dist/interactive" : "dist/static");
// …in the config: build: { outDir, emptyOutDir: true, … }
```

- [ ] **Step 2: Isolate produce's build dirs per run + pass them to the snaps**

In `scripts/produce.mjs`: derive a per-run tag from the outDir basename, build static + interactive into per-run dirs, and pass each snap the dir to serve/load via `SERVE_DIR`.

```js
import { basename } from "node:path";
const tag = basename(outDir).replace(/[^a-z0-9_-]/gi, "") || "run";
const staticDir = join(root, "dist", `static-${tag}`);
const interactiveDir = join(root, "dist", `interactive-${tag}`);

// 1. builds — each into its own dir
run("bunx", ["vite", "build"], { BUILD_OUT: staticDir });
run("bunx", ["vite", "build"], { INTERACTIVE: "1", BUILD_OUT: interactiveDir });

// 2. snaps — tell each script which build dir to use
run("bun", ["scripts/snap-static.mjs"], { OUTDIR: outDir, SERVE_DIR: staticDir });
run("bun", ["scripts/snap-proof.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });
run("bun", ["scripts/snap-responsive.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });
run("bun", ["scripts/snap-a11y.mjs"], { OUTDIR: outDir, SERVE_DIR: interactiveDir });
```

(Adapt to the existing `run(...)` calls; keep the video section unchanged — it reads the config, not dist.)

- [ ] **Step 3: Each snap reads `SERVE_DIR` (fallback to the current fixed path)**

In `snap-static.mjs` (serves a static dir over HTTP), replace the hardcoded `dist/static` with `const staticDir = process.env.SERVE_DIR ?? join(root, "dist", "static");`.
In `snap-proof.mjs` / `snap-responsive.mjs` / `snap-a11y.mjs` (load the single-file interactive build), replace the hardcoded `dist/interactive` with `const interactiveDir = process.env.SERVE_DIR ?? join(root, "dist", "interactive");` and load `join(interactiveDir, "index.html")`.

- [ ] **Step 4: Add the static no-controls guard to `snap-static.mjs`**

After the static screenshot, assert no interactive controls and exit non-zero on failure:

```js
const ctrlButtons = await page.evaluate(
  () => document.querySelectorAll(".maplibregl-ctrl button").length,
);
if (ctrlButtons > 0) {
  console.error(`STATIC FAILURE: ${ctrlButtons} interactive control button(s) in a static map`);
  await browser.close();
  process.exit(1);
}
console.log("static: no interactive controls");
```

- [ ] **Step 5: Write `knowledge/references/map/formats/static.md`**

Create the per-format static reference (≤ ~40 lines): a static map is an IMAGE — no interactive chrome (no zoom/nav/reset controls), only the licensing attribution; furniture (title/source/legend) sits inside a safe gutter, never flush to the edge; everything legible at the export resolution. Source by name: Datawrapper Academy (static export), FT Visual Vocabulary. End with a pointer: enforced by `snap-static.mjs` (no-controls) + the framing safe-area.

- [ ] **Step 6: Verify on BOTH types + commit**

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/verify/choropleth static
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/verify/symbol static
```

Both must print "static: no interactive controls" + all snap passes. READ `/tmp/verify/choropleth/static.png` and `/tmp/verify/symbol/static.png` — confirm no +/−/reset controls (only the © MapTiler attribution). Confirm the per-run build dirs exist (`dist/static-choropleth`, `dist/static-symbol`).

```bash
git add skills/map-native/vite.config.ts skills/map-native/scripts/produce.mjs skills/map-native/scripts/snap-static.mjs skills/map-native/scripts/snap-proof.mjs skills/map-native/scripts/snap-responsive.mjs skills/map-native/scripts/snap-a11y.mjs knowledge/references/map/formats/static.md
git commit -m "fix(map-native): isolate produce build dirs per run + static no-controls guard + static format KB"
```
(NO Claude-Session trailer.)

---

### Task 2: Label unit (3) + interactive tooltip-XOR-labels (5)

**Files:**
- Modify: `src/SymbolMap.tsx`, `src/components/SymbolStory.tsx`, `src/conformance.ts`
- Test: `tests/conformance.test.ts`
- Create: `knowledge/references/map/formats/interactive.md`
- Modify: `knowledge/references/map/types/proportional-symbol.md`, `knowledge/references/map/design-conformance.md`

- [ ] **Step 1: Conformance rule — labelled value carries its unit (failing test first)**

Append to `tests/conformance.test.ts`:

```ts
describe("checkSymbolConformance — label carries the unit", () => {
  const text = { text: ["#1A1A1A"], bg: "#FFFFFF" };
  const base = {
    title: "Funding by city, sentence-case insight here",
    description: "by city, 2024",
    source: { name: "Dealroom 2025", url: "https://example.org/x" },
    sizingMode: "area" as const,
    hasLegend: true,
    legendStops: 3,
    maxRadiusPx: 40,
    viewportMinPx: 720,
    pointsWithData: 6,
    boundsNonEmpty: true,
    strokeContrast: 4,
    labeled: true,
  };
  it("flags a labelled value with a unit set but missing from the label", () => {
    const r = checkSymbolConformance(
      { ...base, valueUnit: "$bn", labelHasUnit: false },
      text,
    );
    expect(r.some((m) => /label.*unit/i.test(m))).toBe(true);
  });
  it("passes when the label carries the unit", () => {
    const r = checkSymbolConformance(
      { ...base, valueUnit: "$bn", labelHasUnit: true },
      text,
    );
    expect(r).toEqual([]);
  });
  it("does not require a unit when none is set", () => {
    const r = checkSymbolConformance({ ...base, labelHasUnit: false }, text);
    expect(r).toEqual([]);
  });
});
```

Run `cd skills/map-native && bun test tests/conformance.test.ts` → FAIL (no `valueUnit`/`labelHasUnit` handling).

- [ ] **Step 2: Implement the rule in `checkSymbolConformance`**

Add `valueUnit?: string` and `labelHasUnit?: boolean` to the input type, and before `return v`:

```ts
  if (input.valueUnit && input.valueUnit.trim() && input.labelHasUnit === false)
    v.push(
      `labelled value omits its unit "${input.valueUnit}" — a directly-labelled value must state its unit`,
    );
```

Run the test → PASS; `bun test` → green.

- [ ] **Step 3: Code — put the unit in the label (static + video)**

In `src/SymbolMap.tsx`, the `labelText` feature property value line currently is `${labels[i].name}\n${labels[i].valueText}`. Append the unit:

```ts
labelText: labels[i]?.name
  ? `${labels[i].name}\n${labels[i].valueText}${config.valueUnit ?? ""}`
  : `${labels[i]?.valueText ?? ""}${config.valueUnit ?? ""}`,
```

Do the SAME in `src/components/SymbolStory.tsx`'s label feature builder (the video labels must also carry the unit).

- [ ] **Step 4: Code — interactive shows tooltip XOR labels**

In `src/SymbolMap.tsx`, the `symbol-labels` layer is added unconditionally. Make it conditional on NOT interactive:

```ts
if (!interactive) {
  map.addLayer({ id: "symbol-labels", /* …existing label layer config… */ });
}
```

The interactive build keeps the hover popup (already present) and drops the baked labels; static/video (where `interactive` is false) keep the labels. (The popup HTML already shows `${p.label}` + value + `config.valueUnit` — leave it; in interactive the unit lives in the tooltip.)

- [ ] **Step 5: KB — at the right layers**

- Create `knowledge/references/map/formats/interactive.md` (≤ ~60 lines): the interactive-map best-practices — **tooltip XOR labels** (hover shows the value OR a baked label, never both — redundant encodings clutter; hover is the interactive idiom), bounded free-explore (Task 4 adds the rest), responsive recentering (Task 4). Source by name: NN/g (tooltips / progressive disclosure), Datawrapper Academy (interactive maps).
- In `knowledge/references/map/design-conformance.md` add to the direct-labels rule: "a directly-labelled value states its unit." In `knowledge/references/map/types/proportional-symbol.md` update the direct-labeling rule: the label = name + value + unit, enforced by `checkSymbolConformance` (`labelHasUnit`).

- [ ] **Step 6: Verify at render (BOTH types) + commit**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/verify/symbol static
```

READ `/tmp/verify/symbol/static.png` — labels read "London 296$bn", "Paris 181$bn", … (unit present). Then load the INTERACTIVE build (`dist/interactive-symbol/index.html`) in Playwright (or read `interactive.png`): confirm the baked labels are GONE and hovering a circle shows the popup with name+value+unit. (Choropleth has no per-symbol labels — unaffected; confirm its static still renders.)

```bash
git add skills/map-native/src/SymbolMap.tsx skills/map-native/src/components/SymbolStory.tsx skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts knowledge/references/map/formats/interactive.md knowledge/references/map/types/proportional-symbol.md knowledge/references/map/design-conformance.md
git commit -m "feat(map-native): unit in symbol labels + interactive tooltip-xor-labels (+conformance, KB layers)"
```
(NO Claude-Session trailer.)

---

### Task 3: Legend-aware safe-area (2) + title gutter (4)

**Files:**
- Modify: `src/core/map-format.ts` (`resolveMapFrame`), `src/core/MapFrame.tsx`, `src/SymbolMap.tsx`, `src/ChoroplethMap.tsx`, `src/conformance.ts`
- Test: `tests/map-format.test.ts`, `tests/conformance.test.ts`
- Modify: `knowledge/references/map/design-conformance.md`, `knowledge/references/map/formats/static.md`
- Modify: `scripts/snap-responsive.mjs`

- [ ] **Step 1: `resolveMapFrame` reserves the real legend height (failing test)**

Append to `tests/map-format.test.ts`:

```ts
it("reserves the supplied legend height in the bottom pad", () => {
  const small = resolveMapFrame(1280, 720, { legendHeight: 0 });
  const big = resolveMapFrame(1280, 720, { legendHeight: 160 });
  expect(big.pad.bottom).toBeGreaterThanOrEqual(160);
  expect(big.pad.bottom).toBeGreaterThan(small.pad.bottom);
});
```

Run `bun test tests/map-format.test.ts` → FAIL.

- [ ] **Step 2: Implement legend-aware bottom pad**

In `src/core/map-format.ts`, add `legendHeight?: number` to the opts and make `pad.bottom` reserve it:

```ts
  const legendHeight = opts.legendHeight ?? 0;
  // …existing sourceBand…
  const bottomBand = Math.max(sourceBand, legendHeight + MARGIN * scale + type.source * LINE_HEIGHT);
  // pad.bottom:
      bottom: Math.round(bottomBand),
```

(Keep `sourceBand` as the floor so the source line always fits.) Run the test → PASS.

- [ ] **Step 3: Components pass their legend height**

In `src/SymbolMap.tsx` and `src/ChoroplethMap.tsx`, compute the legend box height (the symbol nested-circle SVG height = `geo.legend[0].radius*2 + 24`; the choropleth bins legend height = the rendered legend `div` height — measure it or compute from the bin count × row height) and pass `legendHeight` into the `resolveMapFrame(...)` call already present. Use a conservative constant if measurement is awkward (e.g. symbol: `geo.legend[0].radius*2 + 28`; choropleth: `bins.length * 18 + 36`).

- [ ] **Step 4: Title/source gutter in `MapFrame`**

In `src/core/MapFrame.tsx`, raise the furniture inset so the title (and source) never sit flush to the edge: `const G = Math.round(Math.max(12, 16) * frame.scale)` used for `top/left/bottom` and `maxWidth: width - 2*G`. (Today `m = 12*scale`; bump to ≥16 so the wrapped title keeps a visible gutter.)

- [ ] **Step 5: `checkMapFraming` asserts the legend band is reserved (failing test → impl)**

Append to `tests/conformance.test.ts` a case: `checkMapFraming({ width:1280, height:720, title:"…", hasSource:true, legendHeight: 400 })` → a violation matching `/legend/` (because 400 > the frame's bottom band at that size). Implement: add `legendHeight?: number` to `checkMapFraming`'s input; after computing `frame`, `if (input.legendHeight && frame.pad.bottom < input.legendHeight) v.push("legend overruns the reserved bottom band — data would sit under the legend")`. Run tests → green.

- [ ] **Step 6: KB updates**

In `knowledge/references/map/design-conformance.md`, strengthen the framing rule: "the legend occupies a RESERVED band sized to its height; no data feature renders under the title or the legend; furniture keeps a safe gutter from the edges." In `map/formats/static.md` add the gutter line. Source: FT Visual Vocabulary (layout), Datawrapper Academy.

- [ ] **Step 7: Harness — title gutter assertion**

In `scripts/snap-responsive.mjs`, extend the per-width `inView` check for the title into a gutter check: assert `[data-testid="map-title"]` bbox `left >= G && right <= innerWidth - G` (use `G = 14`). Add a failure if violated.

- [ ] **Step 8: Verify (BOTH types) + commit**

`produce … static` for choropleth + symbol; READ each `static.png` — the legend does NOT cover any region/symbol; the title pill has a clear gutter from the edges; nothing clipped. Also produce `all` for one type and READ a `video-*-still.png` — the legend/title don't cover data in video. `bun test` green.

```bash
git add skills/map-native/src/core/map-format.ts skills/map-native/src/core/MapFrame.tsx skills/map-native/src/SymbolMap.tsx skills/map-native/src/ChoroplethMap.tsx skills/map-native/src/conformance.ts skills/map-native/tests/map-format.test.ts skills/map-native/tests/conformance.test.ts skills/map-native/scripts/snap-responsive.mjs knowledge/references/map/design-conformance.md knowledge/references/map/formats/static.md
git commit -m "feat(map-native): legend-aware safe-area + title gutter (+conformance, harness, KB)"
```
(NO Claude-Session trailer.)

---

### Task 4: Interactive nav bounded (6) + responsive re-fit (7)

**Files:**
- Modify: `src/SymbolMap.tsx`, `src/ChoroplethMap.tsx`
- Modify: `knowledge/references/map/formats/interactive.md`
- Modify: `scripts/snap-a11y.mjs`, `scripts/snap-responsive.mjs`

- [ ] **Step 1: maxBounds + minZoom (both components, interactive only)**

In the `if (interactive)` block of `src/SymbolMap.tsx` and `src/ChoroplethMap.tsx`, after the initial `fitBounds(geo.bounds, { padding: frame.pad })`, constrain navigation to the story extent:

```ts
map.once("idle", () => {
  const pad = 0.15; // 15% margin around the data bbox
  const [w, s, e, n] = geo.bounds; // [west, south, east, north]
  const dx = (e - w) * pad, dy = (n - s) * pad;
  map.setMaxBounds([[w - dx, s - dy], [e + dx, n + dy]]);
  map.setMinZoom(map.getZoom()); // can't zoom out past the story extent
});
```

(For choropleth `geo.bounds` is `layout.bounds`; for symbol it is `geo.bounds` — both `[w,s,e,n]`.)

- [ ] **Step 2: ResizeObserver → re-fit (both components)**

In both components, after the map is created, observe the container and re-fit on resize so the data stays centred and the zoom adapts:

```ts
const ro = new ResizeObserver(() => {
  const m = mapRef.current;
  if (!m) return;
  m.resize();
  const f = resolveMapFrame(containerRef.current!.clientWidth, containerRef.current!.clientHeight, { /* same opts as the initial frame */ });
  m.fitBounds(geo.bounds, { padding: f.pad, duration: 0 });
});
if (containerRef.current) ro.observe(containerRef.current);
// disconnect in the cleanup return
```

(Recompute `frame` from the new size so the pad scales; keep the maxBounds from Step 1 — re-fit stays within it.)

- [ ] **Step 3: KB — interactive.md**

In `knowledge/references/map/formats/interactive.md` add: **bounded free-explore** ("maxBounds + minZoom keep the reader inside the data's story extent — no panning into empty ocean, no zooming out past the story") and **responsive recentering** ("on container resize the map recentres and re-fits; the data is always centred and the zoom adapts"). Source: NN/g (constrained navigation / responsive), Datawrapper Academy.

- [ ] **Step 4: Harness assertions**

- `scripts/snap-a11y.mjs` (interactive): after load, attempt a large pan (`map.panBy([5000,5000])` via `window.__map__`) and a `map.zoomTo(0)`, then assert the centre stays within the maxBounds and `map.getZoom() >= map.getMinZoom()`. Fail otherwise.
- `scripts/snap-responsive.mjs`: at each width, assert the map centre ≈ the data bbox centre (within a tolerance) — the data stays centred across widths.

- [ ] **Step 5: Verify (BOTH types) + commit**

`INTERACTIVE=1` build each type; in Playwright confirm: dragging far snaps back inside the bounds; scroll-zoom-out stops at the fit zoom; resizing the window keeps the data centred + refit. `produce … static` for both runs the responsive/a11y snaps green.

```bash
git add skills/map-native/src/SymbolMap.tsx skills/map-native/src/ChoroplethMap.tsx skills/map-native/scripts/snap-a11y.mjs skills/map-native/scripts/snap-responsive.mjs knowledge/references/map/formats/interactive.md
git commit -m "feat(map-native): interactive maxBounds+minZoom + responsive re-fit (+KB, harness)"
```
(NO Claude-Session trailer.)

---

### Task 5: `formats/video.md` (the per-format video KB, feeds Group B)

**Files:**
- Create: `knowledge/references/map/formats/video.md` (repo root)

- [ ] **Step 1: Write the video format reference**

Create `knowledge/references/map/formats/video.md` (≤ ~70 lines): the per-format VIDEO best-practices for maps, sourced. Cover: motion is a pure function of frame (frame-deterministic, no clock/random — Tom's discipline); the reveal/camera must be legible (don't move too fast); furniture (title band + source) baked and scaled per ratio (landscape/square/portrait); the data never under the title/legend; an ending hold; the choice between a SIMPLE reveal and a STORYTELLING camera tour is editorial (the tour = the beat sequence from `deriveMapStory`/`deriveSymbolStory`) — note that the storytelling video / camera modes are built in Group B. Source by name: Amini 2015 (data video grammar), Disney/Chang-Ungar (motion), FT Visual Vocabulary. End with a pointer: enforced by `checkMapFraming` (framing) + the render harness; storytelling treatments → Group B + Tom's `map-explainer`.

- [ ] **Step 2: Commit**

```bash
git add knowledge/references/map/formats/video.md
git commit -m "docs(knowledge): per-format video map reference (feeds Group B storytelling)"
```
(NO Claude-Session trailer.)

## Notes for the executor

- The conformance + resolveMapFrame changes are pure TDD (complete code above). The component/produce/harness changes are render-verified — the acceptance is the produced artifacts eyeballed on BOTH map types + the harness assertions gating produce.
- Run `produce` ONE type at a time (Task 1 isolates the build dirs, but keep runs sequential while verifying).
- NEVER print or log the MapTiler key.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages.
- Every fix must land its KB line in the correct layer file — a render fix without its `formats/*.md` (or `design-conformance.md` / type) line is incomplete.
- After all tasks: `cd skills/map-native && bun test` green; `produce all` for both types passes every snap; the map KB now has the `formats/` layer.
