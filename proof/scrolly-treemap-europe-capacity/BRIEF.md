---
format: scrolly
type: treemap
---

# Beat — L'eau et l'atome portent encore 77 % du bas-carbone européen — mais 10 pays ont déjà basculé (scrolly)

**Type:** treemap (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `treemap` type in the scrolly format, drawn once per filed direction from the same stations, countries, thread,
claim and assertions as `static-treemap-europe-capacity`.

## The choreography

A treemap is a whole divided; the scroll divides the same whole twice — by fuel, then by country — so the reader sees
what the accent means before it lands on countries (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | Europe's installed low-carbon capacity: 469 GW over 8,900 stations; one rectangle whose area is that power | **reveal** | one block |
| 2 | by fuel: hydropower 43 %, nuclear 34 % — water and the atom, 77 %; wind and solar, in the accent, 21 % | **split** | the block divides into squarified fuel cells |
| 3 | by country: France first at 97.2 GW | **re-divide** | the fuel cells give way to country cells |
| 4 | in the accent, the 10 countries where wind and solar are over half the fleet: 14.0 % of the total | **highlight** | the tipped cells, and the tipped remainder, take the accent |
| 5 | France, the largest rectangle, opened by fuel: 65 % nuclear, 14 % wind and solar | **zoom** | France's cell grows to the stage and divides into its fuels |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels, squarified** (Bruls, Huizing & van Wijk) on every paint; the no-script picture is
  the same algorithm in percentages.
- **Every cell carries its own number**: value, subject, basis, given up basis first and value last; a cell that
  cannot hold its value shows nothing.
- **The accent marks the thread, never the maximum**: wind and solar in the fuel view, the tipped countries in the
  country view, and the remainder split along the thread.
- **Every sentence is asserted**: water and the atom over 70 %, at least five tipped countries holding under a quarter,
  the largest cell France and not tipped, hydropower and nuclear the two largest fuels, a tipped country among the
  drawn cells, France under 20 % wind and solar.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
