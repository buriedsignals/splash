# Cartogram — in web

Worked example: `proof/web-cartogram-europe-lowcarbon` (2026-09-15), from `proof/static-cartogram-europe-lowcarbon`.
Vocabulary: `skills/map-web/assets/restore.ts`.
**The gesture**: the reader PUTS THE GEOGRAPHY BACK, one sacrifice at a time — first the place each unit really occupies, then the size it really weighs — and watches the headline figure move from the by-country number to the by-area one.

- **THIS ONE IS NOT A LIVE MAP, and the sheet says so rather than pretending.** There is no basemap and no geography to tile: the cells are the
  whole picture, drawn as SVG through the design base. So there is no MapTiler plan, no plate, no fallback image, no `bake.mjs`, and none of
  `live-map.mjs`'s three radius behaviours is in play — a cell is not a circle, a `camera`/`ground`/`fixed` choice does not arise. The other
  seven map types in this tree promise a place does not move; the cartogram is the named exception, which is why its gesture can be the movement.
- **Hand the sacrifice back in separable pieces, in argument order**: one cell per unit as filed → each cell relaxed towards its true centroid
  (the place given back, and the figure does not move a thousandth) → each cell at its true area, relaxed the same way (which lands on the
  choropleth's own figure, because this IS the choropleth, in squares).
- **Relax, never pile**: squares on their true centroids overlap catastrophically, and a well-drawn pile is still a pile. Keep each cell's area
  EXACTLY (assert side²/Σside² against the declared share to 1e-9) and move only the centres, by the smallest push that separates them.
- **Print the price of the relaxation**: every stage states the gap it leaves, worst and median, as a share of the map's width, and every cell
  answers with its own — and compares it against the hand-drawn tile grid, which charges the same price silently and charges more of it.
- **Mercator still has to be answered, on this type by absence**: the beat carries no Mercator drawing at all, so what it owes the reader is the
  statement that area here is a decision and not a fact about the earth — the projection's cost is exactly what the type has chosen to stop paying.
