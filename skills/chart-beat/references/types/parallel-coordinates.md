# Parallel coordinates

**Argues:** Parallel coordinates lay several variables out as parallel vertical axes, each keeping its own scale, with one item drawn as a polyline crossing every axis in turn — so the crossing pattern reveals trade-offs a table hides.

## What it is for

Parallel coordinates lay several variables out as parallel vertical axes, each keeping its OWN
independent scale, with one item drawn as a single polyline crossing every axis in turn — so the
crossing pattern of many items' lines reveals trade-offs a table of the same numbers hides: an item
that's high on one axis and low on the next shows up as a visibly steep diagonal, and a cluster of
similarly-shaped items shows up as a bundle of near-parallel lines. This is the type for comparing many
items across several (three to eight or so) dimensions at once where each axis genuinely has its own
unit and range — a job radar can't do honestly (radar forces every axis onto one shared scale) and
small multiples can't do at all (faceting loses the connective line that ties one item's values
together across dimensions).

## When NOT to use it, and what to use instead

Position on any one axis here is read approximately, not precisely — if the story needs an exact
number for a specific item on a specific dimension, this isn't how to state it; put the number in text
or a table alongside the chart instead. Past a modest number of items, the lines pile into a hairball
where individual trajectories can no longer be traced — reserve accent colour for a small highlighted
set (three or fewer) and render the rest as unaccented context, or trim the dataset to what the story
needs. And if there's really only one dimension being compared, this whole multi-axis machinery is
solving a problem that doesn't exist — a bar or dot plot handles a single variable more simply.

## The one thing that goes wrong

At least three axes are needed for the "trade-offs across dimensions" reading to mean anything — fewer
than that collapses into a single comparison a scatter plot already does better. The concrete, shipped
failure on this type lives in its hover tooltip: the series name was painted directly in the line's own
accent hue on a dark tooltip background, and on a muted grey line that measured under the WCAG
text-contrast floor — the same defect that hit roughly ten chart types across this codebase at once,
sharing one root cause (a mark-colour text label on a dark background never re-checked for contrast).

## What the drawing actually needs

Each axis gets its own independently-scaled, padded range — never one shared scale forced across every
dimension, which is exactly the trade parallel coordinates makes against radar's shared-scale
constraint. Highlighted lines are capped near three; every other item's line renders in a single
neutral muted grey, exempt from the categorical palette check the same way an unaccented context line
is exempt on a bump chart — the grey lines are scaffolding for the highlighted ones' shape to stand out
against, not claiming to be individually tracked categories. All lines typically reveal together across
the whole frame rather than one at a time, since the trade-off reading depends on comparing many lines'
shapes against each other at once, not following one line's build in isolation.

## The accessibility trap

The tooltip-naming failure described above is the concrete, checkable trap for this type: a hover label
must render in plain white or ink, never the line's own accent hue, on a dark tooltip background — if
the hue still needs to travel with the name, carry it on a small decorative swatch exempt from the
text-contrast rule rather than painting the name itself in colour. Separately, the un-highlighted
context lines being exempt from the categorical-palette CVD check is a deliberate, documented carve-out
in this codebase, not an oversight — but it only stays a safe carve-out as long as those lines are
genuinely unaccented background, never quietly pressed into carrying meaning of their own.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the two adjacent axes the claim is about, which is why the claim sits between the FIRST TWO: adjacency is the only place a trade-off is legible
- **Then** the two accented polylines that clear both thresholds
- **Then** the two threshold marks on their own rails, the only numbers the scale prints
- **Subordinate** — the fourteen other lines in one neutral, the axis heads and their names, the item names seated once per line at its highest vertex
- **The claim lands on** the pair of accented lines against the field, read across the two named rails

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-reorder-rails-nicer` — reorder the rails for a nicer picture — adjacency IS the argument, so a rail order is chosen once from the claim and stated
- `no-let-slope-carry` — let a slope carry meaning while each rail keeps its own scale, unless the sheet's own condition is met
- `no-seat-item-name` — seat an item's name more than once, or where it would cross a neighbouring rail

## Precision to assert
- each axis keeps its own fixed scale, stated
- the correlation the claim reports is computed here, not asserted from elsewhere
- the counts at each threshold and their intersection are derived from the frozen file and asserted

## Devices the worked example implements
- **The claim placed between the first two rails** — the layout decision that makes the finding readable at all (`render-directions.mjs`)
- **One name per line, at its highest vertex** — with a shortened form only where the full name would cross a rail (`DirectedParallelCoordinates.tsx`)
- **Two thresholds as the only printed numbers** — the scale spends nothing else (`DirectedParallelCoordinates.tsx`)

## Worked example

`proof/static-parallel-coordinates-electricity-mix` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedParallelCoordinates.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type parallel-coordinates --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
