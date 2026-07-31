# map-native — exact config fields (choropleth, point/locator, symbol)

Detail for the `map-native` producer paths referenced from `skills/suggest-chart/SKILL.md`
(§ map-native interactive/video choropleth, and § map-native POINT/LOCATOR or SYMBOL path).
Read the relevant section before filling a config. **The "Map colour" rule referenced below lives
in `map-dw-spec.md`** (shared across all map producers — map-dw, map-native, scrolly).

## Contents

- [Choropleth — emitted config](#emitted-config-exact--validated-by-validatechoroplethconfig-in-map-nativesrcvalidate-configts)
- [Choropleth — field notes](#field-notes)
- [Choropleth — filters (interactive only)](#filters-interactive-maps-only--reader-exploration)
- [Point / locator config shape](#config-shape--locator-discrete-markers)
- [Symbol config shape](#config-shape--symbol-sized--valued-points)

## Choropleth (interactive / video)

**Emitted config (exact — validated by `validateChoroplethConfig` in `map-native/src/validate-config.ts`):**

```json
{
  "producer": "map-native",
  "regionKey": "<data column holding ISO-A3 codes>",
  "valueField": "<data column holding the normalised rate>",
  "labelField": "<data column holding the region NAME in the deliverable language>",
  "rows": [{ "<regionKey>": "<ISO-A3>", "<labelField>": "<region name>", "<valueField>": <number> }, "…"],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, never a label>",
  "description": "<what / when / where context>",
  "unit": "<long legend label, e.g. 'Share of renewables (%)'>",
  "valueUnit": "<short callout unit, e.g. '%'>",
  "subject": "<the topic hint, e.g. 'electricity access' — drives the subject-fit ramp>",
  "scaleType": "sequential",
  "palette": "<subject-fit registry ramp — see the Map colour rule below; NEVER default blue for a non-water subject>",
  "revealMode": "context",
  "cameraMode": "guided-tour",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```

Field notes:
- `producer`: MUST be `"map-native"` — the routing discriminator.
- `regionKey` / `valueField`: the data column names. `rows` is an **array of objects** (not CSV string).
- **`labelField` (REQUIRED when the deliverable language is not English, recommended always)**: the data
  column holding a human-readable region NAME **in the deliverable's language** (e.g. `"Éthiopie"`,
  `"Soudan du Sud"`). The narration (scrolly/video beats) uses THIS name — without it, a French map narrates
  the basemap's ENGLISH names (`"Ethiopia"`, `"S. Sudan"`), the exact defect. Put the name column in every
  row alongside the ISO-A3 code. If the data has no name column, add one with the correct-language names.
- `basemap`: `"world"` for world ISO-A3 preset (slice 1b; other presets are later scope).
- `title`: the spatial finding as a sentence — NOT a label or year range (validator enforces ≥12 chars).
- `description`: the what/when/where — required (furniture standard; a missing value is a warning).
- **`subject` + `palette`**: set BOTH (see the Map colour rule below). The produce guard FAILS a declared
  `subject` left on the default blue ramp — so a warm subject (energy) MUST carry `palette:"oranges"`, water
  keeps `"blues"`, vegetation `"greens"`. Emitting `subject` without a subject-fit `palette` blocks produce.
- `source.name` + `source.url`: required (furniture standard; missing is a warning).
- `revealMode`: `"context"` (default) — emit it explicitly. Journey/progression narratives (a route or
  ordered sequence the story deliberately walks) may set `"sequential"`; do NOT infer it heuristically —
  leave it on `"context"` unless the editorial framing is genuinely a guided journey.
- `cameraMode` (video only): `"guided-tour"` (default) — a beat-driven camera tour between the data's
  own highlights. `"simple"` — a fixed camera; the data animates in place instead. This is the
  journalist's own choice of camera style, not an inference: ask when the format is video and it
  matters to the story, otherwise leave it unset (`"guided-tour"` is the documented preference and
  today's default — validated by `validateChoroplethConfig` / `validateSymbolConfig` /
  `validateLocatorConfig` / `validateDotDensityConfig` / `validateHexGridConfig` /
  `validateCartogramConfig`, all in `map-native/src/validate-config.ts`). A `route` has no
  `cameraMode` field — its one video animation (`RouteReveal`) is not a choice.
- `unit` / `valueUnit`: **EMIT them whenever the measured quantity has a short unit (mm, %, €, t,
  hab.)** — the unit feeds the legend and the hover/caption surfaces and is part of faithful data
  representation, not decoration (same rule as the map-dw `unit` field note above). Omit only when the
  quantity truly has none.

**Filters (INTERACTIVE maps only — reader exploration).** When the format is **interactive** (Gate 2
fired) AND the data shape supports it, add a `filters` array so the reader can explore. Emit a filter
ONLY when it serves the story's exploration intent — never "all possible filters." **At most 2.** The
bar derives its values from the data; you name the FIELD, not the values. Two kinds are supported today:

```json
"filters": [
  { "kind": "category", "field": "<a categorical column, 2–8 distinct values>", "label": "<optional>" },
  { "kind": "range",    "field": "<a numeric column>", "mode": "atLeast", "label": "<optional>" }
]
```
- `category` → toggle chips (e.g. hospital type, party). `range` → a value-threshold slider
  (`mode`: `atLeast` default / `atMost` / `between`).
- **Do NOT emit `kind:"time"` yet** — the interactive time-scrub re-derivation is not wired for any map
  type, so a time filter would render a control that does nothing. A temporal story stays a **video /
  scrolly** (Gate 3/4), not an interactive time slider.
- **Do NOT emit `kind:"category"` for a dot-density map** — category filters are unsupported for
  dot-density; use a range filter on a numeric field, or drop filters entirely.
- Filters are **interactive-only**: the static PNG and the video render the default (all categories,
  full range) with no filter bar. If the format is static (`map-dw` or a static `map-native`), omit `filters`.
- `validateChoroplethConfig` rejects a bad filters block (unknown field, category cardinality outside
  2–8, non-numeric range, >2 filters) — fix any error it reports.

## Point / locator / symbol

(The coordinate-provenance HARD RULE and the point-map basemap HARD RULE stay in
`skills/suggest-chart/SKILL.md` itself — they are not repeated here.)

**Config shape — locator (discrete markers):**
```json
{
  "type": "locator",
  "markers": [
    { "lon": 2.35, "lat": 48.85, "label": "Paris", "category": "capital" }
  ],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, ≥12 chars>",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```
`category` is optional (used for a `kind:"category"` filter). Validate with `validateLocatorConfig`.

**Config shape — symbol (sized / valued points):**
```json
{
  "type": "symbol",
  "points": [
    { "lon": 2.35, "lat": 48.85, "value": 1200, "label": "Paris" }
  ],
  "basemap": "world",
  "title": "<the spatial insight — sentence case, ≥12 chars>",
  "source": { "name": "<honest source>", "url": "<URL>" }
}
```
Validate with `validateSymbolConfig`.
