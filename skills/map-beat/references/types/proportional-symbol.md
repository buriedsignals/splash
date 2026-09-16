# Proportional symbol (symbol / bubble map)

**Argues:** A proportional symbol map answers "how big is this quantity AT this specific place" — where the geography is a set of POINTS, not a partition of area.

## What it's for

A proportional symbol map answers "how big is this quantity AT this specific
place" — a city's population, an earthquake's magnitude, a plant's output —
where the geography is a set of POINTS, not a partition of area. It carries a
real, sized magnitude, which is the thing that separates it from a locator: a
locator names places, a symbol map measures them.

## When not to use it, and what to use instead

Don't reach for a symbol map when the underlying geography is really an area
with a per-region rate — that's a choropleth, and shading area by a point
value invites the reader to misread the SIZE of the circle as the size of the
territory around it. Don't use it either when there is no real number behind
each place — a set of markers that only names locations, with nothing sized,
is a locator, and forcing a fixed decorative size onto every marker just to
use this type is the same "decoration that encodes nothing" mistake as any
other fake data channel. And don't linear-scale the radius: a symbol's radius
must scale with the SQUARE ROOT of the value, because it's the circle's AREA
the eye actually compares. Sizing radius directly proportional to value
exaggerates every large value quadratically — a value 4× as big reads as a
circle roughly 16× the visual area instead of 4×. This is not a style
preference; it is a mechanically wrong scale, and it is the difference between
an honest bubble map and a misleading one.

## The one thing that goes wrong

A direct label sitting near the edge of the viewport runs off-canvas —
concretely, a circle for Indonesia positioned close to the map's right edge
had its name clipped to "Indonés" because the collision-avoidance MapLibre
provides only resolves label-vs-label overlap; it has no idea where the
canvas edge is, so an edge symbol with no colliding neighbour keeps its
default label side and simply overflows off the frame. The label side has to
be computed from the symbol's actual PROJECTED SCREEN position after the
camera has settled — not from the data, which has no concept of "near an
edge" — and flipped or clamped inward whenever the default side would run off.
This is a screen-space problem, and treating it as a data-space one is exactly
how it gets missed.

## What the drawing needs

Position is lon/lat; size is the value, scaled by square root to a capped
maximum radius, with the legend built from a small number of "nice"
round reference values (round to one significant figure) rather than the raw
max — a legend swatch labelled "8,432" is harder to use as a mental ruler
than one labelled "8,000." Draw order matters when circles overlap: sort by
value so the smaller symbols sit on top of larger ones, or a big circle can
visually bury a small one directly underneath it and make it un-hoverable.
There is no data JOIN for this type — points carry their own coordinates, so
there's no shape file to silently mismatch against — but there is a
geography trap that plays the same role: a point set spanning the
antimeridian (Pacific earthquake data running Japan +142° through Alaska
−176° to Chile −73°) will compute a ~360° bounding span from a naive
min/max on longitude and try to frame the entire globe. Compute the shortest
arc across the date line instead of the raw min/max.

## The accessibility trap

An interactive symbol map that only reveals each point's name and value on
hover has no way to hand that information to a reader on a no-JS or static
fallback — the direct labels aren't decoration, they're the accessible path,
and a build that only wires them into the hover state has quietly dropped a
required channel of the map's actual data. The same edge-clamp discipline
that keeps labels on-canvas also has to apply to the hover tooltip itself: a
tooltip anchored to a point near the frame edge needs to flip or clamp the
same way the direct label does, or a keyboard/pointer user near the border
gets a tooltip that's partly or fully cut off exactly where reading it
matters most.

## In video

Worked example: `proof/video-proportional-symbol-europe-capacity` (validated 2026-09-14). The gesture only a video has is
**the ranking arriving**: the largest symbols land one by one, largest first (linear in rank, each easing its own
arrival), while the count of sites and their share of the total climb together; then the rest land at once as faint
points and their share is set beside the first — a comparison, not a sentence. Hollow symbols, area proportional to the
quantity, the key's named circles on the same function as the marks, one row per named circle with its label beside it.
The still's drawing threshold is not needed: the rest are points.

On the live MapTiler map (2026-09-15, awaiting the owner): each symbol that arrives at its own time is its own GeoJSON
`circle` layer, hollow, its radius a constant expression bound to its own arrival field (less half the stroke — MapLibre
strokes outside the radius); the rest share one layer bound to their presence. The key and the counts stay SVG, the key
and the credit on the measured open sea, clear of every symbol.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place. On a map the basemap is a MapTiler plate baked once per filed direction and tinted by it, every mark placed from that plate's RECORDED camera (`frameCorners`, measured with `map.unproject()` after the camera settles — never the nominal bounds, which `fitBounds` widens) — except where the form gives up position, where the refusal of a basemap is reasoned on the plate.

## Reading stations
- **Enter at** the largest circles, whose AREA is the quantity
- **Then** the field of smaller ones, hollow, so an overlap accumulates rather than hiding one place behind another
- **Then** the key's NAMED circles at stated megawatts, computed by the same function as the marks — or the key is a decoration that happens to sit near the map
- **Subordinate** — the basemap giving up its contrast, the water as a tint, the printed cut saying what is not drawn and why
- **The claim lands on** the share of the quantity the drawn circles carry, printed beside their count

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-scale-radius` — scale by radius: area is proportional to the value, so the radius runs on a square root
- `no-fill-circles` — fill the circles — filled discs would let the largest sites erase the smaller ones beside them, and the map would answer its own question by hiding the evidence
- `no-draw-mark-because` — draw every mark because the overlap rule permits it: the rule had a condition nobody had measured, and at full density the field measured 302 % of a cell's area in outline — a blot, not a field a reader counts

## Precision to assert
- symbol AREA, never radius alone, is proportional to the asserted value, and the same function computes the marks and the key
- the density floor is measured on the WORST cell of a grid over the camera, not on an average, and the component enforces it again at the camera it actually got
- the threshold that cut the field is printed on the plate, with its reason

## Devices the worked example implements
- **A capacity-threshold ladder against a measured ink floor** — the readability condition the overlap rule always had, made a number (`render-directions.mjs`)
- **Hollow circles** — `an-overlap-accumulates-rather-than-occluding` (`DirectedProportionalSymbol.tsx`)
- **A key drawn by the marks' own function** — no second derivation of the same number (`DirectedProportionalSymbol.tsx`)

## Worked example

`proof/static-proportional-symbol-europe-capacity` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedProportionalSymbol.tsx` (the marks), `bake.mjs` (the plate). `BRIEF.md` records the choreography table, not the shape. `skills/map-beat/scripts/scaffold-static-map-beat.mjs --type proportional-symbol --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
