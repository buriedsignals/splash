---
name: map-native
description: Use when you need a native (non-Datawrapper) map that ships ALL THREE formats from ONE React+MapTiler component — a static PNG, a self-contained interactive HTML (pan/zoom/hover/legend, responsive), and a Remotion mp4 motion build. The native map engine — 9 MapTiler 2D types covering the FT "MAP" group + Cesium 3D flyover as a separate engine. The premium path for stories that want a motion reveal or rich interactivity on a map. Keywords choropleth, proportional symbol, flow route, explainer beat, dot density, hex grid, spatial bins, cartogram, contour isoline, locator markers, 3D terrain flyover, MapTiler, Remotion, Cesium, geojson, choropleth, sequential scale, diverging scale, CVD-safe, basemap-fit, fitBounds, region shading, data join, ISO-A3, world, us-states, legend, no-data, static PNG, interactive HTML, video mp4, animation, reveal, progress, react, native map.
---

# Map Native — the native map engine (one component per type → three formats)

> **9 MapTiler 2D types** (one React+MapTiler component each, `<Type>Map.tsx`, driven by a single
> `progress` → static + interactive + video), grouped by function:
> - **Area encoding** — choropleth (regions shaded by value)
> - **Point / symbol** — proportional symbol, dot density, locator / markers
> - **Movement / topology** — flow / route, explainer beat (region sequence)
> - **Spatial aggregation** — hex / grid (spatial bins)
> - **Geometry transform** — cartogram (grid / scaled), contour / isoline
>
> **Cesium 3D terrain flyover** is a separate engine (`cesium-flyover`) — not part of `map-native`.
>
> Every type shares the MapTiler+Remotion harness (Tom's per-frame `delayRender`/`idle` gate), the
> conformance guard, the basemap-fit rule, and the `produce` pipeline; the per-type knowledge lives
> in the component/geo-core header comment + its `check<Type>Conformance` rule. Build a specific
> map by setting `COMP=<type>` (web) or the `<Type>Story` composition (video, e.g. `ChoroplethStory`).
> The choropleth is the worked exemplar (the "line" of maps); every other type follows the identical
> pattern. The full type registry is in `remotion/src/Root.tsx` and `scripts/audit-cases.mjs`.
>
> **Shared layer** — `src/`: `conformance.ts` (global L0 guard + WCAG math; per-type checks compose
> on top), `components/HarnessCheck.tsx` (the per-frame `delayRender`/`idle` gate — the canonical
> proof of Tom's harness), `theme/scale.ts` (BLUES sequential ramp, DIVERGING CVD-safe pair).

## Foundation — Tom's MapTiler+Remotion harness

The hard problem — a **frame-deterministic MapTiler WebGL map in Remotion** — was already solved by
Tom's `map-explainer` (operator-approved: water-wars Pilot A). `map-native` seeds from it verbatim
and does not reinvent it.

**The harness (per frame — `HarnessCheck.tsx` is the canonical reference):**

1. **Init once.** A `started` ref guard ensures the `Map` constructor runs exactly once across
   React renders. The map is created with `interactive: false`, `fadeDuration: 0`, and
   `canvasContextAttributes: { preserveDrawingBuffer: true }` — the last is mandatory for Remotion
   to read the WebGL canvas after each frame.

2. **On `load` — add sources/layers + `jumpTo`/`fitBounds`**, then `map.once('idle', () => continueRender(initHandle))`.
   `delayRender` is called synchronously at component mount (in a `useState` initialiser) so
   Remotion holds the first frame before the map has even loaded.

3. **Per frame** — `useEffect([map, frame])` runs on every frame Remotion renders:
   ```
   const h = delayRender(`frame-${frame}`)
   map.setPaintProperty(…) / map.setData(…) / map.jumpTo(…)   // mutate state
   map.once('idle', () => continueRender(h))                   // release frame
   map.triggerRepaint()                                        // force a WebGL tick
   ```
   This is the **`delayRender → setData/setPaintProperty → map.once('idle', continueRender)`**
   cycle. Without `triggerRepaint()` the SDK may not repaint if nothing changed in the viewport.

4. **Render flags** — `bunx remotion render --gl=angle --concurrency=1 --timeout=120000`.
   `--gl=angle` is mandatory for MapTiler WebGL under Remotion (headless Chrome). `--concurrency=1`
   prevents two Remotion workers racing on the same map instance.

**Why we still `jumpTo` per frame, and not Tom's fixed map plate.** `map-explainer`'s
`references/render-stability.md` prescribes a frozen MapTiler camera plus a CSS `translate/scale`
plate for ANY 2D pan/zoom, because headless capture can resample **hillshade and satellite imagery**
differently frame to frame. Deliberately not adopted here, for two reasons and one caveat:
1. **Our basemaps have no such texture.** The story types render on `MapStyle.DATAVIZ` LIGHT/DARK —
   flat vector fills, no hillshade, no imagery. The symptom the plate exists to cure has not been
   observed on our output.
2. **A guided tour does not fit on one plate.** The plate must be rendered once at the highest zoom
   any waypoint reaches, and must be wide enough to cover the whole route's extent at that zoom,
   under a ~4096 px canvas ceiling. Tom's own shot pans 0.6° and zooms 4.75→5.05. A beat tour goes
   from a continental establish to a single country: on the choropleth sample that is ~35° of route
   extent at a scale of roughly 128 px/°, i.e. a plate on the order of 4500–5000 px per side —
   past the ceiling `render-stability.md` sets. Its own instruction at that point is to *split the
   shot into two plates with an editorial transition*, which is a different film, not a render fix.

**Caveat — this is a judgement, not a measurement.** Nobody has run the reference's own diagnostic
(inspect static basemap texture while the camera moves) on a map-native mp4 and written the result
down. If a story is ever shot on a satellite or hillshade style, the plate is mandatory and the shot
must be cut so it fits one.

**The web builds** (static + interactive) use the same `ChoroplethMap.tsx` component via Vite
(static: `progress=1`, screenshot; interactive: `INTERACTIVE=1` → Vite + `vite-plugin-singlefile`
→ single-file HTML with pan/zoom/hover). The MapTiler SDK key is injected as
`VITE_MAPTILER_KEY` (web) and `REMOTION_MAPTILER_KEY` (Remotion). Both are gitignored.

**Basemap-fit rule** — every map type calls `fitBounds` to the DATA extent (not the world default),
and the frame must hug the data **zone**, not stretch to far-flung territory:

- **Mainland framing.** Compute the bbox from each region's **largest-area polygon**, not the raw
  MultiPolygon. Natural Earth admin-0 features bundle overseas territories (NOR→Svalbard,
  FRA→French Guiana/Réunion, ESP→Canaries) that silently stretch the bbox to the whole world — the
  exact "why is it showing the planet" bug. The pure core does this (`mainlandFeature` in
  `choropleth-geo.ts`); the audit asserts ≥ **70%** fill on the binding dimension via `map.project()`.
- **maxBounds.** After `fitBounds`, set `map.setMaxBounds(dataBounds + ~35% margin)` so the reader
  stays on the subject and cannot pan back out to the whole world.
- **Breathing room.** `fitBounds` padding ≈ 48px so edge regions (the story's south, here Spain/Italy)
  are not clipped against the frame.

This is the known `map-dw` footgun — enforced here (core + audit), not left to the operator.

## The recipe — adding a map type (always these steps)

For each new map type, in order:

1. **KB first** — capture the type's knowledge as the header comment of `<type>-geo.ts` + the
   encoding rule it enforces: what the type is for, its non-negotiables (e.g. choropleth →
   CVD-safe sequential/diverging scale, mandatory legend, basemap-fit; proportional symbol →
   area-proportional radius, not linear), and the reveal gesture. Reuse the format disciplines in
   `knowledge/references/formats/{video,interactive}.md`.

2. **Pure geo core** — `src/<type>-geo.ts` (framework-free, no MapTiler import): join/transform the
   data, compute the paint spec, compute the data bbox for `fitBounds`, flag no-data features.
   Unit-tested with `bun:test`. The choropleth exemplar is `src/choropleth-geo.ts`
   (`computeChoropleth` → `ChoroplethLayout`: joined array, bins, bounds, noData, unmatched).

3. **Component** — `src/<Type>Map.tsx` driven by one `progress` (0→1). Uses Tom's harness:
   init-once ref guard, `on('load')` to add sources/layers + `fitBounds`, per-frame
   `delayRender → setPaintProperty/setData → map.once('idle', continueRender) → triggerRepaint`.
   The `interactive` prop switches hover popup on/off. Same component renders static, interactive,
   and video — no forks. **Apply the grounded interactive rules** in
   `references/interactive-map-best-practices.md` — they are non-negotiable defaults every map type
   inherits: water blue / land light basemap (`theme/colors.ts`); a region with no data keeps the
   basemap default and is never tinted — `NO_DATA_COLOR` only names that basemap appearance for the
   paint expression's fallback, it is not a separate rendered layer;
   hover/tooltip ONLY on regions with data (no hover on no-data — project decision); `NavigationControl`
   + a reset control top-right with `aria-label`s; visible attribution; `maxBounds` (+~20%) plus
   `minZoom`/`maxZoom`; a container `aria-label`. The video adds: an opaque title card BEFORE the map,
   on-map value annotations (not subtitles), stable colours (no dimming), no title repeat at the end —
   all in the narrative-grammar section above.

4. **Conformance rule** — `check<Type>Conformance` in `src/conformance.ts`, composing on the global
   L0 guard (insight title ≥ 12 chars + not a year range, source name + url, WCAG text contrast
   ≥ 4.5:1). Type-specific additions for choropleth: CVD-safe scale (≥ 3 steps), legend present,
   ≥ 1 region with data, bounds non-empty. Unit-tested.

5. **Classify global vs type-specific (every time).** For each concern ask: *is this an invariant
   true for all map types, or specific to this type?*
   - **Global** (basemap-fit, contrast, legend required for region maps, insight title, source) →
     reuse the shared mechanism (`conformance.ts`, harness `fitBounds`, audit) and enforce with a
     test. Never re-solve per component.
   - **Type-specific** (the geo math, which `setPaintProperty` to animate, where the legend goes,
     what no-data looks like) → lives in the type module.

6. **Pass the layout audit, then look** — add the type to `scripts/audit-cases.mjs` (sample +
   ≥ 1 stress config: many regions, missing data, extreme values, narrow viewport) and run
   `bun run audit`. It renders every config × 7 viewports in a real browser, waits for `map.once('idle')`,
   then asserts: title/legend/source in bounds, no significant text overlap, AND the projected data
   bbox fills ≥ 50% of a canvas dimension (the basemap-fit gate). The audit MUST be green. The eye
   missed basemap-fit failures on several `map-dw` stories that `map.project()` catches — never
   rely on the eye alone again.

## Module furniture

Every map module carries four pieces of furniture — **insight title**, **description** (subtitle elaborating the insight), **source**, and, when the geometry came from a DECLARED file (spec D7), **`geoCredit`** — each appearing exactly once. `geoCredit` (`{ name, url? }`, `MapFrame.tsx`'s own props) renders bottom-right, distinct from `source`: a data attribution and a boundary-file attribution are two different facts, and a newsroom correcting one must not silently touch the other. It is absent for a shipped basemap (Natural Earth `world`, US Census `us-states`) — those carry no attribution obligation. A produce-time guard exists to enforce its presence on a declared-geometry map (`docs/splash/guardrails.md`'s Geography credit guard), but that enforcement is not reachable from a real run today — nothing in this loop assembles a geography config carrying the `origin: "declared"` the guard checks for, so the credit currently renders only when a config supplies it by hand. Overlays use `min()`/`clamp()`/`vw` units so they stay readable from 390 px mobile up to 1280 px desktop without breakpoints. The video title card inherits `title` and `description` from the shared config (same JSON drives all three formats). The interactive scrolly inherits the same values via the shared config. See `docs/splash/embeddable-module-best-practices.md` for the full responsive overlay contract.

## Overview

**MapTiler SDK does the geo rendering; React drives the component; a single `progress` value drives
the animation.** Every type is one framework-free geo core (`<type>-geo.ts`) computing joins/bins/bounds
+ a deterministic reveal, and one React component (`<Type>Map.tsx`) parameterised only by a `progress`
(0→1) prop. From that one component three formats derive: a **static** PNG (render at progress=1,
screenshot), a self-contained **interactive** HTML (pan/zoom/hover/legend), and a **video** mp4 (a
Remotion composition through Tom's harness). The video is NOT a single `progress` fade — narrated types
drive it from a `mapStory` of beats (see "Narrative video grammar" above). The `choropleth` type below
is the worked exemplar; the other types follow the identical pattern. Per-type artifacts are in
`output-proof/<type>/`.

This is the native premium path. `map-dw` (Datawrapper) stays the no-code fallback — do not touch it.

## When to use

- Any of the 9 FT-vocabulary map types where the story wants a **motion reveal** (video) or **rich
  pan/zoom/hover** interactivity beyond what Datawrapper exposes.
- You want one owned artifact per format (PNG / HTML / mp4) the newsroom keeps — no SaaS dependency.
- **Not** for: standard static locator maps with no motion/interaction need (→ `map-dw`); 3D terrain
  flyovers (→ `cesium-flyover`); charts (→ `chart-native`). A type the engine doesn't have yet →
  add it with the recipe above.

## The one gotcha that will waste your day (read first)

The animation MUST be a **pure function of `frame`** — never `Date.now()`, `Math.random()`, or a
wall-clock in the Remotion path. The per-frame gate (`delayRender → idle → continueRender`) makes
each frame reproducible, but only if the MapTiler mutations (setPaintProperty, setData, jumpTo) are
also deterministic given `frame`. Two more plumbing musts for the video: render with **`--gl=angle`**
and **`--concurrency=1`** (a second Remotion worker racing on the same map instance corrupts frames),
and **validate ONE still frame before the full mp4** (a half-reveal still catches framing/easing bugs
the tests can't). After the mp4, `produce.mjs` runs **`scripts/snap-video.mjs` fail-hard**: it probes
the ACTUAL mp4 (Remotion's bundled ffprobe/ffmpeg), asserts container sanity (size / dims), that the
story really animates (2%/50%/98%/final sampled frames: first≠final, midpoint≠both endpoints, none
blank — catches the "still succeeds but the mp4 is frozen/blank" class mechanically), and that the mp4
frame at `STORY_STILL_FRAME` **matches the approved review still** within codec tolerance — so the frame
Gate-3 approves is the frame that ships (measurements + thresholds land in `video-verify.json`). Both
Remotion invocations are bounded by a **watchdog** (`src/video-watchdog.ts`, default 15 min,
`SPLASH_VIDEO_TIMEOUT_MS` override) that kills a hung render process tree — the seismes-class
Remotion+MapLibre per-frame hang becomes a clean fail-hard instead of a burned run (root-causing that
hang stays a separate ticket). The static and interactive web builds need `VITE_MAPTILER_KEY` in `.env`;
the Remotion build needs `REMOTION_MAPTILER_KEY` — both free-tier keys, gitignored.

One more Remotion footgun, now HISTORICAL: the geometry-needing video compositions used to fetch the
basemap via `staticFile("geo/world.geojson")` at render time, which required the file to live under
the Remotion **public dir**. That fetch is gone — every one of them now reads the geometry
`produce.mjs` injects into `config.geometry` instead (see the "Video now renders any SHIPPED
geography" paragraph below), the same decode the static/interactive/scrolly formats already use.
Kept here as a note in case the public-dir plumbing (`Config.setPublicDir("remotion/public")` in
`remotion.config.ts`) is ever repurposed for a different static asset — not because the geo fetch
it originally existed for still runs.

## Narrative video grammar — the `mapStory` (for narrated types)

A reveal that just fades every region in at once "tells no story". Narrated map types instead derive an
ordered **`mapStory`** — a list of **beats** (map states) — from the data, and BOTH the video and (later)
the interactive scrolly play through the same beats. This is the difference between motion and a story.

- **Pure spine** — `src/map-story.ts` `deriveMapStory(layout, features, joinKey, meta) → Beat[]`
  (framework-free, unit-tested). A `Beat` = `{ kind, camera:[w,s,e,n], highlight[], dim, callout, copy }`.
  The choropleth grammar: **title** (opaque title card, map hidden — the title shows BEFORE the map, never
  over it) → **establish** (map fades in clean, no caption) → **reveal max** (fly to the top region's
  mainland frame, pop it, callout `Name`/`value`) → **reveal min** (same, lowest) → **takeaway** (pull
  back to the full extent at FULL opacity; caption ONLY if the insight differs from the title — the title
  must not reappear at the end). Ties break by ascending region key (deterministic — Remotion forbids
  `Date`/`random`).
- **Camera** — each beat's camera is a mainland-framed bbox (slice-1b's largest-polygon rule, per
  region, so a country's overseas territory never blows up its beat frame). The component precomputes
  `cameraForBounds` per beat, then interpolates center/zoom between beats with an ease; per frame it sets
  the camera with `map.jumpTo` (NEVER async `flyTo` — that desyncs from Remotion frames).
- **Emphasis WITHOUT changing colours** — region fill stays at a constant `fillReveal`-scaled opacity on
  EVERY beat (only the establish fade-in moves it 0→1); do NOT dim other regions (a region must keep the
  same colour through the whole video — dimming reads as "the colours aren't consistent"). The revealed
  region pops via the zoom + a `__highlight`-keyed **stroke layer** (a thicker dark outline), not by
  fading its neighbours.
- **Consistent basemap colours** — water colour comes from `src/theme/colors.ts` (`WATER_COLOR`), the
  SAME constant the interactive uses, so the two formats match; no-data regions stay unpainted (basemap
  default) in both — `NO_DATA_COLOR` is a paint-expression fallback, never a rendered tint.
  (Import colours from `theme/colors`, NEVER from `ChoroplethMap` — `ChoroplethMap.tsx` throws at
  module-load time when `VITE_MAPTILER_KEY` is unset, and the Remotion build only ever sets
  `REMOTION_MAPTILER_KEY`, so pulling anything from it — even a shared constant — crashes the
  Remotion bundle before a single frame renders.)
- **Words integrated on the map** — the data value is an on-map annotation anchored to the region
  (`CountryLabel` = NAME + large value, e.g. `NORWAY` / `99%`), NOT a lower-third subtitle. The value uses
  a SHORT `valueUnit` (e.g. `%`), never the long legend label. The lower-third caption is reserved for the
  takeaway insight (when distinct from the title).
- **The EXPLAINER story — `sweepCarrier`** (choropleth today). Buried Signals' map-explainer beat is
  "a river draws on, and as it reaches each country that country animates in — border draws, fill
  blooms, label rises, and it stays lit". `src/sweep-carrier.ts` generalises the river to five
  **carriers** (`route` · `time` · `threshold` · `space` · `order`) — the river is only what carries a
  scalar, and a subject with no route still has a clock, a value, a geography or a walk. Declaring
  `sweepCarrier` on a `story` config turns the beat tour into that explainer:
  - **the carrier ORDERS the reveal beats** (`src/story-sweep-order.ts`) and does nothing else. The
    beat timeline that already flies the camera stays the ONE clock. There is no second window, no
    parallel camera and no second entrance — a sweep clock of its own is exactly what made the camera
    leave a region mid-entrance, lit regions off-screen, and left on-screen regions dark.
  - **the entrance is the tuned one** (`stagedByKey` → `stagedEntrance`), triggered at the frame the
    camera STOPS (`triggerFrameByRegion({atHoldStart:true})`), so border → fill → label all run in
    stillness and finish ~0.9 s before the next move — the arithmetic `AREAL_REVEAL_HOLD_S` claims.
  - **a visited region stays lit**: a carrier resolves `revealMode` to `sequential`
    (`resolveRevealMode`), so the map opens dark and each subject's own bloom layer holds at full
    once its entrance settles.
  - **the border is a darker shade of the region's own colour** (Map Explainer's rule), so the draw
    already says which bin the region is in before the fill answers.
  - **the takeaway brings the rest of the distribution in.** Tom's non-river countries are basemap
    and that is right for his claim; on a choropleth an uncoloured region reads as *no data*, so the
    closing beat washes the remaining data regions in over its own hold.
  - Without `sweepCarrier` **nothing changes** — same beats, same paint, byte-identical mp4.
  - The other five `*Story` types still run the old sweep clock; `tests/sweep-carrier-coverage.test.ts`
    holds that gap open as a decision rather than letting it go quiet.
- **Gate** — `scripts/audit-story.mjs` (`bun run audit:story`) is render-free and deterministic: it asserts
  the beats open on the title, close on takeaway, every reveal has a highlight + callout text, ≥2 distinct
  cameras (the camera moves), and copy on the title + reveal beats. Green before the eye — but ALWAYS
  validate a still mid-reveal AND the title/takeaway frames, since the audit can't see colour/annotation.

## Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Geo core | **turf + plain TS in `src/<type>-geo.ts`** — framework-free | Joins/bins/bounds are pure math, unit-tested with `bun:test`. No MapTiler/React coupling. |
| Render | **React `src/<Type>Map.tsx`** + **MapTiler SDK** | Remotion is React-only. `progress` prop is the single animation input. |
| Static | **Vite build + Playwright** (`scripts/snap-static.mjs`) | Render at progress=1, wait for `map.once('idle')`, screenshot → PNG. |
| Interactive | **Vite + `vite-plugin-singlefile`** (`INTERACTIVE=1`) | One embeddable HTML file with pan/zoom + hover popup + legend. Verified live in the browser (hover + popup), not just a static PNG. |
| Video | **Remotion** (`remotion/`) wrapping the SAME component | `useCurrentFrame` → eased `progress` → `<Type>Map`. `bunx remotion render --gl=angle --concurrency=1`. |

**Reduced motion (WCAG 2.3.3):** the standalone interactive maps have no autoplay camera
animation to begin with — every `fitBounds` call is `duration:0` (instant), so there is nothing to
gate on page load. The one interaction-triggered animation (`LocatorMap.tsx`'s cluster-click
`easeTo`, zooming into an expanded cluster) checks `prefers-reduced-motion`
(`lib/core/motion.ts`) and eases instantly (`duration:0`) when set, matching scrolly's
`flyToBeat` contract. The **video** format is exempt — a baked mp4 cannot honor a CSS media query
at playback time, and the reveal is the map's essential content (WCAG 2.3.3's "essential"
carve-out), nothing to disable.

Conformance is enforced, not hand-baked: `src/conformance.ts` (`checkChoroplethConformance`)
is the map-native equivalent of chart-native's `checkConformance` — it runs the global L0 guard
(insight title, source name + url, WCAG contrast) plus type-specific map checks (CVD-safe scale,
legend, basemap-fit possible). Unit-tested in `tests/conformance.test.ts`. Conformance also runs
**fail-hard at produce time** — `scripts/produce.mjs` calls `runProduceMapConformance` (furniture
L0 + palette CVD-safety) against the actual config BEFORE any build step; a violation exits
non-zero with the violation list, before anything is built or rendered.

## Choropleth — the worked exemplar

The **choropleth** (slice 1) is the "line chart" of maps: regions shaded by a value, with a legend,
a CVD-safe sequential or diverging colour scale, and a `fitBounds` to the data extent.

**Pure core `src/choropleth-geo.ts`** (`computeChoropleth`):
- Joins CSV rows to GeoJSON features by `regionKey` (e.g. ISO-A3 for `world`). Reports unmatched
  CSV rows — never silently drops them.
- Computes **bins** (equal-interval, 5 steps default) from the joined values, picking colours from
  `BLUES` (sequential) or `DIVERGING` (diverging, symmetric around a configurable midpoint).
- Computes the **data bbox** (`turf.bbox`) over only the matched features — this is what
  `ChoroplethMap` passes to `fitBounds` and what the audit measures.
- Returns `ChoroplethLayout`: `joined`, `bins`, `bounds`, `noData`, `unmatched`, `scaleType`.

**Component `src/ChoroplethMap.tsx`**: MapTiler SDK map, init-once, `on('load')` wires sources/layers
+ `fitBounds(layout.bounds, { duration: 0 })`. `progress` drives `fill-opacity` via
`setPaintProperty` (the reveal). Exposes `window.__map__` and `window.__layout_bounds__` for the
audit's basemap-fit check. Strips symbol/label clutter from the basemap. Hover popup on mousemove.
No-data regions keep the basemap default (opacity 0, never tinted) and are not listed in the legend
— only data-bearing bins appear there.

**Remotion compositions**: `ChoroplethStory` (1280×720 landscape), `ChoroplethStorySquare`
(1080×1080), `ChoroplethStoryPortrait` (1080×1920, true 9:16) — duration derived from the `mapStory`
beats via `buildTimeline` (~15 s / 453 frames at 30 fps for the 4-beat sample), not a fixed length.

## How it works (the shape)

1. **Geo core** — `computeChoropleth(data, features, joinKey, options)` → `ChoroplethLayout`.
   Framework-free. Pure, deterministic, unit-tested.
2. **Component** — `ChoroplethMap` builds the SDK map (static + interactive), joins the data, renders
   bins and legend; its `progress` prop fades `fill-opacity` for the static/interactive builds. The
   VIDEO is a separate component, `ChoroplethStory`, driven by the `mapStory` beats (not a single fade).
3. **Static** — Vite build (`dist/static/`) → `scripts/snap-static.mjs` waits for idle, screenshots.
4. **Interactive** — `INTERACTIVE=1` Vite build (single file, `vite-plugin-singlefile`) →
   `scripts/snap-proof.mjs` loads it, hovers a region, asserts the popup, screenshots.
5. **Video** — `remotion/src/Root.tsx` registers `ChoroplethStory/StorySquare/StoryPortrait`;
   `produce.mjs` renders a still first, then the full mp4 (`--gl=angle --concurrency=1`).

## Quick start

```bash
cd skills/map-native
bun install
# Set keys in .env: VITE_MAPTILER_KEY=... and REMOTION_MAPTILER_KEY=...
bun run audit                                                   # layout + basemap-fit gate
bun scripts/snap-static.mjs                                     # static PNG
bun scripts/snap-proof.mjs                                      # interactive hover proof
bunx remotion still remotion/src/index.ts ChoroplethStory \
  output-proof/choropleth/still.png --frame=150 --gl=angle      # validate one frame first
bunx remotion render remotion/src/index.ts ChoroplethStory \
  output-proof/choropleth/landscape.mp4 --gl=angle --concurrency=1 --timeout=120000
```

Or via `produce.mjs` with an arbitrary config (nothing touches the committed sample):
```bash
bun scripts/produce.mjs assets/sample-data/choropleth.json output-proof/choropleth static
```

## Map-type roadmap

`map-native` is ONE engine, exactly as `chart-native` is one engine for 41 types. The choropleth is
the worked exemplar; every other type plugs into the **same foundation** (Tom's harness + a per-type
pure geo-core + conformance + audit + `produce`) and is added one at a time via the recipe above.
S/I/V = which formats fit (Static / Interactive / Video):

| Map type | Engine | S | I | V | Tom reference |
| --- | --- | --- | --- | --- | --- |
| **Choropleth** | MapTiler 2D | ✓ | ✓ | ✓ | geojsonPreset — **slice 1 (built)** |
| Proportional symbol | MapTiler 2D | ✓ | ✓ | ✓ | convert-map markers |
| Flow / route | MapTiler 2D | ✓ | ✓ | ✓ | map-explainer (river/route) — **static + interactive (route line + territories + direction) + video (route-reveal / scrolly)** |
| Explainer beat (region sequence) | MapTiler 2D | — | — | ✓ | **map-explainer (proven)** |
| Dot density | MapTiler 2D | ✓ | ✓ | ✓ | — **all six formats built (Slice A: static + interactive; Slice B: video reveal + storytelling + scrolly + interactive scrolly)** |
| Hex / grid (spatial bins) | MapTiler 2D / turf | ✓ | ✓ | ✓ | CARTO analysis (H3) — **all six formats built (Slice A: static + interactive; Slice B: video reveal + storytelling + scrolly + interactive scrolly)** |
| Cartogram (grid / scaled) | precompute + 2D | ✓ | ✓ | ✓ | square-grid-maps-of-the-usa — **all six formats built (Slice A: static + interactive; Slice B: video reveal + storytelling + scrolly + interactive scrolly)** |
| Contour / isoline | MapTiler 2D | ◻ | ◻ | — | |
| Locator / markers | MapTiler 2D | ✓ | ✓ | ✓ | map-dw locator (native port) — **all six formats built (Slice A: static + interactive; Slice B: video reveal + storytelling + scrolly + interactive scrolly)** |
| **3D terrain flyover** | **Cesium (separate engine)** | — | — | ✓ | cesium-flyover |

The first nine ride the one `map-native` engine. The 3D flyover is a separate engine (`cesium-flyover`).

## Boundary presets (shipped: `world`, `us-states`, and `natural-earth-admin-1`)

| Preset | Boundary | Join key | Source |
| --- | --- | --- | --- |
| `world` | Natural Earth admin-0 (countries) | `iso_a3` (ISO-A3) | Natural Earth |
| `us-states` | US states | 2-letter postal code | US Census |
| `natural-earth-admin-1` | Sub-national admin-1 (cantons, départements, states, provinces — world-wide, ~199 sets) | `name` (a 9-identifier join-key family, `lib/geo/ref.ts`) | Natural Earth |

All three are public domain — no credit obligation, no licence to track (`lib/geo/ref.ts`'s
`BASEMAPS`/`SHIPPED_REFS` registries). The obvious next entries beyond these — French
departments/regions sourced directly, say — would come from Eurostat NUTS, which this project's
own licence audit disqualified as non-commercial and MIT-incompatible, alongside GADM
(`docs/superpowers/specs/2026-07-28-geography-anywhere-design.md` §2.3/§2.4b). Dropping a
Eurostat or GADM GeoJSON into `assets/geo/` would ship data this project has ruled it cannot
ship — `natural-earth-admin-1` is what closes that gap instead, without incurring it: **sub-national
coverage now ships**, at the `admin-1` level, world-wide, scoped per-country on a join (Task 15,
`lib/geo/subset.ts`'s `scope` — a name shared across a border, e.g. Swiss/French "Jura", resolves
to the request's majority-vote country and never bleeds into the neighbour).

Below `admin-1` (postal codes, communes, `code insee`…), or for a boundary this registry does not
ship at all, the journalist's own DECLARED geometry file is the route — **but as of this branch
that route does not yet work end to end**: `input.geography` on `initRun` (spec D1/D1b, credited
via `geoCredit`, see "Module furniture" above) is validated and accepted, but no assembler code
in this tree threads the frozen file's path onto `config.geography.sourcePath` before produce —
`resolveGeometryForProduce` throws a named refusal naming exactly that gap
(`lib/geo/resolve-for-produce.ts:206-211`) rather than silently rendering the wrong map. Treat a
declared geography as accepted-but-not-yet-wired, not as a working shipped-preset alternative,
until that threading lands.

**Video now renders any SHIPPED geography — `world`, `us-states`, `natural-earth-admin-1` — a
declared geography stays the one thing it cannot render yet.** The eight video compositions
(`{Choropleth,Cartogram,DotDensity}{Story,Reveal}.tsx`, `RouteReveal.tsx`, `RouteScrolly.tsx`) read
the injected `config.geometry` through `resolveVideoGeometry` (`skills/map-native/src/core/
video-geometry.ts`) — the same decode the static/interactive/scrolly formats already use, joining on
`config.geography.joinKey` when present — instead of the bundled `staticFile("geo/world.geojson")` +
hardcoded `iso_a3` this section used to describe (render-verified: a Swiss-canton choropleth video
renders the real cantons, camera-toured beat by beat — see the geography-anywhere digest above). A
DECLARED geography is the one case still refused for video: `resolveGeometryForProduce` throws by
name, before any build step, because no assembler in this tree threads a declared geometry's
`sourcePath` through to produce yet (the same gap the paragraph above already names — nothing new
here, just the video-specific consequence of it). Choose static, interactive, or scrolly for a
declared geography until that threading lands.

## Produce — format selector from one config

`produce.mjs <config.json> <outDir> <format>` where `format ∈ { static | reveal | story | scrolly | all }`
(defaults to `static`). The static + interactive proofs (`static.png`, `interactive.png`) are always
emitted; the `format` arg gates the VIDEO render:
- `reveal` → simple-reveal video (fixed camera, data animates in) — `reveal-{aspect}.mp4`
- `story` → storytelling camera-tour video — `story-{aspect}.mp4`
- `scrolly` → scrolly-as-video (interactive scrolly captured as MP4, step-paced prose panel + pinned map) —
  `scrolly-{aspect}.mp4`. Covers all 3 types (choropleth, symbol, route). Route gains
  `scrolly` alongside `story` (route has no simple-reveal). See `knowledge/references/map/formats/video-scrolly.md`.
- `all` → reveal + story + scrolly.

**Channel-driven aspect (Slice 2):** `SPLASH_CHANNEL` (env, default `article-web`) picks which ONE
aspect is rendered — `social-vertical`→portrait 1080×1920, `social-feed`→square 1080×1080,
`article-web`→landscape 1200×675 (`skills/splash/src/channel.ts` `channelAspect`/`renderSize`) — never
the full landscape+square+portrait triple. The STATIC build is also sized to the channel's exact
pixels (`static.png` comes out at `renderSize(channel)`); `interactive.png`/`interactive.html` stay
unsized (the `interactive` format is article-web-only, filling its host).

Output JSON is nested by sub-format, keyed by the ONE rendered aspect name:
`{ static, interactive, reveal?: {[aspect]: mp4}, story?: {[aspect]: mp4}, scrolly?: {[aspect]: mp4} }`
(sub-keys present only for the formats produced). The config is injected via the `__CONFIG__` Vite
define (web builds) and `--props` (Remotion), so nothing touches the committed sample. Simple-reveal
best practices live in `knowledge/references/map/formats/video-reveal.md`.

## Tuning knobs

| Want | Knob | Where |
| --- | --- | --- |
| Beat hold / move durations (video) | `buildTimeline` opts (`establishHold`/`revealHold`/`takeawayHold`/`move`, seconds) | `src/story-timeline.ts` |
| Camera-move easing (video) | `easeInOutCubic` | `src/story-timeline.ts` |
| Value unit in callouts | `valueUnit` (e.g. `%`; the long `unit` stays the legend label) | choropleth config JSON |
| Number of colour bins | `bins` (default 5) | choropleth config JSON |
| Sequential vs diverging scale | `scaleType: "sequential" | "diverging"` | choropleth config JSON |
| Diverging midpoint | `midpoint` (default: (min+max)/2) | choropleth config JSON |
| Basemap style | `MapStyle.DATAVIZ.LIGHT` | `ChoroplethMap.tsx` |
| Viewport padding on fitBounds | `padding: 48` | `ChoroplethMap.tsx` / `ChoroplethStory.tsx` |
| Min data fill fraction (audit) | `MIN_DATA_FILL_FRACTION` (0.7) | `scripts/audit.mjs` |
| Render watchdog ceiling | `DEFAULT_VIDEO_TIMEOUT_MS` (900000 = 15 min; env `SPLASH_VIDEO_TIMEOUT_MS`) | `src/video-watchdog.ts` |
| Video snap sensitivity | `REVEAL_MIN_MEAN_DIFF` (0.5) / `PROGRESSION_MIN_MEAN_DIFF` (0.15) / `MIN_LUMA_VARIANCE` (10) / `STILL_MATCH_CHANNEL_TOLERANCE` (40) / `STILL_MATCH_MAX_DIFF_RATIO` (0.01) | `src/core/video-verify.ts` |

## Files

- `src/choropleth-geo.ts` — framework-free geo core (join, bins, bounds, no-data). Unit-tested.
- `src/ChoroplethMap.tsx` — THE one React+MapTiler component, driven by `progress`. Wires Tom's
  `delayRender/idle/continueRender` harness for Remotion; same component for static + interactive.
- `src/conformance.ts` — global L0 guard + WCAG math (`relativeLuminance`, `contrastRatio`) +
  `checkChoroplethConformance` (CVD-safe scale, legend, basemap-fit possible, source, insight title).
- `src/components/HarnessCheck.tsx` — minimal MapTiler-in-Remotion smoke test; the canonical
  reference implementation of Tom's per-frame `delayRender → setPaintProperty → idle → continueRender`
  gate. Run `bunx remotion render … HarnessCheck --gl=angle` to prove the harness on a new machine.
- `src/theme/scale.ts` — `BLUES` (sequential monotonic-luminance) and `DIVERGING` (CVD-safe pair).
- `src/map-story.ts` — pure `deriveMapStory(layout, features, joinKey, meta) → Beat[]`: the shared
  narrative spine (establish/reveal-max/reveal-min/takeaway). Framework-free, unit-tested.
- `src/story-timeline.ts` — pure frame→beat math + eased camera interpolation (`buildTimeline`,
  `cameraForFrame`, `easeInOutCubic`). Unit-tested.
- `src/components/ChoroplethStory.tsx` — the narrated VIDEO component: consumes the beats + timeline,
  per-frame `jumpTo` camera, data-driven dim/emphasis, `CountryLabel` callouts + a beat caption.
- `remotion/src/Root.tsx` — Remotion root: the reveal/story/route-reveal compositions across the
  map types (`{Choropleth,Symbol}Reveal*`, `{Choropleth,Symbol}Story*`, `RouteReveal*`) + `HarnessCheck`.
- `remotion.config.ts` — `setPublicDir("remotion/public")` (so `staticFile` resolves) + `.geojson`
  JSON webpack loader.
- `scripts/audit.mjs` — layout + basemap-fit audit (real browser × 7 viewports; `map.project()`
  pixel-projects the data bbox to assert ≥ 70% fill on the binding canvas dimension).
- `scripts/audit-story.mjs` — render-free narrative gate (`bun run audit:story`): beats open establish,
  close takeaway, reveals carry highlight + callout text, consecutive cameras differ, every beat has copy.
- `scripts/audit-cases.mjs` — sample + stress cases registry for the audit.
- `scripts/snap-static.mjs` — Playwright: waits for `map.once('idle')`, screenshots static build.
- `scripts/snap-proof.mjs` — Playwright: loads interactive build, hovers a region, screenshots popup.
- `scripts/lib/furniture-i18n.mjs` — i18n furniture gate (fail-hard, runs inside `snap-static.mjs` + `snap-a11y.mjs`'s existing page loads): a non-English config's rendered HTML furniture (MapFrame title/source, legend, filter bar) must carry the localized "Source" label from `src/core/locale.ts`, no English caption, no unambiguously English-grouped number; GL-canvas text is not DOM-reachable and stays out of scope.
- `scripts/produce.mjs` — `produce(configPath, outDir)`: all three formats from an arbitrary config.
- `scripts/snap-video.mjs` — video snap guard (fail-hard after the mp4 render): container sanity + reveal-animates + mp4-matches-reviewed-still, via the bundled ffmpeg (`scripts/lib/ffbin.mjs`); pure pixel math in `src/core/video-verify.ts`.
- `src/video-watchdog.ts` — bounds every Remotion render/still subprocess (default 15 min, `SPLASH_VIDEO_TIMEOUT_MS`); kills the hung process tree (seismes-class hang → clean fail-hard).
- `src/route-geo.ts` — `computeRoute` / `computeRouteReveal`: runtime route geometry (auto-detect crossed territories + stops + borders); superseded the build-time `prep-geo.mjs` bake.
- `assets/geo/world.geojson` — Natural Earth admin-0 boundaries (simplified).
- `assets/geo/us-states.geojson` — US Census state boundaries, 2-letter postal join key.
- `assets/geo/natural-earth-admin-1.topojson` — Natural Earth admin-1 (sub-national) boundaries,
  world-wide, 15.4 MB on disk — never inlined, subset per-run by `lib/geo/subset.ts`.
- `assets/sample-data/choropleth.json` — runnable sample (EU renewable energy share by country).
- `tests/` — `bun:test` suites: geo core (join/bins/bounds/no-data), conformance guard, the `mapStory`
  spine (`map-story.test.ts`), and the story timeline (`story-timeline.test.ts`).
- `output-proof/choropleth/` — real artifacts: `static.png`, `interactive.png`, 3 × mp4 + stills.
