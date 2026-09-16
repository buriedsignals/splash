---
format: scrolly
type: slope
---

# Beat — La part renouvelable de l'électricité allemande a presque doublé en neuf ans (scrolly)

**Type:** slope. **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide desktop.

The `slope` type in the scrolly format, drawn once per filed direction from the same six countries, two years and claim
as `static-renewables-shift`. That static predates the design base and is set in English; this beat is set in French
through the filed directions — see `PALETTE.md`.

## The choreography

A slope says how much a line climbed; the scroll then asks where the climb came from and how much room there was — the
two questions a slope cannot answer on its own (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | renewable share in 2015, from 98 % in Norway to 14 % in Poland | **reveal** | the 2015 rail alone |
| 2 | in 2024 every country draws its slope: all six rise | **grow** | the slopes grow to the 2024 rail |
| 3 | Germany from 29 % to 59 %, +29.2 points, the steepest of the six | **filter** | Germany in the accent, the rest stepping back |
| 4 | where the gain came from: wind and solar +24.9 points; what gave way: coal −21.1, nuclear −14.4 | **decompose** | the slope gives way to Germany's change as bars either side of zero, gains in the accent |
| 5 | not everyone started from the same place: Germany had 71 points to gain, Norway 2 | **transform** | the slope gives way to one bar a country, 0 to 100 %: its 2015 share filled, the room left dashed and numbered |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels**: one scale, 0 to 100 %, for both rails; labels relaxed so no two touch; the room card is its own picture, never drawn over the slope; a phone
  names each country once — at the first rail alone, then at the second — and sets each group's name above its bar.
- **The decomposition is closed**: every source falls into exactly one group, and the groups' changes sum to zero.
- **Every sentence is asserted**: every source counted, all six rose, Germany the steepest and nearly doubling, wind
  and solar the largest gain and coal the largest loss, Norway the highest in 2015 with under 3 points of room.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
