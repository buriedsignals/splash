---
name: cesium-flyover
description: Use when a story needs a cinematic 3D flyover of real geography as a video — a slow glide down a gorge, along a river or a route, over a coastline or a mountain range, or through a city. CesiumJS renders satellite-draped terrain (MapTiler) or photorealistic city meshes (Google 3D Tiles); Remotion drives the camera and captures deterministic frames. Video only — this engine has no static or interactive format. Keywords flyover, 3D, terrain, aerial, cinematic, drone shot, gorge, river, coastline, mountain, city, Cesium, CesiumJS, quantized mesh, satellite imagery, photorealistic 3D tiles, camera path, flight path, banking, Remotion, mp4.
---

# Cesium flyover — the 3D terrain engine (one path in → one mp4 out)

The other map engine (`map-native`) draws 2D MapTiler maps and ships three formats. This one is
different in kind: it renders a **3D globe** with real elevation and real imagery, and it produces
**one format — video**. There is no static flyover and no interactive flyover; the thing being
delivered is camera movement through terrain.

Two modes, one component:

| Mode | Data | Use for |
| --- | --- | --- |
| `landscape` | MapTiler `terrain-quantized-mesh-v2` + `satellite-v2` | Mountains, gorges, rivers, coastlines, rural routes |
| `city` | Google Photorealistic 3D Tiles | Cities, architecture, recognizable landmarks |

Do not build city flyovers from extruded OSM footprints — they give crude blocks, not textured
architecture.

## When to use it

- The story's subject is **the ground itself**: a valley a road cuts through, a river a dam will
  drown, the terrain a landslide came down.
- The reader needs **scale and relief** that a flat map cannot carry.
- You have a **route** (a line) or a **place** to move through, and 20–30 seconds of screen time.

Not for: anything data-encoded (values by region → `map-native` choropleth), anything the reader
should explore themselves (→ `map-native` interactive), anything that must exist as a still.

## The gotcha that costs a day

**Cesium's globe does not draw in a standalone headless Chromium.** Measured in the reference
skill's own spike (not re-run here — the Remotion path was taken from the start): the skybox
renders, the globe emits zero draw commands, `globe.tilesLoaded` never turns true, and every frame
comes back as a black starfield. It is not a network failure and not a key failure.

It **does** draw when Remotion drives the frame loop, under four non-negotiables:

1. `viewer.useDefaultRenderLoop = false` — frames are advanced by hand.
2. Per tick call **`viewer.render()`, never `scene.render()`**. `scene.render()` skips frame
   initialization, so tile streaming never advances and the globe never appears. This is the single
   most important line in the engine.
3. `contextOptions: { webgl: { preserveDrawingBuffer: true } }` — or Remotion's screenshot is blank.
4. Gate initialization **and every frame** with `delayRender(..., { timeoutInMilliseconds })`;
   60–120 s, because cold tiles exceed Remotion's default.

Two more that fail loudly and confusingly:

- The MapTiler key must be **unrestricted**. A domain-locked key 403s from headless Chrome.
- Render with **`--gl=angle`** and **`--concurrency=1`**. Each frame settles one shared viewer;
  two workers race on one tile pipeline.

## Architecture

- **`src/flight-path.ts`** — the pure core. Chaikin corner-cutting (`smoothFlightPath`), arc-length
  walking (`makePathWalker`), great-circle distance and bearing. No Cesium, no React, no network —
  unit-tested on its own (`tests/flight-path.test.ts`).
- **`src/CesiumFlyover.tsx`** — the Remotion component. Loads CesiumJS (~5.9 MB of JS, plus workers and assets) **from its CDN at render
  time** (`window.CESIUM_BASE_URL` must be set *before* the script tag is injected), builds the
  viewer, attaches the provider for the mode, and per frame: `delayRender` → `setCamera(progress)` →
  `settle()` → `continueRender`.
- **`scripts/prep-path.mjs`** — turns a route/river centerline GeoJSON into a camera path:
  clip → resample to even arc-length spacing → moving-average smooth → dampen toward the straight
  chord. Prints a heading-delta probe; deltas must change *gradually*. Never `simplify`
  (Douglas-Peucker concentrates curvature at sparse points — that is exactly the corner artefact).
- **`remotion/src/Root.tsx`** — the two registered compositions.

**Cesium is loaded from a CDN, not vendored.** That keeps ~40 MB of engine and assets out of this
repository, and it is also the honest constraint: this engine — unlike every other engine here —
**cannot render offline**. Terrain, imagery and the library itself all come over the network at
render time. The mp4 it produces is a fully owned local file; the act of producing it is not
local-first.

## How the camera works

Four properties, in order:

1. **Continuous curvature.** Three Chaikin passes round every direction change into a curve. Without
   this the camera flies straight, snaps to a new heading, flies straight.
2. **Constant ground speed.** The path is walked by **arc length**, never by vertex index — unequal
   source spacing would become visible speed bumps.
3. **Minimized amplitude.** For a detailed centerline, `prep-path.mjs` dampens the route toward its
   straight start→end chord (`DAMP`, the single swerve knob).
4. **Enough length.** `pathKm ≥ travelKm + 2 · lookAheadKm`, or the look-ahead aim clamps at the end.

Per frame: position = the point `travelKm · progress` along the curve at
`lerp(altitudeStart, altitudeEnd)`; heading = bearing to a **real point `lookAheadKm` further along
the same path** (a far aim averages out wiggle and leads into the bend — a local tangent spins the
camera at every kink); pitch = constant; roll = the turn rate between the aim and a second probe
twice as far, so the camera **banks into the turn** — the helicopter tell.

> **Cesium conventions (inverted vs MapLibre):** heading in radians, 0 = north, clockwise. Pitch
> 0 = horizon, negative = down — hence `pitch = -(90 - pitchFromNadir)`.

## Quick start

```bash
cd skills/cesium-flyover && bun install
# REMOTION_MAPTILER_KEY comes from the repo root .env (unrestricted key)
export REMOTION_MAPTILER_KEY=...

# 1. Prepare a camera path from a centerline (or hand-author 5-10 sparse control points)
bun scripts/prep-path.mjs assets/sample-data/yarlung-gorge.geojson assets/sample-data/my-path.json

# 2. Validate framing with ONE still before spending a render
bunx remotion still remotion/src/index.ts LandscapeFlyover out/still.png \
  --frame=360 --gl=angle --timeout=180000

# 3. Render
bunx remotion render remotion/src/index.ts LandscapeFlyover out/flyover.mp4 \
  --gl=angle --concurrency=1 --timeout=180000
```

## Tuning knobs (each one a number)

| Knob | Proven value | What it does |
| --- | --- | --- |
| `travelKm` | 13 | How far the camera travels. **Speed = travelKm / duration.** |
| duration | 24 s (720 f @ 30) | 13 km / 24 s ≈ 0.54 km/s — a slow, peaceful glide. 8 s feels frantic. |
| `altitudeStart` → `altitudeEnd` | 4600 → 4300 m ASL | Absolute, terrain-independent. Inside the corridor walls = fly *through*, not over. |
| `lookAheadKm` | 1.5 | Heading smoothness vs responsiveness. |
| `pitchFromNadir` | 76 | 90 = level with the horizon; 76 stares ahead down the corridor. |
| `pathSmoothingPasses` | 3 | 2 = tight corridor, 4 = softer route. |
| `verticalExaggeration` | 1.1 | Subtle terrain drama. |
| `maximumScreenSpaceError` | 4 (hero) / 6-8 (wide) | City mode only — refinement vs download cost. |
| `DAMP` (in `prep-path.mjs`) | 0.45 | Swerve amplitude: higher = weavier, lower = straighter. |

A **slow camera renders fast**: at 0.54 km/s the camera moves ~18 m per frame, tiles stay cached and
each `settle()` returns almost immediately.

## Credentials and licensing

- **Landscape** — `REMOTION_MAPTILER_KEY` (unrestricted). MapTiler supplies both the terrain mesh
  and the satellite imagery; no Cesium ion token is needed. Keep the MapTiler credit visible.
- **City** — `REMOTION_GOOGLE_MAPS_API_KEY`, from a **billing-enabled** Google Cloud project with the
  Map Tiles API enabled. Google's Map Tiles policy permits promotional video about the application
  only, capped at **30 seconds** and marked "For promotional purposes only". The component enforces
  the ceiling and renders the marker. Do not remove the marker, crop credits or cache tiles, and do
  not read this as a general editorial-video right. **For a newsroom this is the blocking question,
  not a footnote:** the landscape mode is the editorially safe path today.
- Provider attribution is drawn by Cesium's credit display and must stay visible in the frame. Note
  that this strip also carries a **"CESIUM ion" logo** even though no ion token is used — the
  optional `title` / `sourceName` furniture is positioned to clear it, never to cover it. Whether a
  newsroom is comfortable with that mark in a published video is an editorial call to make before
  this ships, not a rendering problem.

## Known artefacts

- **Texture smear on very steep faces.** Satellite imagery is draped on the terrain mesh; where the
  camera passes close to a near-vertical wall the drape stretches into vertical streaks (visible in
  `output-proof/landscape/frame-600-furniture.png`, left slope). Fly higher, or further from the
  wall, rather than trying to fix it in post.
- **Distant ridges are low-resolution** while the near ground is sharp — tiles refine by screen-space
  error, and the horizon is always the coarsest thing in frame.

## What is proven here

- **Landscape mode renders in this repository.** 720 frames, 1280×720, 24 s, MapTiler terrain +
  satellite over the Yarlung Tsangpo gorge — `output-proof/landscape/flyover.mp4`, rendered in
  **2 min 19 s** (~0.19 s/frame) on an Apple-silicon laptop.
- **The mp4 was verified mechanically, not by eye alone**, with this repo's own video guard
  (`skills/map-native/scripts/snap-video.mjs`): container 1280×720 / 720 frames, every sampled
  frame non-blank, real animation (reveal mean diff 40.6 against a 0.5 floor; mid-vs-early 43.6,
  mid-vs-final 45.3 against a 0.15 floor — no frozen or two-state video), and the frame at 360
  matches the separately-rendered review still to 0.07 % of pixels (1 % allowed).
- **The camera path is reproducible.** `bun scripts/prep-path.mjs` regenerates
  `yarlung-gorge-path.json` byte-identically from the shipped centerline, and prints the same
  heading-delta sequence the reference documents (3, 0, -1, -3, -4, 1, 7, 9, 5, -5, -12, -7, …) —
  17.1 km of path for 13 km of travel, so the look-ahead never clamps.
- **City mode is untested here** — it needs a billing-enabled Google key this repository does not
  have. The code path is carried unchanged from the reference implementation.
- Not yet wired: no `produce.mjs`, no config validation, no conformance guard, no orchestrator
  routing. This engine is reachable by rendering its composition directly.

## Files

- `src/CesiumFlyover.tsx` — the two-mode Remotion component.
- `src/flight-path.ts` — dependency-free path smoothing + arc-length walking (pure, tested).
- `scripts/prep-path.mjs` — centerline GeoJSON → camera path, with the heading-delta probe.
- `remotion/src/Root.tsx` — `LandscapeFlyover` and `CityFlyover` compositions.
- `assets/sample-data/yarlung-gorge.geojson` — sample centerline (input to the prep script).
- `assets/sample-data/yarlung-gorge-path.json` — the prepared landscape camera path.
- `assets/sample-data/manhattan-path.json` — sample city route (sparse control points).
- `output-proof/landscape/` — the rendered mp4 and the frames pulled out of it.

Camera math, parameter values and the headless dead-end come from the `3d-flyover` reference skill
(Buried Signals); this engine is a port into this repository's toolchain, not a reimplementation.
