# Route Map — per-type best practice

> Sources: data-to-viz.com (connection map) — https://www.data-to-viz.com/graph/connection.html ·
> Financial Times Visual Vocabulary (SPATIAL group, "flow / connection") —
> https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary ·
> Datawrapper Academy (locator / route maps) — https://academy.datawrapper.de/ ·
> Natural Earth (boundary presets) — https://www.naturalearthdata.com ·
> Turf.js docs (booleanIntersects / lineIntersect) — https://turfjs.org/docs ·
> Okabe & Ito 2008 ("Color Universal Design").

A route map encodes a **linear geographic feature** — a river, road, pipeline, migration corridor,
border segment, or supply chain — as a polyline, and simultaneously shows the **territories it
passes through**, auto-detected by intersecting the route geometry with a boundary preset. The
primary question is "what path does this take, and which places does it cross?"

## When to use

- **Use** for: a linear geographic story — following ANY path-like linear feature across space:
  a river source-to-sea, a road trip / itinerary, a trade route, a migration corridor, a pipeline,
  a flight path, a disputed border. The type is NOT river-specific (the Yarlung sample is just
  sample data) — the input is any `LineString`, and the "territories" are whatever boundary
  polygons that line crosses. The route is the protagonist; territories are supporting context.
  (Source: FT Visual Vocabulary, "flow / connection"; data-to-viz connection map.)
- **Not** for: regional magnitudes (rates, shares, densities) → use a **choropleth**, where the
  region boundary is the encoding unit and colour encodes the rate.
- **Not** for: quantities at discrete locations (counts, magnitudes at named places) → use a
  **proportional symbol** map, where symbol area encodes the value.
- **Not** for: a static list of locations with no directional or sequential relationship → use a
  simple locator or symbol map.
- **Not** for: contours / isolines (closed iso-value lines — temperature, elevation, pressure) → a
  route is an A→B path, not an iso-line. Contour/isoline maps are a distinct type (FT Visual
  Vocabulary, SPATIAL group), NOT this one.

The distinction is editorial: a route map tells a story *along* something. If the spatial narrative
is "how much / how different across areas," use a choropleth. If it is "how large at these places,"
use a symbol map. (Source: data-to-viz — chart decision tree; FT Visual Vocabulary, SPATIAL group.)

## Territory detection

Territories are **auto-detected**: `route-geo.ts` constructs a GeoJSON LineString from the route
coordinate array, then tests each feature in the boundary preset for intersection with the line
using Turf `booleanIntersects`. Matched features are ordered by the position of their **first
intersection point** along the route (Turf `lineIntersect`, sorted by distance from the route
start), so the territory list reads in spatial sequence from origin to terminus.

The `basemap` config field selects the boundary preset (e.g. `"world"` → Natural Earth
admin-0 polygons). Territory labels are anchored at the **pole of inaccessibility** of each
intersected polygon (the point furthest from any boundary edge, maximising label legibility).

## Encoding rules

### 1. Route line

The route is rendered as a **single continuous line layer** (MapLibre GL `line` type). A fixed
contrasting stroke — white or light-cyan on a dark basemap, dark-indigo on a light basemap — makes
the path legible over basemap linework without competing with the territory fills. Line width is
fixed in v1 (no data-driven width). (Source: FT Visual Vocabulary, SPATIAL group — a flow line
should read clearly against the basemap background.)

### 2. Territory fills: qualitative CVD-safe palette

Each crossed territory receives a **distinct categorical colour fill** (MapLibre GL `fill` type,
moderate opacity). Because territories carry no numerical magnitude — they are categories, not a
ramp — the palette must be **qualitative** rather than sequential or diverging. Use the
**Okabe-Ito** palette (eight distinct hues, safe for all common forms of colour-vision deficiency,
including deuteranopia and protanopia). Do not reuse a hue across adjacent territories. Fill
opacity is set below 0.5 so basemap texture remains visible through the colour. (Source:
data-to-viz — qualitative palettes; Okabe & Ito 2008, "Color Universal Design".)

`checkRouteConformance` enforces: `territories.length >= 1` (at least one territory was matched);
palette hues are drawn from the CVD-safe set; adjacent territories in route order do not share a
hue.

### 3. Territory labels

Each territory receives a **direct text label** at its pole of inaccessibility so the country or
region name is legible without hover. A white text halo (`text-halo-color #ffffff`, width ~1.6 px)
separates the label from basemap linework on any base style. Labels use `text-allow-overlap: false`
+ `text-optional: true` (MapLibre GL defaults) so tightly packed territories suppress overlapping
labels rather than pile them. (Source: FT Visual Vocabulary — every encoded element needs a name;
Datawrapper Academy — direct labeling over legends where space permits.)

In **interactive** mode the territory label layer is retained; a hover tooltip adds the full
territory name and any supplementary data. Labels and hover are complementary here (unlike symbol
maps where the tooltip replaces direct labels — see `knowledge/references/map/formats/interactive.md`).

### 4. AI-selected `mapStyle` (basemap tile style)

The basemap tile style is **chosen per the article's editorial register** — it is a capability,
not a fixed default. Two options are available:

| `mapStyle` value | Use case |
|---|---|
| `dataviz-dark` | Dramatic explainer, conflict or crisis context, night-time subject, editorial gravity |
| `dataviz-light` | Clean locator, infographic, bright editorial context, print-adjacent |

The AI (or editor) selects `mapStyle` based on the article's tone, not a convention. The route
line and territory fills are recoloured automatically to maintain contrast on whichever base is
selected. (Source: MapTiler dataviz styles; FT Visual Vocabulary — basemap tone is an editorial
choice that frames the story's register.)

Note: `basemap` (existing convention) selects the **boundary preset** used for territory detection
(e.g. `"world"`, `"europe"`, `"asia"`). `mapStyle` (new field, added in SP3a) selects the **tile
style**. These are independent config fields.

### 5. Bounded interactive navigation

In interactive builds the map viewport is initialised to the **bounding box of the route geometry**
(not the full globe). Pan and zoom are allowed freely within `clampBounds` — the same bounded-nav
discipline as the choropleth and symbol types — so the reader can explore without losing spatial
context. Zoom controls and an attribution footer are always present. (Source: `knowledge/references/map/formats/interactive.md`.)

`checkRouteConformance` enforces: `boundsNonEmpty` (the route geometry produces a non-degenerate
bounding box with at least 1° span in each axis).

### 6. Furniture: title as insight, description, source

Every module requires a title that states the insight (not a bare label), a description that
answers what/when/where, and a named + URL source for the data. These are editorial minimums shared
with every map type, enforced by the shared L0 (`checkGlobalMapConformance`). (Source: FT Visual
Vocabulary — every chart needs a headline, standfirst, and source.)

`checkRouteConformance` enforces (via `checkGlobalMapConformance`): `title` ≥ 12 characters and
not a bare year range; `description` non-empty; `source.name` and `source.url` non-empty.

## Anti-patterns

- **Choropleth confusion** — filling territories by a data value (e.g. GDP of each crossed
  country) turns the route map into a hybrid that misleads: territories are selected by the linear
  feature, not by data coverage, so the resulting colour pattern is geographically biased. If
  territory magnitude matters, add a tooltip; do not encode it as fill colour.
- **Unlabelled territories** — omitting territory names forces the reader to recognise countries
  by shape alone. This is unreliable at any zoom level. Always label.
- **Fixed `mapStyle`** — hardcoding `dataviz-dark` for every route is an anti-pattern. A river
  map in a travel piece reads better on light; a conflict corridor reads better on dark. Select per
  the article. (Source: FT Visual Vocabulary — basemap tone is editorial.)
- **Route with no territory detection** — a bare polyline with no territory fills is a locator
  line, not a route map. Territory detection and labelling are what distinguish the type.

## Known v1 limits

- **No data-driven line width.** The route line is a uniform stroke; encoding magnitude along the
  route (e.g. river discharge) would require a variable-width or graduated line — deferred.
- **Single route per module.** Multiple simultaneous routes (e.g. comparing two supply chains)
  are not supported in v1.
- **Single `LineString` — no branching / network.** The route is one continuous line; a branching
  river delta, a road network, or a `MultiLineString` is not handled (would need multi-segment
  support). A future capability.
- **No directional / magnitude-oriented flow.** The line has no arrowhead or orientation, and its
  width does not encode a volume; a true oriented flow map (A→B arrow, width = flux) is a future
  capability, not part of v1.
- **A path within a single territory degrades to a bare line.** With no *crossed* territories to
  colour or label, the "territories along the route" narrative disappears — use a plain locator/
  symbol map for a within-one-area path.
- **Territory data limited to boundary preset.** Only attributes available in the chosen Natural
  Earth preset (name, ISO code) are surfaced; arbitrary custom polygons (parks, non-administrative
  zones) and joining extra data to territories are deferred.

## Video format (shipped SP3b)

The video format for the route type is the **route-reveal** animation — `kind: "story"` with
a `route` config renders `RouteReveal` in three output sizes: landscape (16:9), square (1:1),
and portrait (9:16).

**Choreography.** The video opens with a full-screen title-card scene (no map furniture — title
only, consistent with the shared title-scene rule in `video.md`). After the title card, the route
line draws itself on from origin to terminus, led by an electric-glow head. As the line crosses
each territory boundary, that territory animates in over three sequential phases:

1. **Border draw** — the territory's outline strokes on.
2. **Fill bloom** — the territory fill expands with an overshoot ease (Disney overshoot principle
   — the fill slightly exceeds its target opacity before settling, giving the animation tactile weight).
3. **Label rise** — the territory label translates upward into its final position.

The camera holds a gentle push-in throughout the line draw, framing the full route extent with a
small margin — enough movement to give the viewer a sense of geographic scale without obscuring
the draw. (Tom Vaillant's `map-explainer` discipline — the route-draw is the primary narrative
device; the camera supports rather than competes with it.)

**mapStyle-adaptive colours.** The electric head colour is chosen to maintain contrast on the
selected basemap:

| `mapStyle` | Electric head colour |
|---|---|
| `dataviz-dark` | Icy blue (high-luminance cyan, reads against the dark tile) |
| `dataviz-light` | Deep blue (lower-luminance indigo, reads against the light tile) |

Territory fills use the Okabe-Ito qualitative palette (same as the static and interactive
formats). The AI selects `mapStyle` per the article's editorial register; the route-reveal
animation recolours automatically.

**Beat arc.** The route-reveal structure maps to Amini et al. 2015's EIPR arc: the title card
is the event beat; the line draw is the progress phase; each territory reveal is a micro-beat
within progress; the completed route with all territories filled and labelled is the resolution.

**Three sizes.** All three ratios frame the route geometry to fill the viewport without cropping.
The push-in camera and the label anchors are computed per-size so labels remain legible across
all three.

For the full camera-mode taxonomy see `knowledge/references/map/camera-modes.md` § `route-reveal`.

## Implementation pointer

This type is implemented by `skills/map-native/src/route-geo.ts` (turf intersection, territory
ordering, pole-of-inaccessibility label anchors) and `skills/map-native/src/RouteMap.tsx` (static
+ interactive render, `mapStyle` token resolution). All configs are validated by
`validateRouteConfig` and guarded at render time by `checkRouteConformance` in
`skills/map-native/src/conformance.ts`.
