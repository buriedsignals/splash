---
size: landscape
type: diverging-stacked-bar
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Nuclear holds the centre: in France it outweighs fossil and renewables put together

**Type:** diverging stacked bar. **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

## Claim

Each country's 2024 electricity mix, split into three groups and drawn as a lean: **fossil** to the
left (coal, oil, gas), **renewables** to the right (wind, solar, hydropower, bioenergy, other), and
**nuclear straddling the centre** — a level that belongs to neither, by definition rather than by
judgement.

France's nuclear share is **67.7 %**, against 5.1 % fossil and 27.2 % renewable — so it is larger
than both sides put together. Poland leans furthest left (68.9 % fossil), Norway furthest right
(98.6 % renewable, no nuclear at all).

Every figure is computed from the frozen file and the headline's comparison is asserted before the
render.

## Why nuclear is the neutral, and why that is a definition

`the-neutral-straddles-the-centre` says the level in the middle has to belong to neither side as a
matter of classification, not because the designer finds it awkward. Nuclear generation is not a
fossil fuel and is not a renewable: both statements are definitional. The plate says so in its
reading line, and it does NOT say whether that is good — the lean it draws is fossil against
renewable, and nuclear's mass is symmetric about the anchor so it adds to neither.

## What the harvest gave it

Three references across three publications — the FT's Visual Vocabulary specimen, jbryer's Likert
package plate, and Vega-Lite's own example. Two rules two of them agree on are filed: each side is
one ramp deepening outward, and the neutral straddles the centre. A third, unfiled because only one
publication carries it, is followed anyway and cited where it is used: **the totals belong outside
the bar, at the ends**, where they never collide with a small segment.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh, 2024, frozen beside this beat as `data.csv`.

## The choreography

Six rows, and the first reading is purely a lean: Poland's mass falls left, Norway's right, and
the eye takes that in before any number. What makes the lean honest is the band straddling the
anchor — nuclear, half on each side, adding to neither camp — and the plate then prints the two
side totals at the bar ends so the lean can be checked. France is the row the accent is spent on,
and it is the row where the straddling band outweighs both wings at once: 67,7 against 5,1 and
27,2. The axis is there; the value labels make it almost unnecessary.

**The eye enters at** `the row leans`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the row leans` | `the France row` |
| reference | `the straddling nuclear band` | `the row leans` |
| reveal | `the two side totals` | `the row leans` |
| subject | `the France row` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the row leans",
  "stations": [
    {
      "station": "establish",
      "carries": "the row leans",
      "subordinateTo": "the France row"
    },
    {
      "station": "reference",
      "carries": "the straddling nuclear band",
      "subordinateTo": "the row leans"
    },
    {
      "station": "reveal",
      "carries": "the two side totals",
      "subordinateTo": "the row leans"
    },
    {
      "station": "subject",
      "carries": "the France row",
      "subordinateTo": null
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **The centre outweighs both wings** — France's 67,7 % against 5,1 % plus 27,2 % is computed from the frozen mix, and the headline is the comparison, not a rounding of it.
- **Every row sums to one hundred** — each country's bands are asserted to sum to its whole production, or the row would lean on an arithmetic that is not there.
- **Segments darken outward from the centre** — the order inside each camp is the response order — gas, oil, coal outward to the left; bioenergy, other, hydro, solar, wind outward to the right — and the tint follows it.
- **The headline comparison is asserted first** — the beat checks that the middle band really does outweigh both wings before it renders the row that says so.
- **Six mixes in the one frame** — every side total and every centre value is printed at rest, because the lean only means something against the five other rows.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-centre-outweighs-both-wings",
    "every-row-sums-to-one-hundred",
    "segments-darken-outward-from-the-centre",
    "the-headline-comparison-is-asserted-first",
    "six-mixes-in-the-one-frame"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-centre-outweighs-both-wings",
    "every-row-sums-to-the-same": "every-row-sums-to-one-hundred",
    "the-segment-order-is-the-response": "segments-darken-outward-from-the-centre",
    "the-headline-comparison-is-asserted-before": "the-headline-comparison-is-asserted-first",
    "asserted-in-the-one-frame": "six-mixes-in-the-one-frame"
  }
}
```
