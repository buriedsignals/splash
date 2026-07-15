# suggest-visual — routing to maps (slice 1) — design

**Date:** 2026-06-29
**Status:** approved (brainstorming)
**Scope:** broaden the suggester so it routes a claim to the right ELEMENT (chart vs map) and FORMAT,
grounded in the new `format-selection.md` ladder. Slice 1 wires the **map** family end-to-end via the
**static producer (`map-dw`)** — so a genuinely spatial story finally yields a real map, while a
ranking-of-regions story correctly stays a sorted bar chart (Gate 5). Native-map and scrolly formats
follow in later slices.

## Why

`suggest-chart` is chart-only today: it emits a ChartSpec (`dw-chart`) or NativeSpec (`chart-native`).
It never routes to a map, even for geographic data — the end-to-end system test confirmed a geographic
story would still become a chart. Slice 1 adds the missing routing layer and the first map producer
path, grounded so the suggester's judgment is defensible (the house rule: AI judges what best serves,
from the KB — not a user knob, not a rigid heuristic).

## The grounded judgment (what the suggester reads)

The suggester applies the ordered ladder in `<repo-root>/knowledge/references/formats/format-selection.md`
(committed): static-first (most readers don't interact); escalate to interactive/scrolly/video only on
the named conditions; and **Gate 5 — geographic data does NOT automatically mean a map**: a map only when
the spatial pattern IS the story (+ normalized rates + legible regions / a self-location motive),
otherwise a sorted bar chart of the regions. Plus the existing `chart-selection.md` (intent → chart
family) and `design-conformance.md`.

## Broaden the skill — `suggest-chart` becomes the visual-element suggester

Keep the directory `skills/suggest-chart/` (other skills/commands reference it — a rename is a separate
cosmetic refactor), but broaden its scope. Its runtime procedure gains:

1. **Profile** the data (as today) AND detect **geographic structure**: is there a column of region
   identifiers (country names / ISO-A2/3 / a recognised admin code) or lat-lng point coordinates? Record
   the region column + the candidate basemap family (world-countries, us-states, …).
2. **Chart family** from intent (`chart-selection.md`), as today.
3. **Gate 5 (only when geographic):** decide map vs chart. A map ONLY if the spatial pattern is the story
   AND the value is a rate/normalized AND the regions are legible (or a self-location motive). Otherwise
   emit the **sorted bar chart** (the existing chart path) — the honest default for "which region is
   highest". The skill must state WHY (cite Gate 5) in its decision.
4. **Format (Gates 1–4):** static by default; escalate only on the conditions. Slice 1 PRODUCES the
   static path; for the map family that means `map-dw`. (If the judgment recommends a native/interactive/
   scrolly/video map, the skill records that recommendation but slice 1 produces the static map and notes
   the richer format as a follow-up — native map + scrolly land in later slices.)
5. **Emit the right spec:**
   - chart → `ChartSpec` (dw-chart) / `NativeSpec` (chart-native), as today;
   - **map (slice 1) → `MapSpec`** for `map-dw`.

## The article → `MapSpec` mapping (slice 1)

`map-dw`'s `MapSpec` (from `skills/map-dw/src/map-spec.ts`):
`{ basemap, mapKeyAttr, regionKey, valueField, title, source, … }`. The suggester fills it from the
article's geographic data:

- **basemap + mapKeyAttr** — pick the DW basemap whose key matches the region identifiers. Slice 1
  supports the common case: countries by ISO-A3/name → the `world` basemap (its `mapKeyAttr`); leave
  us-states / NUTS / custom for later. Use the basemap-key discovery `map-dw` already documents
  (`GET /v3/basemaps/{id}` → `meta.keys`). If no basemap matches the region identifiers, FALL BACK to a
  sorted bar chart (do not force a map onto unmatched regions).
- **regionKey** — the data column holding the region codes/names.
- **valueField** — the numeric column (the normalized rate per Gate 5).
- **title** — the insight (sentence case, the finding — not a label), as for charts.
- **source** — the honest source (prose-provenance rule: the source the article names).
- Furniture: the map carries title + description + source (the common standard); `map-dw` renders DW's
  title/intro/source — set `intro` to the description.

Self-check: the emitted `MapSpec` must pass `map-dw`'s validator before producing.

## Produce (slice 1)

Route the `MapSpec` to `map-dw`'s producer (the existing seam `MapSpec → spec-to-map-metadata →
produceMap`), which returns a Datawrapper embed + an owned PNG. The Datawrapper token comes from
`/splash/.env` (`DATAWRAPPER_API_TOKEN`), never logged.

## Eval — prove the routing (the gate)

Add cases to the suggester's eval that prove Gate 5 both ways (this is the slice's correctness proof):

- **Spatial-pattern geographic story** (e.g. "renewables form a clear north–south gradient across
  Europe", a normalized rate, legible countries) → routes to a **map** (`MapSpec`, `map-dw`), produces a
  real choropleth. The decision cites "spatial pattern is the story".
- **Ranking geographic story** (e.g. "China sold far more EVs than Europe or the US", few regions,
  magnitude) → correctly STAYS a **sorted bar chart** (NOT a map), citing Gate 5 ("ranking → bars; map
  overhead not earned"). This guards against the "it's geographic so map it" trap.
- **Unmatched regions** → falls back to a bar chart (no forced map).

Score with the existing eval harness (`score.ts` + the LLM judge), mirroring the chart cases. An
end-to-end live proof (one real article → a published map embed) like `map-dw`'s existing `e2e-proof.md`.

## Out of scope (slice 1 — later slices)

- **Native map** (`map-native`: interactive / video) as a format option — needs an `article → choropleth
  config` mapper + a `produce-from-spec.mjs` seam (mirroring `chart-native`). Slice 1b.
- **Scrolly** as a format (`article → chapters`). Slice 2.
- **Symbol / point maps** (lat-lng) — `map-dw` supports `SymbolMapSpec`; wire after the choropleth path.
- **Basemaps beyond world-countries** (us-states, NUTS, custom GeoJSON).
- Renaming the skill directory to `suggest-visual` (cosmetic; do later to avoid breaking references).
- The mechanical confirmation gate + multi-proposal production (logged in the backlog).

## Testing

| Case | Expectation |
| --- | --- |
| Spatial gradient, normalized rate, legible countries | → `MapSpec` (map-dw); decision cites "spatial pattern is the story"; choropleth produced |
| Ranking of few regions, magnitude | → sorted `d3-bars` (NOT a map); decision cites Gate 5 |
| Absolute counts (not rates) over regions | → bar chart, or map flagged for needing normalization |
| Region identifiers with no matching basemap | → bar chart fallback (no forced map) |
| Emitted MapSpec | passes `map-dw`'s validator; title is the insight; source honest |
