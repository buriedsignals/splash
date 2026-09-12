---
size: landscape
type: sankey
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
