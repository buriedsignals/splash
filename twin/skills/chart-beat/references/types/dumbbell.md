# Dumbbell (range plot)

## What it is for

A dumbbell chart answers "how big is the gap between two values, for each of several categories, and
which categories have the biggest gap" — one row per category, two dots (one per series) joined by a
connecting line whose LENGTH is the point. It is a slope chart rotated and de-linearised: instead of
reading direction from a tilt across a shared time axis, the reader reads the gap's size directly
from each row's own connector, and rows can be sorted by that gap so the biggest differences surface
at the top. Use it whenever the story is specifically the SIZE OF THE DIFFERENCE between two measures
per category — a before/after, a men-vs-women, a target-vs-actual — not the two values in isolation.

## When NOT to use it, and what to use instead

If the two values being compared are naturally ordered in time (an earlier reading and a later one)
and there are many categories whose DIRECTION of change matters as much as the gap's size, a slope
chart usually tells that story more clearly — a dumbbell's two dots don't distinguish "which one came
first" the way a slope's left-to-right convention does, unless you add that convention back in
through colour and a legend. If there's only one pair of values total (not per-category), this is
just two numbers — state them in text or a single annotated pair, not a chart. And if there are more
than roughly a dozen or fifteen categories, the rows stack up until individual gaps get hard to
compare — sort by gap size to help, but past a certain row count consider a scatter of gap-vs-category
instead, or trim to the categories that matter to the story.

## The one thing that goes wrong

The two dots need a visible category label AND a legend naming which series is which — lose either
and a dumbbell degrades into two colours of dot with no stated meaning. Long category labels are the
practical failure mode: this chart has, in production, shipped with literally zero reserved space for
the label column, which either truncated category names or forced a fallback to a plainer chart type
entirely, purely because nobody sized the label gutter to what the labels actually needed. The fix is
the same discipline as a slope chart's labels: measure the widest label you're about to draw and
reserve exactly that much room, wrapping onto a second line before you ever truncate — a category
name is data, and truncating it changes what the row claims to be about.

## What the drawing actually needs

Each row's two values sit on the same linear scale, one shared axis across all rows, plotted as two
dots joined by a straight connector. Like a slope, this is position encoding, not length encoding —
the value axis does NOT need to start at zero, because what matters is where each dot sits and how
far apart the pair is, not the distance from an arbitrary floor. The connector itself should read as
neutral scaffolding, not a third mark competing with the two dots — its whole job is to make the gap
visible as a length, not to carry its own meaning. Colour is capped at exactly two hues, one per
series, both colourblind-safe and reused consistently across every row so a reader learns "which dot
is which series" once and can apply it to the whole chart. Sort rows by gap size (descending, unless
the categories have their own meaningful order like geography or rank) so the chart itself surfaces
which categories differ most, rather than making the reader scan every row to find the extremes.
Value labels sit on the OUTER side of each dot — left of the left dot, right of the right dot — so
they never sit inside the gap the connector is drawing attention to.

## The accessibility trap

The two dot colours are the only thing telling a reader which series is on the left and which is on
the right, on every single row — there is no positional convention (unlike a slope chart's
consistent left-is-earlier reading) once the two series aren't tied to a time order. That makes the
two-hue cap and a legend both load-bearing, not decorative: drop either one and a row's meaning
collapses to "two dots, unknown series." And exactly like every other type in this family, value
labels belong in the page's neutral ink, never in either dot's own colour — a value label painted in
a dot's accent hue has previously failed WCAG contrast here and had to be moved off the mark's colour
entirely.
