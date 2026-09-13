---
format: scrolly
type: area
---

# Beat — La moitié du CO₂ suisse depuis 1858 a été émise après 1986 (scrolly)

**Type:** area (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop — the geometry stretches, the type never does.

The `area` type in the scrolly format, and the first **directed** scrolly beat: drawn once per filed
direction, through the direction's own registers, from the same data, claim and words as
`static-area-swiss-co2`.

## The same plate, read in order

The static plate states four things at once and leaves the reader to find their order. Here each
card names one of them and the picture shows exactly that much:

| card | what the card says (the static plate's own words) | what the picture shows |
| --- | --- | --- |
| 1 | the height is the rate of one year — 46,2 Mt at the 1973 peak, 32,1 Mt in 2024 | the curve alone, and its last reading |
| 2 | the surface is the stock — 3 158 Mt since 1858 | the surface fills under the curve, left to right, as the reader scrolls |
| 3 | the 129 years to 1986 carry 50,1 % | the rule at 1986, and the earlier half turning to its tint, named |
| 4 | the 38 years after carry 49,9 % — the two surfaces are the same size | the later half named; the plate's own reading line |

Nothing on the frame is absent from the static plate, and nothing is added to it: the scroll decides
order, not content. A reader without a script gets the complete plate and every card.

## What the static plate's rules become on a fluid frame

- **The base is zero or the component throws**, and a gap in the years is refused before a mark is
  drawn — both unchanged.
- **One hue, two chromas** for the two halves, the tint lifted until it clears the non-text floor.
- **A half is named inside itself only where it fits** — the static `seatFor`, run in the reader's
  own pixels on every resize. On a phone neither half has room, and the cards name them instead.
- **The midpoint year is written on its rule** and sits above the highest stretch of curve under its
  own width, so the neighbouring peaks never run through it.
- **The last reading is written at the end of the curve, in the surface's colour.** The static plate
  seats it above the crest under its own width; on a phone that crest is the 1990s peak and the
  number floated a decade from its point. It sits in a measured gutter beside the end instead.
- **The title steps down the static plate's own ladder** until the fixed header fits its share of the
  frame.
- **An x tick that would touch its neighbour is not drawn**, and the last year always is.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`. The
interligne follows the design base's adaptive leading once `rerender/static-corpus` is merged; until
then it is the scaffold's own.
