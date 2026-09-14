---
format: scrolly
type: cartogram
---

# Beat — Compté par pays, le bas-carbone européen est à 65,1 % ; compté au kilomètre carré, à 44,9 % (scrolly)

**Type:** cartogram (map). **Medium/format:** map / **scrolly**. **Frame:** the whole graphic, from a phone
to a wide desktop.

The `cartogram` type in the scrolly format, drawn once per filed direction from the same data, designed
grid, area computation, assertions and colour rules as `static-cartogram-europe-lowcarbon`. Each direction
keeps its own palette and faces — creme, nocturne, rapport.

## The choreography

The static plate's claim is that a map's ink follows territory and a cartogram's follows countries. The
scroll shows exactly that — the reader watches the map become the cartogram — then gives the tiles a third
weight, the electricity each country produces, so the reader sees that every mean is a choice of what counts.

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | 41 countries, each taking the room of its territory | — | the map, shaded by class, neighbours in a neutral |
| 2 | Russia is 73 % of these countries' territory at 35,9 %; by km² the mean falls to 44,9 % | **focus + count** | Russia picked out, the rest steps back; "au km² : 44,9 %" counts up |
| 3 | give every country the same room: one tile, one vote, 65,1 % | **morph + count** | each country shrinks or swells into its equal tile; "par pays : 65,1 %" counts up |
| 4 | each tile sized to its production: Russia 1 209 TWh first, France 562 second, Malta and Luxembourg a dot; by kWh 61,3 % | **resize + count** | every tile becomes a square whose area is its production; "au kWh : 61,3 %" counts up |
| 5 | three means, all true; each drawing shows one | **compare** | the tiles step back, the three means on one 0–100 % rule |
| 6 | Ukraine has no 2024 reading; the layout is designed | **pull back + name** | the equal tiles again, Ukraine's hollow tile ringed and named |

## Precision

- **One coordinate space** (`cartogram-geometry.mjs`): the sibling plates' Lambert azimuthal equal-area
  projection, a stated window (Iceland to Cyprus, Portugal to western Russia), shapes clamped and
  simplified; area figures computed on whole countries, never on the window.
- **The morph is an affine map per country**, from the shape's box onto its tile, the viewBox fitted
  uniformly so no country is stretched on one axis; strokes do not scale.
- **The resize is the same affine map** onto a square centred in the tile, its side the tile's short side
  times the square root of the country's share of the largest producer, so a square's area is its production.
- **Names are placed through the SVG's own screen matrix.** On the equal tiles they are shown all or none,
  at the largest size every tile holds and never below 70 %; on the resized squares a name shows where its
  own square holds it.
- **On a phone the frame is fitted into the stage's upper part**, clear of the card that reads over the
  middle, with a line kept at the top for the missing country's note; the rule of the three means sits in
  that band too. On a wide stage the rule sits near the top.
- **Every sentence is asserted**: the static plate's two checks, plus the three means in the order km² <
  kWh < country, Russia then France the two largest producers, Malta and Luxembourg the two smallest.

- **The map fills its own row, from gutter to gutter.** The counter sits in a row above it and the key in a
  row below it — never over the map. The page's own side gutter (the header's, `--prose-gutter`) bounds the
  map, so its edges line up with the title; inside that box the frame is fitted and the view widened to the
  box's aspect (`skills/scrolly/assets/reveal.mjs`, `fitViewBox`), with geography drawn far enough past the
  frame that no side of the row is left bare.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
