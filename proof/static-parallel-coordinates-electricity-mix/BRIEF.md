---
size: landscape
type: parallel-coordinates
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — 2 pays sur 16 font les deux : plus de 25 % de nucléaire et plus de 20 % d'éolien

**Type:** parallel coordinates (chart). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

The first `parallel coordinates` beat in this tree — and **the last of the catalogue's forty forms to
get one**.

## What the form is for

An entity that has many numbers at once, where no two of them share a scale. A national electricity
mix is exactly that: a country is seven shares, and the shape of the seven is what tells it from its
neighbour. No other form in this tree holds seven dimensions of sixteen entities on one plate.

## The claim, and why it sits between the first two axes

**Five of the sixteen countries draw more than 25 % of their electricity from nuclear; ten draw more
than 20 % from wind; and two do both — Finland and Sweden.** The correlation between the two shares
across the sixteen is **−0.4**.

That number matters because of what this form can and cannot show. **Only ADJACENT axes let a reader
see a relationship**: a crossing between two neighbours is a real inverse, a line that rises three
axes later is nothing. So the axis order is the argument, and this plate's order is stated in its
reading line — nuclear beside wind, because the crossing between them *is* the claim; everything
after them is low-carbon first, fossil last.

And the crossing is **measured, not read off the ink**. A parallel-coordinates plate that says "these
two lean against each other" and cannot say how much is a plate arguing from its own drawing. The
beat refuses to render if the correlation is not negative, if the two floors have no real group
behind them, or if the countries clearing both are none or all.

## What the reference gave

One publication — the EU data-visualisation guide's own example figure, the classic cars dataset,
read at rest. Below the floor of two, so the form files no family rules of its own.

- **Every axis carries its own scale and says so on itself** — name at the top, values on the rule,
  each ceiling fitted to its own column and rounded outward. Nothing is normalised to a shared
  0–100: a polyline is a set of positions, not a profile whose slope means anything.
- **The tick values sit ON the axis, not in a gutter** — seven gutters would eat the plate. But the
  reference's full ladder of values on every rail is **refused at this density**, see below.
- **Colour is the category, never the value.** `PALETTE.md` records which category and why two groups
  rather than the reference's three.
- **The axis order is a choice**, and the plate says so rather than leaving a reader to assume the
  order is the data's.

## Where the reference's ladder stops, measured

The reference prints a full ladder of values on each of its eight rails, and at four hundred
polylines that is what a reader needs to place a line. At sixteen it was **twenty-five numbers doing
the work of eight**, repeated four to an axis and sitting in the lines — Rémy's read was *beaucoup de
labels dont on ne sait pas à quoi ils servent*.

The fact that ladder exists to carry is that **each axis has its own scale**, and that fact is
carried better by **seven different ceilings** — 70 %, 60 %, 30 %, 60 %, 30 %, 50 %, 60 % — than by
four repeated gradations. So each rail prints its own ceiling at its top, and the zero is drawn once,
at the left, because it is the one value every rail shares.

**And a name may not cross a rail that is not its own.** Bounded only by the plate's edges and the
other names, `Danemark` ran from the wind axis across the solar one and `Tchéquie` sat on the coal
rail — a label lying over an axis reads as belonging to that axis. The seat test now includes every
other rail, and a line that cannot clear them tries its next-highest axis.

## One rule of this beat's own

**Every line is named once, at the axis where its own value is highest.** A polyline crossing seven
axes has seven places it could be labelled, and its own maximum is the place it is furthest from its
neighbours — so that is where its name goes. Where the seat is taken the line tries its next highest
axis, and the ladder prints how many could not be seated at all. All sixteen are named on all three
directions.

The reference names nothing, and is right not to: at four hundred polylines there is no such seat.
At sixteen there is, and an unnamed line on a plate about countries is a country the reader cannot
find.

## Source

Ember / Energy Institute – Statistical Review of World Energy (2025), via Our World in Data, frozen
beside this beat as `data.csv` — a duplicate of the file three sibling beats carry. Each axis is the
source's share of that country's own total generation, the total taken over all nine columns the file
reports, so the seven axes do not sum to 100 and are not meant to.

## The choreography

Only two ADJACENT axes can be compared, so the claim's two sources are put first and next to each
other, and that is where the eye is meant to enter. Between the nuclear rail and the wind rail the
sixteen lines mostly fall, and two of them do not: Finland and Sweden, accented, are the only
polylines high on both. The seven ceilings printed at the axis heads are the only numbers the
scale gives — each rail is fitted to its own column, which is the price of putting seven sources
on one plate. Every other line is one neutral, named once at its own highest vertex.

**The eye enters at** `the first two axes`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the first two axes` | `the two accented lines` |
| reference | `the axis ceilings` | `the first two axes` |
| reveal | `the fourteen grey lines` | `the two accented lines` |
| subject | `the two accented lines` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the first two axes",
  "stations": [
    {
      "station": "establish",
      "carries": "the first two axes",
      "subordinateTo": "the two accented lines"
    },
    {
      "station": "reference",
      "carries": "the axis ceilings",
      "subordinateTo": "the first two axes"
    },
    {
      "station": "reveal",
      "carries": "the fourteen grey lines",
      "subordinateTo": "the two accented lines"
    },
    {
      "station": "subject",
      "carries": "the two accented lines",
      "subordinateTo": null
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **Five, ten and two are counts** — five countries above 25 % nuclear, ten above 20 % wind, and the two in both are counted in the frozen file, not read off the picture.
- **Each axis keeps its own stated ceiling** — every rail has its own fixed scale and prints it, because a shared scale would flatten six of the seven sources into the floor.
- **The correlation is computed here** — the −0,4 between the two leading shares is computed in this beat from this beat's own file, never carried in from a sibling.
- **Both thresholds and their intersection counted** — the two threshold counts and the size of their intersection are derived together, so the headline's "2 sur 16" cannot drift from the two numbers it sits between.
- **Sixteen mixes across seven axes, once** — the whole field is on the plate at rest; the trade-off is only legible because both rails and all sixteen lines are visible at the same instant.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "five-ten-and-two-are-counts",
    "each-axis-keeps-its-own-stated",
    "the-correlation-is-computed-here",
    "both-thresholds-and-their-intersection-counted",
    "sixteen-mixes-across-seven-axes-once"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "five-ten-and-two-are-counts",
    "each-axis-keeps-its-own-fixed": "each-axis-keeps-its-own-stated",
    "the-correlation-the-claim-reports-is": "the-correlation-is-computed-here",
    "the-counts-at-each-threshold-and": "both-thresholds-and-their-intersection-counted",
    "asserted-in-the-one-frame": "sixteen-mixes-across-seven-axes-once"
  }
}
```
