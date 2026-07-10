# Choropleth Map — per-type best practice

> Sources: data-to-viz.com (choropleth) — https://www.data-to-viz.com/graph/choropleth.html ·
> Financial Times Visual Vocabulary (SPATIAL group) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> Datawrapper Academy (choropleth / classing) — https://academy.datawrapper.de/

A choropleth encodes a **rate or normalised value** over **areal regions** by filling each region
with a colour from a ramp. The region boundary is the unit; colour is the encoding. The spatial
pattern answers "which areas rank higher / lower / diverge from average?"

## When to use

- **Use** for: a rate, share, density, index, or per-capita figure — any value that is already
  normalised for the size of the region (e.g. GDP per capita, unemployment rate, disease
  prevalence per 100 k, population density).
- **Not** for: raw counts — a count choropleth redraws population and area, not the phenomenon of
  interest. Use a **proportional symbol** for counts at locations.
- **Not** for: point data — choropleth requires data that is intrinsically bound to a region
  polygon. Geocoded point data belongs on a symbol or dot-density map.

## Encoding rules

### 1. Sequential vs diverging ramp

Sequential ramp (one-directional magnitude: light→dark or low-saturation→high-saturation) for data
with a natural zero or lower bound. Diverging ramp ONLY when the data has a meaningful midpoint —
above/below a national average, gain vs loss, positive vs negative deviation — with a neutral
(near-white or grey) centre colour. Both ramps must be CVD-safe and maintain monotonic luminance so
the progression reads in greyscale. (Source: data-to-viz choropleth; Datawrapper Academy —
diverging palettes.)

`checkChoroplethConformance` enforces: `scaleColors.length >= 3` — fewer than 3 steps cannot
render a perceptually safe ramp.

### 2. Bin count 3–7; name the classing method

Between 3 and 7 bins. Fewer than 3 hides variation; more than 7 exceeds the eye's ability to
distinguish adjacent hues. Always state the classing method in the legend or caption:

- **Quantile** — equal counts per bin, balances ink distribution across the map, but bins span
  different value ranges.
- **Equal-interval** — constant value span per bin, preserves true magnitude gaps, but can
  leave most regions in one bin when the distribution is skewed.

Classing changes the story. An unlabelled classing is an undisclosed editorial decision.
(Source: Datawrapper Academy — "What to consider when creating choropleth maps".)

### 3. No-data colour: distinct neutral grey

Regions with no data must receive a clearly distinct neutral grey — never a colour from the ramp.
Label it explicitly in the legend ("no data"). A missing region that blends into the lowest ramp
step silently implies a low value. (Source: Datawrapper Academy; data-to-viz choropleth.)

### 4. Legend required

A choropleth without a legend is undecodable — the reader cannot assign values to colours.
(Source: FT Visual Vocabulary — every encoded channel needs a key.)

`checkChoroplethConformance` enforces: `hasLegend` — the conformance guard rejects a build where
`hasLegend` is false.

### 5. Bounds and basemap fit

Frame the basemap to the regions that carry data, not the full globe or the full GeoJSON file.
A world basemap around a single-continent story wastes 80 % of the canvas and shrinks the
regions to illegibility. (Source: FT Visual Vocabulary, SPATIAL group — frame to the story.)

`checkChoroplethConformance` enforces: `boundsNonEmpty` (at least one matched region has a
non-empty bounding box) and `regionsWithData >= 1` (at least one region carries a value).

### 6. Furniture: title as insight, description, source

Every module requires a title that states the insight (not a label or year range), a description
that answers what/when/where, and a named + URL source for the data. These are editorial minimums
shared with every map type, enforced by the shared L0 (`checkGlobalMapConformance`). (Source: FT
Visual Vocabulary — every chart needs a headline, standfirst, and source.)

`checkChoroplethConformance` enforces (via `checkGlobalMapConformance`): `title` ≥ 12 characters
and not a bare year range; `description` non-empty; `source.name` and `source.url` non-empty.

### 7. Ramp hue fits the subject — never default blue

The sequential ramp's HUE carries meaning (the choropleth mirror of the chart `baseColor` rule):
**energy / electricity / solar / heat → a warm `oranges` ramp** (warm = light/power); water /
rainfall / cold / marine → `blues` (the one subject blue is right for); environment / vegetation →
`greens`; culture / politics-neutral magnitude → `purples`. A blue ramp on an energy story reads
water/cold/generic — the wrong association. The suggester sets `subject` + a subject-fit `palette`;
every single-hue sequential ramp is CVD-safe, so any fitting choice passes. (Source: FT Visual
Vocabulary — sequential ramps encode ordered magnitude by one hue; Okabe-Ito subject-fit.)

`checkPaletteConformance`'s subject branch enforces: a declared `subject` left on the library default
blue FAILS (wired at produce and in the scrolly audit).

### 8. Names come from the data, in the deliverable language; distinct takeaway

A scrolly/video map narrates region names in its beats. Those names come from the DATA (`labelField`),
in the deliverable's language (`"Éthiopie"`, `"Soudan du Sud"`) — NOT the basemap GeoJSON's
ISO/English `name` (`"Ethiopia"`, `"S. Sudan"`). The suggester emits a `labelField` column of names.
And the concluding **takeaway beat must be a DISTINCT, data-tied close** (the leader↔tail gap, e.g.
"Kenya : 75 %, Soudan du Sud : 8 % — un écart de 1 à 9"), never a verbatim repeat of the intro
description. (Source: the story is the deliverable — region names + the closer are editorial
furniture, not basemap side-effects.)

Enforced by `computeChoropleth`'s `labels` map + `deriveMapStory` (`labelField` → beat names;
`deriveTakeawayCopy` → distinct closer) and the scrolly `auditDistinctBookends` guard.

## Anti-patterns

- **Raw counts** — a count choropleth is an artefact of population and area, not the phenomenon.
  Large, sparsely populated regions dominate the eye regardless of their share of the total.
  Use a proportional symbol or normalize first.
- **Unlabelled classing** — presenting a quantile map without saying so is a silent editorial
  choice that makes two maps of the same data look incomparable. Always name it.
- **Area / projection bias** — large regions (Canada, Russia, Australia) visually dominate even
  when their values are middling. Mitigation options: switch to a proportional symbol map, or use
  a cartogram (areas rescaled to value or population). Cartogram support is deferred in v1.

## Known v1 limits

- **Cartogram deferred.** Area/projection bias cannot be corrected within the choropleth type
  in v1. A cartogram variant is a future slice.
- **Quantile only in v1 (default).** The `computeChoropleth` function uses equal-interval binning
  with a fixed span; editorial choice of quantile vs equal-interval is not yet a config knob.
- **No-data colour is fixed.** The distinct grey for unmatched regions is hardcoded; it is not
  yet user-configurable.

## Implementation pointer

This type is implemented by `skills/map-native/src/choropleth-geo.ts` (geometry joining, bin
computation, sequential / diverging ramp selection via `BLUES` / `DIVERGING` theme scales) and
`skills/map-native/src/ChoroplethMap.tsx` (static + interactive render), with
`ChoroplethStory.tsx` for the video format. All configs are guarded at render time by
`checkChoroplethConformance` in `skills/map-native/src/conformance.ts`.
