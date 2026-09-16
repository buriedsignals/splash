---
format: scrolly
type: hex grid
medium: map
grounding: supported
---

# Beat — Par habitant, ce n'est pas l'Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants (scrolly)

**Type:** hex grid (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `hex grid` type in the scrolly format, drawn once per filed direction from the same readings, designed layout,
rates and assertions as `static-hex-grid-europe-protection`.

## The choreography

The static plate is the flow map's pair: counts on one, rates on the other. The scroll puts both on the same cells,
one after the other (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | one hexagon per country, all equal, laid out roughly as the map; Ukraine grey | — | the grid, uncoloured |
| 2 | by count: Germany first (1,250,825), Poland second | **fill** | cells take the count's classes; the count key |
| 3 | divided by population: Czechia darkest, 36.1 per 1 000 | **re-encode** | the same cells cross-fade to the rate's classes; the key changes |
| 4 | ranked by rate: Czechia first, Germany 11th, France last at 0.7 | **reorder** | the cells leave the map for a honeycomb in rate order, each with its rate; Ukraine leaves |
| 5 | Czechia 36.1, Germany 14.8 | **zoom + ring** | back on the map, the camera closes on the two cells and centres them, both ringed with their rates |
| 6 | the reading line | **pull back** | the grid by rate, its key and the note on Ukraine |

## Precision

- **Placed in the reader's pixels**: the designed map and the ranking are both sized to the stage and centred; the
  ranking takes whichever row length gives the largest cell. On a narrow stage both are sized to the band above the
  resting card.
- **The code inside its cell** in the ink or the ground, whichever reads on the fill at that moment of the cross-fade.
- **Every sentence is asserted**: the layout checked both ways, Czechia first per inhabitant, the largest count not
  first, the largest count below fifth per inhabitant, the top count class holding exactly Germany and Poland.
- **Batch pass (2026-09-16)**: all three directions baked and rendered. `verify-scrolly.mjs` refused all
  three at first (`c.handle.map` read on a null handle with no key in the page) — fixed the same way as the
  sibling maps, checking `c.handle` first (`hex-drive.mjs`). Now clean; `verify-live-map-scrolly.mjs` clean
  on all three; swap check on `creme` clean at both viewports (labels only, hexagon and border positions
  match).

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`. The static beat has no
`nocturne` render; this page has one.
