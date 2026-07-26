---
id: dot-density
engines:
  map-native: dot-density
intent: [spatial, magnitude]
shape: spatial
limits: { maxCategories: 6 }
formats: [static, interactive, video]
bestFor:
  - "absolute totals (population, emissions, cases) where the distribution within regions is the story — the dot scatter makes density visible at a glance"
notFor:
  - "normalised values (rate, share, index) — redraws population geography; use a choropleth instead"
  - "precise magnitudes — readers cannot count thousands of dots; add a label or use a proportional symbol if exact values matter"
---

# Dot-Density Map — per-type best practice

> Sources: data-to-viz.com (dot-density) — https://www.data-to-viz.com/graph/density.html ·
> Financial Times Visual Vocabulary (SPATIAL group) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> Datawrapper Academy (dot density maps) — https://academy.datawrapper.de/

A dot-density map encodes **magnitude by scattering dots inside each region** — one dot represents
N units, and the dots are placed at random (but deterministic) positions within the polygon.
The spatial pattern answers "where is the mass concentrated?" without the area-bias of a choropleth
fill, because large, sparsely populated regions naturally receive fewer dots than their area might
suggest. The unit of encoding is the dot, not the fill colour.

## When to use

| Question | Type |
| --- | --- |
| Where is the mass? (raw count, total, physical volume) | **Dot density** |
| Which areas rank higher/lower? (rate, share, per-capita) | Choropleth |
| How large is each location? (magnitude at a point) | Proportional symbol |

- **Use** for: absolute totals (population, emissions in TWh, cases) where the *distribution within
  regions* is the story. The dot scatter makes density visible at a glance.
- **Not** for: normalised values (rate, share, index). A dot-density map of unemployment rate would
  just redrawn population geography — use a choropleth instead.
- **Not** for: precise magnitudes. Readers cannot count thousands of dots; the map conveys pattern,
  not exact figures. If the exact value matters at each location, add a label or use a proportional
  symbol.

(Source: FT Visual Vocabulary — SPATIAL group; data-to-viz.com dot-density entry.)

## Two regimes

### Univariate (monochrome)

A single `valueField` drives dot allocation. All dots share one colour (defaults to the basemap's
primary accent, chosen for contrast against `mapStyle`). The legend reads "1 dot = N units".

Config signals: absence of `categories`. Example:

```json
{
  "type": "dot-density",
  "valueField": "population",
  "mapStyle": "dataviz-light"
}
```

### Multivariate (colour-by-category)

`config.categories[]` lists two or more fields, each mapped to a label and a colour from the CVD
Okabe-Ito qualitative palette (`QUALITATIVE`). For each region, dots are allocated per-category
proportional to that category's value; dots are coloured accordingly and then rendered together in
the region, producing a visual colour blend that shows the mix. The legend lists each category with
its colour swatch.

Config signals: presence of `categories`. Example (`dot-density-multi.json`):

```json
{
  "type": "dot-density",
  "categories": [
    { "field": "coal",       "label": "Coal" },
    { "field": "gas",        "label": "Natural gas" },
    { "field": "renewables", "label": "Renewables" }
  ]
}
```

Regime detection is consistent across `computeDotDensity`, `validateDotDensityConfig`, and
`checkDotDensityConformance`: `categories` present → multivariate; absent → univariate.

## Auto dotValue — targeting a readable total

`computeDotDensity` auto-derives `dotValue` (units per dot) so the map renders roughly **5 000 dots**
across all regions — a count shown to be readable at standard viewport sizes. The derivation:

1. Sum all values across all regions (and categories, in the multivariate case).
2. Divide by the target count (5 000) to get a raw quotient.
3. Round to the nearest "nice" step (1, 2, 5 × 10^k) so the legend reads cleanly ("1 dot = 50 000
   people", not "1 dot = 47 312 people").
4. Cap at a maximum that keeps the total below **10 000 dots**. If the auto-value would exceed the
   cap, `computeDotDensity` sets a flag and the conformance guard surfaces a warning.

`config.dotValue` overrides the auto-derived value. Prefer the auto-derived value unless the
editorial context requires a specific unit (e.g. "1 dot = 1 million people").

## Deterministic seeded scatter

Dots are placed by `scatterInPolygon(feature, nDots, seed)` — a rejection-sampling algorithm that:

1. Generates candidate points inside the feature's bounding box using the mulberry32 PRNG seeded
   from `seed`.
2. Tests each candidate with `booleanPointInPolygon` (Turf.js).
3. Accepts candidates until `nDots` are collected or a maximum-iteration guard is triggered.

The seed for each region × category pair is computed by `hashSeed(regionId, categoryField)` — a
deterministic integer hash. Because the seed is fixed per region+category, the same points are
generated on every render (frame-safe: safe for Remotion multi-pass rendering). Dots are computed
once on mount and memoised.

`checkDotDensityConformance` enforces: scatter completed (no partial allocation); all dots within
their polygon.

## Hover target — the region, not the dot

The interactive layer registers hover on the **region polygon**, not on individual dots. Hover
surfaces: region name, plus the total value (univariate) or per-category values (multivariate).
Individual dots are too small to reliably hit-test and carry no additional information beyond their
colour.

## mapStyle — AI-selected per context

`mapStyle` accepts `"dataviz-dark"` or `"dataviz-light"`. The implementation agent (or AI at
generation time) selects based on context:

- Dark basemap — good for high-density dot scatter: dots (often bright) pop against a near-black
  ground; the basemap recedes.
- Light basemap — better when the map must embed in a print-white editorial context, or when dots
  are dark-coloured.

The conformance guard requires `mapStyle` to be one of the two accepted values.

## Encoding rules

### 1. Legend: always state "1 dot = N units"

Without the legend, the reader cannot interpret dot density. The legend must state the unit
explicitly ("1 dot = 50 000 people"). In multivariate mode, add a colour swatch per category.
(Source: FT Visual Vocabulary — every encoded channel needs a key.)

`checkDotDensityConformance` enforces: `hasLegend`.

### 2. Dot size: legible but not crowded

Dot radius is fixed at a value that keeps dots individually legible at the top-level zoom, while
allowing regions with high density to form a visible mass. Dots must not overlap so severely that
the polygon boundary is invisible. The conformance guard checks that total dot count does not exceed
the cap (~10 000).

### 3. Basemap fit to data extent

Frame the basemap to the regions that carry data, matching the choropleth rule. A world basemap
around a European story wastes 80 % of the canvas. (Source: FT Visual Vocabulary, SPATIAL group.)

`checkDotDensityConformance` enforces: `boundsNonEmpty` and `regionsWithData >= 1`.

### 4. CVD-safe qualitative palette (multivariate only)

Dot colours in multivariate mode come from the Okabe-Ito qualitative palette (`QUALITATIVE`), which
is designed to be distinguishable under all common colour-vision deficiencies. Do not substitute
arbitrary brand colours. (Source: data-to-viz; Datawrapper Academy.)

`checkDotDensityConformance` enforces: `categoryColorsAreCvdSafe`.

### 5. Furniture: title as insight, description, source

Identical to the choropleth rule: title must state the insight (not a label or year range),
description answers what/when/where, and a named + URL source is required.
(Source: FT Visual Vocabulary — every chart needs a headline, standfirst, and source.)

`checkDotDensityConformance` enforces (via `checkGlobalMapConformance`): `title` ≥ 12 characters
and not a bare year range; `description` non-empty; `source.name` and `source.url` non-empty.

## Anti-patterns

- **Dot-density of a rate** — dot-density shows totals, not rates. Mapping "unemployment rate %" as
  dot density redraws population geography, not the phenomenon. Use a choropleth for rates.
- **Too many categories (> 6)** — more than six categories in multivariate mode exceeds the eye's
  ability to distinguish adjacent qualitative hues, even with the Okabe-Ito palette. Cap at 6;
  merge less-significant categories into "Other".
- **Non-deterministic scatter** — a PRNG without a fixed seed produces different dot positions on
  every render, which is incompatible with Remotion's multi-pass rendering and makes the map
  non-reproducible. Always seed via `hashSeed`.
- **Hover on dots** — individual dots are too small for reliable pointer interaction. Target the
  region polygon.

## Format support — all six formats shipped

| Format | Status | Notes |
| --- | --- | --- |
| Static PNG | ✓ | Via `produce.mjs … static` |
| Interactive HTML | ✓ | Pan/zoom/hover on region polygon |
| Video reveal | ✓ | Uniform dots fade in on fixed camera + title scene |
| Video storytelling | ✓ | Guided-tour camera to densest regions; dots dimmed (~0.25) except highlighted region; caption + category legend (multivariate) |
| Video scrolly | ✓ | Scroll captured as MP4; overview + takeaway visual-only; reveals carry the panel; dim-emphasis synced to the panel |
| Interactive scrolly | ✓ | `ScrollyDotDensityMap` (`skills/scrolly/src/ScrollyDotDensityMap.tsx`); `Scrolly.tsx` dispatches on `config.type === "dot-density"` |

**Slice A** (merged) shipped static + interactive. **Slice B** (this branch) shipped video reveal +
video storytelling + video scrolly + interactive scrolly.

## Densest-region story structure (`deriveDotDensityStory`)

`deriveDotDensityStory(layout, meta, opts?)` produces the canonical beat sequence for storytelling
and scrolly formats:

```
title → establish (all dots) → reveal × N (densest regions) → takeaway
```

Beat ordering: regions are ranked by **dots/area** (dot count divided by polygon area in km²),
capped at a configurable maximum reveal count. This surfaces geographic concentration — a small,
dot-dense region scores higher than a large region with the same dot count.

Each reveal beat carries:
- `caption` = region name + formatted value (e.g. "Germany — 12 400 TWh")
- Multivariate: `", mostly <dominant category>"` appended for the region's **plurality** category —
  the group with the largest dot count (no fixed threshold), e.g. "Germany — 12 400 TWh, mostly Coal".

Camera: flies to each dense region's bounding extent and dims all other dots to ~0.25 opacity
during the hold. Returns to full-extent view on the takeaway beat.

**Uniform-dot invariant in video:** dot radius is fixed at 2 px for all video formats; dots are
never value-scaled. `mapStyle` is AI-selected (`dataviz-dark` / `dataviz-light`) per context.

## Known limits

- **`dotValue` cap is not user-configurable.** The maximum-dot guard threshold is hardcoded; it is
  not yet a config knob.
- **Scatter rejects at concave polygons.** Rejection sampling converges slowly on very concave or
  thin polygons (e.g. Norway's mainland + islands). The maximum-iteration guard fires in extreme
  cases; the dot count may be slightly below the target for those regions.
- **`world` boundary preset only.** The `fr-departments`, `fr-regions`, and `us-states` presets are
  not yet connected to the dot-density geo core; they are a following boundary-preset slice.

## Implementation pointer

This type is implemented by `skills/map-native/src/dot-density-geo.ts` (scatter computation,
auto dotValue, seeded allocation, per-region/category `RegionDotSpec[]`) and
`skills/map-native/src/DotDensityMap.tsx` (static + interactive render, hover on region polygon,
univariate / multivariate legend), with validation in `skills/map-native/src/validate-config.ts`
(`validateDotDensityConfig` / `DotDensityConfigShape`) and conformance in
`skills/map-native/src/conformance.ts` (`checkDotDensityConformance`). All configs are guarded at
render time by `checkDotDensityConformance`.
