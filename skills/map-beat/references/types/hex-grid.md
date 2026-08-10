# Hex grid (spatial binning)

## What it's for

A hex-grid map answers "where is this cluster of scattered EVENTS actually
densest," by aggregating raw points — incidents, sightings, transactions —
into a regular grid of cells so the eye sees a smooth density surface instead
of an unreadable smear of thousands of overlapping dots. It trades exact
point locations for a legible pattern; that trade is the entire point of
using it.

## When not to use it, and what to use instead

Don't reach for a hex grid when the geography already has a partition the
reader recognises and cares about — administrative districts, postal codes,
countries. A choropleth on those real, nameable boundaries answers "which
district" directly; a hex grid answers only "which arbitrary cell," which a
reader can't name, can't look up, and can't connect to anything else about
that place. And don't use it on a handful of points — this type's value comes
entirely from aggregating volume, and binning a dozen points into cells
mostly just hides them behind arbitrary cell walls instead of letting the
reader see where they actually are; at that count, plot the points directly
(symbol or locator) instead.

## The one thing that goes wrong

The aggregate mode silently changes what the same shade of colour MEANS,
and the map doesn't tell the reader which mode it's in unless the legend
says so explicitly. A "count" cell says "this many events happened here"; a
"sum" cell says "this much total value accumulated here," which means a cell
with a few large-valued points can out-rank a cell with many small ones —
the visual density (how packed the original points looked) and the coloured
density (what the cell is shaded) can point in different directions under
sum or mean. The same colour on two different hex-grid maps built from the
same points can mean three unrelated things depending on a config choice
that leaves no visible trace in the image itself — the aggregate mode has to
be spelled out in the legend, every time, not left implicit.

## What the drawing needs

Points are binned into a regular tessellation — hex or square cells — built
over the points' own bounding box with a real padding margin around the
edge; skip that padding and points sitting exactly at the bbox boundary land
in the gap the tessellation leaves at its own edge and get silently dropped
from every cell, undercounting the boundary without any error. Cell size is
derived from point density to target a legible cell COUNT across the frame,
growing the cell size until the grid fits under a hard cap rather than
rendering an unbounded number of tiny cells on a dense dataset — which means
a story that hardcodes a specific cell size on the wrong dataset can
silently get a different resolution than what was configured; check the
rendered legend and cell count, not the config value, before trusting it.
Empty cells are dropped entirely rather than shown as a zero-value class,
because unlike a choropleth's country shapes, a grid built over an arbitrary
bbox has no meaningful "this cell legitimately has zero" versus "this cell
is outside the study area" distinction to draw. There is no region-name join
here — hex-grid bins raw coordinates, not data rows matched against named
shapes — so the join failure that haunts choropleth and dot-density doesn't
apply; the cell-size/aggregate-mode confusion above is what fills that slot
instead.

## The accessibility trap

Cell size and aggregate mode are both invisible from the final image alone —
no amount of colour-vision-safe ramp design tells a reader whether they're
looking at counts, sums, or means, or at what spatial resolution. The legend
needs the bin's actual numeric range printed, in the deliverable's own
number format, next to each colour class; a sequential ramp compresses
several adjacent classes toward a similar hue under a colour-vision-deficiency
simulation even when it's built correctly, so the printed number — not the
colour alone — is what actually lets a reader tell two adjacent classes
apart.
