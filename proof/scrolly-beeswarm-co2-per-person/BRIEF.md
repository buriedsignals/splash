---
format: scrolly
type: beeswarm
---

# Beat — Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l'humanité (scrolly)

**Type:** beeswarm (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `beeswarm` type in the scrolly format, drawn once per filed direction from the same data, claims,
assertions, derived callouts and words as `static-beeswarm-co2-per-person`.

## The same plate, read in order

| card | what the card says | what the picture shows |
| --- | --- | --- |
| 1 | a circle is a country, placed by its tonnes per person; its surface is its population | the field |
| 2 | the largest circle is India, 2,1 t — below the median country, 3,1 t | India ringed, its card and hairline |
| 3 | the world average, 4,6 t, is above what 64 % of people emit | the average's rule and label |
| 4 | past 20 t, 6 countries, 0,6 % of humanity; the farthest, Qatar, 40,1 t; the plate's reading line | Qatar ringed, its card and hairline |

## The static plate's rules, and what the fluid frame asks of them

- **Marks are pushed only perpendicular to the axis**, largest first; the radius runs on the square
  root of population, its largest rung walked down until the swarm fits its band.
- **The field is furniture, the cases are ink**: a tint of the accent for 213 circles, a ring and a
  card for the two named ones, which are derived — the largest and the farthest — not chosen.
- **Cards sit above the field, never over it**, pushed apart along the axis and clamped to the frame.
- **The axis name and its ticks share a row**; a tick that would touch the name gives way.
- **The packing runs where the frame is known.** A swarm packed at one size is wrong at every other,
  and a stretched circle is an ellipse, so `swarm-layout.mjs` is one implementation used twice: in
  node for the reference render a reader without a script gets, and in the page on every resize, with
  the field's viewBox set to the plot's own pixels.
- **The block is centred**: the cards just above the swarm and the average's label just under it,
  rather than cards at the top of a band as tall as the plot with hairlines a third of a screen long.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
