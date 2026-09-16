# Heatmap (matrix)

**Argues:** A heatmap lays a grid across two categorical (or temporal) dimensions and encodes a third, quantitative value as the colour of each cell.

A heatmap lays a grid across two categorical (or temporal) dimensions — day by hour, region by
year — and encodes a third, quantitative value as the colour of each cell. It answers "where are
the highs and lows across two dimensions at once," a question neither axis alone can answer: the
whole point is that the interesting pattern is in the combination — Friday evenings, not Fridays
or evenings separately — and the eye scans a grid for clusters far faster than it could read the
same numbers out of a table.

Do not reach for it when there's only one dimension to plot — that's a bar, and a bar's length is
read far more precisely than a cell's colour ever will be, so collapsing a one-dimensional
comparison into colour is a strict downgrade. Don't reach for it either when the reader needs to
compare exact values precisely: colour is a coarse instrument next to position or length, so if
the numbers themselves are the story, either put a value label in every cell or pick a different
type. And don't let the grid get too fine — past some point the cells stop reading as
distinguishable regions and start reading as static; aggregate the bins first.

The one thing that goes wrong: choosing a colour ramp that isn't sequential. It's tempting to
reach for a rainbow or a multi-hue gradient because it "looks lively," but a heatmap's colour
carries the entire quantitative channel, and a ramp whose brightness doesn't move in one
direction breaks that channel in two independent ways at once — it stops being readable in
greyscale (photocopy, print, a screen reader's high-contrast mode) and it stops being reliably
readable to a colour-vision-deficient reader, because both of those readers are, in effect,
reading luminance, not hue. The test is mechanical and worth actually running: sample the ramp's
stops and check that luminance moves in one direction only, start to finish, never dipping back
up or down mid-scale. A single-hue ramp (pale-to-deep) or viridis both pass this by construction;
a hand-picked multi-hue gradient usually doesn't, even when every individual stop looks fine in
isolation.

What the drawing needs: rows and columns are ordered deliberately (chronological if one axis is
time, by similarity or magnitude otherwise) so real clusters read as blocks instead of scattering
across a randomly-ordered grid. Cells are square-ish with a thin separator so the eye reads
discrete cells, not a smear. Every heatmap needs a colour legend with its min and max labelled —
colour without a key is not decoded, it's just admired — and if exact numbers matter, put the
value inside the cell too, with the label's own colour chosen by that cell's own colour (light
text on the dark end of the ramp, dark text on the pale end), because a value label that's ink
everywhere will vanish against the darkest cells.

The accessibility trap here is real and specific, not generic WCAG boilerplate: on a dark canvas,
a sequential ramp's low-value end is tempted to fade toward the background colour itself, because
"pale" and "dark background" pull in the same direction — and a cell that blends into the ground
it's drawn on has failed before a reader even gets to read its value. The concrete floor worth
holding: every stop in the ramp needs at least 3:1 contrast against the actual ground it's drawn
on (the non-text contrast floor, since a cell is a shape, not prose) — measured against the real
background colour, not an assumed white or an assumed black. A ramp that was checked on paper
against white and then dropped onto a dark theme without re-checking is exactly how a "readable"
heatmap ships with an invisible bottom third.

That floor has a consequence worth knowing before you meet it in a render, because it is not
obvious and it looks like a data problem rather than a scale one. Holding the pale end at 3:1
against a white ground puts the lightest usable stop at a solid mid-grey, which leaves the whole
ramp roughly 90 of 255 levels to spend. Spend those *linearly* across a domain whose maximum is an
outlier — a grid running to 87% where three quarters of the readings sit under 25% — and nearly
every real reading lands in the same grey. The grid renders as one flat slab, every assertion in
it true, every mechanical check green, and the finding invisible: one beat's steepest movement,
a 98% collapse, could not be seen at all.

**The remedy is the scale, not the floor.** Position a value on the ramp by a monotonic transform
of its share of the maximum — a square root works, and is close to how brightness is perceived
anyway — so the readings that actually exist spread across the range available. Monotonic is the
word that matters: a bigger value is still a darker cell, always, so the type's one failure mode
is untouched. What it costs is proportionality, and that cost has to be paid in the open — the
legend's ticks are placed on the same transform, so its uneven spacing shows the non-linearity
rather than hiding it, and the subtitle says what was done. Hand-chosen bins are the other way out
and are usually worse: they let a value crossing an edge flip a whole shade for a rounding's worth
of change. The other half of the remedy is at the dark end, which unlike the pale end is free to
move: carry the accent part of the way toward the ground's own derived ink and the ramp buys back
about a third more range without naming a second hue.

And say what the floor still costs, rather than papering over it. On a white ground, "almost none"
cannot be drawn as almost nothing — the palest cell is a mid-grey. If the alt text calls it "pale
grey", a reader who cannot see the grid has been told something the grid does not show.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the BLOCK of darkness at the top — the finding here is a block, not a cell, and the shape of that darkness is the argument
- **Then** the bracket naming the region, drawn in the ink, OUTSIDE the ramp entirely so it can never be read as a value
- **Then** the sorted column at the right, printing the quantity the rows are ordered on — an order is a claim, and a reader who cannot see the quantity cannot check it
- **Subordinate** — the column families named above a drawn rule, the row names, the key with its printed breaks
- **The claim lands on** the partition of the top block into its routes, visible as which columns are dark in which rows

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- print a value in every cell when the cell count forbids it: at 108 cells the value register's band does not fit the row pitch, so the plate NAMES the region instead
- hand-pick the rows — which of forty are drawn is a stated editorial rule (everyone above the floor, plus the largest producers), and the first draft that hand-picked eighteen asserted a count that was false across the real forty
- leave the row or column order in the data's order: neither is in the data, and both are printed on the plate

## Precision to assert
- the colour scale's domain is fixed and the key prints its breaks
- the routes the claim names are a COMPUTED partition — three disjoint tests, and a case falling into none or two throws
- the row count is measured against what the frame can carry, and the component refuses rather than shrink the row labels

## Devices the worked example implements
- **A bracket outside the ramp** — the region named where a value cannot be printed (`DirectedHeatmap.tsx`)
- **The selection printed as a rule** — the editorial act put on the plate rather than left in the runner (`render-directions.mjs`)
- **A copy ladder that spends the reading line first** — and prints which rung each direction took (`render-directions.mjs`)

## Worked example

`proof/static-heatmap-europe-electricity` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedHeatmap.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type heatmap --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
