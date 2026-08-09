# Connected scatter

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
