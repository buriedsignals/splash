# Locator

**Argues:** A locator answers "where, exactly" — it names a set of places relevant to the story with nothing more than position and, optionally, a category.

## What it's for

A locator answers "where, exactly" — it names a set of places relevant to the
story (the sites of an event, the stops on an itinerary, the hometowns of
people quoted) with nothing more than position and, optionally, a category.
It is the map type with the least to say: no magnitude, no rate, no gradient —
just "this place matters, here is where it is."

## When not to use it, and what to use instead

The moment a marker needs to carry a real number — a headcount, a cost, a
frequency — it has stopped being a locator; that's a proportional symbol map,
and forcing the value onto marker size at this type invents an encoding the
type doesn't have and the reader will misread as one it does. The moment
markers need a colour scale driven by a continuous value, it's not a locator
either — that's a choropleth or a symbol map, depending on whether the
geography is areas or points. And a locator with hundreds of markers and no
priority ordering isn't really answering "where, exactly" anymore — at that
density either give every marker a genuine `priority` so the busiest view can
decide what survives, or the story has moved past what a locator can show and
wants a density type (dot-density, hex-grid) instead.

## The one thing that goes wrong

Marker size gets used to imply importance. The whole promise of this type is
that markers are UNIFORM — a fixed radius, never value-scaled — so the only
thing a locator is allowed to say about a place is that it belongs (and, with
categories, what kind of place it is). Sizing a marker "just a bit bigger"
because that place feels more important sneaks a false data channel into a
type that explicitly promised not to have one. The correct lever for
importance is a declared `priority` field feeding label placement, not the
marker's own size.

## What the drawing needs

Position only; colour is category if the markers are grouped, a single
neutral or house colour if they aren't. Labels touch each marker directly
rather than living in a separate legend — a detached key that forces a
look-away/look-back cycle is a fallback for genuine crowding, not a default
layout choice. With more than a handful of markers, decluttering which labels
show has to be a DETERMINISTIC rule — highest-priority markers place first,
and a lower-priority label that would collide with an already-placed one is
dropped, with the same input always producing the same shown/hidden set.
Leaving it to the map engine's own built-in label culling means the set of
labels that survive depends on draw order and can differ between renders of
the identical data, which is exactly the kind of instability a static frame
or a reproducible export can't tolerate. Markers spanning the antimeridian
need the same shortest-arc longitude framing as a point-based symbol map, or
the camera tries to hold the entire globe.

## The accessibility trap

Locator labels are placed by a priority declutter with overlap allowed
against a default top-of-marker anchor — a different model from the
edge-aware clamp a proportional symbol map uses, and it does not by itself
guarantee a label stays inside the viewport. A marker sitting near the frame
edge can still have its label overhang off-canvas even after decluttering
cleanly against its neighbours, because "doesn't collide with another label"
and "stays on the canvas" are two different guarantees, and this type's
declutter only gives you the first one. Don't assume edge-safety is solved
just because the labels don't overlap each other — check the actual rendered
edges before shipping.

## In video

Worked example: `proof/video-locator-zaporizhzhia`. The gesture only a video has is **travelling there**: the continent
first, the focus country tinted and named and the subject ringed on it, then the camera closing in until the names that place it can be printed — countries uppercase, settlements with a dot, waters
italic — landing only once the camera has settled, and the subject's figure counting up. **When the camera focuses on a
country, its regional borders are drawn** (the owner, 2026-09-14: « si tu focus sur un pays il faut montrer les frontières
des régions »): that country's admin-1 borders, thinner than a national border,
floored at 1.6:1 on the country's fill, landing as the camera closes in and absent from the continental shot. A country's
name is centred inside its own country; settlements are placed before the subject's block, so every name hugs its dot.

**On the live MapTiler map** (2026-09-15, `proof/video-locator-zaporizhzhia`): the travel is two fixed cameras — the
continent fitted "meet", the close-up centred on the subject on both axes — interpolated in Web Mercator numbers, zoom
linear in the eased travel. The focus country's tint and its regions are MapTiler Countries (`level` 0 and 1, joined by
`iso_a2`) beneath the basemap's water, the subject a circle ring and dot, every place's name a symbol layer bound to the
camera having settled; each camera is measured, and names, halos and the credit are placed on the measured close-up.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place. On a map the basemap is a MapTiler plate baked once per filed direction and tinted by it, every mark placed from that plate's RECORDED camera (`frameCorners`, measured with `map.unproject()` after the camera settles — never the nominal bounds, which `fitBounds` widens) — except where the form gives up position, where the refusal of a basemap is reasoned on the plate.

## Reading stations
- **Enter at** the subject, ringed in the accent — not a place class at all, but the beat's subject wearing the clothes it wears on every other form in this base
- **Then** the three classes of place, separated by TYPOGRAPHY alone: administrative areas in the axis register uppercased and tracked in muted ink; settlements in the annot register, mixed case, a step darker, each on its own open dot; water in the annot register in italic, in the water tint
- **Then** the subject's own figure
- **Subordinate** — the basemap giving up its contrast, the scale of the frame, the printed rules saying which places are named and which are not
- **The claim lands on** the ring, placed on a coastline a reader can recognise

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-name-story-touches` — name more than the story touches — a locator map that named provinces would have made the reader look for one, so both cuts are RULES and both are printed
- `no-let-marker-size` — let a marker's size carry a value: there is none on this type
- `no-seat-area-name` — seat an area's name from the whole polygon's centroid — a country whose centroid lies outside the camera reports "no room" while a third of the plate is that country, unnamed; the seat is the centre of the part IN FRAME

## Precision to assert
- a label may be pushed, never dropped, never laid on another: each takes the first of six offsets that clears every box already placed and stays inside the camera, the subject placed first because it is the one label that may not move, and the plate reports what it could not place
- the camera's bounds always come from the subject
- the projection's cost is stated and shown to be negligible at this scale — a fraction of a per cent across the frame — rather than assumed

## Devices the worked example implements
- **Three classes, three typographic treatments** — `three-classes-of-place-three-treatments` made testable for the first time in this tree (`DirectedLocator.tsx`)
- **In-frame seating** — an area named at the centre of what the reader can see (`render-directions.mjs`)
- **A push-never-drop placer that reports its failures** — `DirectedLocator.tsx`

## Worked example

`proof/static-locator-zaporizhzhia` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedLocator.tsx` (the marks), `bake.mjs` (the plate). `BRIEF.md` records the choreography table, not the shape. `skills/map-beat/scripts/scaffold-static-map-beat.mjs --type locator --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
