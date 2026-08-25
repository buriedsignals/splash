# Beeswarm

## What it is for

A beeswarm shows every raw observation on one shared value axis, with no aggregation and no
overlap — the "show your data" distribution chart. Points that would land on top of each other on a
plain dot strip get nudged sideways just far enough to clear their neighbours, so the swarm's WIDTH at
any point along the axis is itself a density signal: a fat cluster means many similar readings, a thin
stretch means few. That's a different promise than a histogram (which bins and counts, discarding each
individual reading) or a boxplot (which summarises to five numbers and discards every point) — a
beeswarm is the type to reach for specifically when the story needs both the shape of the distribution
AND the fact that every mark is a real, individually-locatable observation.

## When NOT to use it, and what to use instead

Past roughly a hundred and fifty points the collision-avoidance layout stops helping — the swarm turns
into a dense blob where individual points can no longer be told apart, which defeats the entire premise
of showing raw data. At that volume, aggregate: a histogram for the shape, a boxplot if only the
summary statistics matter. If the story genuinely only needs the summary — the median, the spread, a
few outliers named — a boxplot says that more directly and takes less space to say it in. And if
overlap doesn't need resolving because the points are naturally sparse along the axis, a plain dot
strip does the same job for less layout cost — reserve the collision simulation for datasets dense
enough to actually need it.

<!-- limit: rows > 150 -->

<!-- A beeswarm draws one mark per raw observation, so a point IS a row of the frozen table.
     That is why this ceiling is declared in `rows`, the one unit `source/profile.json` carries and
     the one unit `formatCandidates` enforces: a swarm of 234 salaries was offered once, and the
     sentence above had refused it on disk the whole time. -->

## The one thing that goes wrong

A beeswarm has exactly one colour channel to spend when it's rendering a single distribution (not
split by category), and that one colour has, in production, been left on a chart's default hue even
when the subject plainly called for something else — a housing-cost swarm shipped in a cool blue that
had nothing to do with "rent" or "cold." The mark's colour is a real decision, not a placeholder,
whenever the chart isn't already using colour to separate categories; when it IS split by category
(several groups on one axis), colour is doing that job instead and subject-matching doesn't apply the
same way.

## What the drawing actually needs

Points sort by value first, then each one is placed at the smallest sideways offset from the centre
line that still clears every already-placed neighbour within one point's diameter — a deterministic
packing, not a jittered scatter, so the same data always produces the same swarm shape. If the total
swarm would overflow its allotted band, the whole layout scales down uniformly rather than letting
points spill outside the frame or re-clipping individual points differently from their neighbours.
Category splits, when present, get up to five colourblind-safe hues; a single, undivided distribution
gets one deliberately chosen hue that fits the subject. Outliers — points that sit meaningfully apart
from the main cluster — deserve their own label, since the swarm's whole visual logic (density by
width) makes an isolated point easy to miss without one.

## The accessibility trap

Outlier labels belong in the page's neutral ink with a light halo behind the text, never in the swarm's
mark colour — the same "label carries the value, mark carries the hue" rule this whole family shares,
grounded in a real shipped defect where a value label painted in an off-palette accent colour measured
under the WCAG text-contrast floor. With category-split swarms, the up-to-five hues are the only thing
separating groups whose points otherwise share the same axis and the same shape logic, so every one of
those hues has to stay distinguishable from its neighbours under a colour-vision-deficiency simulation,
not merely distinct to full-colour vision.
