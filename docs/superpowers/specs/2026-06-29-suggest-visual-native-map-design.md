# suggest-visual — routing to the native map (slice 1b) — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** extend the suggester so a geographic story that the format ladder escalates to
**interactive or video** routes to the **native map** (`map-native`), not the static `map-dw`. Slice 1
wired the static map; this adds the non-static map producer to the routing.

## Why

Slice 1 routes every spatial story to `map-dw` (static). But the format ladder (Gates 1–4) says: a
geographic story with an exploration hook or a motion/social need should be interactive/video — which for
a map means `map-native` (it produces the interactive HTML + the narrative mp4s + feeds the scrolly). The
producer already exists (`map-native/scripts/produce.mjs <config.json>`); this slice adds the
article→config mapping, the routing, and the scoring.

## The format → producer rule (within the map family)

Gate 5 (slice 1) decides map vs chart. Within a map, the format ladder decides the producer:

- **static** (Gate 1 default) → `map-dw` (the slice-1 path).
- **interactive** (Gate 2: exploration / "find your area" / per-region hover at scale) → `map-native`
  interactive HTML.
- **video** (Gate 4: temporal/spatial diffusion the motion clarifies, or social/vertical distribution) →
  `map-native` mp4s.
- (scrolly is slice 2 — a later format option.)

So the suggester applies the SAME grounded ladder; the only new wiring is "escalated map → map-native".

## The article → `ChoroplethConfig` mapping

`map-native`'s config (the shape `produce.mjs` + `computeChoropleth` consume; see
`assets/sample-data/choropleth.json`):
`{ regionKey, valueField, rows: [{<regionKey>, <valueField>}…], basemap, title, description, unit,
valueUnit, source: {name,url} }`. The suggester emits `{ producer: "map-native", …config }`:

- **regionKey / valueField** — the data columns (region code, the normalized value). map-native joins on
  `world.geojson`'s ISO-A3, so the region codes MUST be ISO-A3 (convert names→ISO if needed, or fall back
  to `map-dw`/bars if they can't be matched).
- **rows** — the data as an array of objects (not a CSV string — that is the config shape).
- **basemap** — `"world"` (slice-1b supports the world ISO-A3 preset; other presets later).
- **title** — the insight. **description** — the what/when/where (the furniture standard). **valueUnit** —
  the short unit ("%") for callouts; **unit** — the long legend label. **source** — honest.

## Validation — a reusable validator in `map-native` (decided by best practice)

Each producer owns its spec validation (`dw-chart`→`validateChartSpec`, `map-dw`→`validateMapSpec`). So
add **`validateChoroplethConfig(config) → { ok, spec, warnings } | { ok:false, errors }`** to `map-native`
(`src/`), and `score.ts` + the suggester import it — same pattern, single source of truth, reusable by
`produce.mjs` too. It checks (structural, framework-free): `regionKey` + `valueField` are non-empty
strings; `rows` is a non-empty array where each row has the `regionKey` and `valueField` keys and a
numeric value; `basemap` present; `title` is an insight (≥12 chars, not a year range); and the furniture
— `description` + `source.name`/`source.url` present (a violation if missing, matching the module-furniture
standard). It does NOT need MapTiler or the geojson — purely the config.

## Scoring — `scoreSpec` discriminates the two map producers

In `eval/score.ts`, when the emitted spec is a map (`isMap`), discriminate by `producer`:
- `producer === "map-dw"` (or a `basemap`+`mapKeyAttr` shape) → `validateMapSpec` (slice 1).
- `producer === "map-native"` → `validateChoroplethConfig` (this slice).
`Expectation` gains `producer?: "dw-chart" | "chart-native" | "map-dw" | "map-native"`; when set on a map
case, scoreSpec also checks the emitted producer matches (so an eval case can assert static-map vs
native-map). When unset, any valid map passes (element-level check only).

## Produce

Route the native config to `map-native`: write the config JSON, then
`bun skills/map-native/scripts/produce.mjs <config.json> <outDir> [all|static]` → static PNG + interactive
HTML + 3 mp4s. (No new seam — `produce.mjs` already takes a config.) The MapTiler key comes from `.env`,
never logged.

## SKILL.md (suggester)

In the map branch: after Gate 5 routes to a map, apply the format ladder → `map-dw` (static) vs
`map-native` (interactive/video). Document the `map-native` emission (`producer:"map-native"` +
`ChoroplethConfig` fields), the ISO-A3 requirement (else fall back), the `validateChoroplethConfig`
self-check, and the `produce.mjs` call. Keep the slice-1 `map-dw` path and all chart paths intact.

## Eval

- A case: **spatial story + an exploration/motion intent** (e.g. "explore how each European country's
  renewable share compares — let readers find their country") → routes to `map-native`
  (`element:"map", producer:"map-native"`). Proves format-driven escalation within the map family.
- Keep the slice-1 cases (static spatial → map-dw; ranking → bars). An e2e: emit a native config from a
  spatial+interactive story → `produce.mjs` → the interactive HTML + mp4 (record in the proof; the
  controller eyeballs).

## Out of scope (later)

- **Scrolly** as a map format (article→chapters) — slice 2.
- Symbol/point maps; basemaps beyond world ISO-A3; name→ISO conversion beyond the simple cases.
- The deferred slice-1 items (typing the `producer` discriminator on the MapSpec union; the absolute-counts
  and geo-without-basemap eval cases).

## Testing

| Case | Expectation |
| --- | --- |
| `validateChoroplethConfig` valid config | ok, no errors |
| missing description or source | warning/violation (furniture standard) |
| rows missing the regionKey/valueField column, or empty | error |
| `scoreSpec` a valid map-native config, expect producer "map-native" | pass |
| `scoreSpec` a map-dw spec when expect producer "map-native" | fail (wrong map producer) |
| eval: spatial + exploration intent | routes to `map-native` (not map-dw) |
