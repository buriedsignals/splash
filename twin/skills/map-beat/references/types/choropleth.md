# Choropleth

## What it's for

A choropleth answers "which of these named regions is proportionally worse or
better off," where the regions are a partition the reader already recognises —
countries, states, districts. It is the type for a rate, a share, an intensity
per unit of something. It is not the type for "which region has the most" in
absolute terms; that question belongs to a different mark entirely.

## When not to use it, and what to use instead

Never shade a choropleth by a raw COUNT — population, total cases, total
votes — when the honest quantity is a RATE. A big, sparsely populated region
and a small, dense one can carry the same count, but the choropleth paints the
big one darker just because it has more area to be big in. The reader reads
area as importance; a count-choropleth is lying about that on the first
glance, before any number is read. If the story's number is a total and not a
rate, use graduated (proportional) symbols placed at each region's centroid
instead — size encodes the total honestly, without area doing uninvited work.
Also don't reach for a choropleth when there's no real regional partition to
begin with (scattered point events, not administrative areas) — that's
dot-density or hex-grid, which aggregate points instead of pretending points
are areas.

## The one thing that goes wrong

The join between the data rows and the region shapes fails SILENTLY, and nothing
about the rendered map announces it. A region whose key doesn't match the data
just renders as no-data — a legitimate class already on the legend, in a shade
a reader accepts without a second thought. Natural Earth's `ISO_A3` property is
not reliably the real ISO A3 code: France, Norway and Kosovo carry the
placeholder `"-99"` in that field, so joining on `ISO_A3` silently drops France
off a world map (the fix is joining on `ADM0_A3` instead). Kosovo compounds it:
Our World in Data codes it `OWID_KOS`, Natural Earth codes it `KOS` — an
un-aliased Kosovo renders hatched-out on every European map built from both
sources, forever, until someone notices the wrong country missing. Treat a join
that can silently drop a real region as a defect that must throw, loudly, at
build time — never soften a failed join into a quiet no-data class.

## What the drawing needs

Value maps to fill colour through a small number of classes (five is a
reasonable default), not a raw continuous gradient — classing is what makes
"which regions are in the worst bracket" answerable at a glance instead of
requiring pixel-perfect colour discrimination. A sequential scale (low→high,
one hue lightening or darkening) is for a quantity with no natural zero-ish
midpoint; a diverging scale (two hues meeting at a stated midpoint) is only
honest when there's a real reference point the data crosses — a national
average, a zero change, a policy threshold — and that midpoint has to be
declared explicitly, not left to whatever the min/max happen to produce.
Multi-polygon countries need care in framing: a country whose shape bundles
far-flung overseas pieces (Norway with Svalbard, France with French Guiana and
Réunion) will bbox-frame to nearly the whole world if you take the whole
MultiPolygon's extent — frame on the mainland ring only. And a hover or
direct-label naming a region should read the region's name from the DATA, in
the deliverable's own language, not from the basemap's shape file — a French
map that pops up "Ethiopia" instead of "Éthiopie" because the label came from
an English basemap property is the same class of silent mismatch as the join
itself, just in the furniture instead of the fill.

## The accessibility trap

The colour ramp is the one legitimate gradient on this map — it is carrying a
real quantity, and it is the only mark on the page allowed to. That means
nothing else on the choropleth may borrow that gradient for decoration, and it
also means the ramp alone cannot be the only way a value is conveyed: the
legend needs the actual bin boundaries printed as numbers, not just colour
swatches, so a reader who can't reliably discriminate the ramp's steps still
gets the value from the label. A diverging ramp is the sharper trap — two hues
either side of a midpoint must stay distinguishable from each other under a
colour-vision deficiency simulation, not just distinguishable from white or
grey, or the two directions of the story (better than the reference vs. worse
than it) collapse into the same colour for a meaningful fraction of readers.
