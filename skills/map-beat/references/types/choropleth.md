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

## In video

Worked example: `proof/video-choropleth-europe-lowcarbon` (validated 2026-09-14, recut 2026-09-15). What the type keeps,
drops and changes when it is watched rather than read:

- **The basemap is vector**, Natural Earth projected in Bun and drawn in SVG, the camera a viewBox — the
  MapTiler plate stays the still's. The still's **anatomy is redrawn** on it: names in capitals, the claim's
  areas at 700, haloed in the colour of the country under the word (and the halo follows that colour as
  classes step back); an ink measured against every cell the word's line crosses, in every state it is
  seen in; a word wholly inside its country or led to it by a line and a dot; the lowest values named as
  context; seas in italic, searched in open water near their own centre, never abbreviated.
- **The ramp arrives class by class**, lowest first, and **the floor rises**: a cursor travels the key's
  bornes while every class it passes steps back to bare land and the count steps down with it. This is
  the filter as time — the one gesture a still cannot make.
- **The exception gets a close-up that measures it**: the camera travels onto it, framed on the subject's ring and
  the neighbours' names, and once it has settled each measured share counts up with a **gauge** under its words —
  one scale for all, the floor the video raised notched on it — so the exception crosses the notch and its
  neighbours visibly do not. The gauge is part of its name's box, so placement and framing account for it. No
  callout: the gauges say it.
- **Pull back to the whole**, the claim's areas named again, and **end on the map** with the source as a
  one-line credit. A map run edge to edge rarely leaves a sea corner a line wide: the credit is seated first, in
  the first row whose line crosses no studied country (outside land such as Greenland is allowed, in an ink that
  reads on sea and land), and the key hangs under it. No end card.
- What broke at validation: the first frame was the map (the title's window opened at frame 0); the title
  stayed four seconds; the key was a plated block with a unit line that hid Iceland; the close-up centred
  Albania with half the shot on the Adriatic; an end card repeated the title; the source was set at the
  axis size. A QuickTime window left open on a replaced mp4 plays black — close it before re-opening.

## The worked example in this tree

`proof/static-choropleth-europe-lowcarbon` — a **directed** beat of this type: written by hand under the doctrine, taken through a
filed direction, its six registers and the arbiter's applicable treatments, and rendered in all
three filed directions. Read its `BRIEF.md` before writing a new one: it records which of this
sheet's rules the beat spent, which it refused, and the measurement behind each refusal. It is a
worked example, not a component to import — nothing here is parameterised.
