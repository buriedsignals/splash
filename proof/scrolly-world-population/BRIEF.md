---
format: scrolly
type: area
medium: chart
grounding: supported
---

# Beat — La population mondiale a dépassé 8 milliards en 2022 (scrolly)

**Type:** area. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide desktop.

The `area` type in the scrolly format, drawn once per filed direction from the same frozen World series (1800–2023)
and claim as `static-world-population`. That static predates the design base and is set in English; this beat is set in
French through the filed directions.

## The choreography

An area of a stock shows the level; the scroll counts it billion by billion, turns the counting into durations, then
shows the rate the level hides (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | 0.98 billion in 1800; the first billion in 1805 | **trace** | the playhead fills the area to 1805, the crossing marked |
| 2 | the second billion in 1927, 122 years later | **trace** | the area to 1927 |
| 3 | then 3 billion in 1960, 4 in 1975, 5 in 1987, 6 in 1998, 7 in 2010, 8 in 2022; 8.09 billion in 2023 | **trace** | the area to 2023, every billion marked as it is reached |
| 4 | the time each billion took: 122 years, 33, 15, 12, 11, 12, 12 | **transform** | the area gives way to one bar a billion |
| 5 | growth peaked at 2.2 % a year in 1964; 0.9 % in 2023 | **rescale** | the area's outline morphs from the population into its annual growth rate, the peak marked |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels**: one column a year, 0 to 9 billion up; the rate reuses the same columns on its own
  0–2.5 % scale so the outline morphs rather than cuts.
- **Every year is read off the frozen series**, never typed: crossings, gaps, the rate's peak.
- **Every sentence is asserted**: only World rows, every year 1800–2023, the first billion in 1805 and the eighth in
  2022, the second billion over a century and each of the last five 15 years or less, the growth peak in the 1960s and
  the 2023 rate under half of it and still positive.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
