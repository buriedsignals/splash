---
format: scrolly
type: sankey
medium: chart
grounding: supported
---

# Beat — Le nucléaire de ces six pays est français à 84 % (scrolly)

**Type:** sankey (bipartite: source → country). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic,
from a phone to a wide desktop.

The `sankey` type in the scrolly format, drawn once per filed direction from the same data, source order, claim and
assertions as `static-sankey-electricity-sources`.

## The choreography

A sankey answers a two-sided question; the scroll asks it one side at a time — where one source goes, then where one
country's electricity comes from (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | six countries, 1,638 TWh: nine sources on the left, six countries on the right, the same total on both | **reveal** | the two rails, no ribbons |
| 2 | nuclear, the largest source: 380.5 TWh of its 455.1 go to France, 84 % | **trace** | nuclear's ribbons grow to the countries; each one's share of nuclear written at the country |
| 3 | every source to every country: 54 ribbons | **trace** | the rest of the web grows |
| 4 | read back from France: 67.7 % nuclear | **filter** | France's ribbons kept, the rest stepping back; each ribbon's share of France written at its source |
| 5 | read back from Germany, the second producer: no nuclear; wind 28.5 %, coal 21.4 %, gas 15.8 % | **filter** | Germany's ribbons kept, the same way |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Conservation is drawn in the reader's pixels**: one scale for both rails, each rail spreading its own nodes over
  the stage, so the ribbons out of a node add up exactly to the node on either side; a flow under a pixel keeps a
  minimum width.
- **Shares are written where they can be read**: a share on the tracked ribbon takes whichever ink reads on the
  accent; every other sits on a halo; a share under 2 % of its country is not written. A phone sets each node's total
  under its name and writes the shares without the source name or the TWh the rails already carry.
- **Every sentence is asserted**: conservation on both rails, 54 flows, nuclear the largest source, France holding at
  least four fifths of it, no German nuclear, wind, coal and gas Germany's three largest sources in that order.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
