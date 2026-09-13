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
scroll shows exactly that: the reader watches the map become the cartogram.

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | 41 countries, each taking the room of its territory | — | the map, shaded by class, neighbours in a neutral |
| 2 | Russia is 73 % of these countries' territory at 35,9 %; by km² the mean falls to 44,9 % | **focus + count** | Russia picked out, the rest steps back; "au km² : 44,9 %" counts up |
| 3 | give every country the same room | **morph** | each country shrinks or swells into its equal tile — Russia melts, Malta swells |
| 4 | one tile, one vote: 65,1 %; both means are true | **filter + count + compare** | the ramp steps back to a neutral; "par pays : 65,1 %" counts up beside the other |
| 5 | the classes, lowest first | **reveal in order** | the classes return one by one, with the key |
| 6 | Ukraine has no 2024 reading; the layout is designed | **name** | Ukraine's hollow tile named |

## Precision

- **One coordinate space** (`cartogram-geometry.mjs`): the sibling plates' Lambert azimuthal equal-area
  projection, a stated window (Iceland to Cyprus, Portugal to western Russia), shapes clamped and
  simplified; area figures computed on whole countries, never on the window.
- **The morph is an affine map per country**, from the shape's box onto its tile, the viewBox fitted
  uniformly so no country is stretched on one axis; strokes do not scale.
- **Names are placed through the SVG's own screen matrix**, and shown all or none: on a phone the tiles
  are ~26 px wide and three-letter codes do not all fit, so the grid carries no names there rather than
  half of them.
- **The static plate's floors**: the lowest class and the neutral floored against the ground; the missing
  country hollow with a dashed edge.

- **Full-bleed.** The map fills the whole graphic at every width: the counters and the key sit over it on
  panels of the ground, the frame is fitted between them and widened to the stage's own aspect
  (`skills/scrolly/assets/reveal.mjs`, `fitViewBox`), and the geography is drawn far enough past the frame
  to fill a stage two and a half times wider than tall.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
