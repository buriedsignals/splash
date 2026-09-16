---
format: scrolly
type: marimekko
medium: chart
grounding: supported
---

# Beat — Le charbon fait 12 % de l'électricité de ces six pays, et il tient dans deux colonnes (scrolly)

**Type:** marimekko (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `marimekko` type in the scrolly format, drawn once per filed direction from the same data, columns, claim and
assertions as `static-marimekko-electricity-mix`.

## The choreography

A marimekko reads a mix first and a quantity second; the scroll gives the columns their width, then gathers the one
source the headline is about (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | six countries' generation by source, each column 100 % | **reveal** | six columns of equal width, sources named at the right |
| 2 | each column takes the width of its generation, 562 TWh to 78 TWh | **rescale** | the columns widen and narrow; totals written under them |
| 3 | coal alone: 200.9 TWh, 12 % of the six | **filter** | every band but coal steps back |
| 4 | gathered into one column, Germany and Poland hold 99.5 % | **gather** | the coal bands leave their columns for one column, area kept, each piece named |
| 5 | every source back in its place | **reverse** | the bands return, the sources named again |
| 6 | the reading line | **pull back** | the static plate, shares written inside the bands that hold them |

## Precision

- **Area kept**: the gathered column is the coal share of the plot wide and the whole plot tall, so a TWh is the same
  area in its column and in the gathered one.
- **Laid out in the reader's pixels**: a share is written only where its band holds it; a narrow stage names its
  columns on up to three rows, puts the sources in a legend row under the plot, and names the gathered pieces beside
  their column when it is too narrow to hold them.
- **Every sentence is asserted**: every source stacked, the bands summing to each column, coal at 12 % of the six, the
  two largest holders at 95 % of the coal or more.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
