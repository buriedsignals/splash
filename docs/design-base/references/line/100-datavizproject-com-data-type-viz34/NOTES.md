# 100 datavizproject — #34, paired triangles

- url: https://100.datavizproject.com/data-type/viz34/
- archive: datavizproject
- type: paired area marks ("mountains")
- export: static
- readAs: the encoding as the page draws it, read at rest

## What it is

The same dataset as a small multiple: one row per country, two triangles per row, one per year,
under two column headings — 2004 and 2022 — with vertical guide rules running the height of the
figure.

## What it does with information

**The year is a column, not an axis.** Two vertical guides carry the two dates down through every
row, so a reader compares within a row (change over time) or down a column (between countries)
without either comparison being privileged.

**The rows are ordered by size and the marks share one scale**, so Sweden's row reads as larger than
Denmark's at a glance while each row still tells its own before-and-after.

**Every mark prints its value**, in white, inside the triangle.

## What it does with style

House triad, white ground, thin grey guide rules that stop at the figure's own extent rather than
running edge to edge.

## What the pixel route actually measured here

`largestGraphic` returned this site's own wordmark — `logo-100.svg`, 280 x 80 at (80, 0) — which is
too small to photograph, so the pixel route fell back to the **whole page**. The ground and the
chromatic colours in this record are therefore the SITE's, not this encoding's: `#3274DA` at
8.6-10.5 % is Ferdio's fixed navigation bar, and it happens to be the same blue the charts are drawn
in, which is exactly why it read as plausible. Nothing in this note rests on that reading, and no
direction may be measured from this record.

## What is transferable

- **Turn the time dimension into columns of a small multiple** when there are few observations:
  it makes the within-series and between-series comparisons equally available, which a single
  multi-series line chart does not.
- **Let the guide rule stop at the data's extent** rather than spanning the frame.

## What is this piece's own

The triangle as the mark. It encodes by area but reads as a mountain, which is decorative here —
this is the one choice in the five that carries no information the shape does not distort.

## What was not verified

Whether the triangle's area or its height carries the value.
