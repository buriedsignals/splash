---
size: landscape
type: connected-scatter
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — Tous plus propres chez eux, cinq plus légers en Europe

**Type:** connected scatter (chart). **Medium/format:** chart / **static**. **Size:** landscape
(1920 x 1080), pinned in the front matter above.

The first `connected scatter` beat in this tree.

## The axis pair the reference recommends is degenerate, and this beat says so

Ferdio's #70 puts a **level** on one axis and that level's **share of the group** on the other, and
its record files the pair as transferable: use it *"when 'grew but shrank relatively' is a thing that
could be true"*. This beat was built that way first, and measured.

**Within one date, a level and its share of the same group are the same number up to a constant.**
Every point of one date therefore lands on a ray through the origin, and the plate is two straight
lines — one ray per date, their slopes set by the group totals. That is true of the reference's own
figure (three countries, two dates, two rays), and its record did not notice.

The reading the rule wants is worth keeping; the axes are not. The pair kept here is **two shares
that can move independently**: how much of Europe's low-carbon electricity a country supplies, and
how much of its own electricity is low-carbon. *Grew and shrank at once* survives, and the scatter
stops being a pair of rays.

## The claim

**All sixteen countries cleaned up their own electricity between 2000 and 2024 — and five of them
now weigh less in Europe's low-carbon total than they did.** France gained 4.2 points at home and
lost 11.8 points of European weight: it produced more, and the others produced faster.

Everything is derived before a mark is drawn, and the plate refuses to render if any country's own
mix got dirtier, if the countries that lost weight are not a minority, or if the subject did not move
up and left.

## What the reference gave

- **Hollow ring for before, filled disc for after, one hue, joined by a curved dotted link — and no
  key for it.** The record's argument is that the convention is old enough that a reader carries it:
  an outline is what a thing *was*, a solid is what it *is*. What the plate spends no key on, the
  standfirst says in prose.
- **Label the later state only.** The label belongs to the entity, and the entity's current position
  is where a reader looks for it. The ring carries nothing.
- **The link is curved and plainly not the shortest path.** A straight segment reads as
  interpolation — as if the source held the states in between. It holds two dates. The bow is a fixed
  fraction of the chord, so a long move bows more than a short one and no arc collapses into the
  straight line it must not be.

What the reference does with **colour** cannot be taken: it gives each of its three entities a hue,
and sixteen hues would be a palette this base does not own. `PALETTE.md` records the substitution —
identity is carried by position and by the label, and colour carries the one thing the headline
argues about.

## The ladder buys room for the names, not just for the plot

Placing the labels after choosing a rung let a rung that cleared the plot's own floor still leave
**five of sixteen entities unnamed** — and the beat then refused a plate whose copy could simply have
been shorter. Every rung is now tried **whole**: laid out, scaled, packed and named, and the first
rung on which all sixteen are named is the one that renders.

Within a rung the seat cascade is: eight directions at five distances, near first; a name that
cannot be seated **degrades to the country's three-letter code** before it is given up; a label that
had to sit far from its mark gets a hairline leader, because at sixteen entities a name a centimetre
from its disc is a name the reader attaches to the wrong disc. How many names degraded, how many are
on a leader and how many x-ticks the axis name cost are all printed on the ladder.

## A note on this form's own evidence

One publication — Ferdio's #70, from an archive whose records this base already marks as
site-chrome contaminated. Below the floor of two, so the form files **no family rules of its own**,
and the one rule of the reference this beat did not keep is refused with a measurement rather than a
preference. `a-narrow-cell-degrades-its-label-rather-than-dropping-it` is the marimekko family's
rule and is **borrowed knowingly** rather than claimed.

## Source

Ember / Energy Institute – Statistical Review of World Energy (2025), via Our World in Data, frozen
beside this beat as `data.csv` — a duplicate of the file `proof/static-stacked-bar-lowcarbon-growth`
carries, copied rather than linked. Low-carbon is the sum of the file's own six low-carbon columns;
the country's own mix is that sum over all nine generation columns.

## The choreography

Sixteen small arcs, each a hollow ring joined to a filled disc, and the field reads as one
statement before any country is named: everything leans upward. The direction of the moves IS the
claim, which is why the eye is meant to stay on the field rather than hunt a label. France is the
exception the accent is spent on — the only long arc, and it runs the other way across the page,
up a little and a long way left. Names sit on the 2024 disc only; the ring carries nothing,
because a reader looks for a country where it is now.

**The eye enters at** `the field of links`. **The claim lands at** `reveal`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the field of links` | `the France pair` |
| reveal | `the move directions` | `the field of links` |
| subject | `the France pair` | — |
| conclusion | `the 2024 labels` | `the field of links` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the field of links",
  "stations": [
    {
      "station": "establish",
      "carries": "the field of links",
      "subordinateTo": "the France pair"
    },
    {
      "station": "reveal",
      "carries": "the move directions",
      "subordinateTo": "the field of links"
    },
    {
      "station": "subject",
      "carries": "the France pair",
      "subordinateTo": null
    },
    {
      "station": "conclusion",
      "carries": "the 2024 labels",
      "subordinateTo": "the field of links"
    }
  ],
  "claimLands": "reveal"
}
```

## Precision

- **All sixteen and the five are counted** — that every one of the sixteen rose at home, and that five of them lost European weight, are two counts over the frozen file.
- **The link runs 2000 to 2024** — the drawn order of each arc is the order of the two states, so a reader reading left to right is not reading the move backwards.
- **The plate refuses a field that disagrees** — if the measured moves do not give the headline's two counts, the beat throws instead of rendering a near miss.
- **Each size rung is tried whole** — the label pass is re-run entire at every rung of the size ladder, so a name that fits at one size is never assumed to fit at the next.
- **Both movements read in one frame** — the home share and the European weight are two axes of the same still; separating them would lose the sentence's "pourtant".

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "all-sixteen-and-the-five-are",
    "the-link-runs-2000-to-2024",
    "the-plate-refuses-a-field-that",
    "each-size-rung-is-tried-whole",
    "both-movements-read-in-one-frame"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "all-sixteen-and-the-five-are",
    "the-path-drawn-order-matches-the": "the-link-runs-2000-to-2024",
    "the-plate-refuses-to-render-if": "the-plate-refuses-a-field-that",
    "every-size-rung-is-tried-whole": "each-size-rung-is-tried-whole",
    "asserted-in-the-one-frame": "both-movements-read-in-one-frame"
  }
}
```
