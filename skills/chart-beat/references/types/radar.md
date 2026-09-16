# Radar (spider)

**Argues:** A radar chart plots several variables as axes radiating from a shared centre, each on the SAME radial scale, with one item's readings joined into a closed polygon — so the shape of that polygon is the read.

## What it is for

A radar chart plots several variables as axes radiating from a shared centre, each on the SAME radial
scale, with one item's readings across all axes joined into a closed polygon — so the shape of that
polygon is the read: a balanced item draws a regular shape, a lopsided one draws a spiky or lobsided
one. It is for a small number of items being compared across a small number of dimensions at once,
where the eye is meant to compare overall SHAPE, not read any one axis precisely.

## When NOT to use it, and what to use instead

Radar forces every axis onto one shared scale radiating from a common centre, which only makes sense
when the axes are genuinely comparable in that way — different units on different axes, forced onto
one radius, produces a shape whose size differences are partly an artefact of unit choice, not just
the data. Parallel coordinates handle that case honestly instead, since each axis there keeps its own
independent scale. Past three items on one radar, overlapping polygons start obscuring each other and
the comparison collapses into a tangle — small multiples, one radar panel per item, keeps every shape
individually legible instead. And a radar needs at least three axes to draw a polygon at all; two
variables is a scatter plot, not a radar wearing extra decoration.

## The one thing that goes wrong

A radar's shared radial scale means every axis is implicitly asserting equal importance and equal
comparability to every other axis on the page — and that assumption breaks quietly the moment an axis
is added or reordered, because a polygon's AREA (the thing a reader's eye actually judges at a glance)
is sensitive to axis order and count in a way the underlying numbers aren't. Two items with genuinely
identical average performance can draw visibly different-sized polygons purely from which axes happen
to sit next to which, or how many axes there are relative to how spiky each item's profile is. There is
no substitute for treating axis choice and axis order as an editorial decision, not an incidental
layout detail — this is the type's structural weak point, not a bug to be fixed in code.

## What the drawing actually needs

Axes are evenly spaced around the centre — at least three of them, since fewer can't close a polygon —
sharing one radial scale from the centre (zero, or the domain's own floor) outward. Each item's
readings connect into a closed shape, one item per accent hue, capped at roughly three items on one
radar before the overlapping shapes stop being individually legible. Axis labels sit just outside the
circle's edge, one per spoke, and the shared scale's rings need at least a faint gridline and one
labelled ring so a reader has some anchor for what the radius actually means, not just a shape to
eyeball. Fill under each polygon, if used at all, needs enough transparency that a reader can still see
where two overlapping shapes diverge rather than one polygon simply hiding the one behind it.

## The accessibility trap

A hover naming which polygon belongs to which item must not paint that name in the polygon's own
accent hue on a dark tooltip background — this exact mistake has shipped on this type before, measuring
well under the WCAG text-contrast floor, fixed by rendering the name in plain white or ink and carrying
the hue instead on a small decorative swatch exempt from the text-contrast rule. Separately, and with
no mechanical guard behind it: this type has no built-in warning for the axis-order/area-distortion
problem described above, so treat every radar's axis selection and ordering as something to check by
eye against the actual numbers before publishing, not something the chart itself will catch for you.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the two polygons' shapes against each other — the read is the shape, and here the claim is that they share almost nothing
- **Then** the spoke the claim turns on, with both shares at its end
- **Then** the family grouping of the spokes, ordered by family clockwise, which is the editorial decision this type makes and hides
- **Subordinate** — the rings, the ceiling value, the key naming the two items, the spoke names
- **The claim lands on** the opposition of the two outlines, checkable spoke by spoke

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- put non-commensurable variables on the spokes — different units forced onto one radius produce a shape whose size is partly an artefact of unit choice; here every spoke is a share of the SAME denominator
- treat axis choice and axis order as an incidental layout detail: it is an editorial decision, made once from the subject and stated on the plate
- let a polygon's area be read as a quantity — area is sensitive to axis order and count in a way the numbers are not, and that is the type's structural weak point rather than a bug to fix in code

## Precision to assert
- every spoke keeps the same radial scale, and each polygon's own spokes sum to the stated whole
- the ceiling is the next round step above the largest share, stated
- the totals and the headline gap are asserted before the render

## Devices the worked example implements
- **One denominator for every spoke** — what makes the form legitimate here rather than merely available (`render-directions.mjs`)
- **Spokes ordered by family, clockwise from twelve** — the editorial decision put on the plate (`DirectedRadar.tsx`)
- **A stated ceiling** — the radial scale given a number so a shape cannot be read as a magnitude it is not (`DirectedRadar.tsx`)

## Worked example

`proof/static-radar-electricity-mix` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedRadar.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type radar --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
