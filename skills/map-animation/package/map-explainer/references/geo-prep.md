# Map Explainer — basemap & geo prep

How the basemap is cleaned and how `scripts/prep-geo.mjs` bakes the per-country data the component reads.

## Basemap styling — strip the clutter

On `load`, remove the basemap's labels and inner admin borders so only your geography reads:

```ts
for (const l of m.getStyle().layers as any[])
  if (l.type === "symbol" || /other border/i.test(l.id)) m.removeLayer(l.id);
```

- `type === "symbol"` → every place/water/road **label** (the "MapTiler labels"). Gone.
- `/other border/i` → dataviz-dark's **inner admin borders** are layers `'Other border'` + `'Other
  border dash'` (filter `admin_level ∈ 3..10`). Removing them drops state/province/district lines. The
  `'Country border'` (admin_level 2) and `'Disputed border'` layers are **kept** (subtle context).
- Logo/attribution: `maptilerLogo:false` + `attributionControl:false` aren't always enough — also hide
  via CSS in the component:
  ```tsx
  <style>{`.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-attrib,.maptiler-logo{display:none!important}`}</style>
  ```

## `scripts/prep-geo.mjs` → outputs

Reads a routed river GeoJSON + country polygon GeoJSONs; writes:

- **River line** — simplified for a smooth draw. (The water-wars river was OSM, Dijkstra-routed
  source→mouth through braided reaches: greedy endpoint-chaining bounces between parallel channels —
  route a graph shortest-path instead.) → `src/geo/yarlung-flow.json`.
- **`public/geo/borders.geojson`** — each country's polygon tagged `{country: name}` (one source,
  filtered per country for the fills).
- **`src/geo/country-meta.json`** — per country `{ stop, anchor, border }`.

### `stop` — when a country lights up

Walk the river points; first point inside a country (`turf.booleanPointInPolygon`) = the arc-length
fraction where the river **enters** it. Drives the trigger time. The headwaters country = 0.

### `anchor` — label centre via pole of inaccessibility

The most-interior point of the country (clipped to a per-country **story bbox** so a big country
centres in the relevant region, not its far bulge), then a small operator **nudge**. Pole = grid-sample
inside the polygon, keep the point with max distance to the boundary. **Centroids get pulled to edges —
don't use them.**

```js
const pole = (poly) => {
  const bb = turf.bbox(poly), edge = turf.polygonToLine(poly), N = 46;
  let best = null, bestD = -1;
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const p = turf.point([bb[0]+(bb[2]-bb[0])*i/N, bb[1]+(bb[3]-bb[1])*j/N]);
    if (!turf.booleanPointInPolygon(p, poly)) continue;
    const d = turf.pointToLineDistance(p, edge);
    if (d > bestD) { bestD = d; best = p.geometry.coordinates; }
  }
  return best;
};
const ANCHOR_BBOX = { china:[82,27,96,32], india:[76,14,99,31], bangladesh:[86,20,93,27] };  // story regions
const NUDGE = { china:[0,0.6], india:[-1.0,0], bangladesh:[0,-0.6] };                          // operator-directed
```

### `border` — one continuous draw

The country's exterior ring clipped to the framed bbox (`FRAME_BBOX = [76,14,104,33.5]`), then **only the
longest segment**. One continuous draw; drops stray corners (e.g. China's tiny Kashmir segment) that
otherwise animate as a confusing *second* border for the same country.

## Tuning the geo prep for a new scenario

| Want | Knob |
| --- | --- |
| Which countries | the country list in `prep-geo.mjs` (+ supply their polygon GeoJSONs) |
| Label centred in the right region | `ANCHOR_BBOX[country]` (the story bbox) |
| Nudge a label | `NUDGE[country]` (lng, lat offset) |
| What border is drawn / how much | `FRAME_BBOX` (the visible extent) |
| When each lights up | derived from `stop` — depends on the river geometry |
