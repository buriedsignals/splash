# Flow map (route — and origin-destination)

## What it's for

A flow/route map answers "what path did this take, and what did it pass
through, in order" — a ship's voyage, a migration corridor, an evacuation
route, a supply chain's journey — where the sequence of places crossed is
itself part of the claim, not just the endpoints.

## When not to use it, and what to use instead

If there's no real path — just two places being compared, with no journey
between them that the story is actually making a claim about — a route
implies a connection and a direction that isn't there; use a locator or a
pair of symbols instead, and don't let a route line invent a sense of motion
the data doesn't support. And a route is a SINGLE path with the territories
it crosses, not a many-to-many flow — trying to show trade or migration
between many origin-destination pairs on this type produces a tangle of
overlapping accent-coloured lines that stops reading as an ordered journey
the moment there's more than one of them competing for the same visual
channel; that's a different chart entirely (an OD flow diagram, not a route
map), with its own legend logic for volume and direction. THIS TOOLCHAIN NOW HOLDS A PRODUCER FOR AN
OD FLOW DIAGRAM — see "The other reading of this type" below, and
`proof/static-flow-map-ukraine-protection`, which draws one origin and thirty-one destinations as
bands whose width is the quantity. It is a DIFFERENT beat with different rules, and it does not
rescue a route map asked to carry many-to-many pairs: on a route map an origin-destination table is
still carried better by a proportional-symbol map of the total leaving each origin (or arriving at
each destination), by a matrix heatmap of origin against destination where the pairs themselves are
the claim, or by a chart of the largest corridors — and the map's geography is then a locator, not a
bundle of routes.
AND THIS TYPE HAS NO PRODUCER FOR THE WEB. A route reads on a static frame and in a video, where
the journey is revealed rather than interrogated, and both of those are built here. `map-web`
draws proportional symbols, choropleths, dot density, hex grids and locators; it holds no flow
machinery — no seed, no pure core, no live-plan builder, no interaction model — so a route asked
for as an interactive page is a route somebody has to write from nothing, off doctrine, inside a
story. Measured once, in round six: 29 defects, the highest of any beat in six rounds, and five
silent failures every one of which was found by driving the page and none by a test. The format
gate refuses the pair now rather than offering it (`storyboard/scripts/format-gate.mjs`,
`TREATMENT_FORMAT_GAPS`); if the interaction is what the story needs, the reading that carries it
is one of the three above, all of which this toolchain does produce on the web.

## The one thing that goes wrong

The order territories are crossed in gets computed wrong, and the map ends up
narrating a false itinerary. The correct order is each territory's FIRST entry
point measured as arc-length from the route's origin — with one deliberate
exception: a territory the route already starts inside gets stop zero, not
the arc-length of wherever it later exits, or a route that begins inside its
first territory would appear to enter it partway through the journey instead
of already being there. Get that ordering backwards and a "the ship went from
A, through B, through C, to D" story states crossings in the wrong sequence —
a factual error dressed as a map, not a subtle stylistic one. A route is also
one of the more likely map types to straddle the antimeridian (long-haul
paths cross it often), and the same naive-longitude-bounds mistake that
balloons a symbol map's camera to the whole globe hits a route just as hard,
just more often.

## What the drawing needs

The route line is an ordered coordinate list, projected as one continuous
path. The territories that get drawn and labelled are whichever polygons the
line GEOMETRICALLY intersects — computed, not hand-picked — because a
territory added to the legend that the line doesn't actually cross claims a
crossing that never happened, and a territory the line does cross but that
got left off the list silently drops part of the journey. Each crossed
territory gets one colour from a cycling, CVD-safe qualitative palette (an
explicit per-territory colour override always wins over the cycle), an anchor
point placed with a point-on-feature calculation rather than a plain
centroid — a centroid can land outside an oddly shaped or concave territory,
which is exactly the kind of thing nobody notices until the label is floating
in the ocean next to the country it's supposed to be inside. The route's own
accent colour — its glow, its line — is the one thing on this map that must
be basemap-aware: a route drawn in a colour close to its own basemap is
invisible, which defeats the entire point of a map whose only job is showing
where the line goes.

## The accessibility trap

An animated or revealed route must never let "hasn't happened yet" read as a
real value. The equivalent trap on a choropleth reveal is a translucent
not-yet-filled region reading LIGHTER than a real light-class value, stating
the opposite of the data; on a route the same failure shows up as a "future"
leg of the journey that's simply invisible or identical in weight to the
"already travelled" leg, so a single frame taken out of context can't tell a
reader what has and hasn't happened. The future and past portions of the path
need a visibly distinct treatment — not just presence versus absence — so the
map is honestly readable at any one instant, not only at the end.

## The other reading of this type, and a correction to the sheet above

**The paragraph above says this toolchain holds no producer for an origin-destination flow diagram.
That was true when it was written and is not true now.** `proof/static-flow-map-ukraine-protection`
draws one: a single origin, thirty-one destinations, each a band whose WIDTH is the quantity, and it
renders in all three filed directions.

The two readings are different forms and neither replaces the other:

- **A route** — one path, and the sequence of places crossed is part of the claim. Everything the
  sheet says above applies, and `proof/mapmore-flow-danube` is the artifact.
- **An origin-destination fan** — many pairs, and the claim is the DISTRIBUTION of a quantity
  between them, not the journey. Its own rules, harvested from Minard's 1862 plate: **width is the
  quantity**; **the width scale is drawn in the key, in the data's own units**; **the route is
  schematic and the basemap is furniture** — the reading line has to say the line is not an
  itinerary, because a curve on a map reads as one; **a band too thin to see is not drawn, it is
  counted**; and **a band whose destination is outside the frame is not drawn either**, because a
  ribbon leaving the plate cannot be named.

The tangle the paragraph above warns about is real, and the beat's own BRIEF records the two redraws
it took to escape it: an origin node whose circumference the bands tiled spent the DIRECTIONS on
widths and sent every ribbon looping across the map, and a camera inherited from the sibling map
beats framed the whole continent for a story that sits in its middle.


## The worked example in this tree

`proof/static-flow-map-ukraine-protection` — a **directed** beat of this type: written by hand under the doctrine, taken through a
filed direction, its six registers and the arbiter's applicable treatments, and rendered in all
three filed directions. Read its `BRIEF.md` before writing a new one: it records which of this
sheet's rules the beat spent, which it refused, and the measurement behind each refusal. It is a
worked example, not a component to import — nothing here is parameterised.
