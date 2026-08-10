# Locator

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
