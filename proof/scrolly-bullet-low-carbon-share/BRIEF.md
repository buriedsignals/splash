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
| 1 | the low-carbon share of six countries, a track to 100 % | — | six empty tracks in their 2015 order |
| 2 | the thick pale bar is 2015: Sweden first, Poland last at 13,8 % | **reveal** | the 2015 bars extend from zero |
| 3 | the thin saturated bar is 2024, extending 2015 | **reveal** | the 2024 bars extend on from where 2015 ends |
| 4 | sorted by gain, Poland goes to the top: +17,3 points, still the only one under half | **reorder + count** | one row at a time climbs to its place while the rows it passes step down; every gain counts up; the state names arrive on Poland's marks |
| 5 | narrowed to 90–100 %, the already-high three gain under a point each | **rescale** | the axis domain closes onto 90–100 %; the gains the full track flattens become visible, the two low rows step back |
| 6 | no target is drawn: 2015 is a date; two states, one hue | **pull back** | the full track again |

## Precision

- **The reorder is an insertion**: the 2015 order and the order of gain are nearly each other's reverse,
  so moving every row at once — or merely staggered — piled rows on each other mid-plot. One row climbs at
  a time, the rows it passes step down one slot together; the pitch is measured with `offsetTop`, never
  on a transformed box.
- **The zoom is a domain, not a stretch**: every length is recomputed on the narrowed axis; one tick set
  shown at a time.
- **The state names are seated in the reader's own pixels**, on a line of their own when they would touch.
- **The title steps down a ladder of three forms.**

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
