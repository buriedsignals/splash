---
format: scrolly
type: heatmap
medium: chart
grounding: supported
---

# Beat — Le charbon a reculé dans les douze pays européens qui en dépendaient le plus ; seule la Pologne reste au-dessus de la moitié (scrolly)

**Type:** heatmap (matrix). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `heatmap` type in the scrolly format, drawn once per filed direction from the same frozen readings, twelve
countries and claim as `static-heatmap-coal-share-europe`. That beat is set in English; this one is set in French
through the filed directions — see `PALETTE.md`.

## The choreography

A matrix of years reads left to right; the scroll fills it in that order, stops where the pattern breaks, then turns the
rows into a ranking (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the twelve most coal-dependent in 2010; Poland first at 87.1 % | **reveal** | the 2010 column alone, its values written |
| 2 | year after year the shade fades; by 2021, four under 10 % | **scrub + count** | the columns fill one at a time, the value column and the header count follow the year |
| 3 | 2022, the gas crisis: Bulgaria, Germany and Czechia up more than 3 points, Greece back over 10 % | **highlight** | the 2022 column outlined, those four cells marked |
| 4 | 2024: all twelve below 2010; six under 10 %, Poland alone above half at 54.3 % | **filter** | the grid complete, Poland's 2024 cell marked, the rows neither under 10 % nor above half stepping back |
| 5 | sorted by fall, the United Kingdom first at −98 %; Poland −38 % | **reorder** | the rows travel into their relative fall, the fall written in the value column |
| 6 | the twelve are a selection by 2010 dependence, not a picture of Europe | **pull back** | the 2010 order again, the 2010 values beside the 2024 ones |

## Precision

- **Five classes whose breaks are the thresholds the cards read** (10 %, 25 %, 50 %, 75 %); the palest stop walks from
  the ground toward the accent until it clears 3:1, so it keeps the accent's hue.
- **Laid out in the reader's pixels**: the name column and the value columns as wide as their widest text; a card's own
  year is read exactly; on a phone the last year's label gives way to the value column's own.
- **Every sentence is asserted**: twelve countries, every year 2010–2024 present, Poland first in 2010, the countries
  under 10 % in 2021 counted, exactly three jumps above 3 points in 2022 and Greece alone back over 10 %, all twelve
  below 2010 in 2024, six under 10 %, Poland alone above half, the United Kingdom the steepest relative fall.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
