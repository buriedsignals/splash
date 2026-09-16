# Dot density

**Argues:** A dot-density map answers "where inside these regions is this concentrated" at a texture level: dense clusters of dots read as dense clusters of the thing.

## What it's for

A dot-density map answers "where inside these regions is this concentrated" —
population, cases, production — at a texture level: dense clusters of dots
read as dense clusters of the thing, sparse areas read as sparse, without
forcing the reader to decode a single number per region the way a choropleth
does. It shows distribution WITHIN a region, which a choropleth (one flat
colour per region) structurally cannot.

## When not to use it, and what to use instead

Don't use dot-density when a single per-region total or rate is actually the
story — a choropleth states that number far more legibly than a reader
eyeballing a dot cloud and estimating its density by squinting. And never
treat an individual dot's position as a real location: dots are scattered
pseudo-randomly inside the region's polygon (seeded, so a given region always
gets the same scatter, but arbitrary within that), so a dot sitting near a
border is not claiming anyone or anything is actually AT that border. Reading
dot placement as address-level precision is the anti-pattern this type
specifically invites, because visually it looks like real points even though
it structurally is not.

## The one thing that goes wrong

The join between data rows and region shapes fails silently — the same class
of defect a choropleth carries, because dot-density reuses the choropleth's
join pattern (each row keyed by a region field, matched against the shapes by
a join key). An unmatched key doesn't throw; it just drops that region's dots
entirely, and a region with real data quietly shows zero dots, which reads as
"nothing happening here" rather than "the data didn't join." The second, type
-specific way this goes wrong is a badly chosen dot value (how many real units
one dot represents): pick it too small on a large total and the dots
over-plot into a solid blob that conveys nothing but "a lot, somewhere here";
pick it too large and a real concentration renders as a handful of sparse
dots that reads as empty. The dot value has to be derived from the total so
the rendered dot count lands somewhere legible — targeting a few thousand
dots total is a reasonable middle ground, with a hard cap well above that to
stop degenerate inputs from rendering tens of thousands of overlapping marks.

## What the drawing needs

The scatter is computed ONCE and seeded deterministically per region (and per
category, in a multi-category map) — never re-randomised on each render or
each video frame, or a re-render produces a visibly different-looking map
from the same data, and a video's dots would jitter frame to frame instead of
holding still. A single-value (univariate) map uses one dot colour for every
dot — the house colour if the newsroom has one, otherwise a vetted default
with distinct light and dark values so the dot never disappears against its
own basemap. A multi-category map cycles one colour per category and needs a
legend row per category PLUS, always, the "1 dot = N units" key — drop that
key and the map stops being quantitative at all, no matter how careful the
colours are.

## The accessibility trap

The "1 dot = N" line is the single piece of text that converts a visual
impression of density into an actual number, for every reader, not just the
ones who can confidently eyeball relative dot density by eye. A dot-density
map that renders this key in small, low-contrast, or easily-missed type has
handed a sighted reader a rough guess and a low-vision or screen-reader
reader nothing at all — it deserves the same legibility as the headline, not
footer-line treatment, because without it the map cannot be read as data at
all, only as texture.

## In video

Worked example: `proof/video-dot-density-europe-stations` (validated 2026-09-14). A dot map's two readings — the count
of places and the weight of each — are told one after the other on the same dots: the units arrive kind by kind (the
rare kind last, never buried) while the count climbs; the subject is ringed while the rest steps back; then **every dot
grows to an area proportional to its quantity**, the ring closing onto the disc, the share of the total climbing and a
size reference landing in the key. Every text a count can show is measured in Bun and keyed by its number, so the
composition types no word. The key and the credit are seated clear of every disc at its largest, not only of the dots.

Recut 2026-09-15: the growth carries each dot's **area** linearly (not its radius), and **one bar in the key measures
both readings** — the subject's share of the weights, a sliver while every unit counts one, widening to its share of the
quantity as the dots grow, the first share ticked. The credit sits on one line in the lowest corner clear of every disc.

On the live MapTiler map (2026-09-15, awaiting the owner): the units are GeoJSON `circle` layers split by kind × the
radius they grow to (a bucket's radius the root of its members' mean square), so the growth is one data-constant
expression per layer bound to the frame's weight — a `["get", …]` radius would relay out the source every frame. The
camera holds every unit; the key and the credit stand on the measured open sea, clear of every disc at its largest.

Owner rules that apply here: one frame, read at rest — one accent, all furniture derived from the ground, the subject named where it ends rather than in a legend, and nothing on the plate that does not earn its place. On a map the basemap is a MapTiler plate baked once per filed direction and tinted by it, every mark placed from that plate's RECORDED camera (`frameCorners`, measured with `map.unproject()` after the camera settles — never the nominal bounds, which `fitBounds` widens) — except where the form gives up position, where the refusal of a basemap is reasoned on the plate.

## Reading stations
- **Enter at** the texture — where the field is dense and where it is bare, which is the count of PLACES
- **Then** the ringed subset, which carries the weight half of the claim
- **Then** the key, saying what one dot is and what a ring is
- **Subordinate** — the basemap giving up its contrast (against thousands of points that is the only way the points stay countable), the water as a tint mixed toward the ground, the source-limit note
- **The claim lands on** the ringed count against the field, and on the capacity share printed beside it

## A choreography must NOT
- `no-accent-thing-claim` — accent more than the one thing the claim is about — a plate where everything is accented has no accent left
- `no-send-reader-legend` — send the reader to a legend for a reading a direct label could carry at the mark itself
- `no-give-furniture-colour` — give furniture a colour of its own instead of deriving it from the ground, or bridge a gap in the data rather than showing it
- `no-scatter-national-totals` — scatter national totals inside national polygons — the pattern a reader would see is the random number generator's, not the world's: every cluster an artefact and every hole one too
- `no-recolour-subset` — recolour the subset: that puts a second hue on a plate whose whole reading is one field's density, so the subset is RINGED
- `no-draw-panel-run` — draw a panel run unwrapped — a panel is a frame too, and there is no such thing as a line short enough to skip the measurement, because how wide a string is depends on the direction

## Precision to assert
- one dot is one real thing, at the place the source records it
- the count, the share and the per-site ranking are all derived, so a data refresh that overturned one would change the sentence
- every panel run is measured and wrapped at the direction's own type, not assumed short

## Devices the worked example implements
- **A source that records a position for every thing it counts** — fetched rather than reusing the file every sibling beat uses (`render-directions.mjs`)
- **The subset ringed, not recoloured** — one hue, one reading (`DirectedDotDensity.tsx`)
- **A per-direction baked plate with a recorded camera** — `bake.mjs`

## Worked example

`proof/static-dot-density-europe-stations` — the reference implementation of this type's picture; read its CODE, not only its BRIEF.md. `render-directions.mjs` (data, assertions, words), `DirectedDotDensity.tsx` (the marks), `bake.mjs` (the plate). `BRIEF.md` records the choreography table, not the shape. `skills/map-beat/scripts/scaffold-static-map-beat.mjs --type dot-density --beat <new-beat>` copies this beat's own code by default, marked `SCAFFOLD:` over what is its subject rather than this type's.
