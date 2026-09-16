---
format: scrolly
type: small-multiples
---

# Beat — Tous ont progressé, et les plus bas le plus vite (scrolly)

**Type:** small multiples (sixteen paired-bar panels). **Medium/format:** chart / **scrolly**. **Frame:** the whole
graphic, from a phone to a wide desktop.

The `small multiples` type in the scrolly format, drawn once per filed direction from the same data, shared scale,
claim and assertions as `static-small-multiples-lowcarbon`.

## The choreography

A grid of panels shows a pattern by the order its panels are read in; the scroll changes that order, then condenses
the panels into the one picture that measures the pattern (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | sixteen panels, alphabetical, the 2000 bar: from 1.6 % in Poland to 96.7 % in Sweden, one scale | **reveal** | the grid, one bar a panel |
| 2 | 2024: sixteen of sixteen rise | **grow** | the second bars grow, every gain written |
| 3 | ordered from lowest to highest in 2000: the gains shrink along the grid | **reorder** | the panels travel to their new slots |
| 4 | each panel a point, 2000 level across, gain up: correlation −0.76 | **condense** | the panels collapse into a scatter, the fitted line drawn, Denmark and Sweden named |
| 5 | ordered by gain: Denmark +74, Sweden +2 | **reorder + highlight** | the panels come back in gain order, the extremes in the accent |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels**: six panels a row on a wide stage, four on a narrow one; one scale, 0 to 100 %,
  for every bar; a name wider than its cell set smaller rather than run into its neighbour's.
- **The scatter is the grid's own data**: every point is a panel's 2000 level and gain, the line their least-squares
  fit, computed in node; a name beside a point turns left when the right would push it off the stage.
- **Every sentence is asserted**: all sixteen rose, the correlation between the 2000 level and the gain below −0.5,
  the smallest gain belonging to the highest starter, the data inside the 0–100 % scale and the scatter's 0–80 axis.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
