# Task 7 report — `map-native` engine SKILL.md

**Status:** DONE
**Commit:** e59f847
**Branch:** feat/map-native-choropleth

## Grep verification

```
cd /Users/rmdms/Sites/Professional/atelier && grep -n "choropleth\|MapTiler\|delayRender\|basemap-fit\|roadmap" skills/map-native/SKILL.md
```

All five terms present across 50+ lines — foundation (delayRender/MapTiler), recipe (basemap-fit, choropleth), and roadmap section.

## What was written

`skills/map-native/SKILL.md` (293 lines):

- **Frontmatter** — `name: map-native`, keyword-rich description (9 map types + MapTiler + 3 formats + basemap-fit + CVD-safe + all preset names).
- **Foundation** — Tom's harness documented precisely from `HarnessCheck.tsx`: init-once ref guard, `delayRender` in `useState` initialiser, `on('load') → add sources + fitBounds → map.once('idle', continueRender)`, per-frame `delayRender → setPaintProperty/setData → map.once('idle', continueRender) → triggerRepaint`, `preserveDrawingBuffer: true`, `--gl=angle --concurrency=1`.
- **Basemap-fit** — documented as a rule: core computes data bbox, `fitBounds` uses it, audit verifies via `map.project()` (≥ 50% fill on binding dimension). Cross-referenced to the `map-dw` footgun.
- **Recipe** — 6 steps mirroring chart-native's (KB-in-geo-header → pure geo core + tests → component with Tom's harness → conformance → global vs type-specific gate → audit-first). Wording reused where it transfers.
- **Overview + when to use + gotcha** — mirrors chart-native's structure and tone. Gotcha is specific to map-native: `--concurrency=1` (chart-native doesn't need it), `REMOTION_MAPTILER_KEY` vs `VITE_MAPTILER_KEY` split.
- **Choropleth exemplar section** — accurate against the built code: `computeChoropleth` interface, bins, bounds, no-data, `window.__map__`/`window.__layout_bounds__` exposure for audit, 3 Remotion compositions (landscape/square/portrait, 6 s @ 30 fps).
- **Map-type roadmap table** — 9 MapTiler types with S/I/V from the design spec, Cesium 3D separate, choropleth marked `slice 1 (built)`.
- **Boundary presets table** — `world` (built) + 3 future presets with their join keys.
- **Produce / 3-format notes** — `produce.mjs` interface, config injection pattern, `formats=static` flag.
- **Tuning knobs + Files** — mirrors chart-native's format.

## Concerns

None. The SKILL is accurate to the built code — every interface name, script, and harness detail was verified against the actual source files before writing.

---

# Task 7 addendum — whole-branch review fixes

**Status:** DONE
**Date:** 2026-06-27

## Fix 1 — npx → bunx

```
grep -rn "npx" skills/map-native/SKILL.md skills/map-native/remotion/src/Root.tsx
(no output — 0 npx remain)
```

Replaced 5 occurrences in `SKILL.md` (lines 56, 153, 204, 206, 279) and 2 in `remotion/src/Root.tsx` (lines 9, 13).

## Fix 2 — duplicate world.geojson removed

```
grep -rn "public/geo" skills/map-native/src skills/map-native/vite.config.* skills/map-native/index.html
(no output — unreferenced confirmed)
```

`git rm skills/map-native/public/geo/world.geojson` — 3.9 MB dead duplicate deleted. `assets/geo/` and `remotion/public/geo/` untouched.

## Fix 3 — typo fixed

`choropletth` → `choropleth` in `SKILL.md` frontmatter keyword list.

## Fix 4 — dead rampColor export removed

```
grep -rn "rampColor" skills/map-native/src
(no output — zero imports confirmed)
```

`rampColor` function removed from `src/theme/scale.ts`. `choropleth-geo.ts` does its own index arithmetic and never imported it.

## Test result

```
bun test v1.3.5
 16 pass
 0 fail
 24 expect() calls
Ran 16 tests across 2 files. [106.00ms]
```

---

# Task 7 addendum — short value unit for callouts; on-map label shows country name

**Status:** DONE
**Commit:** 77854b2
**Branch:** feat/map-native-narrative-video

## Files changed

- `assets/sample-data/choropleth.json` — added `"valueUnit": "%"` (kept `unit` for legend)
- `src/map-story.ts` — extended `Beat.callout` type to include `name: string`; reveal beat construction sets `name: nameOf(key)`
- `tests/map-story.test.ts` — updated callout `.toEqual` to include `name: "Norway"`
- `src/components/ChoroplethStory.tsx` — added `valueUnit?: string` to config type; meta now uses `config.valueUnit ?? ""`; `CountryLabel` receives `beat.callout.name` instead of `overlay.calloutText`
- `remotion/src/Root.tsx` — `deriveMapStory` call uses `(sampleConfig as any).valueUnit ?? ""` instead of `sampleConfig.unit`

## Verification

1. `bun test tests/map-story.test.ts` — 7/7 pass
2. `bun run audit:story` — GREEN (4 beats, 2 reveals, cameras move, callouts present)
3. `bunx tsc --noEmit | grep -iE "ChoroplethStory|map-story|Root.tsx"` — no new type errors

## Concerns

None.
