# Ferdio / 100.datavizproject.com — visualisation #74, mirrored arc chart

- url: https://100.datavizproject.com/data-type/viz74/
- archive: datavizproject
- readAs: the visualisation's own page at 1440×900. `style.graphic.tag` is **`img`** at
  `documentTop: 172`, `nearTheTop: true`; `routes.pixel.measuredFrom: "graphic.png"`, and the
  photograph is clean — no masthead, no nav, nothing but the drawing (correction 13/15 in
  `METHOD.md`).
  `style.typeSource` is **"the page only — the graphic is a raster and carries no type this route
  can read"**, so the `stevie-sans` and `Borgia Pro` in `style.type` are
  **100.datavizproject.com's own site furniture and not the graphic's voice**. Every type
  observation below is a human reading of the raster.
- **The only one of the hundred that is this form.** All 100 thumbnails were downloaded and looked
  at on four labelled contact sheets. `#45` — split semicircles about a centre line — was the only
  other candidate and is an AREA encoding, so it belongs to the paired family, not this one.

## What it is

The archive's shared dataset — World Heritage sites in Sweden, Denmark and Norway, in 2004 and in
2022 — drawn as **three concentric arcs mirrored about a vertical axis**: 2004 growing left from
twelve o'clock, 2022 growing right. A back-to-back bar chart bent into polar coordinates. Length is
arc length, and the two halves share one origin.

## What it does with information

**The centre is a labelled axis, and the category names live in it.** `2004` and `2022` sit at the
top of the plate on either side of a short grey vertical rule, and `SE`, `DK`, `NO` sit in the gap
between the two halves, one per arc, at the arcs' shared starting point. The centre channel does
three jobs at once — it is the zero, it names the two states, and it names the three rows. Nothing
else on the plate is labelled except the six values.

**Every value sits at its arc's outer tip, in ink, unsigned.** `13` and `15` for Sweden at the two
ends of the outermost arc, `4`/`10` for Denmark, `5`/`8` for Norway. Six numbers, six tips, no axis,
no ticks, no gridlines and no radial scale of any kind. The reader gets exact numbers and a shape;
the shape is not independently measurable.

**Hue encodes the category, not the side and not the sign.** `#3274D8` at 2.529 % for Sweden,
`#EE5440` at 1.088 % for Denmark, `#283250` at 0.837 % for Norway (a navy the pixel route files
under **neutral**). The same hue runs continuously through the centre, so an arc reads as one object
crossed by an axis rather than as two bars that happen to be adjacent. This is the opposite decision
from every rectilinear reference here, where the two halves are the thing being distinguished.

**Rows are sorted by the RIGHT-hand side, descending, outermost first** — Sweden 15 on the largest
radius, Denmark 10, Norway 8 innermost. On the left-hand side that order is 13, 4, 5, so the middle
arc is the shortest one there. Sorting by the later state is a compromise: in polar coordinates the outer row has more arc
per unit and the inner row less, so putting the largest values outside makes the plate compact and
makes the three rows' lengths **not comparable to each other at all**. Only the two ends of a single
arc are honestly comparable.

**Round caps on every arc.** The tip of a bar is a semicircle, which adds roughly half a stroke width
to every value; at these magnitudes (4 to 15) that is visible.

## What it does with style

Ground `#FFFFFF` at 94.313 % — the emptiest plate in this family by a wide margin. Palette read as
**diverging**. Furniture: `#283250` 0.837 % (Norway's arc, and also the ink of the numbers),
`#0B1629` 0.139 %, `#F3F4F5` 0.043 % (the centre rule). The chromatic tail below the three fills is
antialiasing along the arcs.

Looked at (raster): a heavy geometric sans for `2004` / `2022` in the ink colour, a lighter weight at
a smaller size for `SE` / `DK` / `NO`, and the same lighter weight for the six values. Three type
sizes, one ink, and no title inside the graphic at all — the page carries `Sweden stayed the country
with the most sites` beside it in its own furniture.

## What is transferable

- **The centre channel can carry the category labels**, which frees both outer edges for values and
  removes the label column a rectilinear back-to-back chart needs.
- **Naming the two SIDES at the top of the axis** (`2004` | `2022`) is enough of a legend for a
  mirrored chart; no swatch is needed when the sides are states of the same thing.
- **One hue per row, continuous across the centre**, makes a mirrored pair read as one object. Use
  it when the story is "this row changed", and use two sign hues when the story is "these rows went
  opposite ways".
- **And the polar version costs the between-row comparison.** Three arcs at three radii encode the
  same number as three different arc lengths. The form is beautiful and it is honest only within a
  row. That is worth knowing before reaching for it.

## What was not verified

The underlying counts are Ferdio's own and were not checked. Whether the arcs are scaled by angle or
by arc length was not determined from the raster — the reading above assumes arc length, and the
distinction changes how badly the rows compare. The page's own explanatory sentence
(`This is mirrored to compare 2004 and 2022 numbers. The radia…`, truncated in `style.type`) was not
read in full. The graphic is a raster, so **nothing about its typefaces or type sizes is measured**.
One publication, and it is a design studio's exercise rather than a published finding.
