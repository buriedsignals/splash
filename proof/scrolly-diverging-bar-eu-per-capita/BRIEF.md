---
format: scrolly
type: diverging bar
medium: chart
grounding: supported
---

# Beat — La Croatie est le seul pays de l'UE à émettre plus de CO₂ par personne qu'en 1990 (scrolly)

**Type:** diverging bar (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `diverging bar` type in the scrolly format, drawn once per filed direction from the same frozen CSV,
reader, claim and assertions as `static-diverging-bar-eu-per-capita`. The reader is copied, not imported, so
this beat renders on its own.

## The choreography

A change is two levels subtracted. The scroll shows both before it shows the difference, then gives the one
rise a length (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | in 1990, Luxembourg 30.9 t per person, Estonia 23.5 t | — | 27 bars of 1990 levels, sorted |
| 2 | in 2024 the bars shorten: 26 of 27 emit less | **rescale + count** | each bar shortens to its 2024 level, the 1990 length kept as an outline; "26 pays sur 27 émettent moins" counts |
| 3 | keep only the change | **re-encode + reorder** | each bar leaves the level axis for the change axis out of a zero line, then the rows re-sort from the rise to the largest fall |
| 4 | the only rise: Croatia, +0.03 t on 4.73 t, 0.67 % | **zoom** | the axis closes onto −0.5…+0.1 t; Croatia's bar gets a length; every other bar steps back |
| 5 | the 26 others fall by 4.93 t on average; Luxembourg −20.48, Estonia −17.40 | **rule + filter** | the mean drawn down the chart; the eight countries past it kept, their values in bold |
| 6 | the reading line | **pull back** | every row, Croatia in the accent, the mean |

## Precision

- **Laid out in the reader's pixels**: a row is the stage's height over 27; the name and value columns as
  wide as their widest text, measured on each resize; the plot takes the rest. Ticks change set with the
  axis (levels, change, close-up), one set at a time.
- **The re-encoding happens in two halves**: first the geometry (level bar to change bar) in the level
  order, then the re-sort, so a bar never travels and changes length at once.
- **Every sentence is asserted**: 27 members read in both years, exactly one rise, the two highest 1990
  levels are the two largest falls (cards 1 and 5 name them), the close-up's domain holds the rise.
- **French names**, with the article each sentence needs; the static plate prints English names.
- `→` is not in the embedded faces, so the unit reads "variation de 1990 à 2024".

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
