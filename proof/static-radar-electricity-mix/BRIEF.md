---
size: landscape
type: radar
format: static
medium: chart
grounding: supported
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
