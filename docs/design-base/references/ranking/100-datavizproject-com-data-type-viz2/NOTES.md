# 100 datavizproject — #2, paired dots on an arc scale

- url: https://100.datavizproject.com/data-type/viz2/
- archive: datavizproject
- type: two ranked states drawn as paired dots joined along a semicircular scale
- export: static
- readAs: the encoding as the page draws it, read at rest, in the 1440×900 page screenshot.
  The chart is a raster image inside Ferdio's own page shell, so the **style route reached the
  shell, not the chart** — the type tuples in `measured.json` (`stevie-sans`, `Borgia Pro`) are
  Ferdio's site furniture and say nothing about the graphic's own lettering.

## What it is

A semicircular scale running 0 → 20, captioned "World Heritage Sites" at its centre. Three countries
are each drawn **twice** — once for 2004, once for 2022 — as a filled dot sitting on the arc, and
the two dots of a country are joined by a thin arc in that country's own colour. The country name is
set along the curve, outside the scale, in the same colour.

## What it does with information

**The year lives inside the mark, not on an axis.** Each dot carries `'04` or `'22` reversed out of
its own fill. There is no time axis and no legend: an entry's two states are told apart by reading
the mark itself. In a ranking that compares two moments, this removes the whole lookup — no key, no
second scale, no colour spent on time.

**One scale carries both states, so an overtake is a crossing you can see.** The coral pair starts
lower along the arc than the navy pair and ends higher; the crossing is the picture's subject and it
is legible without any annotation, because both states of both entities are on the same scale.

**The connector is the change.** The arc between an entry's two dots is the only mark that encodes
movement — its length is the size of the move, its direction along the scale is the sign.

## What it does with style

Ground: the pixel route read the **page**, not the chart — `#F4F7F7` at 44.81 % coverage with
`#FFFFFF` at 42.50 %. The pale grey is the page and the white is the chart card; no graphic element
was isolated (`routes.pixel.measuredFrom` is `screenshot.png`), so the chart's own ground was not
measured separately. The dominant chromatic, `#3274DA` at 8.57 %, is the site's blue navigation bar,
not the graphic. The chart's own coral reads as `#EE5440` (0.087 %) with a paler `#EC978B`
(0.026 %). The palette's shape was read as `sequential`.

The scale itself is drawn as a pale segmented band — ticks are gaps in a grey ribbon rather than
lines — so the scale recedes and the six dots are the only saturated ink.

## What is transferable

- **Set the state label inside the mark** when a ranking compares two moments. Two dots per entity
  and a year inside each is cheaper than a legend and cheaper than a second axis.
- **Put both states on one scale** so an overtake reads as a crossing rather than as two numbers.
- **Let the connector be the only encoding of change**, so the marks stay at their true positions.

## What is this piece's own

The arc. A semicircle is a worse position scale than a straight one — equal steps subtend equal
angles but read as unequal lengths near the poles — and the piece is one of a hundred deliberate
variations on a single dataset, not a recommendation. Also Ferdio's coral-and-blue pair.

## What was not verified

The graphic's own typography, at any size or weight: the style route measured the page shell only.
The scale's exact values for any country — the positions were read off the picture and no number is
asserted here. Whether the piece is interactive at all.
