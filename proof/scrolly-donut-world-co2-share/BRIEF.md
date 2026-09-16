---
format: scrolly
type: pie and donut
medium: chart
grounding: supported
---

# Beat — En 2000 les États-Unis émettaient un quart du CO₂ mondial et la Chine un septième ; en 2023, c'est l'inverse (scrolly)

**Type:** pie and donut (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `pie and donut` type in the scrolly format, drawn once per filed direction from the same data, six
countries, claim and assertions as `static-donut-world-co2-share`.

## The choreography

The static plate draws six rings, one per country. The scroll starts from the one ring they are all cut from
— the world — and ends on the static plate's six (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | in 2000 the world emits 24.7 Gt; one turn is all of it | — | one ring, an arc per country, the rest of the world in the track's tone |
| 2 | the United States a quarter, China a seventh | **filter** | the two kept, the other four stepping back |
| 3 | in 2023 the shares swap | **morph** | every arc resizes and turns to its 2023 share; the unit line changes year |
| 4 | but the ring grew: 24.7 → 37.0 Gt, +50 % | **rescale** | the ring's area follows the world's tonnes; the 2000 ring left as a dashed outline |
| 5 | Russia: share 6.0 → 4.7 %, tonnes 1.5 → 1.7 Gt | **isolate** | Russia alone, its 2000 arc on the 2000 ring beside its 2023 arc, its tonnes under its name |
| 6 | the reading line | **split** | the ring breaks into one ring per country, 2000 outside, 2023 inside, tonnes underneath |

## Precision

- **Built in the reader's pixels**: the SVG's viewBox is the stage, so rings stay round at every width.
- **On the world's ring countries are told apart by name, not hue**: China in the accent, the United States
  in a deep neutral, the other four in a light one. The static plate's past colour (a tint of the accent
  where it separates, the neutral where it does not) returns for the six rings.
- **Labels outside the ring, relaxed per side** so no two touch, with leaders. Below 560 px every label is
  one line in one column to the right of a ring kept in the top of the stage, above the resting card.
- **The ring's hole is where the card rests**, so the year lives in the unit line rather than in the hole.
- **The drawn labels' faces are carried in the markup**: the script builds every word on the stage, and the
  font embedding reads only the rendered page.
- **Every sentence is asserted**: the swap, "a quarter" within 2.5 points, "a seventh" within 1.5, growth
  above a third, exactly one of the six whose share fell while its tonnes rose.

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
