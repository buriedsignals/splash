# Locator Map — per-type best practice

> Sources: data-to-viz.com (dot map) — https://www.data-to-viz.com/graph/map.html ·
> Financial Times Visual Vocabulary (SPATIAL group) —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> Datawrapper Academy (locator maps) — https://academy.datawrapper.de/article/locate-places-on-a-map ·
> FT editorial practice (locator / explainer maps).

A locator map answers **"where is it?"** — it situates named places on a basemap using markers and
labels. Spatial position is the only encoding; there is no magnitude, no size channel, no area shading.
The reader's takeaway is location, not quantity.

## When to use

- **Use** for: placing named points of interest — cities, sites, field offices, conflict incidents,
  event venues, election constituencies — where the editorial question is "which places, and where?"
  The map is the story; the markers are the nouns.
- **Not** for: communicating a quantity at a point location → that is a **proportional symbol map**,
  where circle area encodes a value (how much). If you find yourself sizing markers by a field, you
  need a symbol map, not a locator.
- **Not** for: rates or shares aggregated to regions (share, density, index) → that is a
  **choropleth**, where region colour encodes the rate. Locator markers have no regional boundary.
- **Decision rule (FT Visual Vocabulary, SPATIAL group):** locator = where/which; symbol = how much
  at points; choropleth = how much per area. If the word "how much" appears in your question, you are
  not in locator territory.

## Encoding rules

### 1. Labels are mandatory — every marker must have one

A marker without a label is unidentifiable. `label` is a required field on every marker; the
conformance guard (`checkLocatorConformance`) flags any marker with a missing or blank label as a
violation. This is unlike the symbol map's optional hover-only mode: a locator's only encoding is
**name + position**, and the name must be visible without interaction in static output.

### 2. Uniform marker size — no value channel

All markers render at the same size. There is no `value` field, no radius mapping, no size legend.
Any appearance of value-by-size in a locator config is a category error; move to proportional symbol.

The glyph style is set once per map via `config.markerStyle` (default: `dot`):

| Style | Description |
| --- | --- |
| `dot` | Uniform small filled circle — the compact default; works at any density |
| `pin` | Drop-pin shape — visually prominent; use for sparse, high-attention maps |
| `icon` | Per-category SVG glyph — falls back to default pin for uncategorized markers |

One `markerStyle` applies to the whole map. Mixing styles within a single map creates visual noise
that undermines the spatial reading.

### 3. Category → CVD-safe colour (optional second channel)

When markers carry a `category` field, colour differentiates them. The palette is the **Okabe-Ito**
qualitative set (CVD-safe, the same `QUALITATIVE` export reused from route-geo): categories are
sorted alphabetically, then assigned palette colours in that order — deterministic regardless of
input order.

The legend shows one swatch + category name per distinct category. When no markers carry a
`category`, no legend is shown (adding an empty legend wastes furniture space). A marker missing a
`category` while others have one gets a neutral grey (`#8a8a8a`) — this signals editorial
incompleteness rather than a distinct category.

`checkLocatorConformance` enforces: when `hasCategories` is true, at least two distinct categories
must be present — a single-category config gains no information from colour and should drop the
`category` field.

### 4. Deterministic label declutter — not silent culling

Dense locator maps produce overlapping labels. MapLibre's built-in `text-allow-overlap: false` drops
overlapping labels silently and non-deterministically (order depends on GL tile loading, which varies
across renders). The locator uses `locator-labels.placeLabels` instead: a **pure, priority-based
declutter** that runs in screen space.

How it works:

1. Markers are always drawn — no marker is ever hidden.
2. Each marker's label box (screen-space rectangle) is ranked by the marker's `priority` field
   (integer; higher = placed first). Ties are broken by label text (alphabetical) — fully
   deterministic.
3. Labels are greedily placed highest-priority first. A label is shown only if its box does not
   collide with any already-placed label.
4. Same input → same visible / hidden sets, regardless of input order or render timing.

The `priority` field is optional; omitted markers get priority 0. Editorial guidance: assign higher
priority to the most story-relevant places. The declutter is a function of projected screen boxes,
so it can be unit-tested without a map instance — see `tests/locator-labels.test.ts`.

### 5. Clustering — interactive only

When many markers cluster in a small geographic area, individual markers and labels pile up at low
zoom levels. Clustering collapses nearby markers into a count bubble that expands as the reader
zooms in. This is an **interactive-only** feature: static output cannot respond to zoom, so
clustering is disabled in static and video builds. In interactive mode clustering is enabled by
default for dense maps (> ~30 markers in the data extent) and can be toggled via config.

### 6. Map style is AI-selected

`mapStyle` is resolved by `resolveMapStyle` (same mechanism as the route map). The AI selects
`dark` or `light` based on editorial context — dense, high-contrast maps often suit dark; clean
explainers with few markers often suit light. The operator can override via `config.mapStyle`. This
is the same basemap-fit rule as every other type: the map frames the data extent via `fitBounds`,
not the world default.

### 7. Furniture: title as insight, description, source

Every locator module requires a title that states the editorial insight (not a place-name list or a
year range), a description that answers what/when/where, and a named + URL source for the data. Enforced
identically to all other type conformance guards. (Source: FT Visual Vocabulary — every chart needs a
headline, standfirst, and source.)

`checkLocatorConformance` enforces: `title` ≥ 12 characters and not a bare year range;
`description` non-empty; `source.name` and `source.url` non-empty.

## Slice A scope — what ships now vs later

**Slice A (this branch)** ships:
- Static PNG (`progress=1` render, screenshot).
- Interactive HTML (pan/zoom/hover popup, clustering on dense maps, category legend).

**Slice B (a following slice)** will add:
- Video formats (landscape, square, portrait mp4 via `LocatorStory` compositions) — requires
  `deriveLocatorStory` to define the narrative beats (zoom to cluster → expand → pan between
  categories or priority groups). These are NOT yet implemented; do not claim video works on this type.
- Interactive scrolly (step-paced prose + pinned locator map).

The static + interactive builds share `LocatorMap.tsx`; the video will add a `LocatorStory.tsx`
composition following the same harness pattern as `ChoroplethStory` / `SymbolStory`.

## Known v1 limits

- **No geocoding.** Coordinates (`lon` / `lat`) must be supplied per marker. Place-name resolution
  is out of scope in v1.
- **One markerStyle per map.** `markerStyle` is a map-level setting; per-marker style overrides
  are not supported.
- **Icon glyphs are default-pin fallback.** In `markerStyle: "icon"` mode, uncategorized markers
  (no `category` field) fall back to the default pin glyph — no custom glyph per marker in v1.
- **Clustering is interactive only.** Static and video builds always render every marker individually.
- **Video not yet implemented.** See Slice B above.

## Marker data model

```ts
interface LocatorMarker {
  lon: number;       // required — WGS-84 longitude
  lat: number;       // required — WGS-84 latitude
  label: string;     // required — the visible place name
  category?: string; // optional — groups markers by colour via Okabe-Ito palette
  note?: string;     // optional — tooltip / popup detail (interactive only)
  priority?: number; // optional — label placement priority (higher = placed first); default 0
}
```

`markerStyle` is a **map-level** field (one per config), not a per-marker field:

```jsonc
{
  "type": "locator",
  "markerStyle": "dot",  // "dot" | "pin" | "icon" — default "dot"
  "mapStyle": "dataviz-dark",
  "markers": [ … ]
}
```

## Implementation pointer

This type is implemented by `skills/map-native/src/locator-geo.ts` (geometry, category colour
assignment, bounds) and `skills/map-native/src/locator-labels.ts` (deterministic priority-based
label declutter), with `skills/map-native/src/LocatorMap.tsx` for the static + interactive renders.
Configs are validated by `validateLocatorConfig` and guarded at render time by
`checkLocatorConformance` in `skills/map-native/src/conformance.ts`.

Credits: data-to-viz.com for encoding taxonomy; FT Visual Vocabulary for the where/which vs
how-much decision rule; Datawrapper Academy for locator map editorial guidance.
