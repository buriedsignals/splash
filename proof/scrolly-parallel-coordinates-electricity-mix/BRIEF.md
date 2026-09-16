---
format: scrolly
type: parallel-coordinates
medium: chart
grounding: supported
---

# Beat — Deux pays sur 16 font les deux : plus de 25 % de nucléaire et plus de 20 % d'éolien (scrolly)

**Type:** parallel coordinates (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `parallel coordinates` type in the scrolly format, drawn once per filed direction from the same data, axis order,
floors, claim and assertions as `static-parallel-coordinates-electricity-mix`.

## The choreography

Parallel coordinates only show a relationship between adjacent axes; the scroll builds the argument on the two axes
that carry it, then unfolds the rest of the mix (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the nuclear share of sixteen countries; five above 25 % | **reveal** | one axis, sixteen points, the floor drawn, the five named |
| 2 | wind beside it; ten above 20 % | **add + trace** | a second axis stands, a line grows from each point to it, the ten named |
| 3 | the lines cross, correlation −0.4; only Finland and Sweden clear both | **filter + highlight** | the two lines take the accent, the fourteen step back |
| 4 | the rest of the mix, each axis on its own scale | **unfold** | five more axes arrive one by one, every line growing toward each |
| 5 | Finland and Sweden followed: hydro and bioenergy complete their mix, gas and coal under 2 % each | **follow** | the two lines' values written on every axis |
| 6 | the reading line | **pull back** | the static plate, every line named once |

## Precision

- **Laid out in the reader's pixels**: the axes stand as a block whose spacing is capped, left of the resting card on
  a wide stage and centred on a narrow one, until all seven need the whole width; axis names take a second row and the
  ceilings drop their unit when the rails are close.
- **The static plate's naming rule kept**: every line named once, at the axis where its own value is highest, never
  across another rail — except the two accented lines, which are always named and may cross a rail on their halo.
- **Every sentence is asserted**: one to three countries clearing both floors, a real group behind each floor, a
  correlation below −0.2, gas and coal each under 2 % and hydro plus bioenergy at least 20 % for the accented countries.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
