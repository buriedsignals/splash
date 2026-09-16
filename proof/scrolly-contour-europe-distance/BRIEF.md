---
format: scrolly
type: contour
medium: map
grounding: supported
---

# Beat — La moitié de l'Europe est à moins de 132 km de la mer, et aucun point à plus de 682 km (scrolly)

**Type:** contour / isoline (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `contour / isoline` type in the scrolly format, drawn once per filed direction from the same field, study
area, claim and assertions as `static-contour-europe-distance`. Each direction keeps its own palette and faces.

## The choreography

A contour map measures everywhere; the scroll makes that measurement happen in front of the reader
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | every point of the land is some distance from the sea | — | the land, bare; the sea is the ground |
| 2 | from every coast at once: at 100 km, 42 % of Europe | **sweep + count** | a fill advances inland from every coast, its front drawn as an edge; the 100 km line left where it passed; "42 % des terres à moins de 100 km" counts with it |
| 3 | at 132 km, half | **sweep + name** | the front reaches the median; its line drawn in the accent, the 100 km line giving way to it |
| 4 | at 400 km, 89 %; two islands left | **sweep + count** | the 200, 300 and 400 km lines left behind; two untouched islands remain |
| 5 | the last point reached, in Belarus, 682 km from the sea | **zoom + trace** | the camera closes onto the last land while the fill closes over it; the summit marked with its number |
| 6 | the plate's reading line | **pull back** | the fill withdraws; every line with its number, the summit marked |

## Precision

- **One projection for everything drawn.** The static plate measures in Lambert equal-area and draws on a
  Web Mercator raster; its summit mark is placed in the first and its lines in the second. This page draws
  the land as Natural Earth vectors in the measuring projection itself, so the fill, the lines, the land and
  the summit are placed by one transform. The numbers are unchanged, and the runner checks them: median
  132 km, deepest 682 km in Belarus, 42 % within 100 km, 50 % within 132, 89 % within 400.
- **The sweep is the field itself**, sent to the page as one byte per 6 km cell (3 km steps, gzipped,
  76 KB) and thresholded on each paint. The canvas sits under an SVG that paints the sea as the frame minus
  every land ring, so the 6 km cells never show a staircase on the water.
- **Every number is on its own line and never across another.** Label seats are computed in node with the
  room a horizontal number has against every other level's lines; the page takes only the lines currently
  drawn, the median first, then the innermost line outwards, spread apart. A line within 50 km of the median
  gives way to it: at the scale of Europe the two run a few pixels apart and neither could carry its number.
- **The close-up centres the summit**, both ways.
- **Land rings are clipped, not clamped**, to the margin past the frame: Russia runs on to the Pacific, and a
  ring clamped onto the margin folds into a polygon that covers Western Europe.
- **The land step is measured**: the static plate's 0.085 of the ink is the floor, raised until land and sea
  clear `SEA_LAND_MIN` (on `nocturne`'s navy the floor alone left the coast unreadable). Every line and number
  is floored against both the bare land and the fill.
- **Batch pass (2026-09-16)**: all three directions baked and rendered. `verify-scrolly.mjs` refused all
  three at first — `c.handle.map` read on a null handle when no key is in the page (`contour-drive.mjs`
  never guarded `c.handle` itself the way the sibling maps do) — fixed to check `c.handle` first. Now clean.
  `verify-live-map-scrolly.mjs`'s bare-canvas sample flags most of the mobile stage on every card but the
  close-up; a screenshot of the same card shows ordinary land, so this reads as the guard's tight colour
  threshold catching this beat's own deliberately subtle land/sea step (`SEA_LAND_MIN`), not a blank canvas —
  left as observed, not changed, since fixing the shared guard's threshold is outside this beat. Swap check
  on `creme` clean at both viewports (labels only).

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
