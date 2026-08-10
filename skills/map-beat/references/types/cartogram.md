# Cartogram

## What it's for

A cartogram answers "how big is this region's VALUE," honestly, by distorting each region's own area
to be proportional to a number — trading recognisable geography for magnitude a reader can compare at
a glance. It does something neither choropleth nor proportional-symbol can do on their own: a
choropleth keeps true shape and encodes value only in colour, which a reader reads far less precisely
than size; a proportional-symbol map adds a sized circle but leaves the underlying shapes at their real
(and often wildly unequal) areas, competing with the symbols for the reader's sense of scale. A
cartogram resolves that fight by making the shape itself the value.

## When NOT to use it, and what to use instead

Don't reach for a cartogram when readers need to be able to relocate their OWN region on the map by its
recognisable outline — a distorted shape is, by design, no longer the shape a reader has in their head,
and a story whose value comes from "find where you live and see how it compares" fights the whole
premise of this type. A choropleth (true shape, colour-only value) or a proportional-symbol map (true
shape, sized marker on top) both keep that recognisability; reach for one of those instead whenever the
map's geography, not just its data, is part of what the reader needs to keep. And don't reach for a
cartogram when a plain ranked bar chart would state the same magnitude comparison more precisely — a
cartogram earns its place specifically when the SPATIAL layout of the distorted regions still matters
to the story (neighbours, clusters, a geographic pattern in who's big and who's small), not merely as a
more decorative bar chart.

## The one thing that goes wrong

There are two real variants of this type, and conflating them is the mistake: a shape-preserving
variant scales each region's true polygon around its own centroid by a factor derived from its value,
keeping the real basemap and real relative positions underneath (non-contiguous — scaled shapes can
gap or overlap their neighbours, since this is not a diffusion-based contiguous cartogram); and a
grid variant that throws the real geography away entirely and places one uniform tile per region on an
abstract grid, keeping only relative position, not shape or true adjacency. The grid variant in
particular gives up EVERY positional reference a reader might use to relocate their own region — no
basemap, no true shape, nothing but the tile's row/column position and its label. Know, explicitly,
which variant a given map is before deciding whether a legend and a caption are enough to keep it
readable, because the grid variant needs far more compensating labelling than the shape-preserving one
does.

## What the drawing needs

Colour on a cartogram is inherited straight from a choropleth's binning logic — the same sequential or
diverging ramp, the same class boundaries, the same legend discipline — because area is carrying the
primary value here and colour is very often carrying a SECOND variable alongside it (or reinforcing the
same one). A cartogram absolutely needs a legend stating what the distorted area itself represents, not
just what the colour represents, since a reader unfamiliar with the type will otherwise assume the
shapes are still roughly true to life. On the grid variant specifically, an explicit decoder line
stating "each cell = one region, equal size; colour = value" earns its place directly in the map's own
furniture, because the grid's cells carry no size-magnitude cue of their own — only colour does, on
that variant, which is a real reduction in how much this type can say per region compared to the
shape-preserving one.

## The accessibility trap

Once a region's shape is distorted, colour becomes not just the value channel but very often the ONLY
identity channel too — there is frequently no persistent on-map text label naming each region, so a
reader has to use position and colour together to work out which shape is which, with no keyboard-
navigable fallback for a non-mouse user to relocate a specific region by name. That makes the colour
ramp's CVD-safety doubly load-bearing on this type: it is simultaneously carrying the data value and,
in practice, the only cue letting a reader tell one region's shape from its neighbour's. The
shape-preserving variant at least keeps the real basemap underneath as a positional anchor; the grid
variant has no such fallback at all, which is the sharper version of this same trap.
