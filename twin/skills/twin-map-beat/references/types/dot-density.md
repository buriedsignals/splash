# Dot density

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
