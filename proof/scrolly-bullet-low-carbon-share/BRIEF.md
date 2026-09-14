---
format: scrolly
type: bullet
---

# Beat — Pologne : +17,3 points de bas-carbone depuis 2015, et toujours la seule des six sous la moitié (scrolly)

**Type:** bullet (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `bullet` type in the scrolly format, drawn once per filed direction from the same data, shares,
ranking, assertions and words as `static-bullet-low-carbon-share`.

## The choreography

The static plate is the floor — shares, ranking by change, assertions, colour rules. The scroll tells the
subject with its own gestures (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the low-carbon share of six countries on a track to 100 %; the thick pale bar is 2015: Sweden first, Poland last at 13,8 % | **reveal** | the 2015 bars along their tracks, in their 2015 order |
| 2 | the thin saturated bar is 2024, extending 2015 | **reveal** | the 2024 bars extend on from where 2015 ends |
| 3 | sorted by gain, Poland goes to the top: +17,3 points | **reorder + count** | one row at a time climbs to its place while the rows it passes step down; every gain counts up; the state names arrive on Poland's marks |
| 4 | and still the only one under half: 31,1 % in 2024, Germany next-to-last at 58,6 % | **filter** | the half ruled across the tracks, every row past it stepping back |
| 5 | narrowed to 90–100 %, the already-high three gain under a point each | **rescale** | the axis domain closes onto 90–100 %; the gains the full track flattens become visible, the two low rows step back |
| 6 | ranked by their 2024 level, the six are back in their 2015 order; no target is drawn | **reorder + pull back** | the full track again, the rows sliding back to the 2015 order |

## Precision

- **The reorder is an insertion**: the 2015 order and the order of gain are nearly each other's reverse,
  so moving every row at once — or merely staggered — piled rows on each other mid-plot. One row climbs at
  a time, the rows it passes step down one slot together; the pitch is measured with `offsetTop`, never
  on a transformed box.
- **The zoom is a domain, not a stretch**: every length is recomputed on the narrowed axis; one tick set
  shown at a time.
- **The state names are seated in the reader's own pixels**, on a line of their own when they would touch.
- **The thin bar fades in over the first stretch of its card**, so a hair of progress past the 2015 card never
  draws it at full strength over the thick one; a hair of zoom never lifts the floor past the 0 tick.
- **Every sentence is asserted**: the static plate's checks, plus the 2024 ranking equal to the 2015 one.
- **The title steps down a ladder of three forms.**

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
