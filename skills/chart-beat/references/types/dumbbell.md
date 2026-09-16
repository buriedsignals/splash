# Dumbbell (range plot)

**Argues:** A dumbbell chart answers "how big is the gap between two values, for each of several categories, and which categories have the biggest gap" — two dots joined by a connecting line whose LENGTH is the point.

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

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the top row, because the rows are sorted by GAP, descending — the sort IS the ranking the claim makes
- **Then** the connecting bars, whose lengths are the reading; the two dots are its ends
- **Then** the small legend naming the two series' colours — load-bearing here, and the deliberate exception to this discipline's "direct end labels, not a legend", because nothing positional tells a reader which dot is which series
- **Subordinate** — the row names, the shared value scale, the ticks
- **The claim lands on** the longest bar and the shortest, at the two ends of the sorted column

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- give this type one accent plus neutrals: a dumbbell has two colour ROLES, one per series, capped at exactly two
- drop the legend as decoration — without a positional convention it is the only thing telling the reader which dot is which
- anchor the value scale at zero: the gap is the point, and zeroing compresses every gap the chart exists to show

## Precision to assert
- the drawn bar length equals the asserted computed difference for every row
- the rows' order is the computed order of gap, not a hand-kept list
- the beat throws if any category did not move in the claimed direction

## Devices the worked example implements
- **Two CVD-safe hues, capped at two** — the series pair as the only colour decision (`DumbbellLifeExpectancyGains.tsx`)
- **Rows sorted by gap, descending** — the ranking computed rather than typed (`render.mjs`)
- **A legend declared load-bearing** — the exception written down where the next beat will read it (`DirectedDumbbell.tsx`)

## Worked example

`proof/more-dumbbell-life-expectancy-gains` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedDumbbell.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type dumbbell --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
