---
format: scrolly
type: heatmap
---

# Beat — Sept pays européens tirent plus de 94 % de leur électricité de sources bas-carbone — par trois chemins différents (scrolly)

**Type:** heatmap (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a
wide desktop.

The `heatmap` type in the scrolly format, drawn once per filed direction from the same data, selection rule, floor,
three routes and assertions as `static-heatmap-europe-electricity`. (`static-heatmap-coal-share-europe` has no
directed render and is not this beat's source.)

## The choreography

A matrix's own move is re-ordering its rows; the scroll does it twice, once to rank and once to group
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | twelve countries: the seven above 94 % and the five largest producers | — | the grid, rows in alphabetical order, every cell empty |
| 2 | each cell is a source's share, in six classes | **fill** | the cells take their class family by family: renewables, nuclear, fossil |
| 3 | sorted by low-carbon share: seven clear 94 % | **reorder** | the rows slide to their share order, the share column appears, the seven bracketed |
| 4 | three routes: without nuclear, by nuclear, by both | **regroup** | the seven split into three blocks with a gap between routes, each named; the other five step back |
| 5 | the "other renewables" column has one dark cell: Iceland's geothermal, 29.2 % | **isolate** | every other column steps back; Iceland's cell outlined |
| 6 | the reading line | **pull back** | the static plate's sorted matrix and bracket |

## Precision

- **Rows slide** between three orders — alphabetical, by share, by route — interpolated, never jumping.
- **Laid out in the reader's pixels**: name and share columns as wide as their widest text, nine cell columns in
  between, route labels to the right on a wide stage. Source heads fall back to two-letter forms when a full name
  does not fit, with a key of the abbreviations under the legend; family heads fall back to a short form, then to
  their rule alone.
- **Every sentence is asserted over the whole file**, not the drawn rows: seven above the floor, the partition into
  three non-empty routes, Iceland the largest "other renewables" share and every other drawn row under 5 % there.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
