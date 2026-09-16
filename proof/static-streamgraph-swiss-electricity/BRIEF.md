---
size: landscape
type: streamgraph
format: static
medium: chart
grounding: supported
---

# Beat — Solar became Switzerland's third source of electricity in 2016

**Type:** streamgraph (silhouette offset, inside-out order). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

Between 2000 and 2024, Swiss solar generation went from **0.01 TWh** to **5.66 TWh**, and **in 2016
it passed oil to become the country's third source of electricity**, behind hydropower and nuclear.
It has stayed third every year since. Hydropower rose from 36.8 to 44.9 TWh over the same period and
nuclear fell from 26.4 to 24.0.

The rank, the year it was first reached, and the fact that it held afterwards are all computed in
`render-directions.mjs` from the frozen file and asserted before the render.

**2025 is excluded and the reason is on the plate**: the frozen file carries a partial 2025 (65.0 TWh
against 78.4 in 2024, with hydropower at 34.0 against 44.9) and a partial year drawn on a stream
reads as a collapse.

## Why this form, and what it costs

A streamgraph shows composition changing over time without asking the reader to track a stack against
a baseline. What it gives up is exactly measured: **no band starts at zero**, so no value can be read
off a scale — which is why `a-free-baseline-forbids-a-value-axis` prints the numbers instead, and why
Lee Byron's own figure is in this base as the counter-example: strip the labels and *"nothing on this
plate can be turned back into a number"*.

## What the harvest gave it

Five references across four publications — Ferdio, the New York Times' 2008 box-office piece that
named the form, UNHCR (twice), and Lee Byron's own paper figure. Three rules are filed: every band a
reader could name is named inside itself, a free baseline forbids a value axis, and the layer order
is the argument rather than the layout.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
Switzerland, electricity generation by source, TWh, frozen beside this beat as `data.csv` (a copy of
the file `proof/vidx-stacked-bar-swiss-electricity` uses, per this corpus's "duplicate, do not link"
ruling).
