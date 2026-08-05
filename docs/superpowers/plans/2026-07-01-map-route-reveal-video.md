# Route-Reveal Video (SP3b) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the route type's video — the `route-reveal` camera mode: the route line draws itself (electric head) while each crossed territory animates in over three phases, on the AI-selected basemap, opening with the title-card scene, in three aspect ratios.

**Architecture:** `computeRouteReveal` extends SP3a's `computeRoute` with per-territory `stop` (arc-length entry) + `border` (boundary LineString) at runtime. `RouteReveal.tsx` generalizes the hardcoded pilot `RiverReveal.tsx` — config-driven inputs, mapStyle-adaptive electric colours, a derived push-in camera, the 3-phase animate-in, and the scene model. Produce dispatches `route` video → `RouteReveal`; the pilot is removed.

**Tech Stack:** Bun, TypeScript, bun:test, React, Remotion 4, `@maptiler/sdk` (MapLibre), `@turf/turf`, Playwright.

## Global Constraints

- **Bun only** (`bun test`, `bun scripts/...`); video render via `bunx remotion ... --gl=angle --concurrency=1`.
- **MapTiler key via env only** (`set -a && . ../../.env && set +a` from `skills/map-native/`; Remotion reads `REMOTION_MAPTILER_KEY`) — never hard-code or log it.
- **No Claude/Anthropic mention** in any file OR commit message — NO `Claude-Session:` trailer, NO an authorship trailer naming an assistant.
- **English** throughout.
- **Additive except the deliberate pilot removal** — `RouteReveal` is new; SP3a route static/interactive + all other types + the produce `static|reveal|story|all` selector are unchanged; the pilot (`RiverReveal`/`MapExplainer`/its geo + `prep-geo.mjs`) is removed as superseded.
- **`mapStyle` AI-selected** — route-reveal honours it (verify BOTH dark and light).
- **Frame-deterministic** — pure function of frame; NO `Date.now()`/`Math.random()`.
- **Grounded KB**, sourced by name (Tom Vaillant's map-explainer; Amini et al. 2015; Disney ease/overshoot), no fabricated URLs.
- Baseline before this plan: **161 tests passing** — keep them green.

All paths relative to `skills/map-native/` unless stated otherwise.

---

### Task 1: `computeRouteReveal` (stops + borders) + `routeRevealFrames`

**Files:**
- Modify: `src/route-geo.ts`
- Test: `tests/route-geo.test.ts` (APPEND — do NOT overwrite)

**Interfaces:**
- Produces: `computeRouteReveal(config, boundaries) → RouteRevealLayout` where each territory is the SP3a `RouteTerritory` extended with `{ stop: number; border: [number, number][][] }`, plus `{ route, territories, bounds, totalLengthKm }`; and `routeRevealFrames(territoryCount: number, fps: number): number`.

- [ ] **Step 1: Write the failing test (APPEND to `tests/route-geo.test.ts`)**

Add a `describe("computeRouteReveal", …)` block (reuse the synthetic 3-cell `boundaries` + a route crossing A then B from the existing file; import `computeRouteReveal`, `routeRevealFrames`):

```ts
describe("computeRouteReveal", () => {
  const layout = computeRouteReveal(config, boundaries); // config/boundaries from the existing describe scope
  it("gives each crossed territory a stop in [0,1], ascending along the route", () => {
    const stops = layout.territories.map((t) => t.stop);
    for (const s of stops) { expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(1); }
    // AAA (route starts inside) triggers before BBB (entered mid-route)
    expect(stops[0]).toBeLessThan(stops[1]);
  });
  it("gives each territory a non-empty border", () => {
    for (const t of layout.territories) {
      expect(Array.isArray(t.border)).toBe(true);
      expect(t.border.length).toBeGreaterThan(0);
      expect(t.border[0].length).toBeGreaterThan(1); // a segment has ≥2 coords
    }
  });
  it("routeRevealFrames grows with territory count and is bounded", () => {
    expect(routeRevealFrames(3, 30)).toBeGreaterThan(routeRevealFrames(1, 30));
    expect(routeRevealFrames(50, 30)).toBeLessThanOrEqual(routeRevealFrames(60, 30) + 1); // clamped
  });
});
```

(If the existing `config`/`boundaries` are scoped inside another `describe`, hoist them to module scope or redeclare small local copies — do NOT modify the existing tests.)

Run `cd skills/map-native && bun test tests/route-geo.test.ts` → FAIL.

- [ ] **Step 2: Implement `computeRouteReveal` + `routeRevealFrames` in `src/route-geo.ts`**

Build on `computeRoute` (reuse its detection/ordering/colour/anchor/bounds). For each crossed territory add:
- `stop`: the entry arc-length fraction. Reuse the SP3a `firstInsideAlong(f)` value (already computed for ordering) ÷ `turf.length(line)` (the total route length), clamped `[0,1]`.
- `border`: `turf.polygonToLine(f)` → extract its coordinates as `[number,number][][]` (a Polygon → one LineString; a MultiPolygon → several). Handle both (flatten to an array of coordinate rings).
- `totalLengthKm = turf.length(line)`.

```ts
export function routeRevealFrames(territoryCount: number, fps: number): number {
  // title scene + draw window + the last territory's border→fill→label (~4.2s) after its stop.
  const DRAW_S = Math.min(12, 5 + territoryCount * 1.2); // longer route → longer draw, clamped
  const TAIL_S = 4.2;                                    // last territory's 3-phase after it triggers
  const totalS = DRAW_S + TAIL_S;
  return Math.round(totalS * fps) + TITLE_SCENE_FRAMES;  // import TITLE_SCENE_FRAMES from ./video-scene
}
```

Refactor `computeRoute` minimally if needed to expose the per-territory `firstInsideAlong` value (e.g. keep it on the intermediate `withStop` and thread it into `computeRouteReveal`), OR recompute it in `computeRouteReveal`. Keep `route-geo.ts` framework-free (turf only). Export the extended `RouteRevealTerritory`/`RouteRevealLayout` types.

Run the test → PASS.

- [ ] **Step 3: Full suite** — `cd skills/map-native && bun test` → 161 + new cases green.

- [ ] **Step 4: Commit**

```bash
git add skills/map-native/src/route-geo.ts skills/map-native/tests/route-geo.test.ts
git commit -m "feat(map-native): computeRouteReveal (per-territory stop + border) + routeRevealFrames"
```
(NO Claude-Session trailer.)

---

### Task 2: `RouteReveal.tsx` — the config-driven draw-on

**Files:**
- Create: `src/components/RouteReveal.tsx`

**Interfaces:**
- Consumes: `computeRouteReveal` (Task 1), `resolveMapStyle` (SP3a), `CountryLabel`, turf.

This GENERALIZES `src/components/RiverReveal.tsx` — READ it FULLY first and reproduce its proven animation with parameterised inputs. The pilot's structure to keep: the MapTiler init (strip symbol + inner admin border layers), the electric river source/layers (`glow` → `line` → `headglow` → `head`), the per-territory `trail-<key>`/`fill-<key>` layers, the per-frame `setData`(river slice)/`setPaintProperty` + `sliceBorder` draw-on, the fill overshoot ramp, the projected `CountryLabel`s, the `delayRender → … → map.once("idle", continueRender)` harness. The generalisation deltas:

- [ ] **Step 1: Config-driven inputs (replace the hardcoded pilot constants)**

- Props: `{ config }` (a route config). On load compute `const layout = computeRouteReveal(config, world)` (import `worldGeoJsonRaw from "../../assets/geo/world.geojson?raw"`; `JSON.parse`). The line is `turf.lineString(config.route)`; `lineKm = layout.totalLengthKm`.
- Replace `ORDER`/`META`/`COUNTRY`/`COUNTRY_DARK`/`FILL_OPACITY`/`flowCoords` with `layout.territories` (`{key,label,color,order,anchor,stop,border}`). The border-draw uses each territory's `border` (build the same cumulative-segment `DRAW` structure the pilot builds, but from `t.border` instead of `META[c].border`). The darker trail shade = a programmatic darken of `t.color` (e.g. mix 45% toward black). `FILL_OPACITY` → a constant (0.55, matching RouteMap).
- `trigger(t) = RIVER_START + t.stop * (RIVER_END - RIVER_START)` where `RIVER_START`/`RIVER_END` derive from the clip (see Step 3).

- [ ] **Step 2: mapStyle-adaptive electric colours + basemap**

- Basemap: `const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";` map to `maptilersdk.MapStyle.DATAVIZ.DARK/.LIGHT`.
- Electric colour set (replace `COLORS.river`/`riverHead`/`riverHeadGlow`/`bg`): a `dark` variant (`line #E8F7FF`, `glow #49C6FF`, `head #FFFFFF`, `headGlow #BEE9FF`, `bg #0e0f12`) and a `light` variant (`line #1A3A5C`, `glow #4A90D9`, `head #0B2A45`, `headGlow #8Fc3F0`, `bg #f4f4f5`). Pick by `dark`. The multi-layer head + trail keep the pilot's widths/blur/opacity choreography.

- [ ] **Step 3: Derived camera + timing + canvas scale**

- Camera: derive `START`/`END` from `layout.bounds` — `map.cameraForBounds(clampBounds(layout.bounds), {padding})` gives the fit; `START` = that camera; `END` = the same centre with `zoom + ~0.3` and `pitch ~8` (a gentle push-in). Lerp START→END across the clip as the pilot does. (No hardcoded `[89.6,27.7]…`.)
- Timing: `RIVER_START = 0.3`s; `RIVER_END` = `DRAW_S` from the duration model (so `routeRevealFrames`'s `DRAW_S` and the component agree — export/share `DRAW_S`, or recompute `Math.min(12, 5 + territories.length*1.2)`). Border/fill/label durations keep the pilot's `2.5 / 1.0 / 0.7`s.
- Canvas scale: read `width`/`height` from `useVideoConfig`; scale the line widths + `CountryLabel` size for square/portrait (≤1080 wide → larger), as the other video comps do.

- [ ] **Step 4: Scene model (title scene → draw-on)**

Mirror `SymbolReveal`'s scene wiring: `import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene"; import { TitleCard } from "./StoryCards";`. Compute `const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });`. SHIFT the whole draw-on by `TITLE_SCENE_FRAMES` — the animation's `t` is `(frame - TITLE_SCENE_FRAMES)/fps` (clamped ≥ 0), so nothing draws during the title scene. Wrap the map in `MapFrame` (title/description/source, `dark={dark}` for the theme-aware furniture, `furnitureOpacity={scene.furnitureOpacity}`); render `<TitleCard text={config.title} description={config.description} opacity={scene.titleOpacity} />` when `scene.titleOpacity > 0`. Keep the projected `CountryLabel`s in the map scene.

- [ ] **Step 5: Verify at render (the draw-on)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
mkdir -p /tmp/rr && python3 -c "import json;c=json.load(open('assets/sample-data/route.json'));open('/tmp/rr/props.json','w').write(json.dumps({'config':c}))"
# register RouteReveal first (Task 3) OR temporarily register it to render; if not yet registered, do Step 5 after Task 3.
```
NOTE: `RouteReveal` is registered in Task 3. If you implement Task 2 and Task 3 as one unit (recommended — the component isn't renderable until registered), do the render check at the end of Task 3. Otherwise commit Task 2 (component only) and render in Task 3.

- [ ] **Step 6: Commit**

```bash
git add skills/map-native/src/components/RouteReveal.tsx
git commit -m "feat(map-native): RouteReveal — config-driven route draw-on (generalizes the RiverReveal pilot)"
```
(NO Claude-Session trailer.)

---

### Task 3: Register `RouteReveal*` (3 sizes) with the derived duration

**Files:**
- Modify: `remotion/src/Root.tsx`

- [ ] **Step 1: Compute the sample duration + register three compositions**

In `remotion/src/Root.tsx`: import `RouteReveal`, `computeRouteReveal`/`routeRevealFrames` (from route-geo), a sample route config (`assets/sample-data/route.json`), and `world.geojson`. Derive `ROUTE_REVEAL_FRAMES = routeRevealFrames(computeRouteReveal(sampleRoute, world).territories.length, 30)`. Register three compositions (mirror the `SymbolReveal*` registrations):

```tsx
<Composition id="RouteReveal"        component={RouteReveal} durationInFrames={ROUTE_REVEAL_FRAMES} fps={30} width={1280} height={720}  defaultProps={routeDefaultProps} />
<Composition id="RouteRevealSquare"  component={RouteReveal} durationInFrames={ROUTE_REVEAL_FRAMES} fps={30} width={1080} height={1080} defaultProps={routeDefaultProps} />
<Composition id="RouteRevealPortrait" component={RouteReveal} durationInFrames={ROUTE_REVEAL_FRAMES} fps={30} width={1080} height={1350} defaultProps={routeDefaultProps} />
```

- [ ] **Step 2: Verify at render (the draw-on, landscape)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bunx remotion still remotion/src/index.ts RouteReveal /tmp/rr/f0.png   --frame=0   --gl=angle --props=/tmp/rr/props.json
bunx remotion still remotion/src/index.ts RouteReveal /tmp/rr/mid.png  --frame=$(python3 -c "print(int(75+90))") --gl=angle --props=/tmp/rr/props.json
```
READ both: `f0.png` = the title-card scene (no furniture over it); `mid.png` (well into the draw) = the route line PARTIALLY drawn with the electric leading head visible + at least one territory mid-animate (border drawing or fill blooming). If nothing draws at mid, the title-scene frame-shift or the stop timing is wrong — debug. `bun test` green.

- [ ] **Step 3: Commit**

```bash
git add skills/map-native/remotion/src/Root.tsx
git commit -m "feat(map-native): register RouteReveal compositions (3 sizes, derived duration)"
```
(NO Claude-Session trailer.)

---

### Task 4: Produce dispatch + remove the pilot

**Files:**
- Modify: `scripts/produce.mjs`, `remotion/src/Root.tsx`
- Remove: `src/components/RiverReveal.tsx`, `assets/geo/yarlung-flow.json`, `assets/geo/country-meta.json`, `scripts/prep-geo.mjs` (+ `src/theme/tokens.ts` IF dead)

- [ ] **Step 1: Produce dispatches route video → RouteReveal**

In `scripts/produce.mjs`:
- Default `cameraMode` per type: `const cameraMode = config.cameraMode ?? (isRoute ? "route-reveal" : "guided-tour");`
- Extend `storyComps` to take the type and return the route set for `route-reveal`:
  ```js
  function storyComps(config, cameraMode) {
    const isSymbolMap = config.type === "symbol";
    if (cameraMode === "guided-tour") {
      return isSymbolMap ? [["SymbolStory","landscape"],["SymbolStorySquare","square"],["SymbolStoryPortrait","portrait"]]
                         : [["ChoroplethStory","landscape"],["ChoroplethStorySquare","square"],["ChoroplethStoryPortrait","portrait"]];
    }
    if (cameraMode === "route-reveal") {
      return [["RouteReveal","landscape"],["RouteRevealSquare","square"],["RouteRevealPortrait","portrait"]];
    }
    throw new Error(`camera mode '${cameraMode}' is not implemented`);
  }
  ```
  (update the one call site to pass `config` instead of `isSymbol`.)
- REMOVE the `if (isRoute) throw new Error("route video … ships in SP3b")` guard (line ~117).
- **Route has no simple-reveal:** the route type's only video is route-reveal (a `story`-kind). Make the `kinds` collapse for route so `all`/`reveal` don't try a non-existent simple reveal: `const kinds = isRoute ? (format === "static" ? [] : ["story"]) : (format === "all" ? ["reveal","story"] : format === "reveal" ? ["reveal"] : format === "story" ? ["story"] : []);` (so route `all`/`story`/`reveal` all render the single route-reveal via the `story` path; `static` renders none). Keep the non-route branch exactly as-is.
- `STILL_FRAME.story` stays 140 — but for route-reveal the title scene is 75 frames, so 140 lands early in the draw; set a route-aware still frame or a larger `story` still is fine (the still is a proof, the mp4 is the deliverable). If 140 lands in the title card, bump the route still to e.g. `TITLE_SCENE_FRAMES + 120`; keep it simple — a `STILL_FRAME` per (kind,type) or just a comment.

- [ ] **Step 2: Remove the pilot**

- `remotion/src/Root.tsx`: delete the `MapExplainer` composition + the `RiverReveal` import (and any now-unused sample geo imports it pulled in).
- `git rm skills/map-native/src/components/RiverReveal.tsx skills/map-native/assets/geo/yarlung-flow.json skills/map-native/assets/geo/country-meta.json skills/map-native/scripts/prep-geo.mjs`.
- `grep -rn "theme/tokens\b" src/ remotion/ scripts/` — if `src/theme/tokens.ts` is now imported ONLY by the removed RiverReveal (i.e. no remaining importers), `git rm` it too; if anything else imports it, KEEP it. Report which.
- Confirm no dangling imports remain: `bun test` compiles + passes (161 + Task 1 cases).

- [ ] **Step 3: Verify at render (route video, both story/all)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/route.json /tmp/rr/out story
```
Confirm it renders `story-landscape/square/portrait.mp4` via RouteReveal (no throw). READ `story-landscape-still.png` — the draw-on (partial line + territory animating). `bun test` green.

- [ ] **Step 4: Commit**

```bash
git add -A skills/map-native/scripts/produce.mjs skills/map-native/remotion/src/Root.tsx
git commit -m "feat(map-native): produce dispatches route video to RouteReveal + remove the RiverReveal pilot"
```
(NO Claude-Session trailer.)

---

### Task 5: KB + final render verification (3 sizes × dark and light)

**Files:**
- Modify: `knowledge/references/map/camera-modes.md`, `knowledge/references/map/types/route.md`, `knowledge/references/map/formats/video-storytelling.md`

- [ ] **Step 1: KB updates (grounded, sourced by name)**

- `camera-modes.md`: change `route-reveal`'s status from "ships in SP3 / not yet implemented" to **IMPLEMENTED** — the line draws on while territories animate in (border→fill→label), electric head, gentle push-in, mapStyle-adaptive; the route type's default video mode.
- `types/route.md`: the "Video format (SP3b — not yet shipped)" section → SHIPPED; describe the route-reveal choreography (draw-on + 3-phase animate-in + electric head), 3 sizes, mapStyle-adaptive, title scene.
- `video-storytelling.md`: add a short `route-reveal` note (or a pointer to `camera-modes.md`) — the third storytelling mode: a linear feature draws on rather than a camera flying between beats.
- Every line grounded, sourced BY NAME (Tom Vaillant's map-explainer discipline; Amini et al. 2015; Disney ease/overshoot). NO fabricated URLs; match each doc's existing source style (the `types/*.md` carry URLs; the `formats/*.md` are name-only).

- [ ] **Step 2: Final render verification (3 sizes × dark AND light)**

```bash
cd skills/map-native && set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/route.json /tmp/rr/dark story
python3 -c "import json;c=json.load(open('assets/sample-data/route.json'));c['mapStyle']='dataviz-light';open('/tmp/rr/route-light.json','w').write(json.dumps(c))"
bun scripts/produce.mjs /tmp/rr/route-light.json /tmp/rr/light story
```
For BOTH dark and light, and for each of the three sizes' mp4s, extract + READ a frame-0 still (title scene), a mid-draw still (partial line + electric head + a territory animating), and a near-final still (line complete, territories filled + labelled). Confirm: the dark sample uses the icy-blue electric signature; the light sample uses the deeper-blue variant on a light base; furniture + labels are theme-appropriate; all three sizes frame the route. `bun test` green.

- [ ] **Step 3: Commit**

```bash
git add knowledge/references/map/camera-modes.md knowledge/references/map/types/route.md knowledge/references/map/formats/video-storytelling.md
git commit -m "docs(map-native): KB — route-reveal video shipped (camera-modes + route type + storytelling note)"
```
(NO Claude-Session trailer.)

## Notes for the executor

- Tasks 2 + 3 are best done as one unit (the component isn't renderable until registered); if split, do the render check at the end of Task 3.
- Task 2 is the crux — READ `RiverReveal.tsx` completely and mirror its animation; the deltas are: inputs from `computeRouteReveal` (not hardcoded META/ORDER/flowCoords), mapStyle-adaptive electric colours, a derived push-in camera, and the title-scene frame-shift + theme-aware furniture.
- Keep `clampBounds` on the camera bounds.
- Run `produce`/`remotion` ONE composition at a time; always `--gl=angle --concurrency=1`.
- NEVER print or log the MapTiler key.
- NO `Claude-Session:` trailer or any Claude/Anthropic mention in commit messages or files.
- After all tasks: `bun test` green; a `route` config's `story`/`all` renders the RouteReveal draw-on in 3 sizes on the AI-selected basemap (dark + light both verified); the pilot is gone; the KB marks route-reveal shipped.
