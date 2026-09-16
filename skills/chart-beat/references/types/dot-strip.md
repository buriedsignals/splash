# Dot strip

**Argues:** A dot strip lays one horizontal lane per category and marks every raw observation in that category as a dot positioned by its own value, with a small deterministic jitter and a neutral tick at the category's mean.

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

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the SHAPE of each field — where it starts, where it ends, where it bunches; that shape is the claim, and no other paired form in this tree lets a reader see a distribution move
- **Then** the two extremes, named, because they are what the claim measures
- **Then** the leaders joining a category to itself across the lanes, the only line on the plate
- **Subordinate** — the lane rules, the shared ticks, the mean ticks
- **The claim lands on** the distance between the two lanes' floors against the distance between their ceilings

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-let-dot-move` — let a dot move to avoid an overlap without the move being visible as declared jitter — a silent nudge is a value moved
- `no-give-lanes-different` — give the two lanes different scales, or recolour a dot between them: a dot is the same category twice
- `no-summarise` — summarise: this is the one lossless distribution in the catalogue, and a box or a bin gives away what it is for

## Precision to assert
- one scale for both lanes over the full domain
- the plate refuses to render if the floor did not rise far while the ceiling barely moved, if the spread did not close by more than the stated fraction, or if the subject is not the category that actually was the extreme
- the floor, the ceiling, the spread and the median are all computed from the frozen file

## Devices the worked example implements
- **Leaders joining a category to itself** — what stops the two lanes reading as two populations (`DirectedDotStrips.tsx`)
- **Chips stacked into rows, never sideways** — separation paid for across the lane, never along the axis (`DirectedDotStrips.tsx`)
- **Three refusals on the shape of the move** — the claim's own geometry asserted before the render (`render-directions.mjs`)

## Worked example

`proof/static-dot-strip-lowcarbon-spread` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedDotStrips.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type dot-strip --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
