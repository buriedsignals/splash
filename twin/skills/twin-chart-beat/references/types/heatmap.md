# Heatmap (matrix)

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
