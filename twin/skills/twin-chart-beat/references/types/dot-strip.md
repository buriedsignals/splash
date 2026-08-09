# Dot strip

## What it is for

A dot strip lays one horizontal lane per category and marks every raw observation in that category as
a dot positioned by its own value, with a small deterministic jitter and enough transparency that
overlapping points still show through each other — plus one neutral tick per lane marking that
category's mean. It is the cheap, honest way to show "here is every reading we have, by group,"
without the collision-avoidance machinery a beeswarm spends to keep points from touching: overlap here
is implied by transparency, not resolved by pushing points apart.

## When NOT to use it, and what to use instead

If two nearby points genuinely need to stay visually distinguishable rather than blending through each
other, this type's cheap jitter-plus-opacity approach isn't enough — reach for a beeswarm, which
actually simulates the layout so no two points occupy the same space. And if there's only one number
per category rather than a set of raw observations, this is the wrong type entirely: a dot strip's
whole reason to exist is showing MULTIPLE readings per lane; a single summary value per category is a
bar or lollipop's job, encoded by length from a baseline, not a lone dot on an unbounded axis.

## The one thing that goes wrong

The legend for this type is hand-built rather than drawn from the shared legend system — a mean-tick
symbol plus a sample dot, laid out by hand below the plot — and that hand-built legend's reserved
vertical space has, in production, been computed independently from where the legend actually wraps
onto a second line at narrow widths. On one real embed the legend text ran eighteen and a bit pixels
past the frame's own right edge, because the space reserved for it and the space it actually needed at
that width had quietly drifted apart. The fix that holds: one function decides both how much room to
reserve AND where the wrap happens, so the two can never disagree with each other again.

## What the drawing actually needs

Each lane gets one shared value axis running across all lanes, so categories are directly comparable
by dot position. Points get a small, deterministic jitter perpendicular to the axis — enough to reveal
overlap through transparency, not a random scatter that would make the same data look different every
time it renders. A neutral, non-accent tick marks each lane's mean, distinct in shape from the data
dots themselves so it can't be mistaken for one more observation. Every lane needs at least one
observation; an empty lane with no points at all isn't a legitimate zero-reading category, it's a
missing lane that shouldn't be drawn. All dots share a single colour — this type doesn't spend colour
on category separation, since the lanes themselves already do that job through position.

## The accessibility trap

Because dots aren't colour-coded by category — position in a labelled lane does that work — colour
itself isn't the accessibility risk here the way it is on a categorical chart. The real trap is the
hand-built legend: it has to reserve exactly the space it will use once wrapped, at every width the
chart might render at, or the mean-tick and sample-dot key can overrun the frame at the narrow end of
the responsive range, silently clipping the one piece of text that tells a reader what the neutral tick
even means.
