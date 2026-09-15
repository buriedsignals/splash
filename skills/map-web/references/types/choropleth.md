# Choropleth — in web

Worked example: `proof/web-choropleth-europe-lowcarbon` (2026-09-15), from `proof/static-choropleth-europe-lowcarbon`.
Vocabulary: `skills/map-web/assets/classing.ts` + `skills/map-web/assets/live-choropleth.ts`.
**The gesture**: the reader picks the CLASSING RULE, because what a choropleth hides is that the partition was a choice.

- **Draw it live, not as paths**: every region is a MapLibre `fill` and `line` layer over MapTiler's own tiles, joined
  on the tileset's own key (ISO A2 here) — no `viewBox`, so the map fills the figure's width and the ratio question stops existing.
- **No `radius` at all**: a choropleth's marks are `fill` and `line` layers, so `live-map.mjs`'s three radius behaviours do not
  apply — the mark IS the ground, which is exactly why the projection's cost lands on the datum.
- **Print what Mercator costs THIS subject**: the mark is the ground, so Web Mercator inflates the value the reader reads.
  Derive the drawn area (shoelace at the plate's own camera) against the true spherical area, set the outsized region aside,
  and put the measured factor in the caveat — never a typed number, never a quote from a sibling beat.
- **State what the architecture costs the gesture**: no stylesheet reaches a MapLibre fill, so the map's half of the re-classing
  is one `setPaintProperty` per rule, built at build time from the same index the markup carries. With script off the reader keeps
  the plate, the legend's bounds and counts under every rule, and the value table whose swatches re-shade in pure CSS. Say so on the page.
