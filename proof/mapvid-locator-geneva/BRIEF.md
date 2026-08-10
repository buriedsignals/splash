# Beat — eleven international organisations inside 4.4 km, and a 6 km search finds no more

**Type:** locator. **Medium/genre:** map / **video** — the third genre for this type, beside the
static beat (`proof/map-geneva-locator`) and the web one (`proof/mapgen-locator-web`).
`render/locator.mp4`, 1080 × 1350, 30 fps, **380 frames = 12.67 s**, over a 660 × 660 baked plate
frozen in `plate/`.

## Why this type earns a video — and the honest size of that claim

**The narrowest of the three motion cases in this family, and it earns on one thing: a locator map
cannot show an absence, and this one can.** A static locator draws the markers it has. It cannot say
how far the search went, so a reader has no way to tell "these are all of them within 6 km" from
"these are the ones somebody happened to plot". Here the radius grows at a constant rate out to the
**6 km the source's own Wikidata query used**, and after the eleventh organisation is found at
4.39 km the ring keeps growing for another **1.61 km and finds nothing**. That last second and a
half is the evidence, and no still frame contains it.

What motion does NOT add here is stated plainly: the reveal ORDER is distance rank, which a static
frame could annotate with a few concentric rings and a table. **A fade-in over a finished locator
would have earned nothing and was not built.** The two things that make this a video rather than an
animation are the empty tail and the gap — and both are also carried, deliberately, by the static
distance axis under the map, so a reader who pauses on any single frame still gets them.

## Claim

Eleven international organisations sit around central Geneva, and **ten of them are inside 3.4 km**.
Then comes **1.02 km of nothing** — the largest gap anywhere in the ranking — and the eleventh, the
**World Economic Forum, at 4.39 km**. The search the source ran went to **6 km**, so the last
**1.61 km** of it is a measured absence rather than an edge of the map.

Both load-bearing facts are asserted before a frame is drawn. `render.mjs` throws if any
organisation lies beyond the search radius (the sweep would end with a marker it never drew), and
throws if the step to the farthest is not the largest step in the whole ranking (then "a gap, then
one more" would be a sentence about a different dataset).

## Data

- Source: Wikidata (`query.wikidata.org/sparql`), international organisations within 6 km of central
  Geneva. `geneva-orgs.csv`, **11 rows**, each with a Wikidata QID, copied here so this beat's render
  resolves every input inside its own directory.
- The reference point is **46.2044 N, 6.1432 E** — the centre the source's own query was run from,
  and the point the rings are struck from. It is on the frame, marked and labelled.

## Exact values — printed by `render.mjs` on every run, from the frozen CSV

| km | Organisation |
| --- | --- |
| 1.76 | European Free Trade Association |
| 2.02 | International Civil Defence Organisation |
| 2.02 | World Intellectual Property Organization |
| 2.16 | Aga Khan Development Network |
| 2.25 | World Trade Organization |
| 2.48 | United Nations Office at Geneva |
| 2.86 | International Social Security Association |
| 2.86 | International Labour Organization |
| 3.31 | World Health Organization |
| 3.38 | Inter-Parliamentary Union |
| **4.39** | **World Economic Forum** |

- Largest gap in the ranking: **1.02 km**, immediately before the World Economic Forum. The next
  largest is 0.45 km, before the World Health Organization — so the gap the conclusion rests on is
  more than twice any other.
- Empty tail: **1.61 km** of search radius after the last find.
- **The four UN-system bodies are not the four nearest**: by distance they rank 3rd, 6th, 8th and
  9th of eleven, and the nearest of all is the European Free Trade Association. That is in the alt
  text, because it is the assumption a reader most easily makes about this map and the data does not
  support it. (It does not contradict the static sibling's finding that the UN four sit ~510 m north
  of the set's centre of mass: north is a direction, distance from the centre is a radius.)
- **2 of the 11 markers are nudged** to clear 14 px on screen — the ILO and the International Social
  Security Association, 13 m apart in the world. Same nudge, same reason, as the static sibling.

## Subject and accent

**One accent, carrying one variable: reached by the search, or not yet.** The growing ring, the
markers it has found and the ticks it has passed on the distance axis are all `#0B7A75` (the house
colour, `origin: newsroom`), because they are all the same fact.

The static sibling encodes the three organisational tiers in three Okabe-Ito hues, which is right
for a frame whose only variable is category. This beat's variable MOVES, and a second categorical
hue underneath a moving state asks a reader to hold two colour meanings at once on a mark that
changes under them. The tiers are the static sibling's subject; the distance is this one's, and the
caveat says on the frame that the categories are not shown here.

## Reveal order (the edit)

30 fps, 380 frames. `establish` 0–24 (title, source, caveat) → `reference` 30–48 (**the search's own
limit**: the centre point, the dashed 6 km ring, and the empty 0-to-6 km axis — laid down before any
result, which is what makes the empty final stretch read as a result rather than as the video
running out of data) → `reveal` 60–270 (the radius grows **linearly in kilometres**, 0 → 6 km) →
`subject` 270–290 (the labels land) → `conclusion` 290–320 → `hold` 320–380 (2.0 s).
Contract-checked; `hold` ends exactly on frame 380.

Linear in kilometres, never in area: the readout on the frame is a radius, so the number and the
speed of the thing drawing it have to be the same quantity.

## The rings are real geography, not a circle scaled by an assumed metres-per-pixel

`bake.mjs` projects a genuine great-circle locus at each of 24 radii, 0.25 km apart — 72 bearings
each, through the same MapLibre camera as the markers — and the component only ever interpolates
**between two baked rings**, vertex by vertex, in the same bearing order. A constant metres-per-pixel
would have been a claim about the projection that Mercator does not honour. The bake also **throws**
if the outermost ring leaves the frame at any of its 72 bearings, because a sweep whose own edge is
off-screen cannot show that the ground beyond the last marker is empty.

## Anti-patterns for this case

- **Never size a locator's marker by anything.** There is no value here to size by, and a reader
  reads area as magnitude whether or not one is intended. Every marker is the same radius; the only
  thing that changes is whether it exists yet.
- **A marker not yet reached is not drawn.** Drawing an unreached point would answer the question
  before the sweep asks it — the claim is about what a search of a given radius has found.
- **A coordinate is not an address**, and a nudged marker is not a surveyed position. Both are on
  the frame.
- **Do not name in words a marker the picture does not label.** The declutter priority promotes the
  organisation the conclusion names, and the component **throws** if the declutter drops it — the
  static sibling's own `mustLabel` lesson, applied before the fact rather than after.

## A defect found by rendering and looking, and fixed

The first render placed labels with `geo-locator.ts`'s `labelSide`, which checks **one** edge — the
right — because that is the only one the static sibling's frame could run off. This beat's names run
to nearly 400 px and its markers cluster left of centre, so every label flipped left and two ran off
the map's **left** edge, clipped mid-word: "…ational Social Security Association" and "…ld
Intellectual Property Organization". Fixed by checking both edges against the **frame's** padding
rather than the map box, and by moving the labels out of the plate's clip path — a direct label may
overhang the map into the page margin, but never leave the page — and by refusing outright to place
a label that fits on neither side. Four labels survive the declutter, one of them the World Economic
Forum, which the conclusion names.

## Verification — frames extracted from the mp4 and looked at

Not the still, and not the props: `ffmpeg -vf select=eq(n,N)` on `render/locator.mp4`, committed
beside it.

- **`render/frame-0.png`** — the poster frame: title, source and caveat at full opacity, the plate
  and the axis not yet faded in. Not blank, which 19 mp4s in this repository once were.
- **`render/frame-150.png`** — 2.57 km, six of eleven found, the ring still inside the cluster.
- **`render/frame-210.png`** — **the beat**: 4.29 km, "10 of 11 found", the solid sweep ring visibly
  short of the dashed 6 km limit, and on the axis the cursor sitting just before the one unreached
  tick. The gap is on the screen as a gap.
- **`render/frame-230.png`** — 4.86 km, eleven found: the last one has landed.
- **`render/frame-265.png`** — 5.86 km, still eleven: the ring has grown most of a kilometre past
  the last marker and the axis's final stretch carries no tick. This is the frame the static genre
  cannot produce.
- **`render/frame-379.png`** — the last frame, identical to `render/final-frame.png`.

## Source line

`Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva · basemap © MapTiler, © OpenStreetMap`

## Size — REFUSED, with the numbers, and R6 fired — 2026-08-11

**This beat pins no size, and that is a decision rather than an omission.** The full measurement is
`probe/VERDICT.md`; re-run it with `bun proof/mapvid-locator-geneva/probe/size-budget.mjs`.

This is the beat the removal ladder's new title rung had the most to bite on: the longest headline of
the four owing a pin, 114 characters, on the map video whose words the ledger measured at 1191 px
against a 910 px band. **R6 fired at every frame in the table** — the shortened form is *All 11
international organisations sit within 4.4 km of central Geneva — a 6 km search finds no more.*, 101
characters, keeping the count, what it counts, both distances with their unit, the place, the
universal and the negation. Three lines become two at landscape, six become five at square and
portrait.

**And it is worth 90 px against a 106 px gap.** At landscape the words still overrun the band by 16
px with the rung fired. Spending the conclusion line as well leaves 53 px of plate — a 53 × 53 map in
a 1920 px frame, 3% of its width, and this plate is square, so height lost is width it cannot take.
Square and portrait are 1137 and 1094 px short.

**The refusal does not rest on the caveat.** With the caveat gone entirely landscape reaches 272 px
and square and portrait are still short by 212 and 169 px. The honesty line is kept and the beat
still refuses.

At the beat's **own** 1080 × 1350 frame R6 declines: the long form already fits in two lines there,
so the shorter one recovers nothing and the journalist's sentence stays. Nothing this beat delivers
changes.

What this settles is the ledger's own open question. It recorded that the count "comes down when
those beats' words are shortened, which is an editorial decision". The decision has now been taken,
on the beat with the most to gain, and measured. **The words were never the whole constraint** — what
fills this frame is a five-line caveat, a two-line conclusion and a two-line source at a 30 px video
floor, and the title is one block among five.
