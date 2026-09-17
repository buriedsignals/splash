---
size: landscape
type: sankey
format: static
medium: chart
grounding: supported
derived: v1
---

# Beat — The nuclear power of these six countries is 84 % French

**Type:** sankey (bipartite: source → country). **Medium/format:** chart / **static**.
**Size:** landscape (1920 x 1080), pinned in the front matter above.

## Claim

In 2024, six European countries — France, Germany, Norway, Poland, Sweden, Switzerland — generated
1 637.5 TWh of electricity from nine sources. **Nuclear is the largest of the nine at 455.1 TWh, and
380.5 TWh of it — 83.6 % — is generated in France alone.** France's own mix is 67.7 % nuclear;
Germany, the second-largest generator on the plate, has none.

Every figure is computed in `render-directions.mjs` from the frozen `data.csv` and asserted before
the render: that nuclear is the largest source, that France holds at least four fifths of it, and —
the form's own promise — that **every node's total equals the sum of its own ribbons**, on both
sides, to within a rounding tolerance.

## Why a sankey rather than a stacked bar

Because the question is *where does each source go*, and a sankey is the only form on the shelf that
answers a two-sided question with one mark per pair. The plate carries **54 flows** — nine sources
into six countries — and the smallest of them is under a hundredth of a per cent of the total.
Conservation is what makes that legible: the ribbons out of a node add up to the node, and the node
prints its own number.

## What the harvest gave this beat

Seven references, four of them independent publications actually drawing energy flows: LLNL's
national energy flowcharts, the IEA's energy sankey, Eurostat's, and Carbon Brief's offsets
diagram. Four rules two or more of them agree on are filed as treatments — every node carries its
own total, the neutral is the largest area, ribbons are translucent so crossings are honest, and a
flow too small to draw is still drawn.

The one thing the corpus does NOT agree on is whether hue travels with a source across the stages
(the IEA) or sits on the nodes with the ribbons left neutral (Carbon Brief). The condition is
legible in their own records — colour can travel only where a reader could follow one ribbon — and
this plate is bipartite with one tracked flow, so it takes Carbon Brief's answer.

## Source

Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data ·
electricity generation by source, TWh, 2024. Frozen beside this beat as `data.csv`, a copy of the
file `proof/static-wind-vs-solar` uses, per this corpus's "duplicate, do not link" ruling.

## The choreography

One ribbon is twice the thickness of anything else on the plate and it is the only coloured one,
so the eye enters on it and nowhere else. It leaves the nuclear rail and arrives at France, and
both of those nodes print their own total beside their own bar — 455,1 on the left, 561,8 on the
right — so the thickness can be turned into a share without a legend. The other fifty-three
ribbons are what make that thickness mean something: translucent, so a crossing darkens instead of
hiding what it passes over, and grey so the argument stays one colour.

**The eye enters at** `the nuclear-France ribbon`. **The claim lands at** `establish`.

| station | carries | subordinate to |
| --- | --- | --- |
| establish | `the nuclear-France ribbon` | — |
| reference | `the nuclear node` | `the nuclear-France ribbon` |
| reveal | `the remaining fan` | `the nuclear-France ribbon` |
| conclusion | `the France node` | `the nuclear-France ribbon` |

```json splash:choreography
{
  "kind": "frame",
  "entry": "the nuclear-France ribbon",
  "stations": [
    {
      "station": "establish",
      "carries": "the nuclear-France ribbon",
      "subordinateTo": null
    },
    {
      "station": "reference",
      "carries": "the nuclear node",
      "subordinateTo": "the nuclear-France ribbon"
    },
    {
      "station": "reveal",
      "carries": "the remaining fan",
      "subordinateTo": "the nuclear-France ribbon"
    },
    {
      "station": "conclusion",
      "carries": "the France node",
      "subordinateTo": "the nuclear-France ribbon"
    }
  ],
  "claimLands": "establish"
}
```

## Precision

- **The 84 % is a ribbon over a node** — 380,5 TWh of French nuclear over 455,1 TWh of nuclear in the six countries, both read off the frozen file.
- **Every node equals the sum of its ribbons** — on both rails, to within a stated rounding tolerance, because a Sankey whose nodes do not balance is a picture of an arithmetic that does not hold.
- **One pixels-per-unit scale for the whole diagram** — every node height and every ribbon thickness is on the same scale, or a thickness could not be read as a share.
- **The headline share is asserted before the render** — the 84 % is computed and checked before anything is drawn, not read back off the ribbon.
- **Fifteen node totals printed at rest** — every node carries its own number in the one frame, which is what lets a reader take the ratio the headline took.

```json splash:precision
{
  "kind": "frame",
  "rounding": null,
  "asserts": [
    "the-84-is-a-ribbon-over",
    "every-node-equals-the-sum-of",
    "one-pixels-per-unit-scale-for",
    "the-headline-share-is-asserted-before",
    "fifteen-node-totals-printed-at-rest"
  ],
  "values": {},
  "labels": [],
  "covers": {
    "claim-datum": "the-84-is-a-ribbon-over",
    "every-node-total-equals-the-sum": "every-node-equals-the-sum-of",
    "one-pixels-per-unit-scale-for": "one-pixels-per-unit-scale-for",
    "the-headline-share-is-computed-from": "the-headline-share-is-asserted-before",
    "asserted-in-the-one-frame": "fifteen-node-totals-printed-at-rest"
  }
}
```
