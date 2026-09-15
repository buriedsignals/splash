# Hex grid — in web

Worked example: `proof/web-hex-grid-europe-protection` (2026-09-15), from `proof/static-hex-grid-europe-protection`.
Vocabulary: `skills/map-web/assets/pool.ts` + `skills/map-web/assets/live-hex.ts`.
**The gesture**: the reader holds THE GRAIN — over how many cells a cell adds up its own numerator and its own denominator before it divides.

- **Build the grid in Web Mercator METRES, never in degrees**: one degree of latitude is not one degree of longitude on a Mercator screen, and
  a grid laid out in degrees is a grid of sheared cells. Unproject to lon/lat only to hand the seats to MapLibre.
- **Nothing moves between grains**: a cell's seat is a function of the drawn grid and of no grain, so the states are the same polygons at the
  same places with different fills — `fill-color` and `line-opacity` interpolate over the beat's own duration. The legend is IDENTICAL under
  every grain; that is this vocabulary's whole distinction from `classing.ts`, where the bounds themselves move.
- **No `radius` at all**: hexagons are `fill` and `line` layers, so `live-map.mjs`'s three radius behaviours do not apply — and the type's
  purchase is that every cell is equal on the screen, which a screen-held or ground-held circle would not give.
- **Print what Mercator costs THIS subject**: the cells are rigorously equal because they are built in Mercator metres — that is the type's
  buy — but the GROUND under them is not. Area inflates by 1/cos²(lat), so derive the northernmost seat against the southernmost on the grid
  the page really draws, and print the factor rather than burying it.
