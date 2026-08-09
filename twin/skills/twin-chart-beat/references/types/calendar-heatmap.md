# Calendar heatmap

## What it is for

A calendar heatmap answers "when, across a real calendar, did this value run high or low" by laying
one cell per day into a fixed weekday-by-week grid and colouring each cell by its value — the same
value-to-colour idea as a matrix heatmap, but with the grid's structure fixed to the calendar itself
rather than free to be any two categorical axes. That fixed structure is the whole point: because rows
are always weekdays and columns are always weeks, a reader's eye can pick up weekly rhythm (weekends
low, Mondays high) and seasonal drift (a summer dip, a December spike) directly from the shape of the
grid, in a way a generic day-by-value list or a plain line chart of the same numbers doesn't surface as
readily.

## When NOT to use it, and what to use instead

This type needs enough days to actually read as a calendar — a couple of weeks is close to the
practical floor, and anything shorter doesn't have enough grid structure for the weekday/week rhythm to
mean anything; use a plain bar or line for a short date range instead. And it carries exactly one
quantitative variable per day — if the story needs to show more than one measure for the same dates, a
calendar heatmap can't carry the second variable without losing legibility, so either pick the one
variable the story is actually about or move to a matrix heatmap with explicit named row categories
instead of the fixed calendar grid.

## The one thing that goes wrong

Like any value-to-colour chart, the ramp must move in one luminance direction from end to end, checked
stop by stop — a rainbow or hand-picked multi-hue ramp that looks lively but doesn't darken (or
lighten) monotonically breaks the same way it would on a matrix heatmap: unreadable in greyscale, and
unreliable for a colour-vision-deficient reader, because both are effectively reading luminance, not
hue. The more specific risk on this type is a responsive one: weekday row labels have a documented
fallback (dropping to just the first and last day of the week once cells get too short to hold every
label), but month labels along the top of the grid have no equivalent fallback — on a narrow layout
they can collide with nothing catching it, which the weekday axis's own fix doesn't cover.

## What the drawing actually needs

The grid is deliberately rectangular, not square — a year's worth of days needs far more width (up to
roughly fifty-three week-columns) than height (seven weekday-rows), and forcing square cells into that
aspect ratio would leave the grid a thin, awkward band rather than filling its frame. Every cell needs
a shared sequential ramp with its min and max value stated in a legend, exactly like a matrix heatmap —
colour without a printed key is not decoded here any more than it is anywhere else. Missing days (no
recorded value) need their own distinct, clearly-not-part-of-the-ramp treatment — a hatch or a flat
neutral outside the sequential scale — so a gap in the data never gets mistaken for a real
low-but-present value sitting at the pale end of the ramp.

## The accessibility trap

On a dark canvas, exactly the same trap a matrix heatmap faces: the low-value end of a sequential ramp
can drift toward the background colour itself, because pale-toward-a-dark-ground pulls a ramp's low end
in exactly the direction that makes it disappear. Every stop in the ramp needs real, measured contrast
against the calendar's actual background — not an assumed white page — because a calendar heatmap is
frequently the densest grid of individually-meaningful cells in this whole set, and a vanishing bottom
third of the ramp here means an entire season's worth of low readings reads as blank.
