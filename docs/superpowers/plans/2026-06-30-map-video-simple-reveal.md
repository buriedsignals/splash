# Map Simple-Reveal Video (SP1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the simple-reveal video format (3 aspect ratios) for both map types (choropleth + proportional-symbol), mirroring the chart-native video recipe, and establish the produce type×format selector.

**Architecture:** One Remotion composition component per type (`SymbolReveal`, `ChoroplethReveal`), parameterized by canvas size, each registered three times (landscape/square/portrait) in `remotion/src/Root.tsx`. Both drive their reveal from a new shared pure module `src/reveal.ts` (eased progress + opacity ramp + fixed-camera plan), so the reveal math is unified and unit-testable. `scripts/produce.mjs` gains a `format` selector (`static|reveal|story|all`) and a nested output JSON. Strictly additive — the existing `*Story` path is untouched.

**Tech Stack:** Bun, TypeScript, bun:test, React, Remotion 4, `@maptiler/sdk` (MapLibre), Playwright.

## Global Constraints

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion ... --gl=angle --concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`; Remotion reads `REMOTION_MAPTILER_KEY`) — never hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO an authorship trailer naming an assistant.
- **English** throughout.
- **Additive:** do NOT modify `src/components/SymbolStory.tsx`, `src/components/ChoroplethStory.tsx`, or their `*Story*` registrations. SP2 corrects the symbol-story misnomer.
- **Every format ships its four artifacts:** code + conformance/harness + KB at the right layer + render verification on BOTH types.
- **Grounded KB**, sourced by name (FT Visual Vocabulary, Datawrapper Academy, Remotion determinism discipline), no fabricated URLs.
- **Verify at render on BOTH types, all 3 sizes, SEQUENTIALLY** (Remotion `--concurrency=1`; shared dist — never parallel produce runs).
- Baseline before this plan: **122 tests passing** — keep them green.

All paths relative to `skills/map-native/` unless stated otherwise.

---

### Task 1: Shared reveal module + SymbolReveal component (+ 3 compositions)

**Files:**
- Create: `src/reveal.ts`
- Create: `src/components/SymbolReveal.tsx`
- Modify: `remotion/src/Root.tsx`
- Test: `tests/reveal.test.ts`

**Interfaces:**
- Produces (consumed by Task 2, 3, 5):
  - `easedRevealProgress(frame: number, durationInFrames: number, opts?: { holdIn?: number; holdOut?: number }): number` — eased 0→1 (cubic in-out), with blank holds at both ends; `0` at frame 0, `1` at `durationInFrames-1`, monotonic non-decreasing, never NaN.
  - `revealFillOpacity(progress: number, max?: number): number` — `progress * max`, `max` defaults to `MAX_FILL_OPACITY`.
  - `revealCameraPlan(bounds: [number, number, number, number]): { kind: "fixed"; bounds: [number, number, number, number] }` — returns a FIXED camera plan with latitude-clamped bounds (±85 mercator-safe). The reveal never moves the camera.
  - `MAX_FILL_OPACITY = 0.85`, `REVEAL_HOLD = 0.05`, `REVEAL_FRAMES = 240` (8s @ 30fps).

- [ ] **Step 1: Write the failing test for the pure reveal module**

Create `tests/reveal.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import {
  easedRevealProgress,
  revealFillOpacity,
  revealCameraPlan,
  MAX_FILL_OPACITY,
  REVEAL_FRAMES,
} from "../src/reveal";

describe("easedRevealProgress", () => {
  it("is 0 at frame 0 and 1 at the last frame", () => {
    expect(easedRevealProgress(0, REVEAL_FRAMES)).toBe(0);
    expect(easedRevealProgress(REVEAL_FRAMES - 1, REVEAL_FRAMES)).toBeCloseTo(1, 5);
  });
  it("is monotonic non-decreasing and never NaN across the clip", () => {
    let prev = -1;
    for (let f = 0; f < REVEAL_FRAMES; f++) {
      const p = easedRevealProgress(f, REVEAL_FRAMES);
      expect(Number.isNaN(p)).toBe(false);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
  it("is a pure function of frame (same frame → same value)", () => {
    expect(easedRevealProgress(120, REVEAL_FRAMES)).toBe(
      easedRevealProgress(120, REVEAL_FRAMES),
    );
  });
});

describe("revealFillOpacity", () => {
  it("ramps 0 → max monotonically", () => {
    expect(revealFillOpacity(0)).toBe(0);
    expect(revealFillOpacity(1)).toBe(MAX_FILL_OPACITY);
    expect(revealFillOpacity(0.5)).toBeCloseTo(MAX_FILL_OPACITY * 0.5, 5);
  });
});

describe("revealCameraPlan", () => {
  it("is a fixed plan with latitudes clamped to ±85", () => {
    const plan = revealCameraPlan([-10, -90, 40, 90]);
    expect(plan.kind).toBe("fixed");
    expect(plan.bounds[1]).toBeGreaterThanOrEqual(-85);
    expect(plan.bounds[3]).toBeLessThanOrEqual(85);
    expect(plan.bounds[0]).toBe(-10);
    expect(plan.bounds[2]).toBe(40);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd skills/map-native && bun test tests/reveal.test.ts`
Expected: FAIL — `Cannot find module '../src/reveal'`.

- [ ] **Step 3: Implement `src/reveal.ts`**

```ts
// reveal.ts — shared pure helpers for the simple-reveal video format.
// A simple reveal is a FIXED-camera, data-animates-in clip: one eased progress
// 0→1 with short blank holds at both ends. Both SymbolReveal and ChoroplethReveal
// drive their reveal from these helpers so the math is unified and unit-tested.
import { interpolate, Easing } from "remotion";

export const REVEAL_FRAMES = 240; // 8s @ 30fps
export const REVEAL_HOLD = 0.05; // ~5% blank-in / full-out
export const MAX_FILL_OPACITY = 0.85;

export function easedRevealProgress(
  frame: number,
  durationInFrames: number,
  opts: { holdIn?: number; holdOut?: number } = {},
): number {
  const holdIn = opts.holdIn ?? REVEAL_HOLD;
  const holdOut = opts.holdOut ?? REVEAL_HOLD;
  const t = durationInFrames <= 1 ? 0 : frame / (durationInFrames - 1);
  return interpolate(t, [holdIn, 1 - holdOut], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function revealFillOpacity(
  progress: number,
  max: number = MAX_FILL_OPACITY,
): number {
  return progress * max;
}

// Latitude clamp to ±85° (Mercator-safe) — every bounds passed to MapTiler must be clamped.
function clampLat(lat: number): number {
  return Math.max(-85, Math.min(85, lat));
}

export function revealCameraPlan(
  bounds: [number, number, number, number],
): { kind: "fixed"; bounds: [number, number, number, number] } {
  return {
    kind: "fixed",
    bounds: [bounds[0], clampLat(bounds[1]), bounds[2], clampLat(bounds[3])],
  };
}
```

NOTE: `interpolate`/`Easing` are pure Remotion utilities (no React/DOM); they import fine under bun:test.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/map-native && bun test tests/reveal.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Create `src/components/SymbolReveal.tsx`**

This is the correctly-named symbol simple-reveal. It mirrors the EXISTING `src/components/SymbolStory.tsx` body (read it for the exact MapTiler init + per-frame harness — same `delayRender → setPaintProperty → map.once("idle") → continueRender` pattern, same `symbolGeometry`/`symbolLabels`/`MapFrame` usage), with these differences from SymbolStory:
  - Import and use the shared module: `import { easedRevealProgress, revealCameraPlan } from "../reveal";`
  - Compute progress via `const progress = easedRevealProgress(frame, durationInFrames);` (NOT the inline `interpolate` SymbolStory uses).
  - Fit the camera through the plan: `const plan = revealCameraPlan(geo.bounds);` then `map.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 });` (clamped bounds — SymbolStory currently fits unclamped `geo.bounds`).
  - Keep everything else identical: the circle-radius GPU expression `["*", ["get", "radius"], progress]`, the `symbol-labels` text-opacity = progress, the `mapReady` gate, `MAX_RADIUS_PX = 40`, the `labelTextSize = width <= 1080 ? 18 : 13`, and the `MapFrame` furniture wrapper (title/description/source, `responsive={false}`).

Component signature: `export const SymbolReveal: React.FC<{ config: SymbolConfig }> = ({ config }) => { ... }` (import `SymbolConfig` from `../SymbolMap`, as SymbolStory does).

Do NOT modify `SymbolStory.tsx`.

- [ ] **Step 6: Register the 3 symbol-reveal compositions in `remotion/src/Root.tsx`**

Add the import and a shared duration constant near the existing `SYMBOL_FRAMES`:

```tsx
import { SymbolReveal } from "../../src/components/SymbolReveal";
import { REVEAL_FRAMES } from "../../src/reveal";
```

Add three `<Composition>` entries (alongside the existing ones, do not remove any):

```tsx
    <Composition
      id="SymbolReveal"
      component={SymbolReveal}
      durationInFrames={REVEAL_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolRevealSquare"
      component={SymbolReveal}
      durationInFrames={REVEAL_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolRevealPortrait"
      component={SymbolReveal}
      durationInFrames={REVEAL_FRAMES}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={symbolDefaultProps}
    />
```

Also add the three ids to the Root.tsx header comment block.

- [ ] **Step 7: Verify the Remotion graph compiles and the still renders**

Run (from `skills/map-native`, with env loaded):
```bash
set -a && . ../../.env && set +a
bunx remotion still remotion/src/index.ts SymbolReveal /tmp/sp1/symbol-reveal-mid.png --frame=120 --gl=angle --props=<(echo '{"config":'"$(cat assets/sample-data/symbol.json)"'}')
```
Expected: a still renders showing partially-grown circles. READ `/tmp/sp1/symbol-reveal-mid.png` — circles are mid-size (not full, not zero), MapFrame title + source present, no camera offset vs the symbol extent. Also render `--frame=0` to `/tmp/sp1/symbol-reveal-0.png` and READ it: circles invisible (radius 0), basemap + furniture only (blank-data start).

- [ ] **Step 8: Commit**

```bash
git add skills/map-native/src/reveal.ts skills/map-native/src/components/SymbolReveal.tsx skills/map-native/remotion/src/Root.tsx skills/map-native/tests/reveal.test.ts
git commit -m "feat(map-native): symbol simple-reveal video + shared reveal module"
```
(NO Claude-Session trailer.)

---

### Task 2: Wire ChoroplethReveal to the recipe (MapFrame + shared module + 3 compositions)

**Files:**
- Modify: `src/components/ChoroplethReveal.tsx`
- Modify: `remotion/src/Root.tsx`

**Interfaces:**
- Consumes: `easedRevealProgress`, `revealFillOpacity`, `revealCameraPlan`, `REVEAL_FRAMES` from `src/reveal.ts` (Task 1).

- [ ] **Step 1: Bring `ChoroplethReveal` up to the editorial definition**

The existing `src/components/ChoroplethReveal.tsx` works but does NOT match the simple-reveal definition: it renders a BARE map div with NO `MapFrame` furniture (no title/source), and its progress is a LINEAR `interpolate` (not eased). Read the current file, then change ONLY:

1. **Wrap the map in `MapFrame`** (mirror `SymbolStory.tsx`'s return + `resolveMapFrame` usage):
   - Add imports: `import { resolveMapFrame } from "../core/map-format";` and `import { MapFrame } from "../core/MapFrame";`
   - Compute `const mapFrame = resolveMapFrame(width, height, { titleLines: 2, hasDescription: !!(config as any).description });`
   - Return:
     ```tsx
     return (
       <AbsoluteFill style={{ backgroundColor: "#f4f4f4" }}>
         <style>{`.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-attrib,.maptiler-logo{display:none!important}`}</style>
         <MapFrame
           title={(config as any).title ?? ""}
           description={(config as any).description}
           source={(config as any).source ?? { name: "" }}
           width={width}
           height={height}
           responsive={false}
           frame={mapFrame}
         >
           <div ref={ref} style={{ width, height, position: "absolute" }} />
         </MapFrame>
       </AbsoluteFill>
     );
     ```
   - Use `mapFrame.pad` for the `fitBounds` padding (replacing the hard-coded `padding: 24`).

2. **Eased progress via the shared module + clamped camera:**
   - Add `import { easedRevealProgress, revealFillOpacity, revealCameraPlan } from "../reveal";`
   - In the per-frame effect, replace the inline `interpolate(frame/(durationInFrames-1), [HOLD_IN, 1-HOLD_OUT], [0,1], ...)` with `const progress = easedRevealProgress(frame, durationInFrames);` and set opacity via `map.setPaintProperty("choropleth-fill", "fill-opacity", revealFillOpacity(progress));` (this replaces `progress * 0.85` — `revealFillOpacity` defaults to `MAX_FILL_OPACITY = 0.85`, so the final opacity is unchanged).
   - Remove the now-unused local `HOLD_IN` / `HOLD_OUT` consts (the holds live in `reveal.ts`).
   - Fit through the plan: `const plan = revealCameraPlan(layout.bounds as [number,number,number,number]);` then `m.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 });` (replacing the unclamped `layout.bounds`).

3. Remove the unused `scale?` prop from `ChoroplethRevealProps` if it remains unused after these edits (it is currently declared but never read).

Do NOT touch `ChoroplethStory.tsx`.

- [ ] **Step 2: Register the 3 choropleth-reveal compositions in `remotion/src/Root.tsx`**

Add the import:
```tsx
import { ChoroplethReveal } from "../../src/components/ChoroplethReveal";
```

Add three `<Composition>` entries (do not remove any existing):

```tsx
    <Composition
      id="ChoroplethReveal"
      component={ChoroplethReveal}
      durationInFrames={REVEAL_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethRevealSquare"
      component={ChoroplethReveal}
      durationInFrames={REVEAL_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethRevealPortrait"
      component={ChoroplethReveal}
      durationInFrames={REVEAL_FRAMES}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={choroplethDefaultProps}
    />
```

(`REVEAL_FRAMES` is already imported from Task 1; `choroplethDefaultProps` already exists.) Add the three ids to the header comment.

- [ ] **Step 3: Verify the choropleth reveal renders with furniture**

```bash
set -a && . ../../.env && set +a
bunx remotion still remotion/src/index.ts ChoroplethReveal /tmp/sp1/choro-reveal-mid.png --frame=120 --gl=angle --props=<(echo '{"config":'"$(cat assets/sample-data/choropleth.json)"'}')
bunx remotion still remotion/src/index.ts ChoroplethReveal /tmp/sp1/choro-reveal-0.png --frame=0 --gl=angle --props=<(echo '{"config":'"$(cat assets/sample-data/choropleth.json)"'}')
```
READ both: mid-frame shows regions at ~partial opacity WITH the title + source furniture (MapFrame) over the map; frame-0 shows NO region fill (blank-data start), basemap + furniture only. `bun test` still green (no test change in this task).

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/components/ChoroplethReveal.tsx skills/map-native/remotion/src/Root.tsx
git commit -m "feat(map-native): wire choropleth simple-reveal (MapFrame + shared reveal module + 3 sizes)"
```
(NO Claude-Session trailer.)

---

### Task 3: Produce format selector (`static|reveal|story|all`) + nested output JSON

**Files:**
- Modify: `scripts/produce.mjs`
- (Grep for and update any consumer of the produce result JSON — see Step 4.)

**Interfaces:**
- Consumes: the composition ids registered in Tasks 1–2 (`SymbolReveal*`, `ChoroplethReveal*`) and the existing `*Story*` ids.

- [ ] **Step 1: Replace the binary formats flag with the 4-way selector**

In `scripts/produce.mjs`: the `formats` variable (currently `"all" | "static"`, defaulting to `"all"`) becomes `format ∈ { static | reveal | story | all }`. Update the usage string and the header comment:

```js
const format = process.argv[4] ?? process.env.FORMATS ?? "all";
const VALID = new Set(["static", "reveal", "story", "all"]);
if (!configPath || !outDir || !VALID.has(format)) {
  console.error("usage: produce.mjs <config.json> <outDir> <static|reveal|story|all>");
  process.exit(1);
}
```

The web build + 4 snaps (static/proof/responsive/a11y, lines ~45–63) ALWAYS run for every format (they produce the `static.png` + `interactive.png` proofs). Only the VIDEO rendering is gated by `format`.

- [ ] **Step 2: Factor the video render into a reusable helper and gate it by format**

Replace the existing `if (formats === "all") { ... }` video block with a helper that renders one composition-set (3 sizes) and a gated dispatch. The composition-set is chosen by BOTH `config.type` and the video KIND:

```js
const result = {
  static: join(outDir, "static.png"),
  interactive: join(outDir, "interactive.png"),
};

const isSymbol = JSON.parse(readFileSync(configPath, "utf8")).type === "symbol";

// comps[kind] = [[compId, sizeName], ...] for the config's type
const VIDEO_COMPS = {
  reveal: isSymbol
    ? [["SymbolReveal", "landscape"], ["SymbolRevealSquare", "square"], ["SymbolRevealPortrait", "portrait"]]
    : [["ChoroplethReveal", "landscape"], ["ChoroplethRevealSquare", "square"], ["ChoroplethRevealPortrait", "portrait"]],
  story: isSymbol
    ? [["SymbolStory", "landscape"], ["SymbolStorySquare", "square"], ["SymbolStoryPortrait", "portrait"]]
    : [["ChoroplethStory", "landscape"], ["ChoroplethStorySquare", "square"], ["ChoroplethStoryPortrait", "portrait"]],
};

// Still mid-frame per kind (reveal is 240 frames; story uses its existing 140).
const STILL_FRAME = { reveal: 120, story: 140 };

function renderVideoSet(kind, propsPath, remotionEntry) {
  const out = {};
  for (const [comp, name] of VIDEO_COMPS[kind]) {
    const stillOut = join(outDir, `${kind}-${name}-still.png`);
    const mp4Out = join(outDir, `${kind}-${name}.mp4`);
    console.log(`[produce map] ${kind} ${name} (${comp}) — still…`);
    run("bunx", ["remotion", "still", remotionEntry, comp, stillOut,
      `--frame=${STILL_FRAME[kind]}`, "--gl=angle", `--props=${propsPath}`], { COMP: comp });
    console.log(`[produce map] ${kind} ${name} (${comp}) — mp4…`);
    run("bunx", ["remotion", "render", remotionEntry, comp, mp4Out,
      "--gl=angle", "--concurrency=1", "--timeout=120000", `--props=${propsPath}`], { COMP: comp });
    out[name] = mp4Out;
  }
  return out;
}

const kinds = format === "all" ? ["reveal", "story"] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : [];
if (kinds.length) {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const tmpDir = mkdtempSync(join(tmpdir(), "map-native-props-"));
  try {
    const propsPath = join(tmpDir, "props.json");
    writeFileSync(propsPath, JSON.stringify({ config }));
    const remotionEntry = join(root, "remotion", "src", "index.ts");
    for (const kind of kinds) {
      result[kind] = renderVideoSet(kind, propsPath, remotionEntry);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log("PRODUCE_RESULT " + JSON.stringify(result));
```

This yields the nested JSON `{ static, interactive, reveal?: {landscape,square,portrait}, story?: {landscape,square,portrait} }` — `reveal`/`story` present only when produced. (Note the still/mp4 filenames are now `${kind}-${name}...`, e.g. `reveal-landscape.mp4`, `story-portrait.mp4`; the previous flat `landscape.mp4` names are gone.)

- [ ] **Step 3: Smoke-test the selector (static path, fast — no video)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/sp1/sel-static static
```
Expected: builds + snaps run, ends with `PRODUCE_RESULT {"static":"...","interactive":"..."}` (NO reveal/story keys). Confirm an invalid format exits with the usage error: `bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/x bogus` → exit 1 + usage line.

- [ ] **Step 4: Update any consumer of the produce result JSON**

Grep for readers of the old flat keys / the result contract and update them to the nested shape:
```bash
cd skills/map-native && grep -rn "PRODUCE_RESULT\|\.landscape\|\.square\|\.portrait" scripts/ ../.. --include=*.mjs --include=*.ts --include=*.md | grep -v node_modules
```
For each real consumer (e.g. a showcase/orchestrator script that parses `PRODUCE_RESULT` and reads `.landscape`), update it to read `result.reveal?.landscape` / `result.story?.landscape` as appropriate. If the only matches are this plan/spec and produce.mjs itself, note "no external consumer" in the task report and move on. Do NOT invent a consumer.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/scripts/produce.mjs
# plus any consumer files you actually changed in Step 4
git commit -m "feat(map-native): produce format selector (static|reveal|story|all) + nested output JSON"
```
(NO Claude-Session trailer.)

---

### Task 4: KB — `video-reveal.md` (reveal-specific best practices)

**Files:**
- Create: `knowledge/references/map/formats/video-reveal.md`
- Read for context (do not modify): `knowledge/references/map/formats/video.md`

- [ ] **Step 1: Write the reveal-specific KB doc**

Create `knowledge/references/map/formats/video-reveal.md` (<150 lines). It documents ONLY what is specific to the simple-reveal sub-format (the cross-cutting video discipline — frame-determinism, `--gl=angle`, 3 ratios, furniture-per-ratio — stays in the existing `video.md`; reference it, don't duplicate it). Cover, each line grounded and sourced BY NAME (no fabricated URLs):

- **What a simple reveal is / when to choose it:** fixed framing on the full extent, data animates in place, no camera movement; the right choice when the story is "here is the distribution" not "let me walk you somewhere" — the quick social clip. (Source: FT Visual Vocabulary — magnitude/distribution framing; Datawrapper Academy — "let the data, not the camera, carry a simple chart-like map".)
- **Zero camera movement** is the defining rule: the extent is identical on every frame; if the story needs camera motion, that is the storytelling format, not reveal.
- **Blank-data start, settle-at-end:** ~5% blank-in hold (no data ink at frame 0 — basemap may show), a single Disney `easeInOutCubic` ramp, ~5% full hold at the end so the final frame equals the static render's data state. ~8s / 240 frames @ 30fps. (Source: Remotion frame-determinism discipline; the chart-native reveal-contract.)
- **Furniture = MapFrame shell only:** title overlay (top) + source (bottom, always cited), no title card, no lower-third, no callouts — those belong to storytelling. (Source: the toolkit's MapFrame convention; Datawrapper Academy — always attribute the source.)
- **Reveal per type:** choropleth = fill-opacity 0→~0.85; proportional symbol = radius 0→target + labels fade in.

End with a one-line pointer: "For camera-driven explainers (tours, callouts, Tom's route-reveal), see the storytelling format (SP2/SP3)."

- [ ] **Step 2: Verify grounding (no fabricated URLs, sources named)**

Re-read the file; confirm every best-practice line names a real source (FT Visual Vocabulary, Datawrapper Academy, Remotion, MapFrame convention) and that there are NO invented URLs and NO fabricated quote attributions.

- [ ] **Step 3: Commit**

```bash
git add knowledge/references/map/formats/video-reveal.md
git commit -m "docs(map-native): KB — simple-reveal video best practices"
```
(NO Claude-Session trailer.)

---

### Task 5: Conformance (`checkRevealConformance`) + full render verification

**Files:**
- Modify: `src/conformance.ts`
- Test: `tests/conformance.test.ts`

**Interfaces:**
- Consumes: `revealCameraPlan` from `src/reveal.ts` (Task 1).

- [ ] **Step 1: Write the failing conformance test**

Append to `tests/conformance.test.ts` (import `checkRevealConformance` from `../src/conformance` — add to the existing import if one is present):

```ts
import { checkRevealConformance } from "../src/conformance";

describe("checkRevealConformance", () => {
  const ok = {
    bounds: [-10, 35, 30, 60] as [number, number, number, number],
    title: "Renewables power Europe's north",
    source: { name: "Ember", url: "https://ember-energy.org" },
    hasFurniture: true,
  };
  it("passes a well-formed fixed-camera reveal", () => {
    expect(checkRevealConformance(ok).violations).toEqual([]);
  });
  it("flags degenerate bounds (west ≥ east)", () => {
    expect(
      checkRevealConformance({ ...ok, bounds: [30, 35, 30, 60] }).violations
        .some((m) => /degenerate|bounds/i.test(m)),
    ).toBe(true);
  });
  it("flags missing furniture", () => {
    expect(
      checkRevealConformance({ ...ok, hasFurniture: false }).violations
        .some((m) => /furniture/i.test(m)),
    ).toBe(true);
  });
  it("flags a missing source", () => {
    expect(
      checkRevealConformance({ ...ok, source: { name: "" } }).violations
        .some((m) => /source/i.test(m)),
    ).toBe(true);
  });
});
```

Run: `cd skills/map-native && bun test tests/conformance.test.ts` → FAIL (`checkRevealConformance` not exported).

- [ ] **Step 2: Implement `checkRevealConformance`**

Add to `src/conformance.ts`. It is a PURE check guarding the reveal's invariants (the "no camera movement" guarantee is structural — the reveal uses a `fixed` `revealCameraPlan`, so conformance asserts the plan is fixed and its bounds are valid/clamped, plus furniture + source presence):

```ts
import { revealCameraPlan } from "./reveal";

export interface RevealConformanceResult {
  violations: string[];
}

export function checkRevealConformance(input: {
  bounds: [number, number, number, number];
  title?: string;
  source?: { name?: string; url?: string };
  hasFurniture?: boolean;
}): RevealConformanceResult {
  const v: string[] = [];
  const plan = revealCameraPlan(input.bounds);
  // The reveal must use a fixed camera (no movement across frames).
  if (plan.kind !== "fixed") v.push("reveal camera must be fixed (no movement)");
  const [w, s, e, n] = plan.bounds;
  if (![w, s, e, n].every((x) => Number.isFinite(x)))
    v.push("reveal bounds must be finite");
  if (w >= e || s >= n)
    v.push("reveal bounds are degenerate (west ≥ east or south ≥ north)");
  if (s < -85 || n > 85)
    v.push("reveal bounds latitude must be clamped to ±85 (Mercator-safe)");
  if (input.hasFurniture === false)
    v.push("reveal must render the MapFrame furniture (title + source)");
  if (!input.source?.name?.trim())
    v.push("reveal must cite a source");
  return { violations: v };
}
```

Run the test → PASS.

- [ ] **Step 3: Run the full test suite**

Run: `cd skills/map-native && bun test`
Expected: PASS — baseline 122 + Task 1's reveal cases + Task 5's conformance cases (≥ 130). 0 fail.

- [ ] **Step 4: Full render verification — BOTH types, all 3 sizes, sequential**

This is the format's render gate. Run produce in `reveal` mode for each type, ONE AT A TIME (shared dist, never parallel):

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/sp1/choro reveal
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/sp1/symbol reveal
```

For EACH type, READ the three `reveal-{landscape,square,portrait}-still.png` (mid-frame) in `/tmp/sp1/<type>/` and confirm: data is mid-animated (partial), the camera extent is the SAME across all three sizes (no camera offset), and the MapFrame furniture is correct per ratio (title not clipped at portrait, source present). Then render a frame-0 and a final-frame still for ONE size per type to confirm blank-data-start and full-at-end:

```bash
for T in choropleth symbol; do
  C=assets/sample-data/$T.json
  ID=$([ $T = symbol ] && echo SymbolReveal || echo ChoroplethReveal)
  bunx remotion still remotion/src/index.ts $ID /tmp/sp1/$T-f0.png  --frame=0   --gl=angle --props=<(echo '{"config":'"$(cat $C)"'}')
  bunx remotion still remotion/src/index.ts $ID /tmp/sp1/$T-f239.png --frame=239 --gl=angle --props=<(echo '{"config":'"$(cat $C)"'}')
done
```
READ each: frame-0 shows NO data (radius 0 / opacity 0), final shows full data matching the static render's data state. If any size crops the data or shows a camera shift between frames, the reveal isn't fixed-camera — debug before proceeding.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/conformance.ts skills/map-native/tests/conformance.test.ts
git commit -m "feat(map-native): reveal conformance guard + full render verification"
```
(NO Claude-Session trailer.)

## Notes for the executor

- **Additive discipline:** `SymbolStory.tsx`, `ChoroplethStory.tsx`, and all `*Story*` registrations stay untouched. If a step seems to require editing them, stop and re-read — it doesn't.
- Run `produce` ONE type at a time; Remotion always `--gl=angle --concurrency=1`.
- NEVER print or log the MapTiler key.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages or files.
- After all tasks: `bun test` green; `produce … reveal` emits 3 mp4s per type; the frame-0 still has no data, the final still equals the static data state, and the camera never moves.
