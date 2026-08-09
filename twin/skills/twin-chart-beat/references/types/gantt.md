# Gantt

## What it is for

A Gantt chart draws each item as a bar spanning its own start to its own end on one shared, to-scale
time axis, one row per item — answering "when did this happen, how long did it take, and what
overlapped with what." That's a job a plain event timeline can't do: a timeline of instants can show
WHEN something happened but has no way to show DURATION or overlap between concurrent items; a Gantt
bar's length is specifically standing in for elapsed time, which is the one thing this type exists to
make visible.

## When NOT to use it, and what to use instead

If every item is actually a zero-duration event — a single date, not a span — a Gantt bar collapses to
a dot, which is the tell that this is the wrong type; use a plain event timeline instead, which doesn't
force a length encoding onto data that has no length. And a Gantt's bar length is time, never a
quantity — don't repurpose bar length here to also mean magnitude (budget, headcount); if a second
quantitative dimension needs showing, it belongs in colour or a separate encoding, not folded into a
length that's already spoken for. Past a large number of rows, a Gantt becomes a wall a reader can't
parse row by row — filter to the items the story is actually about rather than listing everything.

## The one thing that goes wrong

Every bar's end has to fall on or after its own start — an inverted span isn't a stylistic oddity, it's
a broken date pair that shouldn't render at all rather than draw backwards or silently clamp to
something plausible-looking. The subtler, easy-to-miss failure is a missing time-axis caption: because
a Gantt bar's length reads exactly like a plain bar's length at first glance, a reader with no stated
caption explaining that length here means DURATION, not magnitude, can walk away having silently
misread every bar on the chart as a value comparison instead of a time span.

## What the drawing actually needs

The time axis is a genuine to-scale time scale, not an ordinal list of periods, spanning from the
earliest start to the latest end across every row — bars are positioned and sized against that one
real scale so two bars of equal on-screen length always represent equal elapsed time. Rows sort by
start date, earliest first, so overlapping items cluster visibly rather than scattering in an arbitrary
row order. Category or status colour is capped near six distinct hues, same as any categorical mark in
this family. Long item names need a gutter sized to what's actually in the data, truncated only as a
last resort; the time-axis caption stating what a bar's length means is not optional furniture, it's
load-bearing for correct reading.

## The accessibility trap

When a category legend has to wrap onto a second line at a narrow width, the vertical space for that
wrap has to be reserved in advance, not discovered after the fact — an unreserved wrap collides the
legend into the row labels sitting above it. Beyond that, this type carries none of the label-in-mark-
colour contrast failures common elsewhere in the bar family, because a Gantt bar's own label is
typically the row's category name sitting in the row gutter, in neutral ink, rather than a value
printed inside a coloured fill — but if a value or duration label is ever added inside the bar itself,
the same real-contrast-against-the-actual-fill discipline the rest of this family uses applies here
too.
