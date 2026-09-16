# Area (and stacked area)

**Argues:** A single-series area chart is a line chart with the space beneath it filled.

## What it is for

A single-series area chart is a line chart with the space beneath it filled. The line already carries
the trend; the fill's only real job is to make the reader perceive the series as a QUANTITY
accumulated over the x-axis — a stock, a volume, a level — rather than a rate sampled at points. Use
it when the thing being drawn genuinely behaves like a level (reservoir volume, cumulative signups,
population) and the fill reinforces the right intuition. If the series is a rate, a ratio, or
something that can reasonably go up and down without any sense of "filling up" (a percentage, a
temperature, a stock price), a line alone says the same thing without inviting the wrong mental model.

## When NOT to use it, and what to use instead

Don't reach for area just because a line chart "looks a little bare" — the fill is not a style
option, it's a claim about the series representing an accumulated quantity, and a bare line is
correct and sufficient the rest of the time. When there is more than one series, area's stacked form
is a magnitude-over-time device for PART-TO-WHOLE composition, not a way to compare several
independent trends — stacking two series that aren't naturally parts of one whole (say, unrelated
countries' GDP) produces bands that are technically readable but rhetorically confusing, because
stacking implies they sum to something meaningful. If what you actually want is to compare several
independent series' trajectories, draw them as separate lines instead; nothing is stacked, nothing
implies a whole, and every line keeps its own honest baseline.

## The one thing that goes wrong

Every band above the bottom one sits on a moving floor. The bottom band is the only one whose shape
a reader can read directly, because its baseline is flat at zero; every band above it is squeezed
between two wavy lines, so a reader trying to judge whether the SECOND-from-bottom band is growing
or shrinking is actually trying to subtract two wavy lines in their head — nearly impossible to do
by eye. The one thing a stacked area chart is genuinely good at reading is the TOTAL (top edge) and
the bottom band; anything you want the reader to compare band-to-band should either be the bottom
band, or drawn separately. The second failure is a rendering one: opaque, unbordered bands that are
similar in hue can visually fuse into a single mass with no seam between them — always draw a thin
stroke along each band's top edge so adjacent fills read as separate layers, not one shape.

## What the drawing actually needs

X is the continuous axis (almost always time), sorted ascending — a single series area chart has one
fill running along it; a stacked one cumulatively sums every series below the current one at each x,
so the geometry needs the stacking ORDER decided up front (bottom to top), because that order is
what determines which band gets the flat, readable baseline. The value axis always includes zero —
this is the same non-negotiable rule as a bar's baseline, for the same reason: the fill's AREA (and
a band's thickness) is what a reader measures, and a floor that doesn't start at zero silently
changes what a filled quantity claims to be. Colour one series per band from a small, distinguishable
set; name each band directly at its own right edge rather than in a shared legend, in the page's ink
colour, not the band's own fill — a label painted in a light fill colour (skyblue, pale green) can
drop well under WCAG contrast even though the same hue reads fine as a block of colour. Size the
right-side label gutter to the actual widest label-plus-value you're about to draw, not a constant:
a fixed gutter sized for a short label will silently clip a longer one ("Renewables 280" rendering as
"Renewables 28" is a real, previously-shipped failure of exactly this kind). A gap in the series is
a break in the fill, not a value bridged across the hole — inventing a smooth fill across missing
readings states something nobody measured.

## Stacked area, briefly

Everything above about ordering, the zero baseline, band separators, and end-labels already covers
the stacked case in full — it's the same chart as this sheet describes, just with more than one
series. The comparison caveat is the one thing worth restating on its own: stacking is a
part-to-whole device, and the story it tells cleanly is "how did the total move, and how did the
bottom layer move" — not "which of these two middle bands grew faster," which the stack itself makes
nearly unreadable no matter how well it's drawn. If that second question is the actual story, this
is the wrong chart regardless of how carefully it's built.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the filled surface — the one mark on the plate, in the accent, because the surface IS the quantity
- **Then** the rule that cuts it, with its year written ON the rule that marks it rather than in a legend
- **Then** the last reading, named at the end of the curve in the surface's own colour
- **Subordinate** — the zero baseline, the value ticks and the year axis, all derived from the ground, all neutral
- **The claim lands on** the two shares either side of the cut, read off the areas the reader has just been shown

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- fill across a gap in the series — the polygon would join the years either side and the reader integrates a value nobody measured
- lift the surface off zero: the moment a series is filled, every clipped unit becomes surface, so the component throws rather than draw one pixel over a non-zero base
- draw a smoothed mean over the fill — a second curve bounding a surface it does not bound

## Precision to assert
- the years are asserted consecutive before anything is drawn
- every printed number is the integral the surface draws, computed from the same readings the surface is drawn from
- the plate refuses to render if the split it measures is not near the one the claim states

## Devices the worked example implements
- **A zero-base check that throws, not a comment** — the fill's whole claim enforced in code (`DirectedArea.tsx`)
- **The consecutive-years refusal** — a series with a hole is rejected before a mark is drawn (`render-directions.mjs`)
- **The target named on the rule that draws it** — no legend, and the end label in the surface's own colour (`DirectedArea.tsx`)

## Worked example

`proof/static-area-swiss-co2` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedArea.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type area --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
