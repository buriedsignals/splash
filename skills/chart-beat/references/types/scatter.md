# Scatter (and bubble)

**Argues:** A scatter plot answers one question: as one continuous variable moves, what happens to another, across every unit at once.

## What it is for

A scatter plot answers one question: as one continuous variable moves, what happens to another,
across every unit at once. It is the only chart type in this set where BOTH axes carry a measured
value — every other type in this family spends one axis on category or time and the other on
magnitude. That is what a scatter is for and nothing else: showing the shape of a relationship
(tight, loose, curved, absent, clustered) that a table of the same numbers cannot show you, because
a table makes you compute the relationship in your head, point by point.

## When NOT to use it, and what to use instead

If there are fewer than about eight or ten points, a scatter is an expensive way to draw what a
labelled dot-strip or a small table would show just as well — a cloud needs enough members to have
a shape. If one of the two variables is actually time, this is not a scatter, it is a line (or, if
you only have two time points and want the direction of change per category, a slope chart); do not
let "it has an x and a y" fool you into scattering a time series. If you find yourself wanting to
label most of the points, the chart has already told you it isn't a scatter's job to carry — that
many labels is a table's job, or a dot-strip's.

<!-- limit: rows < 8 -->

## The one thing that goes wrong

Bubble size lies the moment someone maps a value to RADIUS instead of AREA. A bubble twice the value
should look twice as big by eye — which means twice the area, which means the radius scales by the
square root of the value, not linearly. Scale radius directly and a value that is 4x another renders
4x the radius, which is 16x the ink on the page; the reader's eye reads that as a wildly bigger gap
than the data supports. This is silent — nothing about a linearly-scaled bubble chart looks broken,
it just quietly overstates every comparison, which is worse than a chart that looks obviously wrong.
The second failure is specific to labelling: label every point and the cloud disappears under text,
which defeats the reason you chose a scatter (the SHAPE of the cloud is the argument, not each
member's name). Name only the few points the story is actually about — usually the outlier, or
whichever point the journalist has picked out by hand — and leave the rest to read as a shape.

## What the drawing actually needs

Position on both axes is the entire encoding: x from one measured column, y from the other, both on
linear scales fitted to the data's own extent — NOT forced to include zero. A scatter is a position
chart, the direct opposite of a bar's length encoding, and padding the axis down to zero when the
data lives at 40–90 buys nothing but a cloud squeezed into a corner. If you're adding a third
variable as bubble size, that scale starts at zero (so area is proportional to value) and maps to a
square-root curve, not a straight line. Both axes need a label stating what they measure — a bare
number axis on a scatter is close to unreadable, because unlike a bar chart's shared baseline there
is no other cue for what a position means. If you annotate specific points, pick label anchors that
sit outside the point and outside every other label's box, add a short leader line back to the dot
when the point sits in a crowd, and never let a label creep into the axis margins. Whichever points
you've explicitly promised to name should never be dropped for lack of room — offset them instead;
it's only the unlabelled default outlier that's allowed to go unlabelled if things get crowded.

## The accessibility trap

Point labels are text sitting on or near a coloured dot, and it's tempting to colour the label to
match — don't. A dot tinted to the newsroom's house hue can easily fail WCAG contrast as running
text even when it reads fine as a small mark, and a scatter with many dots means many chances to
get this wrong at once. Keep every label in the page's ink colour and let the dot (and its leader
line, if it has one) carry the hue; the colour is doing its job as a mark, the label is doing its
job as text, and conflating the two roles is what breaks contrast. The second trap is a scatter's
own corner furniture: an axis label or title sitting in the plot's own corner can silently occlude
a real point that happens to fall underneath it — a reader loses a data point and never knows it
was there. If a point could land under a corner label, give the axis a little extra headroom on
that side rather than trusting the two to never collide.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the cloud's SHAPE — the steep rise then the flattening, which is the claim; no point is the subject
- **Then** the declared break, which is where the accent goes
- **Then** the two measured bands either side of it
- **Subordinate** — every point in one muted, semi-transparent neutral; the two axes with the log one declared as such; the ticks
- **The claim lands on** the width of the upper band against the lower, read off the marks

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- spend the accent on a member: a scatter's argument is the shape, not any one member's name, unless a specific point earns a label
- map a value to RADIUS instead of AREA — and, past that, let a minimum radius pin most of the cloud at one size while the caption says the area is the value
- state a band's limits from memory: a render audit caught this brief and its render both naming a low end well above the real one

## Precision to assert
- both axes keep the same fixed scale and a log axis is declared as one
- both bands are measured off the data, and the beat throws if the upper band is not much narrower than the lower
- every figure in the claim is recomputed from the frozen file rather than carried in prose

## Devices the worked example implements
- **No named subject, accent reserved and unused** — the type's own rule taken literally (`DirectedScatter.tsx`)
- **An area-true size scale** — and where area-true and visible are not both available, the trade measured (`IncomeLifeExpectancyScatter.tsx`)
- **A declared break rather than a fitted one** — the threshold is editorial and is printed (`render.mjs`)

## Worked example

`proof/static-income-life-expectancy` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedScatter.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type scatter --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
