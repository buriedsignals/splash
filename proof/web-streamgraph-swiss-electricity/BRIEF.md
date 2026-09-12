---
format: web
type: streamgraph
---

# Beat — Le solaire suisse est passé de 0,01 à 7,89 TWh, troisième source depuis 2016 (web)

**Type:** streamgraph. **Medium/format:** chart / **web**. **Frame:** fluid.

## Claim

Between 2000 and 2025 Swiss solar generation went from **0,01 to 7,89 TWh**, and **in 2016 it passed
oil to become the country's third source**, behind hydropower and nuclear — and has held third every
year since. The rank, the year it was first reached and the fact that it held are all computed, and
the beat throws if the source reached third and then lost it.

## Treatments spent

- `a-free-baseline-forbids-a-value-axis` — a streamgraph's baseline wanders by construction, so no
  band is measured from a fixed zero and a value axis would be a lie. The page carries **none**; the
  total is printed at both ends and every band's own number comes from the pointer.
- `a-band-is-named-inside-itself-or-it-is-texture` — a band thick enough carries its name where it is
  thickest, clamped away from both edges; the thin ones are named by the pointer.

## What the web adds, and it is this form's whole debt

A streamgraph is the **least measurable chart in this catalogue**: a reader sees a band swell and
cannot say by how much, from what, or when it passed the band beside it. Every band-year here answers
with the source, the year, its TWh, its share of that year's total, and its rank among the nine
sources that year.

## What the render taught, and it went into the shared spine

Band names on a mint fill under `nocturne` came out **brown**. `adjustToContrast(ink, band)` walks the
direction's ink toward whichever pole clears the floor against that band — and on a dark direction,
whose ink is light, a light band pushes it all the way to a muddy dark. **A direction has two poles,
not one.** `inkOnFill` picks whichever of ink and ground reads better on that particular fill and only
then adjusts; the heatmap, the marimekko and the stacked bar were switched to it in the same pass.

## Verification

`verify-web.mjs --file renders/creme.html` — **56 passed, 0 failed, 5 skipped**.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
Switzerland, 2000–2025. `data.csv` is a byte-for-byte copy of
`proof/static-streamgraph-swiss-electricity/data.csv`.
