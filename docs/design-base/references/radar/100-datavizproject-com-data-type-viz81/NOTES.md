# 100 datavizproject — #81, the three-axis radar

- url: https://100.datavizproject.com/data-type/viz81/
- archive: datavizproject
- type: radar — three spokes from one centre, one closed polygon per date
- export: static raster (`img`, 823 × 823), read at rest
- readAs: the chart card itself. `routes.pixel.measuredFrom = "graphic.png"`, and the graphic sits
  at `documentTop 172` with `nearTheTop: true`, so this is the piece and not the site's masthead.

## What it is

The one radar in the whole archive. One hundred encodings of the same Scandinavian World Heritage
dataset, and exactly one of them puts the three countries on three spokes and closes a polygon over
them. Two polygons: **2004 and 2022**, the same three axes, one shared radial scale running 0 → 15+
outward from the centre.

The axes are **entities**, not metrics. That inverts the usual football reading — there, spokes are
metrics and one polygon is one player. Here one polygon is one *year*, and a spoke is a country. It
is the same geometry serving the opposite question, and it is worth knowing the form supports both.

## What it does with information

**Every spoke is ticked and numbered, and one of them carries the numbers.** The dashed spokes run
outward with small tick marks; the labels `5`, `10`, `15` sit along them. A reader is never asked to
judge the radius by eye alone. This is the single most important thing on the plate, because a
radar with no labelled ring is a shape and not a measurement.

**The axis is named by a flag disc, not by a word.** `DK`, `NO`, `SE` are drawn as circular flag
icons parked just beyond the outer tick of each spoke. The saving is real: three words at three
angles would each need their own rotation, and the icon reads at any angle. It only works because
the reader already holds the convention, which is the same argument
`palette/references/subject-conventions.md` makes about colour.

**Neither polygon is filled.** Two closed outlines with a vertex dot on each spoke, drawn in the
same two accents the whole archive uses. Nothing is hidden behind anything: the 2004 shape sits
wholly inside the 2022 shape and both perimeters stay readable end to end.

**The edges are curved, not straight.** The polygon bows outward between vertices rather than
running the chord. A straight chord asserts that a value exists between two spokes; a bow plainly
does not. Whether Ferdio meant that is not stated on the page — it is a reading of the drawing.

**The centre is not zero and does not pretend to be.** The innermost ticks start above the hub, and
a small grey arrowhead marks the origin.

## What it does with style

Measured on `graphic.png`: ground **`#FFFFFF` at 98.53 %** — the plate is almost entirely paper,
which is what a two-polygon radar with six vertices looks like when nothing is padded. The two
accents are **`#ED5440` at 0.128 %** (hue 6.9°) and **`#3274D8` at 0.101 %** (hue 216.1°), a
diverging pair a hundred and ten degrees apart, and the classifier calls the palette
`"diverging"`. The next four chromatic entries — `#EF5D4A`, `#3B7ADA`, `#F17363`, `#F27B6B` — are
the same two hues at lower saturation, i.e. the antialiasing of one-pixel strokes, not a third
colour.

The record's neutral list holds three steps of near-white — `#D2DADC` (0.046 %), `#F2F4F5`
(0.042 %), `#FEF4F3` (0.031 %) — of which the first two are the tick and spoke furniture; the third
sits at hue 6.9° and is a tint of the red, filed as neutral only because its chroma is below the
classifier's floor. Ticks and spokes are drawn at the very bottom of the ink scale, so the two accent
perimeters carry the entire figure.

**The type in this record is the publisher's, not the graphic's.** `style.graphic.tag` is `img`,
so the style route read Ferdio's page furniture — stevie-sans at 28/700 for `#81`, Borgia Pro 18 for
the standfirst — and nothing of the lettering inside the raster. `style.marks` likewise
(`fill rgb(255,255,255)` ×31, `stroke rgb(37,97,201)` ×6) is the site's own iconography. None of it
describes the radar.

## What is transferable

- **Label the rings.** Ticks and at least three numbers along a spoke, so the radius is a quantity
  and not a vibe. This is the one thing the form cannot do without.
- **Outline, do not fill, when two shapes must both stay readable.** Two closed perimeters with
  vertex dots; the enclosed shape stays visible because nothing is painted over it.
- **Bow the edge between vertices** when there is no value between two spokes, so the connection
  reads as a link and not as interpolation.
- **Spokes can be entities and polygons can be dates.** The form is not restricted to
  metrics-as-spokes.
- **Name a spoke with an icon the reader already holds** when a rotated word would cost more than
  it returns.

## What was not verified

- **Whether the radial scale is truly shared across the three spokes.** All three carry `5 / 10 /
  15` at what look like equal radii, which is the claim; it was read off the raster by eye and
  nothing on the page states it.
- Which polygon is drawn on top. The legend orders 2004 then 2022; the z-order was not established.
- **The lettering inside the graphic was not measured.** The graphic is a raster, so no type tuple
  in this record belongs to the chart.
- **One publication.** Ferdio is one house, one designer and one dataset; nothing here corroborates
  anything, in the sense correction 4 of `METHOD.md` means.
