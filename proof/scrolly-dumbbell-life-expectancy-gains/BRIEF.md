---
format: scrolly
type: dumbbell
medium: chart
grounding: supported
---

# Beat — La Pologne a gagné 5,0 ans d’espérance de vie depuis 2000, les États-Unis 2,5 (scrolly)

**Type:** dumbbell. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `dumbbell` type in the scrolly format, drawn once per filed direction from the same frozen readings, ten countries
and claim as `more-dumbbell-life-expectancy-gains`. That beat compares two years; this one keeps every year between
them, so the scroll can carry each country's later dot there and back. Set in French through the filed directions —
see `PALETTE.md`.

## The choreography

A dumbbell shows two states and the gap between them; the scroll lets the reader watch the second state get there,
including the step back the two ends of the plate hide (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | ten countries in 2000; Japan first at 81.2, Poland last at 73.6 | **reveal** | ten dots, ordered by their 2000 value |
| 2 | each country moves on, year by year, to 2019; all live longer than in 2000 | **scrub** | a second dot travels right, a bar drawn behind it, the year counting in the header |
| 3 | Covid: in 2021, 9 countries of 10 stepped back; the United States −2.5 years since 2019, Poland −2.3 | **reverse** | the dots move back, the 2019 value left as a dashed ring, the two losses written |
| 4 | in 2023 all are above 2000; Poland gained most, +5.0 | **complete** | the dumbbells finished, every gain written in its column |
| 5 | sorted by gain, the United States last: +2.5, 79.3 years; only Poland lives shorter | **reorder** + **filter** | the rows travel into gain order, the United States kept, the rest stepping back |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels**: names in a left column, gain (or loss) in a right column, one fitted value
  scale between them, not anchored at zero (a position encoding); room kept on the right for a head value beside the
  highest dot.
- **Between two years the head is interpolated**; a card's own year is read exactly. Values are rounded to tenths
  before formatting, in the runner and in the driver alike, so a sentence and a dot never disagree.
- **Every sentence is asserted**: every year 2000–2023 present for all ten; Japan highest and Poland lowest in 2000;
  all ten above 2000 in 2019; most fell 2019–2021, the United States then Poland the largest losses; all ten gained by
  2023, Poland most and the United States least; Poland then the United States the two lowest in 2023.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
