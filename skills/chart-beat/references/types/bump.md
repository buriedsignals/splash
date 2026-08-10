# Bump (ranking-over-time)

## What it is for

A bump chart answers "who overtook whom, and when" among several competitors ranked over multiple
periods — a league table's season, a chart's weekly top-ten, a poll's changing front-runners. Each
entity gets one line, but the line's vertical position is its RANK, not its value — position 1 always
sits at the top regardless of the underlying number — so the chart's whole job is making crossings
visible: the moment one line passes another is the finding, in a way a value-based line chart (which
would show two entities' numbers converging without necessarily swapping visual order) can't
guarantee to surface the same way.

## When NOT to use it, and what to use instead

If the actual magnitude matters — how much better, not just who's ahead — this is the wrong type; rank
position throws away the gap size entirely, flattening a landslide and a photo finish into the same
one-step move. Use a line chart on the real values instead, which keeps both the order and the size of
the gap. If there are only two time points, this is a slope chart's job, not a bump chart's — bump
earns its keep specifically across three or more periods, where crossings can happen more than once
and a reader needs to trace a line through several swaps, not just one directional tilt. And past a
handful of competing entities, the tangle of crossing lines stops being readable as individual
trajectories — reserve accent colour for the two or three lines the story is actually about and render
the rest as unlabelled background context, rather than trying to make every competitor legible at
once.

## The one thing that goes wrong

Rank has no natural zero and no shared value scale to anchor a sanity check against, which makes a
bump chart specifically vulnerable to a defect a value-based chart would catch by inspection: a
fabricated or duplicated data point that doesn't correspond to anything in the source. Because the
chart only ever shows ORDER, not magnitude, an invented rank slots into the visual field exactly as
plausibly as a real one — there is no length or position that looks obviously wrong the way a
fabricated bar height would. This is a discipline problem more than a layout one: never synthesize a
data point to smooth over a gap or a transient reading; if a period is missing for an entity, let the
line actually break there rather than inventing a rank to bridge it.

## What the drawing actually needs

Vertical position encodes rank directly — rank 1 at the top — with one evenly-spaced row per rank and
one evenly-spaced column per period; lines run left to right connecting each entity's rank at each
period. Reserve accent colour for a small number of lines the story is actually about (two or three is
plenty); every other line renders in a single neutral, unlabelled grey, the same way a gridline is
exempt from carrying meaning — trying to give every competitor its own hue defeats the purpose of
having an accent at all. Highlighted lines should draw on top of the neutral ones in z-order, and
slightly heavier in stroke weight, so a crossing between an accent line and a background line still
reads as the accent line's crossing, not a tangle. End labels name each highlighted line at its final
rank, always in the page's neutral ink rather than the line's own hue.

## The accessibility trap

A hover or tooltip naming which line is which must never paint that name in the line's own accent
colour on a dark tooltip background — a specific, previously shipped failure on this exact type
measured well under the 4.5:1 text-contrast floor. The fix that holds generally: render the name in
plain white or ink, and if the colour association still needs to travel with the tooltip, carry it on
a small decorative swatch glyph next to the name rather than on the text itself — a decorative mark is
exempt from the text-contrast rule in a way the name itself never is. End labels get the same
treatment: always neutral ink, never the line's own hue, with truncation rather than overlap when two
ranks land close together at the final period.
