# Beeswarm

**Argues:** A beeswarm shows every raw observation on one shared value axis, with no aggregation and no overlap — the "show your data" distribution chart.

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

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the swarm's own shape — where it is thick and where it thins, which is the only aggregate statement this type makes
- **Then** the reference rule (the weighted average) with its value, the one piece of furniture carrying text
- **Then** the two derived callouts, seated ABOVE the field with a hairline leader down to the circle's edge — a card is allowed to move, a circle is not
- **Subordinate** — the axis name and its ticks on one row, separated by weight; where they collide the TICK gives way, and the ladder prints how many ticks the name cost
- **The claim lands on** the named cases, whose position and area together carry the sentence

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- push a mark ALONG the axis to make room — a swarm that slides a circle sideways has lied about the one thing it measures
- lay the small circles down first: a big circle placed late has nowhere to go and ends up at the edge of the band, reading as a value it does not have
- spend a plate on a size key — what a circle is and what its area means is said in the running prose the reader is already reading

## Precision to assert
- the radius ladder is walked from generous to mean and the first rung whose packed swarm still fits its band is taken; the floor under the smallest marks is a distortion the ladder PRINTS rather than hides
- both callouts are derived (the biggest circle and the farthest one out), never chosen
- the plate refuses to render if the claim's set holds more than its stated share, if the average sits above less than its stated share of the weight, or if the largest circle is not below the median

## Devices the worked example implements
- **The radius ladder** — eight rungs walked, the first that fits taken, and the smallest-mark floor printed (`DirectedBeeswarm.tsx`)
- **Cards above the field with leaders down** — the fix for a callout that landed on the swarm it was naming (`DirectedBeeswarm.tsx`)
- **Derived callouts and three refusals** — the two marks the eye lands on anyway, named by code (`render-directions.mjs`)

## Worked example

`proof/static-beeswarm-co2-per-person` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedBeeswarm.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type beeswarm --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
