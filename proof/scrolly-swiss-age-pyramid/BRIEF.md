---
format: scrolly
type: population-pyramid
medium: chart
grounding: supported
---

# Beat — Les femmes passent devant les hommes à partir de 60-64 ans (scrolly)

**Type:** population pyramid. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `population pyramid` type in the scrolly format, drawn once per filed direction from the same 21 bands, shared
mirrored scale and claim as the directed `static-swiss-age-pyramid` renders.

## The choreography

A pyramid compares two sides band by band; the scroll builds the sides, then keeps only what separates them, so the
tipping point is a change of side rather than a small difference in length
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | Switzerland's resident population in 2023 by five-year band, youngest at the bottom; the men, 4,405,220 | **reveal** | the men's bars |
| 2 | the women mirrored, 4,465,340 | **grow** | the women's bars: the pyramid |
| 3 | only the difference in each band: left where men outnumber women, right where women do | **transform** | every band shrinks to its surplus, on a scale fitted to the largest difference |
| 4 | the tipping band, 60-64: 293,052 women for 292,211 men; above it women outnumber men in every band | **mark** | a rule under 60-64, its label and its difference |
| 5 | the oldest: 2.1 women per man at 90-94, 2.9 at 95-99, 4.1 at 100+ | **filter** | the pyramid again, the three oldest bands kept and their ratios written |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels**: one band a row, the ages in a centre gutter, one mirrored zero-anchored scale;
  a phone writes only each scale's largest tick.
- **The tipping point is derived, both halves**: the first band from which women outnumber men in every older band
  while men are at least as many in every younger one.
- **Every sentence is asserted**: the 21 five-year bands in natural order, all 2023; the tipping band 60-64; the
  women-to-men ratio climbing across the three oldest bands and above four at 100+.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
