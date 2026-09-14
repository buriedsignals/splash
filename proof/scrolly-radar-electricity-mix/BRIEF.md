---
format: scrolly
type: radar
---

# Beat — La France et l'Allemagne produisent presque autant d'électricité, avec des mix opposés (scrolly)

**Type:** radar (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a phone to a wide
desktop.

The `radar` type in the scrolly format, drawn once per filed direction from the same data, spoke order, claim and
assertions as `static-radar-electricity-mix`.

## The choreography

A radar compares shapes; the scroll first says the two totals are comparable, then builds each shape, then changes
what the shape is drawn from (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | France 561.8 TWh, Germany 496.0 TWh: nearly the same | **grow** | two bars |
| 2 | France's mix: nuclear 67.7 % | **trace** | the polygon grows spoke by spoke, clockwise, each value written as it lands |
| 3 | Germany's over it: no nuclear, wind 28.5 %, coal 21.4 %; wind + solar 43.5 % against 12.5 % | **trace** | the second polygon, its values beside the first |
| 4 | three families: renewables 27.2 / 58.6 %, fossil 5.1 / 41.4 % | **merge** | every spoke turns to its family's angle and its share to the family's sum: two opposite triangles |
| 5 | the scale tightened to 30 %: only French nuclear leaves the ring | **rescale** | the small shares open; the nuclear vertex rests on the ring, open |
| 6 | the reading line | **pull back** | the static plate |

## Precision

- **Laid out in the reader's pixels**: the wheel takes the radius the stage leaves once the spoke labels have their
  room; on a phone the side labels overhang the ring on their halo and the wheel sits low, so its centre stands below
  the resting card.
- **A share the ceiling cannot hold is marked, not hidden**: it rests on the ring as an open vertex.
- **The three families stand a third of a turn apart**, the first on the middle of its own spokes, so the merged
  shapes are two comparable triangles.
- **Every sentence is asserted**: the totals within 25 %, no German nuclear, French nuclear over half, more German
  wind and solar, each country's families summing to 100 %, France leaning on nuclear and Germany on renewables,
  German fossil over four times France's, and at 30 % only nuclear leaving the ring.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
