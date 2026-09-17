---
size: landscape
type: radar
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — France and Germany make nearly the same electricity from opposite mixes

**Type:** radar. **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080), in the
front matter above, which is the statement that counts.

## Claim

In 2024 France generated 561.8 TWh and Germany 496.0 TWh — within 12 % of each other — from mixes
that share almost nothing:

| | France | Germany |
| --- | --- | --- |
| Nuclear | **67.7 %** | **0 %** |
| Wind + solar | 12.5 % | **43.5 %** |
| Coal | 0.2 % | 21.4 % |
| Hydropower | 12.7 % | 4.8 % |

Every figure is computed in `render-directions.mjs` from the frozen `data.csv` and printed before
the render. Nothing is typed: the shares, the two totals, the ratio between them, the nine spoke
values and the alt text all come from the file.

## Why a radar, and the two things that makes it legitimate here

`references/types/radar.md` refuses the form when the axes are not commensurable — different units
forced onto one radius produce a shape whose size is partly an artefact of unit choice. Here **every
spoke is a share of the SAME denominator**: the country's own generation. All nine axes are
percentages of one total, so the radial scale means one thing everywhere on the plate, and each
polygon's own axes sum to 100 %.

And the type sheet's stated weak point — *"treat axis choice and axis order as an editorial
decision, not an incidental layout detail"* — is answered rather than ignored. The nine spokes are
ordered by FAMILY: the five renewables first, then nuclear, then the three fossil sources, so the
circle reads renewable → nuclear → fossil and a polygon leaning one way leans toward a stated
meaning. The order is written on the plate in the reading line, not left for the reader to infer.

Two items, not three, so the fills stay legible where they overlap.

## What the harvest gave this beat

Five references, four of them from sports analytics — `blogarchive.statsbomb.com` and The Analyst
(`theanalyst.com`, `dataviz.theanalyst.com`) — plus one `100.datavizproject.com` specimen. Football
radars are where this form is actually practised, and the three rules two publications agree on are
filed as treatments: every spoke's number is printed rather than judged by eye, the grid is
concentric circles with a drawn ceiling, and the benchmark the radius is measured against is
captioned on the plate.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh, frozen beside this beat as `data.csv` (a copy of the file
`proof/static-wind-vs-solar` uses, per this corpus's "duplicate, do not link" ruling, so this beat
can be rendered and audited on its own).

## The choreography

Two outlines on one circle, and the reading is that they barely touch. France is a single spike
running almost to the ceiling on one spoke and flat everywhere else; Germany is a squat cluster
spread over wind, solar, coal and gas. The spoke the claim turns on is nuclear, where the two
numbers at its end are 67,7 and 0,0. The order of the spokes is the editorial decision this type
usually hides, and it is said out loud here: renewables, then nuclear, then fossils, clockwise by
family. Every spoke carries both shares at its own end, so the opposition can be checked spoke by
spoke rather than taken on the shape.

**The eye enters at** `the two outlines`. **The claim lands at** `establish`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the two outlines` | — |
| reference | `the nuclear spoke` | `the two outlines` |
| reveal | `the family order` | `the two outlines` |
| conclusion | `the paired spoke values` | `the two outlines` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the two outlines",
  "stations": [
    {
      "station": "establish",
      "carries": "the two outlines",
      "subordinateTo": null
    },
    {
      "station": "reference",
      "carries": "the nuclear spoke",
      "subordinateTo": "the two outlines"
    },
    {
      "station": "reveal",
      "carries": "the family order",
      "subordinateTo": "the two outlines"
    },
    {
      "station": "conclusion",
      "carries": "the paired spoke values",
      "subordinateTo": "the two outlines"
    }
  ],
  "claimLands": "establish"
}
```

## Precision

- **Almost the same total, opposite mixes** — 561,8 TWh against 496,0 TWh, and the nine paired shares behind the word "opposés", are all read off the frozen file.
- **One radial scale on every spoke** — every spoke keeps the same radial scale and each polygon's nine shares sum to its stated whole, or the two shapes would not be comparable.
- **The 70 % ceiling is the next round step** — the outer ring is the next round step above the largest share on the plate, and it is stated rather than left to be inferred from the rings.
- **Both totals and the gap are asserted** — the two national totals and the gap between them are checked before the render, because "presque autant" is half the headline.
- **Eighteen shares printed round one circle** — both values sit at each spoke's own end in the one frame, so the claim is checkable without a legend and without a second plate.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "almost-the-same-total-opposite-mixes",
    "one-radial-scale-on-every-spoke",
    "the-70-ceiling-is-the-next",
    "both-totals-and-the-gap-are",
    "eighteen-shares-printed-round-one-circle"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "almost-the-same-total-opposite-mixes",
    "every-spoke-keeps-the-same-radial": "one-radial-scale-on-every-spoke",
    "the-ceiling-is-the-next-round": "the-70-ceiling-is-the-next",
    "the-totals-and-the-headline-gap": "both-totals-and-the-gap-are",
    "asserted-in-the-one-frame": "eighteen-shares-printed-round-one-circle"
  }
}
```
