---
format: scrolly
type: beeswarm
---

# Beat — Les 6 pays au-dessus de 20 t de CO₂ par personne pèsent 0,6 % de l'humanité (scrolly)

**Type:** beeswarm (chart). **Medium/format:** chart / **scrolly**. **Frame:** the whole graphic, from a
phone to a wide desktop.

The `beeswarm` type in the scrolly format, drawn once per filed direction from the same data, claims,
assertions, derived callouts and words as `static-beeswarm-co2-per-person`.

## The choreography

The static plate is the floor — data, claims, assertions, derived callouts, colour rules. The scroll tells
the subject with its own gestures (`skills/scrolly/references/directed-type-choreography.md`):

| card | what the card says | gesture | what the reader sees move |
| --- | --- | --- | --- |
| 1 | a circle per country, placed by its tonnes per person | — | 213 dots of one size: position is the only channel |
| 2 | its surface is its population | **rescale a channel** | the dots swell to their population and the field re-packs around them |
| 3 | the largest circle is India, 2,1 t, below the median country | **name** | India ringed, its card and hairline |
| 4 | the world average, 4,6 t, is above what 64 % of people emit | **filter + count** | the average's rule; every country above it steps back to a neutral; "64 % des gens émettent moins" counts up |
| 5 | past 20 t, 6 countries, 0,6 % of humanity; the farthest, Qatar | **filter + count + name** | only the tail keeps its tint; its share counts up; Qatar named |
| 6 | the plate's reading line | **pull back** | the whole field again, both cases named |

## Precision

- **Two packings, one field**: dots of one radius and circles at population, both packed in the reader's
  own pixels on every resize (`swarm-layout.mjs`, one implementation used in node and in the page);
  each circle travels between its two seats — marks move only perpendicular to the axis in both.
- **Counters count arriving, not leaving**: a figure climbs over the first half of its fade-in and stays
  whole while it fades out.
- **The tail's counter sits at the top of the band on the right**, clear of the dense field and of the
  travelling card; it wraps on a phone.
- **Cards above the field, never over it; the block centred; the axis name wins over a tick.**

## Directions

`creme`, `nocturne`, `rapport` — `renders/<id>.html`, from `render-directions-scrolly.mjs`.
