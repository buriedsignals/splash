# Connected scatter

**Argues:** A connected scatter answers "what path did these two measures trace together, over time" — each point is ordered and the points are joined, so loops and reversals become visible shapes.

## What it is for

A connected scatter answers "what path did these two measures trace together, over time" — unlike a
plain scatter, whose points have no inherent order, here each point IS ordered (usually by time) and
the points are joined into a single path, so loops, reversals, and doubling-back all become visible
shapes instead of a static cloud. It sits between a scatter and a line: it keeps a scatter's two
continuous axes (both values matter, not one value against a calendar), but adds a line's sense of
sequence and direction.

## When NOT to use it, and what to use instead

If the order of the points doesn't matter to the story — the relationship between the two variables
is the point, not the trajectory that produced it — this is a plain scatter with an unnecessary,
distracting path drawn through it; the connecting line implies a journey that a reader will try to
read even when none was intended. And if only one of the two variables is actually changing over
time while the other is just time itself, this is a line chart wearing a scatter's axes — draw the
single measure against the calendar directly, which reads more precisely than making a reader infer
a time axis from a path's direction. Past a modest number of points the path starts crossing itself
enough times that the sequence becomes illegible; at that density, either trim to the years that
matter to the story or split into a small-multiples set of shorter path segments.

## The one thing that goes wrong

The path's order gets taken from whatever order the source rows happen to arrive in, rather than from
the actual time key — and because a scatter's axes don't visibly encode "which point came first" the
way a line chart's x-axis does, a path drawn on mis-ordered rows produces a shape that is fluent-
looking and completely wrong, with nothing on the chart itself to flag the error. The time column has
to be identified and excluded from the two plotted measures — treating it as a third data column
instead of the ordering key is the concrete version of this mistake, and it silently corrupts the
whole shape of the path, not just one point.

## What the drawing actually needs

Both axes are continuous position encodings, exactly like a plain scatter, and neither needs to
include zero — this is not a length-based type, so fitting each axis tightly to its own readings'
extent is the honest choice, not a truncation. Points stay in their true time order, never resorted by
value on either axis. A single accent colour draws the whole path, because this is one trajectory, not
a set of categorical series competing for hues — if there's a real reason to show multiple entities'
paths at once, that's several connected-scatter charts small-multipled, not one chart with several
crossing paths in different colours. The start and end points are usually the ones worth naming
directly, with their labels given enough visual separation (a light halo behind the text, most
reliably) to stay legible where the path itself crosses nearby. Both axis titles are mandatory — with
no title on either axis, a reader has no way to know which two variables are even being traced.

## The accessibility trap

Because the path is a single accent colour rather than a legend of categorical hues, there's no colour
information at risk here the way there is on a multi-series scatter — but that also means position and
direction are doing all the work, and a reader who can't easily trace a thin, self-crossing line by eye
needs the same fallback a line chart needs: keyboard-navigable points with a text-readable summary of
the sequence, not just a colour-vision-safe stroke. Missing axis titles are the concrete, checkable
failure here — a chart with two unlabelled continuous axes and a path drawn through them communicates
nothing accessibly, screen reader or not, because there is no other channel stating what is being
traced against what.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the field of links — hollow ring for before, filled disc for after, one hue, joined by a curved dotted link, and NO key for it: the convention is old enough that a reader carries it
- **Then** the subject's own move, the longest or the one the claim names
- **Then** the labels, on the LATER state only — the label belongs to the entity, and the entity's current position is where a reader looks for it; the ring carries nothing
- **Subordinate** — the two axes and their names, the ticks, and a hairline leader on any name that had to sit far from its mark
- **The claim lands on** the direction of the moves, read off the field as a whole

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- draw the link as a straight segment — that reads as interpolation, as if the source held the states in between; the bow is a fixed fraction of the chord so a long move bows more than a short one
- choose an axis pair that is degenerate: a level and its own share of the same group are the same number up to a constant, so every point of one date lands on a ray through the origin and the plate is two straight lines
- give up on a name: a name that cannot be seated degrades to a short code before it is dropped, and how many degraded is printed

## Precision to assert
- the path's drawn order matches the data's own ordering axis
- the plate refuses to render if any case moved the wrong way, if the sub-claim's set is not a minority, or if the subject did not move in the stated direction
- every size rung is tried WHOLE — laid out, scaled, packed AND named — and the first rung on which every entity is named is the one that renders

## Devices the worked example implements
- **The whole-rung ladder** — naming is part of fitting, not a step after it (`render-directions.mjs`)
- **The seat cascade** — eight directions at five distances, near first, then a degraded code, then a leader (`DirectedConnectedScatter.tsx`)
- **A bow proportional to the chord** — no arc collapses into a straight line and none reads as interpolation (`DirectedConnectedScatter.tsx`)

## Worked example

`proof/static-connected-scatter-lowcarbon` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedConnectedScatter.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type connected-scatter --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
