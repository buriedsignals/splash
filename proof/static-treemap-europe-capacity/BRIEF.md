---
size: landscape
type: treemap
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — L'eau et l'atome portent encore 77 % du bas-carbone européen, mais dix pays ont basculé

**Type:** treemap (chart). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

The first `treemap` beat in this tree, and the last chart form for which the harvest holds a
reference.

## What the form buys, and what it costs

An area encoding holds quantities three orders of magnitude apart in one frame — France at 97 GW
beside Estonia at 0.3 — which no bar chart on one scale can do. It costs **comparison across
distance**: two cells far apart on the canvas cannot be ranked by eye.

So `every cell carries its own number` is not a nicety on this form, it is the repair for its known
weakness — and here it **drives the layout rather than decorating it**: how many cells the plate
draws is a ladder, and the rung is chosen by whether every drawn cell can hold its own figure. What
does not fit is not shrunk into illegibility; it is folded into a remainder cell that carries its own
number too.

## The claim

**Europe has 469 GW of low-carbon capacity installed across 8 900 stations, and water and the atom
still carry 77 % of it — but ten countries have already tipped: wind and solar are more than half of
their low-carbon fleet.** Those ten hold 14 % of the capacity. The largest cell on the plate, France,
is not one of them: 14 % wind and solar.

## The accent is a thread, and the plate refuses to let it become a maximum

This beat exists partly to spend one rule. Information is Beautiful reserves its orange for an
argument running through the figure — the Iran War and the oil revenue it produced — neither of which
is the largest value on the canvas. The base's note on that record:
*"the accent is assigned by the journalist's answer to 'who is the subject,' never by which value
happens to be largest."*

Here the thread is the countries that have tipped to wind and solar, and **the beat refuses to render
if the largest cell ever joins it**. At that point the accent and the maximum would coincide and a
reader could no longer tell which of the two the colour meant. That is the reference's rule turned
into a check rather than an intention.

## The remainder is split along the thread, or the thread is under-drawn

Folded into one cell, the tail put **nine of the ten tipped countries inside a neutral rectangle**:
the headline said ten and the plate showed one. A remainder that mixes the thread with the field is
not a remainder, it is a place the argument goes to hide. The tail is now split in two — the thread's
own remainder, accented and named, and the field's — and each carries its number and its count of
stations.

**And a cell in the thread carries its name or the plate does not draw it.** An accented box with a
number and no subject is an assertion with nothing to attach it to; the ladder gives up a country
before it gives up that name.

## Three registers inside one label

*Value, subject, basis* — so a figure never appears without the kind of figure it is. IiB sets
"$225 / Mark Zuckerberg / PERSONAL WEALTH (AS OF APR 2026)"; here it is the gigawatts, the country,
and how many stations that capacity is spread over. A cell too small for all three drops the **basis**
first and the **subject** second: the value is the last thing to go, and a cell that cannot hold the
value does not exist — it is in the remainder. The name **wraps to the cell**, up to two lines: a
treemap's cells are whatever shape the data makes them, and a name measured on one line alone falls
out of every tall narrow cell.

## The layout is squarified, and that is a correctness decision

Bruls, Huizing and van Wijk's algorithm: cells are laid in rows whose aspect ratios are kept as near
square as the running total allows. A treemap that is not squarified draws long slivers, and **a
sliver is a shape whose area a reader cannot read at all** — which gives away the one thing this form
is for.

## A note on this form's own evidence

One publication. Below the floor of two, so the form files **no family rules of its own** — but the
rule this beat leans on hardest, `accent-marks-the-thread`, was already filed and this record is the
published piece the base cites for it.

## Source

WRI Global Power Plant Database v1.3.0, public domain, frozen beside this beat as `stations.csv` —
the same file the dot-density and proportional-symbol beats carry, duplicated rather than linked.
**Installed capacity, not output**: the plate says so in its source line, because the database records
one and a reader will assume the other.

## The choreography

The eye lands on the biggest rectangle and then runs across the squarified rows in descending
area, which is how this form is read whether or not a designer intends it. Every cell carries
three registers in a fixed order — the value, then the country, then how many stations it is —
so a figure never appears without the kind of figure it is. The accent is deliberately NOT on the
largest cell: it runs as a thread through the field, picking out the ten countries where wind and
solar already pass half, and one of those cells is a remainder carrying nine of them with its own
number. France, the largest rectangle on the plate, is visibly outside the thread, and that is the
second half of the headline.

**The eye enters at** `the largest cell`. **The claim lands at** `subject`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the largest cell` | `the accented thread` |
| reference | `the squarified rows` | `the largest cell` |
| reveal | `the two remainder cells` | `the accented thread` |
| subject | `the accented thread` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the largest cell",
  "stations": [
    {
      "station": "establish",
      "carries": "the largest cell",
      "subordinateTo": "the accented thread"
    },
    {
      "station": "reference",
      "carries": "the squarified rows",
      "subordinateTo": "the largest cell"
    },
    {
      "station": "reveal",
      "carries": "the two remainder cells",
      "subordinateTo": "the accented thread"
    },
    {
      "station": "subject",
      "carries": "the accented thread",
      "subordinateTo": null
    }
  ],
  "claimLands": "subject"
}
```

## Precision

- **77 % and ten are both computed** — the hydro-and-nuclear share of European low-carbon capacity and the count of countries past the halfway mark are both derived from the frozen database.
- **Area stays proportional and the cells tile** — tile area is proportional to the asserted gigawatts and the cells tile the box exactly, so a remainder is a real area rather than leftover space.
- **How many cells is a ladder rung** — the cell count is chosen off a ladder by whether every drawn cell can hold its own figure; what does not fit folds into a remainder that carries its own number and count.
- **The basis goes first, the value last** — a cell too small for all three registers drops the station count first and the country second; a cell that cannot hold its value does not exist.
- **Every cell carries its own figure** — the thread, the largest cell outside it and both remainders are all in the one frame with their numbers, which is what makes the share checkable.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "77-and-ten-are-both-computed",
    "area-stays-proportional-and-the-cells",
    "how-many-cells-is-a-ladder",
    "the-basis-goes-first-the-value",
    "every-cell-carries-its-own-figure"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "77-and-ten-are-both-computed",
    "tile-area-stays-proportional-to-the": "area-stays-proportional-and-the-cells",
    "how-many-cells-are-drawn-is": "how-many-cells-is-a-ladder",
    "a-cell-too-small-for-all": "the-basis-goes-first-the-value",
    "asserted-in-the-one-frame": "every-cell-carries-its-own-figure"
  }
}
```
