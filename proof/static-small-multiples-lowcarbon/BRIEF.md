---
size: landscape
type: small-multiples
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — All sixteen rose, and the lowest starters rose fastest

**Type:** small multiples. **Medium/format:** chart / **static**. **Size:** landscape (1920 x 1080),
pinned in the front matter above, which is the statement that counts.

The first `small multiples` beat in this tree.

## Why this beat draws the same data as the slope, deliberately

`proof/static-slope-europe-lowcarbon` draws the same sixteen countries on the same two dates and can
carry **six** of them. A slope has no value axis, so it owes every end value it prints, and sixteen
labels on one rail push each other off their own lines — the component measures that and refuses.

Split into panels, each pair gets its own space and its own number, and **all sixteen fit**. The cut
bought the count. That is the argument for this family, and having the two beats side by side is what
makes it checkable rather than asserted.

## The claim

**All sixteen countries raised their low-carbon share between 2000 and 2024, and the ones that
started lowest rose most.** Denmark, second-lowest in 2000, gained 74 points; Sweden, already at
96.7 %, gained 2.

The second half is a claim about a *pattern*, so it is derived rather than eyeballed: the correlation
between the 2000 level and the gain is computed and asserted to be clearly negative (it is −0.76). A
grid of panels is exactly the form that makes such a pattern visible, and exactly the form in which
it would be easy to believe one that was not there.

## What the corpus decided

`panels-share-one-scale-or-they-are-not-multiples` — one scale, 0 to 100 %, governs all sixteen.
Ferdio's words: that is what separates this from sixteen unrelated charts in a grid.

`the-cut-replaces-the-boundary` — no rules between panels, no alternating tint, no grid. The gap is
the boundary. Each panel draws its own short baseline, exactly as wide as its own pair, because a gap
that means "new axis" has to look like one.

`what-is-shared-is-stated-once-and-what-varies-is-repeated` — the two dates and the shared ceiling
are common to every panel and are stated once, in the key. The country's name and its delta belong to
the panel and are drawn in it. The test the treatment sets: a reader looking at one panel can read it.

## The defect that was invisible to every guard

The first render reserved the panel's block and let the grid divide what was left. That put each
name 7px under its own bars and 12px under the **previous** panel's delta. Nothing collided, every
guard was green, and `Grèce` read as though it belonged to Denmark's block. On a grid, **proximity is
the grouping** — it is the only thing saying which name goes with which pair — so the gap between
panels is now part of what a panel owes, and the plate checks that it is at least twice the gaps
inside one before it draws.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data. The 2000
and 2024 rows for the sixteen countries are frozen beside this beat as `data.csv`, duplicated rather
than linked, so the beat renders and audits alone.

## The choreography

The grid is read before any panel is. Sixteen identical cells, same scale, same pair of bars, and
the eye travels along them the way it travels along a sentence. Each panel still has to stand
alone — its name above it and its gain under it, drawn IN the cell, with nothing between cells but
the cut itself. The key states once what is shared: the two dates and the 0-100 % ceiling. What
the claim actually rests on is the ORDER: the panels run from the largest gain to the smallest,
and the pale 2000 bar grows as the gain shrinks. That is the pattern, and it is the last thing
read because it is the only thing no single panel contains.

**The eye enters at** `the grid`. **The claim lands at** `conclusion`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the grid` | `the panel order` |
| reference | `one panel` | `the grid` |
| reveal | `the shared key` | `the grid` |
| conclusion | `the panel order` | — |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the grid",
  "stations": [
    {
      "station": "establish",
      "carries": "the grid",
      "subordinateTo": "the panel order"
    },
    {
      "station": "reference",
      "carries": "one panel",
      "subordinateTo": "the grid"
    },
    {
      "station": "reveal",
      "carries": "the shared key",
      "subordinateTo": "the grid"
    },
    {
      "station": "conclusion",
      "carries": "the panel order",
      "subordinateTo": null
    }
  ],
  "claimLands": "conclusion"
}
```

## Precision

- **Sixteen rose, and the pattern is computed** — that all sixteen gained is a count; that the lowest starters gained most is a correlation, computed here and asserted clearly negative.
- **Every panel keeps the same 0-100 scale** — the axis scale is asserted equal across the sixteen, because a grid whose panels rescale themselves makes any pattern a reader wants to see.
- **The pattern is derived, not eyeballed** — a claim about a pattern in a grid is the one this form makes easiest to believe when it is not there, so it is derived before it is drawn.
- **The cut between panels is measured** — the gap between panels is checked to be at least twice the gap inside a panel's own pair before the plate draws, so the cut reads as the boundary.
- **Sixteen pairs in one grid** — every panel is on the plate at once; the order only argues anything if the reader can run along the whole of it.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "sixteen-rose-and-the-pattern-is",
    "every-panel-keeps-the-same-0",
    "the-pattern-is-derived-not-eyeballed",
    "the-cut-between-panels-is-measured",
    "sixteen-pairs-in-one-grid"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "sixteen-rose-and-the-pattern-is",
    "every-panel-keeps-the-same-axis": "every-panel-keeps-the-same-0",
    "a-claim-about-a-pattern-is": "the-pattern-is-derived-not-eyeballed",
    "the-gap-between-panels-is-checked": "the-cut-between-panels-is-measured",
    "asserted-in-the-one-frame": "sixteen-pairs-in-one-grid"
  }
}
```
