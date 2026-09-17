---
size: landscape
type: streamgraph
format: static
medium: chart
grounding: supported
derived: v1
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

## The choreography

The silhouette is what this form gives that a stacked area does not, so it is read first: a body
that swells slowly across twenty-five years. Two bands are thick enough to be named inside
themselves and they are, once each. The subject is not one of them — solar is a sliver, and the
only way to point at a sliver is a rule, so one vertical accent stands at 2016 with the name at
its head. This form forbids a vertical axis, so the two figures that carry the growth are printed
at the two ends of the band instead, 0,01 and 5,7. The RANK the headline claims is a word, not a
mark: no reader can count third place off a stream, and the plate does not pretend otherwise.

**The eye enters at** `the silhouette`. **The claim lands at** `conclusion`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the silhouette` | `the 2016 rule` |
| reference | `the two named bands` | `the silhouette` |
| reveal | `the 2016 rule` | — |
| conclusion | `the two end figures` | `the 2016 rule` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the silhouette",
  "stations": [
    {
      "station": "establish",
      "carries": "the silhouette",
      "subordinateTo": "the 2016 rule"
    },
    {
      "station": "reference",
      "carries": "the two named bands",
      "subordinateTo": "the silhouette"
    },
    {
      "station": "reveal",
      "carries": "the 2016 rule",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the two end figures",
      "subordinateTo": "the 2016 rule"
    }
  ],
  "claimLands": "conclusion"
}
```

## Precision

- **Third place in 2016, computed** — the year solar passed oil into third place is searched in the frozen series, and the headline's year is that search's answer.
- **The baseline and the stack order are computed once** — the wiggle baseline and the inside-out order are computed once from the frozen file, so the silhouette is a property of the data rather than of a draw order.
- **The rank, its year and its holding** — all three are computed and asserted before the render — that it reached third, when, and that it has held since.
- **Every drawn year is complete** — 2025 is excluded because it is partial, and the source line says so rather than letting an incomplete year narrow the last slice.
- **Both ends printed, since there is no axis** — 0,01 and 5,7 TWh stand at the two ends in the one frame, together with the two totals above the plot, because this form has no vertical scale to read against.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "third-place-in-2016-computed",
    "the-baseline-and-the-stack-order",
    "the-rank-its-year-and-its",
    "every-drawn-year-is-complete",
    "both-ends-printed-since-there-is"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "third-place-in-2016-computed",
    "the-wiggle-baseline-and-the-inside": "the-baseline-and-the-stack-order",
    "the-rank-the-period-it-was": "the-rank-its-year-and-its",
    "every-period-in-the-drawn-range": "every-drawn-year-is-complete",
    "asserted-in-the-one-frame": "both-ends-printed-since-there-is"
  }
}
```
