---
format: scrolly
type: connected scatter
medium: chart
grounding: supported
---

# Beat — Les 16 pays ont tous nettoyé leur électricité, 5 pèsent pourtant moins dans le bas-carbone européen (scrolly)

**Type:** connected scatter (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic,
from a phone to a wide desktop.

The `connected scatter` type in the scrolly format, drawn once per filed direction from the same data, axis
pair, claims and assertions as `static-connected-scatter-lowcarbon`.

## The choreography

The static plate is the floor — hollow ring before, filled disc after, one hue, a curved dotted link, the
subject in the accent. The scroll tells the subject with its own gestures
(`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | in 2000, each country a hollow ring; France alone on the right, 38,4 % | **reveal** | sixteen rings, France named |
| 2 | to 2024, every arc goes up | **trace + count** | each country slides along its arc, the arc drawn as far as it has gone; "16 pays sur 16 plus propres chez eux" counts up |
| 3 | 5 point left: France, Suède, Allemagne, Belgique, Autriche | **filter** | the eleven that gained weight step back to a neutral |
| 4 | France, +4,2 points at home, −11,8 points of European weight | **focus + count** | France's arc in the accent, its two moves counted; the others step back |
| 5 | closed onto 0–12 %, the crowd near the origin opens: 11 of the 14 gained weight | **rescale** | the x domain closes, France and Germany leave the frame, the ticks change set, every small country named |
| 6 | the plate's reading line | **pull back** | the whole axis again, France in the accent |

## Precision

- **Circles stay circles**: the field is laid out in the plot's own pixels on every paint
  (`scatter-layout.mjs`, one implementation used in node and in the page); the arc is a quadratic that
  bows by a capped fraction of its chord, drawn partially by de Casteljau while the disc travels.
- **Names are seated, never piled**: the subject first, then the countries the card is about, then the
  rest by weight; eight offsets around the disc, then the three-letter code, then dropped.
- **Counters and axis names in rows of their own**: the y name and both counters above the plot, the x
  ticks and the x name below it; every row wraps on a phone instead of pushing the plot past the frame.
- **Every sentence is asserted**: all cleaner, a minority lighter, France lighter and producing more, France
  the heaviest in 2000, and exactly the two heaviest outside the close-up's domain.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`. The static
beat has no `creme` render; this page has one.
