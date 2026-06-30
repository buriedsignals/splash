# Symbol map — e2e proof

## Config used

`assets/sample-data/symbol.json` — EU tech-funding, 6 cities, type: "symbol".

```json
{
  "type": "symbol",
  "points": [
    { "lon": 2.3522,  "lat": 48.8566, "value": 181, "label": "Paris" },
    { "lon": -0.1276, "lat": 51.5072, "value": 296, "label": "London" },
    { "lon": 13.405,  "lat": 52.52,   "value": 88,  "label": "Berlin" },
    { "lon": -3.7038, "lat": 40.4168, "value": 124, "label": "Madrid" },
    { "lon": 12.4964, "lat": 41.9028, "value": 67,  "label": "Rome" },
    { "lon": 4.9041,  "lat": 52.3676, "value": 52,  "label": "Amsterdam" }
  ],
  "basemap": "world",
  "title": "London leads Europe's tech-funding map, Paris close behind",
  "description": "Venture funding raised by startups headquartered in each city, 2024",
  "valueUnit": "$bn",
  "source": { "name": "Dealroom 2025", "url": "https://example.org/dealroom" }
}
```

## validateSymbolConfig result

```json
{ "ok": true, "warnings": [] }
```

## Produce command

```bash
cd skills/map-native
set -a && . ../../.env && set +a
bun scripts/produce.mjs assets/sample-data/symbol.json /tmp/system-test/symbol-map all
```

## Output files

| File | Size |
|---|---|
| `/tmp/system-test/symbol-map/static.png` | 411 KB |
| `/tmp/system-test/symbol-map/interactive.png` | 399 KB |
| `/tmp/system-test/symbol-map/video-landscape-still.png` | 207 KB |
| `/tmp/system-test/symbol-map/landscape.mp4` | 355 KB |
| `/tmp/system-test/symbol-map/video-square-still.png` | 332 KB |
| `/tmp/system-test/symbol-map/square.mp4` | 405 KB |
| `/tmp/system-test/symbol-map/video-portrait-still.png` | 380 KB |
| `/tmp/system-test/symbol-map/portrait.mp4` | 421 KB |

## Per-format assessment (what was actually observed)

**static.png** — Full 1280×720 frame, light basemap covering western Europe; all 6 circles fully sized and area-proportional (London clearly largest at top-left of Britain, Amsterdam smallest near the Netherlands coast); title card present in top-left panel.

**interactive.png** — Snap-proof confirmed popup: "London 296$bn" over the largest circle; layer type logged as "symbol"; popup value assertion passed.

**video-landscape-still.png (frame 140/149, progress ≈ 0.94)** — Full 1280×720 frame fills the composition; 6 blue circles visible over western Europe, correctly sized (London noticeably larger than Paris, Paris larger than Madrid, smaller dots for Berlin/Rome/Amsterdam); title overlaid top-left; no blank canvas, no NaN.

**landscape.mp4 (351 KB, 150 frames, 30 fps, 5 s)** — File confirmed non-trivial; frames 0–149 rendered without error; circles grow 0 → target over the clip via cubic easing.

**video-square-still.png (frame 140/149)** — 1080×1080 composition; map fills the full square frame; circles visible and proportional; title wraps cleanly over two lines without clipping.

**square.mp4 (387 KB, 150 frames)** — File confirmed non-trivial; one transient QUIC tile-fetch warning during render (non-blocking — tile loaded via retry, render completed); reveal correct.

**video-portrait-still.png (frame 140/149)** — 1080×1350 composition; map fills the portrait frame; title shows on two lines without clipping; circles correctly placed.

**portrait.mp4 (419 KB, 150 frames)** — File confirmed non-trivial; render completed without error.

## Fix notes (2026-06-29) — regression fix

**Regression (commit e61eb20)**: The attribution fix commit accidentally removed the `mapReady` React state gate. In Remotion's per-frame render each frame is its own render pass, so the per-frame effect runs once at `mapReady=false`, hits the guard, returns early, and never re-runs for that fixed frame — `circle-radius` stays 0 and no circles appear.

**Fix applied**: Restored the `mapReady` state declaration, `setMapReady(true)` call inside `map.once("idle")`, and `mapReady` in the per-frame effect's guard and deps array — exactly as in commit `fbd6592`. The `mapReady` gate is REQUIRED for the Remotion per-frame reveal to work correctly.

**Attribution also correct**: `attributionControl: true` on the Map constructor, no `<style>` tag hiding attribution. "© MapTiler © OpenStreetMap contributors" visible bottom-right in all video stills.

**Visually confirmed** (re-rendered 2026-06-29): landscape still shows 6 proportional blue circles over western Europe (London largest) AND attribution bottom-right. Portrait still (re-rendered separately after transient timeout) also shows circles + attribution + title unclipped.

## Output files (re-rendered 2026-06-29)

| File | Size |
|---|---|
| `/tmp/system-test/symbol-map/static.png` | 421 KB |
| `/tmp/system-test/symbol-map/interactive.png` | 408 KB |
| `/tmp/system-test/symbol-map/video-landscape-still.png` | 217 KB |
| `/tmp/system-test/symbol-map/landscape.mp4` | 363 KB |
| `/tmp/system-test/symbol-map/video-square-still.png` | 346 KB |
| `/tmp/system-test/symbol-map/square.mp4` | 415 KB |
| `/tmp/system-test/symbol-map/video-portrait-still.png` | 380 KB |
| `/tmp/system-test/symbol-map/portrait.mp4` | 431 KB |

## Fix notes (2026-06-29) — direct labels added

**Feature**: Direct name+value labels on every symbol (`symbol-labels` GL layer) added to `SymbolMap.tsx` and `SymbolStory.tsx`. Labels render in all 3 formats (static, interactive, video). In the video, `text-opacity` fades from 0 → 1 in sync with `circle-radius` progress.

**What was READ in static.png (re-rendered 2026-06-29 with labels)**:
- London 296 — two-line label, white halo, readable inside/near the large circle
- Paris 181 — two-line label, white halo, readable
- Madrid 124 — label below the mid-size circle, white halo
- Berlin 88 — label below circle, white halo, clear
- Rome 67 — label below small circle, white halo, readable
- Amsterdam 52 — label below smallest circle, white halo, readable

**Video landscape still**: London 296, Paris 181, Amsterdam 52, Berlin 88, Madrid 124, Rome 67 all visible with white halos. Title unclipped. Attribution present bottom-right.

**Video portrait still**: All 6 labels visible. Title shows on two lines. Attribution present.

**Conformance**: `checkSymbolConformance` now enforces `labeled: boolean`; `labeled: false` emits `"symbols are not directly labeled — values are undecodable without hover"`.

## Output files (re-rendered 2026-06-29 with labels)

| File | Size |
|---|---|
| `/tmp/system-test/symbol-map/static.png` | 434 KB |
| `/tmp/system-test/symbol-map/video-landscape-still.png` | (rendered as part of all) |
| `/tmp/system-test/symbol-map/landscape.mp4` | 369 KB |
| `/tmp/system-test/symbol-map/square.mp4` | 416 KB |
| `/tmp/system-test/symbol-map/portrait.mp4` | 431 KB |

## Test suite

`bun test` after direct-label feature: **82 pass, 0 fail**.

## Fix notes (2026-06-29) — beside-placement + ratio-scaled labels in video

**Feature**: `SymbolStory.tsx` now uses variable-anchor + radial-offset label placement (same as the web build `SymbolMap.tsx`), and scales the label text size by aspect ratio: landscape (1280 px wide) → 13 px, square/portrait (1080 px wide) → 18 px for legibility.

**What changed in `SymbolStory.tsx`**:
- Import `labelRadialOffset` alongside `symbolLabels`.
- Derive `const labelTextSize = width <= 1080 ? 18 : 13` from `useVideoConfig()`.
- Each feature's GeoJSON properties now include `labelOffset: labelRadialOffset(s.radius, labelTextSize)`.
- `symbol-labels` layer layout replaced: `text-variable-anchor: ["left","right","top","bottom"]`, `text-radial-offset: ["get","labelOffset"]`, `text-justify: "auto"`, `text-size: labelTextSize`. Removed conflicting `text-anchor`/`text-offset`.
- Per-frame `text-opacity` reveal, `mapReady` gate, `attributionControl`, and init-once guard left untouched.

**What was READ in video-landscape-still.png (1280×720, labelTextSize=13)**:
- Labels sit clearly BESIDE their circles, not on top — variable-anchor resolved correctly.
- London 296 — label to the right of the large blue circle.
- Paris 181 — label to the right of the Paris circle (France interior).
- Berlin 88 — label to the right of the Berlin circle (top-right).
- Madrid 124 — label to the right of the Madrid circle (bottom-left).
- Rome 67 — label beside the Rome circle (Italy).
- Amsterdam 52 — visible beside the small Netherlands circle.
- Title "London leads Europe's tech-funding map, Paris close behind" unclipped top-left.
- "© MapTiler © OpenStreetMap contributors" attribution present bottom-right.

**What was READ in video-square-still.png (1080×1080, labelTextSize=18)**:
- Labels beside the circles (not on top), larger text than landscape.
- London 296, Paris 181, Berlin 88, Madrid 124, Rome 67 all readable.
- Title wraps across two lines, no clipping.
- Attribution present bottom-right.

**What was READ in video-portrait-still.png (1080×1350, labelTextSize=18)**:
- Labels beside the circles, legibly sized at 18 px — the portrait fix is confirmed working.
- Amsterdam 52 visible top-centre beside the small circle.
- London 296, Paris 181, Madrid 124, Rome 67, Berlin 88 all legible.
- Title wraps across two lines, no clipping.
- "© MapTiler © OpenStreetMap contributors" attribution present bottom-right.

**Note on square/portrait mp4 render**: The first `produce.mjs all` run timed out on the square mp4 (flaky Puppeteer Chromium map init under CPU pressure from sequential renders). Stills and mp4s were completed by rendering them individually after the landscape completed. Portrait mp4 also required one retry. All 3 mp4s confirmed rendered.

## Output files (re-rendered 2026-06-29 — beside-placement + ratio-scaled labels)

| File | Size |
|---|---|
| `/tmp/system-test/symbol-map/video-landscape-still.png` | 224 KB |
| `/tmp/system-test/symbol-map/landscape.mp4` | 379 KB |
| `/tmp/system-test/symbol-map/video-square-still.png` | 356 KB |
| `/tmp/system-test/symbol-map/square.mp4` | 453 KB |
| `/tmp/system-test/symbol-map/video-portrait-still.png` | 404 KB |
| `/tmp/system-test/symbol-map/portrait.mp4` | 470 KB |

## Test suite

`bun test` after beside-placement: **84 pass, 0 fail**.

## Task 3 — MapFrame wired to all 4 components (2026-06-29)

**What changed**: `SymbolStory.tsx` and `ChoroplethStory.tsx` now import `resolveMapFrame` + `MapFrame` from `../core/`. Both video components compute `frame = resolveMapFrame(width, height, { titleLines: 2, hasDescription: ..., labelOverhang: 80|24 })` and wrap the map `<div>` in `<MapFrame responsive={false} frame={frame}>`. The `fitBounds`/`cameraForBounds` padding is now `frame.pad` (not a uniform 64/48 px integer) — data stays outside the title and source bands by construction. The hand-rolled title `<div>` in SymbolStory (top:40, left:48, fontSize:30) was removed; ChoroplethStory's TitleCard beat overlay remains (it fades to transparent before the map becomes visible; MapFrame title + source are always present underneath).

**MapFrame now wraps all 4 components**: SymbolMap.tsx (web static), SymbolMapInteractive.tsx (web interactive), SymbolStory.tsx (video), ChoroplethStory.tsx (video).

**Source previously absent in video**: Before this task, neither SymbolStory nor ChoroplethStory had any source attribution. MapFrame's bottom band adds "Source: Dealroom 2025" and "Source: Ember Global Electricity Review 2025, via Our World in Data" unconditionally in all video compositions.

### What was SAW in the 6 video stills (all rendered 2026-06-29)

**symbol / video-landscape-still.png (1280×720, frame 140)**
- Basemap renders: light-grey land, blue sea, western-Europe view — NOT blank.
- All 6 proportional blue circles visible (London largest, Amsterdam smallest) with beside-placed labels (London 296, Paris 181, etc.).
- Title "London leads Europe's tech-funding map, Paris close behind" in MapFrame top band, styled with text-shadow (not a frosted pill — responsive:false).
- Description "Venture funding raised by startups headquartered in each city, 2024" on a second line below title.
- **Source "Source: Dealroom 2025" visible bottom-left** — key new addition.
- MapTiler attribution "© MapTiler © OpenStreetMap contributors" bottom-right.
- Nothing clips off frame; circles and labels clear of title band.

**symbol / video-square-still.png (1080×1080, frame 140)**
- Basemap renders; all 6 circles + labels visible.
- Title wraps cleanly on two lines (larger scale text vs. landscape — scale ≈ 1.5).
- Description visible below title.
- **Source "Source: Dealroom 2025" visible bottom-left.**
- MapTiler attribution bottom-right.
- Nothing off-frame.

**symbol / video-portrait-still.png (1080×1350, frame 140)**
- Basemap renders; all 6 circles + labels visible (18 px label text, larger than landscape 13 px).
- Title + description in top band, comfortably fits two lines.
- **Source "Source: Dealroom 2025" visible bottom-left.**
- MapTiler attribution bottom-right.
- Nothing off-frame.

**choropleth / video-landscape-still.png (1280×720, frame 140)**
- Basemap renders: light basemap with choropleth fill over Europe — NOT blank. Norway darkest blue (99 %), Sweden medium blue (68 %), Germany medium (59 %), UK light-medium (48 %), Spain/Italy lighter (44/41 %), France light (27 %), Poland lightest (21 %).
- Title "Renewables power most of Europe's north, far less of its south" in MapFrame top band.
- Description "Share of electricity from renewables, by country, 2024" below title.
- **Source "Source: Ember Global Electricity Review 2025, via Our World in Data" visible bottom-left** — key new addition, previously absent in video.
- MapTiler attribution bottom-right.
- Nothing clips; choropleth regions clear of title band.

**choropleth / video-square-still.png (1080×1080, frame 140)**
- Basemap renders; choropleth regions visible with correct color gradient.
- Title + description in top band — larger text scale (scale ≈ 1.5), legible.
- **Source "Source: Ember Global Electricity Review 2025, via Our World in Data" visible bottom-left.**
- MapTiler attribution bottom-right.
- Nothing off-frame.

**choropleth / video-portrait-still.png (1080×1350, frame 140)**
- Basemap renders; choropleth fill visible across European countries.
- Title + description top band, scaled appropriately for portrait.
- **Source "Source: Ember Global Electricity Review 2025, via Our World in Data" visible bottom-left.**
- MapTiler attribution bottom-right.
- Nothing off-frame.

### Output files (Task 3 — 2026-06-29)

**Symbol map**

| File | Size |
|---|---|
| `/tmp/system-test/symbol-map/video-landscape-still.png` | 230 KB |
| `/tmp/system-test/symbol-map/landscape.mp4` | 380 KB |
| `/tmp/system-test/symbol-map/video-square-still.png` | 390 KB |
| `/tmp/system-test/symbol-map/square.mp4` | 457 KB |
| `/tmp/system-test/symbol-map/video-portrait-still.png` | 440 KB |
| `/tmp/system-test/symbol-map/portrait.mp4` | 475 KB |

Note: landscape mp4 rendered in `produce.mjs all`; square and portrait rendered individually after `produce.mjs` exited early on the square mp4 (known flaky Chromium-under-CPU-pressure issue).

**Choropleth map**

| File | Size |
|---|---|
| `/tmp/system-test/choropleth-map/video-landscape-still.png` | 233 KB |
| `/tmp/system-test/choropleth-map/landscape.mp4` | 3.6 MB |
| `/tmp/system-test/choropleth-map/video-square-still.png` | 294 KB |
| `/tmp/system-test/choropleth-map/square.mp4` | 4.5 MB |
| `/tmp/system-test/choropleth-map/video-portrait-still.png` | 327 KB |
| `/tmp/system-test/choropleth-map/portrait.mp4` | 5.0 MB |

All 6 mp4s confirmed non-trivial. Choropleth mp4s are larger than symbol because the beat-driven camera timeline is longer (549 frames vs 150).

### Test suite

`bun test` after Task 3: **93 pass, 0 fail**.
