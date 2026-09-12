---
format: web
type: proportional-symbol
---

# Beat — Cinq pays portent 55 % de la capacité bas-carbone européenne (web)

**Type:** proportional symbol (symbol map). **Medium/format:** map / **web**.

## Claim

**France 96 GW, Royaume-Uni 47, Espagne 39, Allemagne 33, Russie 32 — 55 % of the continent's 453 GW,
across 8 299 stations.** The beat throws if the top five do not hold more than half.

## Treatments spent

- `a-radius-is-not-read-by-eye` — circles are scaled by **area** (√ of the value), and the key gives
  **three named sizes** rather than a continuous ramp nobody can interpolate.
- `the-basemap-gives-up-its-contrast` — the coastline is a quiet step off the ground, so every symbol
  reads against it.
- `an-overlap-accumulates-rather-than-occluding` — symbols are translucent and drawn largest first,
  so a small one is never buried and an overlap reads as an overlap.

**The symbol sits at the capacity-weighted centre of a country's own stations**, not at its centroid:
a country's fleet is where its plants are, and a centroid can land in an empty mountain range.

## What the web adds

Circle area is the encoding a reader ranks and cannot measure. Every symbol answers with the country,
its GW, its share of the continent, its station count, and the water-and-atom / wind-and-sun split.

Like the choropleth, this map draws its own geometry and therefore goes through the **chart** format's
machinery; `map-web` exists for a tiled basemap this page does not use.

## Verification

`verify-web.mjs --file renders/creme.html` — **52 passed, 0 failed, 7 skipped**.

## Source

Global Power Plant Database (WRI) · Natural Earth basemap. `stations.csv` and `shapes.geojson` are
byte-for-byte copies of `proof/static-proportional-symbol-europe-capacity/`.
