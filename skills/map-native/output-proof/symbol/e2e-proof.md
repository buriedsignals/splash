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

## Test suite

`bun test` after fix: **72 pass, 0 fail**.
