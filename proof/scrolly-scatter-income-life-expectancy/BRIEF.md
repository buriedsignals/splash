---
format: scrolly
type: scatter
medium: chart
grounding: supported
---

# Beat — Au-delà de 30 000 $ par personne, l'espérance de vie tient dans une bande 3 fois plus étroite (scrolly)

**Type:** scatter (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `scatter` type in the scrolly format, drawn once per filed direction from the same pairs, declared break and
derived spreads as `static-income-life-expectancy`.

## The choreography

The static plate's log axis is a choice a reader rarely sees made. The scroll makes it in front of them, then
measures each side of the break (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | 165 countries; on an ordinary income axis more than half sit in its first tenth | — | the cloud on a linear axis, piled against the left edge |
| 2 | switch income to a logarithmic scale: the rise, then the plateau | **rescale** | every point slides to its log x; the ticks and the axis name change |
| 3 | a break at $30,000: 124 below, 41 above | **rule** | the break drawn down the plot |
| 4 | below: 40.3 years (Central African Republic) to 81.4 (Portugal), 41 years | **measure + filter** | the spread's band; the two extremes ringed and named; the points above step back |
| 5 | above: 71.2 (Seychelles) to 85.1 (Hong Kong), 14 years, three times narrower | **measure + filter** | the band over the break; its extremes; the points below step back |
| 6 | correlation, not causation | **pull back** | the static plate: the break, the band above, both claims |

## Precision

- **Placed in the reader's pixels**: the SVG's viewBox is the stage; point radius grows with the width.
- **The break is declared, the spreads derived**; the ratio is asserted above 2.5 and printed as "3" only when it
  rounds to it. The 2022 artefact (a reading under 35 years) is refused, as in the static beat.
- **On a narrow stage** the plot takes the larger band the resting card leaves free; the two claims take a line
  each and the axis name wraps.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
