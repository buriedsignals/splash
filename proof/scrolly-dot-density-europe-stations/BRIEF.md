---
format: scrolly
type: dot density
---

# Beat — 72 réacteurs sur 8 900 centrales bas-carbone — et un tiers de la puissance (scrolly)

**Type:** dot density (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone
to a wide desktop.

The `dot density` type in the scrolly format, drawn once per filed direction from the same stations, claim and
assertions as `static-dot-density-europe-stations`.

## The choreography

A dot map gives two readings a bar chart cannot — the count of places and the weight of each. The scroll gives
them one after the other, on the same dots (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | the database lists 8,900 low-carbon stations here, each at its coordinates | — | the land, empty |
| 2 | one dot per station, fuel by fuel | **reveal + count** | solar, wind, hydro, biomass, geothermal, tidal sprinkle in, most numerous first; "8 828 centrales" counts |
| 3 | 72 are missing: the nuclear sites, 0.8 % | **reveal + filter** | the 72 arrive ringed; every other station steps back |
| 4 | give each dot the area of its capacity: 34.4 % of the capacity | **re-encode** | every dot takes the area of its MW; solar turns to dust, nuclear swells; the key becomes a size key |
| 5 | France, 19 of the 72: 3,323 MW per nuclear site, 6.0 MW per solar site | **zoom** | the camera closes on France |
| 6 | the reading line and the database's limit | **pull back** | one dot per station again, nuclear ringed |

## Precision

- **Vectors, not the MapTiler plate**: Natural Earth land in the equal-area projection the static plate's
  window was sized in, clipped to a margin past the frame. The source line says so.
- **One canvas** redrawn in the reader's pixels: the land as one path, dots largest first so a small station
  is never buried, the nuclear rings last.
- **The whole-map view is the box the stations fill** (1st–99th percentile each way), not the window whose
  corners are Greenland and the Sahara: on a phone the window left Europe a strip in the middle of the stage.
- **Sizes in pixels**: a count dot 1.1–2.2 px; at full weight the largest site takes the radius the stage
  allows and every other the radius its capacity's area gives it; both grow gently with the zoom.
- **Every sentence is asserted**: nuclear under 1 % of sites and over 30 % of capacity, the most concentrated
  fuel; the close-up's country is the one with most of the sites, and its nuclear site outweighs its solar site
  by more than a hundred times.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
