# Line

## What it's for

A continuous series read against an ordered axis, almost always time, encoded as position and
joined into a single stroke that reads as one trend. It answers "how did this change" — the slope
between two points, not the size of either one. That's a different question from magnitude, and
it's the reason this type and the bar/column type inherit opposite rules about the baseline.

## When not to reach for it

A handful of periods with nothing in-between to read — eight or fewer, no real trend between the
points — is a bar/column comparison wearing a line's clothes; columns compare those magnitudes more
precisely than a slope between dots. Two variables tracking each other, where BOTH axes move (not
one value over time), is a connected scatter borrowing this type's draw-on mechanics, not a line
proper — the x-axis there is the other variable, not the calendar. Past four or five series on one
frame the lines start crossing and re-crossing until nothing is a trend anymore, only tangle; facet
into small multiples instead of stacking a fifth colour onto the same axes. And never give two
series their own, independently-scaled y-axis: a reader assumes one shared scale, so a "line went
up" on the left axis and a "line went down" on the right axis can describe the same magnitude of
change and still look like opposite stories. Index both series to a common base, or split the
frame in two.

## Where it goes wrong

Anchoring the y-axis at zero. Zero is a rule about LENGTH — bars, columns, areas, anything read by
how far a mark extends — and a line is a different instrument: it encodes change by slope, and
forcing the axis down to zero when the readings sit well above it flattens the very change the
chart exists to show. Rainfall running 604–912mm drawn on a 0–1000 scale is a gentle sag under a
headline saying it fell by a third — the chart contradicts its own claim while looking scrupulous,
which is worse than a truncation a reader can actually see. The honest scale is fitted to the
readings' own extent, rounded outward to clean numbers, with every tick labelled so the span is
stated and can't be misread; a positive series never dips below zero (that invents room that isn't
there), and a series that crosses zero always draws the zero line, because the sign change IS the
story. Don't hand-roll the padding either: an extent padded by a fixed percentage, then floored and
ceiled to a round step, then nudged again to make the tick count even, is three separately
defensible widenings that compound — on one real series running -3.4 to 84.1 they produced an axis
from -45 to 105, the readings used barely more than half the plot, and the chart lost a side-by-side
comparison against an established competitor on arithmetic alone, not on any editorial judgement.
Fit the extent and generate ticks with a scale and a tick generator; don't re-derive that math by
hand a second time next to them.

## What the drawing needs

Position along the ordered axis comes from a scale fitted to the extent, as above; each reading
projects to a point, and the points join into one continuous stroke. Nothing else about the value
is encoded — no fill under the line unless the fill itself is carrying a second, named quantity, no
marker dot at every single point crowding the stroke. The series is named where it ends: the name
and its final value sit directly at the last point, in the one accent colour, rather than in a
legend that makes the reader look away and back. Axis density is not a fixed count of ticks — it's
derived from the series' own span, so a seventy-five-year run gets decade ticks and an eleven-year
run gets ticks every couple of years — but the one real test is whether a reader can locate, on the
axis, any point the chart itself annotates or names; a "first, middle, last" tick set where the
middle tick is just the array's midpoint, not a year anyone's argument needs, fails that test even
though it has the fewest ticks on the page. A missing reading ends the run outright: no dashed
bridge spanning the hole, because a dashed line reads as a measurement nobody actually took. The
gap gets a small, muted note sitting IN the hole, centred between the two real readings on either
side of it — not pinned to the missing slot itself, which on unevenly-spaced data can sit nowhere
near the visual middle of the gap — and several consecutive missing readings collapse into one
note rather than stacking several on top of each other.

## The trap that's specific to this one

When two series finish close together, their end-labels collide — and colour is not a safe
fallback here, because a reader with a colour-vision deficiency can't use two similar hues to tell
crossing lines apart in the first place. The direct end-label is the ONLY reliable cue naming which
line is which, which means it is the one thing that must never be allowed to overlap into
illegibility. If two lines are going to land within a label's height of each other, nudge the
labels apart — up and down, not sideways off the line's actual endpoint — rather than letting them
print on top of one another and silently removing the one cue a colourblind reader had left.
