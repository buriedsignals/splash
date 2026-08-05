# Map Storytelling Video (SP2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the proportional-symbol storytelling video a real beat-driven guided camera tour (at parity with the choropleth), and lay down a camera-mode dispatch point the AI selects per article.

**Architecture:** `SymbolStory.tsx` is rewritten to consume the existing beat engine (`deriveSymbolStory` → `buildTimeline` → `cameraForFrame` → `jumpTo`), mirroring `ChoroplethStory.tsx`. `deriveSymbolStory` gains an AI-controlled `maxReveals` cap. A `cameraMode` config field (default `guided-tour`) dispatches the `story` produce format, with an explicit extension point for SP3's `route-reveal`. Additive: composition ids unchanged; `ChoroplethStory` untouched.

**Tech Stack:** Bun, TypeScript, bun:test, React, Remotion 4, `@maptiler/sdk` (MapLibre), Playwright.

## Global Constraints

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion ... --gl=angle --concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`; Remotion reads `REMOTION_MAPTILER_KEY`) — never hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO an authorship trailer naming an assistant.
- **English** throughout.
- **Additive:** `SymbolStory` internals are rewritten but its composition ids stay (`SymbolStory` / `SymbolStorySquare` / `SymbolStoryPortrait`). Do NOT change `ChoroplethStory`'s logic/behavior, the SP1 reveal components (`SymbolReveal`/`ChoroplethReveal`), or the produce `static|reveal|story|all` selector's meaning. (The ONE permitted `ChoroplethStory` edit is the mechanical extraction of its inline `TitleCard`/`CaptionCard` into a shared module — an import swap with NO logic change, Task 2 Step 1.)
- **Default basemap** (no water recolour); no-data / basemap policy from SP1 holds. The symbol map already uses the default basemap.
- **Every fix ships four artifacts** (code + conformance/harness + KB at the right layer + render verification on BOTH story types).
- **Grounded KB**, sourced by name (FT Visual Vocabulary, Amini et al. 2015, NN/g), no fabricated URLs.
- Baseline before this plan: **129 tests passing** — keep them green.

All paths relative to `skills/map-native/` unless stated otherwise.

---

### Task 1: `deriveSymbolStory` — AI-controlled reveal count (`maxReveals`)

**Files:**
- Modify: `src/symbol-story.ts`
- Test: `tests/symbol-story.test.ts`

**Interfaces:**
- Produces: `deriveSymbolStory(points, meta, opts?: { maxReveals?: number }): Beat[]` and `export const DEFAULT_MAX_REVEALS = 5`. The `reveal` beats are the top-`maxReveals` points by value (descending); `maxReveals` defaults to `DEFAULT_MAX_REVEALS`, and is clamped to `[1, points.length]`.

- [ ] **Step 1: Write the failing test**

Create `tests/symbol-story.test.ts`:

```ts
import { describe, it, expect } from "bun:test";
import { deriveSymbolStory, DEFAULT_MAX_REVEALS } from "../src/symbol-story";
import type { SymbolPoint } from "../src/symbol-geo";

const pts: SymbolPoint[] = [
  { lon: 0, lat: 51, value: 300, label: "London", radius: 40 },
  { lon: 2, lat: 48, value: 200, label: "Paris", radius: 30 },
  { lon: 13, lat: 52, value: 150, label: "Berlin", radius: 25 },
  { lon: 12, lat: 41, value: 120, label: "Rome", radius: 22 },
  { lon: -3, lat: 40, value: 90, label: "Madrid", radius: 18 },
  { lon: 4, lat: 50, value: 60, label: "Brussels", radius: 14 },
];
const meta = { title: "Tech funding", insight: "London leads", unit: "$bn" };

describe("deriveSymbolStory maxReveals", () => {
  it("emits exactly maxReveals reveal beats, the top-N by value descending", () => {
    const beats = deriveSymbolStory(pts, meta, { maxReveals: 3 });
    const reveals = beats.filter((b) => b.kind === "reveal");
    expect(reveals.length).toBe(3);
    expect(reveals.map((b) => b.highlight[0])).toEqual(["London", "Paris", "Berlin"]);
  });
  it("defaults to DEFAULT_MAX_REVEALS when no cap is given", () => {
    const beats = deriveSymbolStory(pts, meta);
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(DEFAULT_MAX_REVEALS);
  });
  it("clamps to the number of points when fewer than maxReveals", () => {
    const beats = deriveSymbolStory(pts.slice(0, 2), meta, { maxReveals: 5 });
    expect(beats.filter((b) => b.kind === "reveal").length).toBe(2);
  });
  it("opens title/establish and closes takeaway, each reveal callout carries the unit", () => {
    const beats = deriveSymbolStory(pts, meta, { maxReveals: 2 });
    expect(beats[0].kind).toBe("title");
    expect(beats[1].kind).toBe("establish");
    expect(beats[beats.length - 1].kind).toBe("takeaway");
    for (const b of beats.filter((x) => x.kind === "reveal")) {
      expect(b.callout?.value.includes("$bn")).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd skills/map-native && bun test tests/symbol-story.test.ts`
Expected: FAIL — `deriveSymbolStory` takes 2 args / `DEFAULT_MAX_REVEALS` not exported.

- [ ] **Step 3: Implement the cap in `src/symbol-story.ts`**

Add the export and the third parameter; cap the sorted list before the reveal loop:

```ts
export const DEFAULT_MAX_REVEALS = 5;

export function deriveSymbolStory(
  points: SymbolPoint[],
  meta: SymbolStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  // …unchanged: unit, fmt, bounds, title + establish beats…

  const sorted = [...points].sort((a, b) => b.value - a.value);
  const cap = Math.max(1, Math.min(opts.maxReveals ?? DEFAULT_MAX_REVEALS, sorted.length));
  for (const p of sorted.slice(0, cap)) {
    // …unchanged reveal-beat body…
  }

  // …unchanged: takeaway beat, return beats…
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd skills/map-native && bun test tests/symbol-story.test.ts`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/symbol-story.ts skills/map-native/tests/symbol-story.test.ts
git commit -m "feat(map-native): deriveSymbolStory reveal-count cap (maxReveals, AI-controlled)"
```
(NO Claude-Session trailer.)

---

### Task 2: Rewrite `SymbolStory` as a real guided camera tour

**Files:**
- Create: `src/components/StoryCards.tsx` (shared `TitleCard` + `CaptionCard`, extracted from `ChoroplethStory`)
- Modify: `src/components/ChoroplethStory.tsx` (import `TitleCard`/`CaptionCard` from the new module — mechanical swap, NO logic change)
- Rewrite: `src/components/SymbolStory.tsx`
- Create (only if `CountryLabel` does not generalize): `src/components/SymbolCallout.tsx`

**Interfaces:**
- Consumes: `deriveSymbolStory(points, meta, { maxReveals })` (Task 1); `buildTimeline`, `cameraForFrame`, `type CameraSolution` from `../story-timeline`; `symbolGeometry`, `symbolLabels`, `labelRadialOffset` (SP1 symbol layers); `resolveMapFrame`, `MapFrame`; `CountryLabel` from `./CountryLabel`; `TitleCard`, `CaptionCard` from the new `./StoryCards`.

This is a rewrite of the mislabelled beatless `SymbolStory` into a beat-driven tour that MIRRORS `src/components/ChoroplethStory.tsx`. READ `ChoroplethStory.tsx` FIRST and follow its exact structure/harness; the notes below are the symbol-specific deltas.

- [ ] **Step 1: Extract `TitleCard` + `CaptionCard` to a shared module**

`TitleCard` and `CaptionCard` are currently defined INLINE inside `ChoroplethStory.tsx` (not exported), so `SymbolStory` cannot reuse them. Move both component definitions VERBATIM into a new `src/components/StoryCards.tsx` as named exports (`export const TitleCard: React.FC<…>`, `export const CaptionCard: React.FC<…>` — copy their exact prop types and bodies). In `ChoroplethStory.tsx`, delete the two inline definitions and add `import { TitleCard, CaptionCard } from "./StoryCards";`. This is a pure move — ChoroplethStory's rendered output must be byte-identical. Run `bun test` after to confirm nothing broke, and (later, Task 3's render step) the choropleth story still renders the same.

- [ ] **Step 2: Mirror the ChoroplethStory skeleton**

Reproduce, from `ChoroplethStory.tsx`: the `useVideoConfig()` (`fps,width,height`), the `mapState` shape (holding `map, beats, phases, solutions` + a symbol-specific `cityByKey` in place of `centroidByKey`), the `[handle] = delayRender(...)` init gate, the `lastBeatIndex` ref, the per-frame `overlay` state, and the `delayRender → jumpTo → idle → continueRender` harness. Keep the MapTiler init from the CURRENT `SymbolStory` (DATAVIZ.LIGHT default basemap, `interactive:false`, `preserveDrawingBuffer:true`, `fadeDuration:0`) — do NOT recolour water.

- [ ] **Step 3: Build beats, solutions, timeline, and the city lookup on load**

Inside `map.on("load")` (after adding the symbol circle + `symbol-labels` layers exactly as the current `SymbolStory`/`SymbolReveal` do):

```ts
const meta = {
  title: config.title ?? "",
  insight: (config as any).insight ?? config.title ?? "",
  unit: config.valueUnit ?? "",
};
const beats = deriveSymbolStory(config.points, meta, { maxReveals: config.maxReveals });

// Camera solution per beat — cameraForBounds on the beat's [w,s,e,n] bbox, padded.
const solutions: CameraSolution[] = beats.map((b) => {
  const result = map.cameraForBounds(b.camera as maptilersdk.LngLatBoundsLike, {
    padding: mapFrame.pad,
  });
  if (!result) return { center: [10, 20], zoom: 2 };
  return { center: [result.center.lng, result.center.lat], zoom: result.zoom };
});

const kinds = beats.map((b) => b.kind);
const { phases } = buildTimeline(kinds, fps);

// City lookup for callout projection: label → [lon, lat] (symbol has no centroids).
const cityByKey = new Map<string, [number, number]>();
for (const p of config.points) {
  if (p.label) cityByKey.set(p.label, [p.lon, p.lat]);
}

map.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });
map.once("idle", () => {
  setMapState({ map, beats, phases, solutions, cityByKey });
  continueRender(handle);
});
```

`config.maxReveals` is a new optional field on `SymbolConfig` — add `maxReveals?: number` to the `SymbolConfig` interface in `src/SymbolMap.tsx` (Task 3 also touches config typing; if this task runs first, add it here and Task 3 consumes it).

- [ ] **Step 4: Per-frame — camera jump + circle establish + callout projection**

Mirror `ChoroplethStory`'s per-frame effect:

```ts
const { camera, beatIndex, fillReveal } = cameraForFrame(frame, phases, solutions);
map.jumpTo({ center: camera.center, zoom: camera.zoom });

// Circles are ESTABLISHED during the establish beat (radius 0→target via fillReveal),
// then stay full for the rest of the tour (no dimming — consistent with ChoroplethStory).
if (map.getLayer("symbol-circles")) {
  map.setPaintProperty("symbol-circles", "circle-radius", [
    "*", ["get", "radius"], fillReveal,
  ]);
}
if (map.getLayer("symbol-labels")) {
  map.setPaintProperty("symbol-labels", "text-opacity", fillReveal);
}

// Callout projection: the highlighted city's own lon/lat → screen.
const beat = beats[beatIndex];
let calloutPt: { x: number; y: number } | null = null;
if (beat.callout) {
  const lngLat = cityByKey.get(beat.callout.region);
  if (lngLat) {
    const pt = map.project(lngLat as [number, number]);
    calloutPt = { x: pt.x, y: pt.y };
  }
}
```

Compute `calloutReveal`/`captionReveal` exactly as `ChoroplethStory` does (eased over the reveal beat's hold). `calloutColor` is the single symbol hue — use `SYMBOL_FILL = "#2171b5"` (the constant already in `SymbolStory`), not a per-bin colour. Store `{ beatIndex, fillReveal, calloutPt, calloutReveal, calloutValue: beat.callout?.value ?? "", calloutColor: SYMBOL_FILL, captionReveal }` in `overlay`. Keep the `delayRender → … → map.once("idle", continueRender)` + `triggerRepaint()`.

- [ ] **Step 5: Overlays in the return JSX**

Mirror `ChoroplethStory`'s return: the `MapFrame` wrapper (title/description/source, `responsive={false}`, `frame={mapFrame}`) with the map `div` child; then the callout, caption, and title-card overlays. For the callout, reuse `CountryLabel` (it takes `name/color/reveal/x/y/value` — city name + value fit its API). If `CountryLabel` proves choropleth-specific in a way that breaks (e.g. it references a region concept), create a thin `src/components/SymbolCallout.tsx` with the same props/визual and use that instead — state which you did in the report. The callout value MUST include the unit (it already does — `deriveSymbolStory` formats `value` with the unit).

- [ ] **Step 6: Verify at render (symbol story)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
mkdir -p /tmp/sp2 && python3 -c "import json;c=json.load(open('assets/sample-data/symbol.json'));open('/tmp/sp2/props.json','w').write(json.dumps({'config':c}))"
bunx remotion still remotion/src/index.ts SymbolStory /tmp/sp2/story-reveal.png --frame=180 --gl=angle --props=/tmp/sp2/props.json
bunx remotion still remotion/src/index.ts SymbolStory /tmp/sp2/story-title.png --frame=20 --gl=angle --props=/tmp/sp2/props.json
```

(Note: the still frames assume the default timeline; if the total is short, pick a frame inside a reveal beat.) READ both PNGs: `story-title.png` shows the TitleCard over a blank/establishing map; `story-reveal.png` shows the camera FRAMED ON A CITY (not the whole extent — zoomed in), a callout "`City — value$unit`", circles established. If the camera is not framed on a city (whole extent) or no callout shows, the beat/solution wiring is wrong — debug before proceeding. `bun test` green.

- [ ] **Step 7: Commit**

```bash
git add skills/map-native/src/components/StoryCards.tsx skills/map-native/src/components/ChoroplethStory.tsx skills/map-native/src/components/SymbolStory.tsx skills/map-native/src/SymbolMap.tsx
# plus src/components/SymbolCallout.tsx if you created it
git commit -m "feat(map-native): SymbolStory is a real beat-driven guided camera tour"
```
(NO Claude-Session trailer.)

---

### Task 3: Camera-mode field + dispatch + computed story duration

**Files:**
- Modify: `src/SymbolMap.tsx` (`SymbolConfig`), `src/choropleth-geo.ts` (the choropleth config type) — add `cameraMode`
- Modify: `scripts/produce.mjs` (dispatch the `story` kind on `cameraMode`)
- Modify: `remotion/src/Root.tsx` (`SYMBOL_STORY_FRAMES`)

**Interfaces:**
- Produces: `type CameraMode = "guided-tour" | "route-reveal"`; config field `cameraMode?: CameraMode` (default `"guided-tour"`); `DEFAULT_CAMERA_MODE = "guided-tour"`.

- [ ] **Step 1: Add the `cameraMode` field to the config types**

Add `cameraMode?: "guided-tour" | "route-reveal"` to `SymbolConfig` (`src/SymbolMap.tsx`) and to the choropleth config type (`ChoroplethData` in `src/choropleth-geo.ts`, or wherever the produce config is typed). Export a shared constant near one of them (e.g. in `src/story-timeline.ts` or a small `src/camera-mode.ts`): `export type CameraMode = "guided-tour" | "route-reveal"; export const DEFAULT_CAMERA_MODE: CameraMode = "guided-tour";`

- [ ] **Step 2: Dispatch the `story` kind on `cameraMode` in `produce.mjs`**

In `scripts/produce.mjs`, where the `story` kind selects its composition set (`VIDEO_COMPS.story`), read `config.cameraMode` (default `"guided-tour"`) and dispatch:

```js
const cameraMode = config.cameraMode ?? "guided-tour";
// story kind → composition set by camera mode. guided-tour is implemented (SP2).
// route-reveal is SP3 — explicit extension point, not yet available.
function storyComps(isSymbol, cameraMode) {
  if (cameraMode === "guided-tour") {
    return isSymbol
      ? [["SymbolStory", "landscape"], ["SymbolStorySquare", "square"], ["SymbolStoryPortrait", "portrait"]]
      : [["ChoroplethStory", "landscape"], ["ChoroplethStorySquare", "square"], ["ChoroplethStoryPortrait", "portrait"]];
  }
  throw new Error(`camera mode '${cameraMode}' is not implemented yet (route-reveal ships in SP3)`);
}
```

Use `storyComps(isSymbol, cameraMode)` for the `story` kind in `VIDEO_COMPS`/`renderVideoSet`. The `reveal` kind is unchanged (it is the `simple` mode intrinsically). Keep the nested-JSON output shape.

- [ ] **Step 3: Compute `SYMBOL_STORY_FRAMES` in `Root.tsx`**

In `remotion/src/Root.tsx`, the three `SymbolStory*` compositions currently use `SYMBOL_FRAMES = 5 * 30`. Replace with a timeline-derived duration (mirroring how `STORY_FRAMES` is derived for choropleth):

```tsx
import { deriveSymbolStory } from "../../src/symbol-story";
// … after sampleSymbol is imported …
const symbolStoryBeats = deriveSymbolStory(
  symbolGeometry({ points: (sampleSymbol as any).points }, 40).symbols.map((s, i) => ({
    lon: s.lon, lat: s.lat, value: (sampleSymbol as any).points[i].value,
    label: (sampleSymbol as any).points[i].label, radius: s.radius,
  })),
  { title: (sampleSymbol as any).title, insight: (sampleSymbol as any).insight ?? "", unit: (sampleSymbol as any).valueUnit ?? "" },
  { maxReveals: (sampleSymbol as any).maxReveals },
);
const SYMBOL_STORY_FRAMES = buildTimeline(symbolStoryBeats.map((b) => b.kind), 30).totalFrames;
```

(If `deriveSymbolStory` can accept the raw `sampleSymbol.points` directly — they already carry `lon/lat/value/label` — use them directly instead of re-deriving via `symbolGeometry`; pick the simplest form that type-checks. `buildTimeline` is already imported in `Root.tsx`.) Set all three `SymbolStory*` `durationInFrames={SYMBOL_STORY_FRAMES}`. Leave the `SymbolReveal*` durations (`REVEAL_FRAMES`) and the choropleth durations unchanged.

- [ ] **Step 4: Verify — dispatch + both story types render**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/sp2/symbol story
bun scripts/produce.mjs assets/sample-data/choropleth.json /tmp/sp2/choro story
```

READ `/tmp/sp2/symbol/story-landscape-still.png` (camera on a city + callout) and `/tmp/sp2/choro/story-landscape-still.png` (choropleth tours max/min, default basemap, no-data unpainted — no regression). Confirm a bogus mode errors: temporarily set `"cameraMode":"route-reveal"` in a copy of the symbol config and confirm `produce … story` exits with the "not implemented (SP3)" error, then discard the copy. `bun test` green.

- [ ] **Step 5: Commit**

```bash
git add skills/map-native/src/SymbolMap.tsx skills/map-native/src/choropleth-geo.ts skills/map-native/scripts/produce.mjs skills/map-native/remotion/src/Root.tsx
# plus src/story-timeline.ts or src/camera-mode.ts if you added the shared type there
git commit -m "feat(map-native): cameraMode dispatch for the story format + computed symbol-story duration"
```
(NO Claude-Session trailer.)

---

### Task 4: Extend `audit-story.mjs` to gate the symbol story

**Files:**
- Modify: `scripts/audit-story.mjs`

- [ ] **Step 1: Read the current audit**

`scripts/audit-story.mjs` is the render-free narrative gate for the choropleth story: it builds `deriveMapStory` beats and asserts they open on `title`/`establish`, close on `takeaway`, every `reveal` carries a `highlight` + callout text, there are ≥2 distinct cameras (the camera moves), and the title + reveal beats carry copy. Read it to learn its exact assertion helpers and output format.

- [ ] **Step 2: Add a symbol-story case using the same assertions**

Add a symbol section that builds `deriveSymbolStory(points, meta, { maxReveals })` from `assets/sample-data/symbol.json` (its `points` already carry `lon/lat/value/label`) and runs the SAME assertions (open title/establish, close takeaway, every reveal has a highlight + callout text, ≥2 distinct camera bboxes, copy on title + reveals). Factor the shared assertion block into a helper `assertStoryBeats(beats, label)` if the file does not already have one, and call it for both `choropleth` and `symbol`. The script must exit non-zero if EITHER type fails, printing which type/assertion failed.

- [ ] **Step 3: Run the audit**

Run: `cd skills/map-native && bun scripts/audit-story.mjs` (or the `bun run audit:story` script if defined in `package.json`).
Expected: passes for BOTH choropleth and symbol, printing a per-type OK line. Then temporarily set `maxReveals: 0`-equivalent (or hand-break a beat) to confirm it FAILS loudly for symbol, and restore.

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/scripts/audit-story.mjs
git commit -m "test(map-native): audit-story gates the symbol story too (beat/camera/callout assertions)"
```
(NO Claude-Session trailer.)

---

### Task 5: KB — storytelling layer + camera-modes reference

**Files:**
- Create: `knowledge/references/map/formats/video-storytelling.md`
- Create: `knowledge/references/map/camera-modes.md`
- Modify: `knowledge/references/map/formats/video-reveal.md` (cross-link)

- [ ] **Step 1: Write `video-storytelling.md`**

Create `knowledge/references/map/formats/video-storytelling.md` (<160 lines). Cover, each line grounded and sourced BY NAME (no fabricated URLs), and REFERENCE `video.md` for the cross-cutting video discipline (frame-determinism, `--gl=angle`, 3 ratios, furniture-per-ratio) rather than duplicating it:

- **What a storytelling video is / when to choose it** — a guided camera tour that walks the reader through a spatial argument (establish → reveal points of interest → takeaway); the right pick when the story is "let me take you somewhere", not "here is the distribution" (that is the simple reveal). (Sources: FT Visual Vocabulary; Amini et al. 2015 — "Understanding Data Videos" — on the establish/climax/resolution beat arc, already cited in `video.md`.)
- **Beat structure** — title card → establish (map settles, no callout) → reveal ×N (camera flies to a feature, callout name + value + unit) → takeaway. Beats are a pure `Beat[]` (`deriveMapStory` / `deriveSymbolStory`); the camera is frame-deterministic (`buildTimeline` + `cameraForFrame` → `jumpTo`, never `flyTo`).
- **Camera choreography** — ease each move with `easeInOutCubic`; a minimum move duration (~1.2 s) so moves read as deliberate, not jarring; hold on each reveal long enough to read the callout (~3 s).
- **Callouts** — anchored ON the feature (region centroid for choropleth, the point itself for a symbol), carrying name + value + unit; no dimming of non-highlighted features (a stable frame reads as trustworthy).
- **Reveal count** — the AI picks how many features to visit per article (one hero, top-N), bounded so the video stays tight.
- End with a pointer: "The motion is one of the camera modes — see `camera-modes.md`."

- [ ] **Step 2: Write `camera-modes.md`**

Create `knowledge/references/map/camera-modes.md` (<120 lines) — the taxonomy and the AI's decision framework:

- **`simple`** — no camera movement; data animates in place. The `reveal` format. Choose when the whole extent tells the story at a glance (magnitude / distribution). → `formats/video-reveal.md`.
- **`guided-tour`** — camera flies between beats with callouts. Choose for a spatial argument that walks the reader to specific places. → `formats/video-storytelling.md`.
- **`route-reveal`** — a line/route draws on while territories animate in (Tom's map-explainer aesthetic). Choose for a linear geographic story (a river, a route, a border). **Status: ships in SP3 — documented here as the target; not yet implemented.**
- A short "how the AI chooses" section: default to `simple` for a single-glance distribution; `guided-tour` when there are distinct places to walk through; `route-reveal` for a linear feature. Sourced by name (FT Visual Vocabulary for the editorial framing; the toolkit's Beat model).

- [ ] **Step 3: Cross-link from `video-reveal.md`**

In `knowledge/references/map/formats/video-reveal.md`, update the closing pointer so it references `camera-modes.md` (the taxonomy) and `video-storytelling.md` (the guided tour), replacing the "SP2/SP3" placeholder wording with the real doc names.

- [ ] **Step 4: Verify grounding**

Re-read all three edited/created docs: every best-practice line names a real source, NO fabricated URLs, and `video-storytelling.md` does not duplicate the cross-cutting content that lives in `video.md`.

- [ ] **Step 5: Commit**

```bash
git add knowledge/references/map/formats/video-storytelling.md knowledge/references/map/camera-modes.md knowledge/references/map/formats/video-reveal.md
git commit -m "docs(map-native): KB — storytelling video best practices + camera-modes taxonomy"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Task 2 is the crux — READ `ChoroplethStory.tsx` completely and mirror its harness/structure; the symbol deltas are: city lookup (`cityByKey` by label → lon/lat) instead of `centroidByKey`, the single symbol hue for the callout colour, circle-radius/label-opacity driven by `fillReveal` instead of a fill-opacity, and the default basemap (no water recolour).
- Run `produce` / `remotion` ONE composition at a time; always `--gl=angle --concurrency=1`.
- NEVER print or log the MapTiler key.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages or files.
- After all tasks: `bun test` green; `audit-story` passes both types; `produce … story` renders a real symbol camera tour (camera framed on cities, callouts with units) AND the unchanged choropleth tour; the SP1 `reveal` path and the produce selector are untouched.
