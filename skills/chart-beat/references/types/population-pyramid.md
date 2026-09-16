# Population pyramid

**Argues:** A population pyramid is two back-to-back bar charts sharing a central category axis: ordered bands run up the middle, one group's bars extend left, the other's right, on the same scale.

A population pyramid is two back-to-back bar charts sharing a central category axis: ordered
bands run up the middle, one group's bars extend left, the other's right, each bar's length a
magnitude on the same scale. Age by sex is the canonical case that gives the type its name, but
the form fits any ordered category split into exactly two groups. It answers "how is this
population distributed across an ordered dimension, split two ways, and where does one group
outweigh the other" — and it does something a pair of separate bar charts can't: the mirrored
silhouette itself is legible as a shape (expansive and bottom-heavy, constrictive and top-heavy,
roughly rectangular and stationary) in a way that reading two disconnected charts side by side
never quite delivers.

Do not reach for it when the categories aren't naturally ordered. The whole reason this type
works is that the bands run in a real sequence — age, typically — and the silhouette that
sequence produces is the point; sort those same bands by value instead, and you've built a
diverging bar chart, which is the right type once ranking by magnitude, not preserving sequence,
is the question. Don't reach for it either with only one group (a bar handles that) or with more
than two groups sharing a category — the back-to-back geometry has exactly two sides, and forcing
a third group in means either a grouped bar or small multiples, not this.

The one thing that goes wrong: sorting the bands by value instead of keeping their natural order.
It's a tempting "improvement" — ranked-by-size looks cleaner — but it destroys the one thing this
type exists to show. The silhouette (whether the population is expanding or aging) is only
visible when the age sequence stays intact top to bottom; a pyramid sorted by magnitude is just a
confusing diverging bar chart wearing the wrong shape.

What the drawing needs: both sides grow outward from a shared central zero on one magnitude
scale — the same scale mirrored, not two independent scales that happen to look similar, because
the entire comparative power of the chart depends on a centimetre of bar meaning the same
magnitude on both sides. The category (age) labels sit in a reserved gutter down the centre,
between the two sides, never printed over a bar. Tick labels on the magnitude axis are mirrored
left and right and both read as positive numbers — the left side is not "negative," it is simply
the other group, and labelling its axis with negative numbers turns a comparison into an
implied subtraction that isn't part of the claim. And because bar length is the encoding here
exactly as with any bar, both scales originate at that shared zero — there is no zoomed-range
version of this type.

There's no accessibility trap specific to the pyramid's own geometry beyond the ordinary one that
governs any two-group comparison: the two side colours need to be a pair a colour-vision-deficient
reader can actually tell apart, checked as a pair, not assumed safe because each looks fine on its
own. Beyond that, the mirrored layout itself already carries the group distinction through
position — left versus right — so the colour pairing is reinforcing a difference the shape
already makes, not carrying it alone; that redundancy is exactly why this type stays legible
even in greyscale, provided the mirrored positions are still there to read.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place.

## Reading stations
- **Enter at** the silhouette as a whole — the shape read at once, which is the type's subject
- **Then** the widest band, named by ONE ink annotation, found by the render script rather than asserted
- **Then** the two halves against each other at that band
- **Subordinate** — the band names in the spine, the shared mirrored zero-anchored scale, the ticks under each half, the two-hue key
- **The claim lands on** the widest band against the youngest, which is what separates an ageing population from an expanding one

## A choreography must NOT
- accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- send the reader to a legend for a reading a direct label could carry at the mark itself
- give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- sort the bands by size — the silhouette only exists while the age sequence stays intact, oldest at the top
- let the two sides take different scales, or move the shared centre
- spend a third hue: the mirrored position already carries the group distinction and colour only reinforces it, as a CVD-safe pair checked AS A PAIR

## Precision to assert
- the shared centre never moves and both sides keep the same mirrored, zero-anchored magnitude scale
- the widest band is FOUND by the render script, not typed
- the bands sum to the asserted population total

## Devices the worked example implements
- **A per-story frame choice** — 21 bands need more vertical room than the default, and the frame is chosen for the data rather than the data squeezed into the frame (`render.mjs`)
- **One ink annotation on the found band** — the claim named where it is, not in a legend (`SwissAgePyramid.tsx`)
- **A CVD-safe pair checked as a pair** — colour reinforcing a distinction position already carries (`DirectedPyramid.tsx`)

## Worked example

`proof/static-swiss-age-pyramid` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedPyramid.tsx` (the marks). `BRIEF.md` records the choreography table, not the shape. `skills/chart-beat/scripts/scaffold-static-beat.mjs --type population-pyramid --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
