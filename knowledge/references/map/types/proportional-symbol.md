# Proportional Symbol Map — per-type best practice

> Sources: data-to-viz.com (bubble map) — https://www.data-to-viz.com/graph/bubblemap.html ·
> Financial Times Visual Vocabulary (SPATIAL group) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> Datawrapper Academy (symbol maps) — https://academy.datawrapper.de/article/symbol-map ·
> NYT / FT editorial practice (nested-circle legend).

A proportional symbol map encodes **quantities at specific point locations** by scaling a circle's
**area** to the value. The spatial position is the primary encoding (where it is); size is the
secondary encoding (how much). The map background is context, not encoding.

## When to use

- **Use** for: counts or magnitudes tied to a discrete location — city populations, earthquake
  magnitudes, funding amounts by office, reported cases by hospital, deaths by district centroid.
  The question is "how much, and where?" at named places.
- **Not** for: rates over areal units (share, density, index) → that is a **choropleth**, where
  the region boundary is the unit and colour encodes the rate. Do not use a symbol map when your
  data is already aggregated to regions with no meaningful point coordinate.
- **Not** for: flows between locations → use a flow / OD map.

## Encoding rules

### 1. Area-proportional sizing — never radius-proportional

Map value to circle **area**, so `r ∝ √value`. Mapping directly to radius exaggerates large
values quadratically: a city twice as large gets a circle four times as big, a severe graphical
lie. (Source: data-to-viz "bubble map"; FT Visual Vocabulary, SPATIAL group.)

`checkSymbolConformance` enforces: `sizingMode` must be `"area"`; any other value is a violation.

### 2. Descending z-order + semi-transparent fill + contrasting stroke halo

Render symbols largest-first (descending sort) so large circles are behind smaller ones rather than
obscuring them. Apply a semi-transparent fill (α ≈ 0.5–0.7) so overlapping symbols remain
distinguishable. Add a contrasting stroke — typically white on a dark basemap — to create a halo
that visually separates adjacent and overlapping symbols from each other and from the basemap
linework. (Source: Datawrapper Academy, symbol maps.)

`checkSymbolConformance` enforces: `strokeContrast` must be ≥ 2 (WCAG ratio between stroke colour
and basemap background); below 2 the halo is too faint to separate symbols.

### 3. Nested-circle legend with 2–3 "nice" reference values

Readers cannot decode absolute values from size alone; a reference legend is mandatory. Use
**nested circles** (Dorling / Flannery convention): two or three representative circles drawn at
their true scale, annotated with the corresponding value. Values must be "nice" (round numbers
that fall at meaningful quantiles of the distribution, not raw min/max). Minimum two reference
circles: one for a small value, one for the largest or a near-maximum. (Source: data-to-viz bubble
map; NYT / FT editorial practice.)

`checkSymbolConformance` enforces: `hasLegend` must be `true` (size is undecodable without it);
`legendStops` must be ≥ 2 (a single reference circle gives no scale to interpolate from).

### 4. Single hue (size is the primary channel; colour is deferred)

Use one hue for all symbols. Colour can carry a second data dimension (e.g. category of location)
but only when that second dimension is editorially essential and the palette is CVD-safe. In v1 the
implementation is monochrome: hue is fixed in config and not data-driven. Adding a colour channel
before the size encoding is fully legible dilutes both.

### 5. Bounded maximum symbol size

The largest symbol must not exceed a defined fraction of the smaller viewport dimension. When a
single circle fills a quarter of the map, the spatial pattern (relative sizes across locations)
collapses into a single dominant blob; the comparative purpose of the chart is lost. (Source: FT
Visual Vocabulary, SPATIAL group — symbol maps require a bounded scale.)

`checkSymbolConformance` enforces: `maxRadiusPx` must be ≤ `viewportMinPx × 0.25`
(`SYMBOL_MAX_VIEWPORT_FRACTION = 0.25`). Beyond this the largest symbol swallows the map.

### 6. Direct labeling — name + value + unit on every symbol

Each symbol must carry its place name, value, **and unit** as a direct label so the data is legible **without hover**. A size legend gives the scale; it does not substitute for values. A value without its unit is ambiguous — "296" could be millions, billions, or an index. (Source: FT Visual Vocabulary — every data point should be readable; NYT direct-labeling practice; data-to-viz bubble map — "add labels for key points".)

Implementation: a MapLibre GL `symbol`-type layer renders a two-line "City\nValue$unit" label (or just the "Value$unit" when the symbol has no name) positioned just below each circle. A white text halo (`text-halo-color #ffffff`, `text-halo-width ~1.6`) ensures legibility over basemap linework in all lighting. `text-allow-overlap: false` + `text-optional: true` give free anti-collision: labels for densely-packed small symbols are auto-hidden rather than piled on top of each other.

For maps with many tightly-clustered points, label all symbols and let the GL anti-collision engine suppress overlapping labels — only editorially-annotated callouts should override suppression. The dense-map case (> ~30 points in a tight bounding box) is a deferred limit where manual annotation or a zoom interaction replaces batch labeling.

`checkSymbolConformance` enforces:
- `labeled` must be `true`; when `false` the violation is `"symbols are not directly labeled — values are undecodable without hover"`.
- When `valueUnit` is set, `labelHasUnit` must be `true`; when `false` the violation is `"labelled value omits its unit … — a directly-labelled value must state its unit"`.

In **interactive** mode the `symbol-labels` layer is omitted entirely; the hover popup delivers name + value + unit instead (tooltip XOR labels — see `knowledge/references/map/formats/interactive.md`).

**Producer: map-native is the only producer for a symbol map.** Datawrapper (`map-dw`) draws its
proportional circles with values on HOVER only and offers no "label symbols by column" option (verified
against the Datawrapper Academy "Customizing your symbol map" docs), so a `map-dw` symbol map's owned
static PNG ships mute, unlabeled circles that cannot carry the claim without interaction. `map-dw`'s
`validateMapSpec` therefore **rejects** a symbol spec and routes it here. Any valued point map — symbol,
proportional, or dot — is produced by `map-native`, whose direct labels (rule 6) make the static export
legible. (`map-dw` covers choropleth + wide locator only.)

### 7. Furniture: title as insight, description, source

Every module requires a title that states the insight (not a label or year range), a description
that answers what/when/where, and a named + URL source for the data. These are editorial minimums
shared with every map type, enforced identically to the choropleth conformance guard. (Source:
FT Visual Vocabulary — every chart needs a headline, standfirst, and source.)

`checkSymbolConformance` enforces: `title` ≥ 12 characters and not a bare year range;
`description` non-empty; `source.name` and `source.url` non-empty.

## Known v1 limits

- **No geocoding.** Coordinates must be supplied in the config (`lon` / `lat` per point). Place-name
  resolution is out of scope in v1.
- **No de-overlap / dodge.** Dense clusters of small values will still overlap. The descending sort
  + halo mitigates reading loss but does not reposition symbols.
- **Monochrome only.** Colour as a second data channel is reserved for a future pass.
- **VIDEO format has no baked size legend.** The nested-circle legend is rendered in static and
  interactive builds only. In the video (`SymbolStory.tsx`) direct name+value labels are present
  and fade in with the reveal; the size legend is omitted in v1.

## Implementation pointer

This type is implemented by `skills/map-native/src/symbol-geo.ts` (geometry and sizing logic) and
`skills/map-native/src/SymbolMap.tsx` (static + interactive render), with `SymbolStory.tsx` for
the video format. All configs are validated by `validateSymbolConfig` and guarded at render time
by `checkSymbolConformance` in `skills/map-native/src/conformance.ts`.
