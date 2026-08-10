# Area (and stacked area)

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
