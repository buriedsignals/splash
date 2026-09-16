---
format: scrolly
type: line
---

# Beat — En 2024, la Suisse a émis moins de CO₂ sur son territoire qu’en 1967 (scrolly)

**Type:** line. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide desktop.

The `line` type in the scrolly format, drawn once per filed direction from the same frozen series, 1967 reference and
claim as `co2-suisse`. Set in French through the filed directions — see `PALETTE.md`.

## The choreography

A line carries its value in its slope; the scroll draws it, so the reader meets the reference before the curve comes
back under it, then looks closely at the margin the headline rests on
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | from 1950 to 1967 emissions triple, 10.3 to 32.5 Mt; that level is the reference | **draw** | the line drawn to 1967, the 1967 level set as a dashed rule |
| 2 | the rise goes on to 46.2 Mt in 1973, the highest of the series | **draw** | the line reaching the peak, marked |
| 3 | a long plateau: 1974–2010 never under 36.6 Mt; 1991 within 0.07 Mt of the peak | **highlight** | the line drawn to 2010, the plateau shaded as a band, 1991 marked |
| 4 | after 2010 the curve comes down; in 2023 it goes under the 1967 level for the first time | **draw** | the fall drawn to 2024, the first year under the rule ringed |
| 5 | close up: 32.0 Mt in 2023, 32.1 in 2024, still 0.5 Mt under 1967 | **zoom** | both scales travelling to 2015–2024, every year a dot and its value |
| 6 | territorial emissions only | **pull back** | the static plate: the rule, the peak, the 2024 point |

## Precision

- **Laid out in the reader's pixels**: both scales interpolated between the wide view (from zero) and the close-up,
  every mark and label following them, the plot clipped so the close-up hides what it leaves out.
- **Values rounded to tenths before formatting**, in every sentence and label alike.
- **Furniture labels carry numbers only**: some directions set the annotation register in capitals, where "Mt" would
  read as another unit; the unit stands in the header.
- **Every sentence is asserted**: only Switzerland in the file, every year from 1950 present, the 1950→1967 ratio a
  tripling, 1973 the highest year of the whole series, 1991 the runner-up within 0.1 Mt, every year after 2010 below
  2010, 2023 the first year after 1967 under its level, 2024 under it and above 2023.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
