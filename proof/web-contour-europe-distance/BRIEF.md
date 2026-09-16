---
format: web
type: contour
medium: map
grounding: supported
---

# Beat — La moitié de l'Europe est à moins de 133 km de la mer (web)

**Type:** contour / isoline (map). **Medium/format:** map / **web**.

## Claim

**Half of Europe's land is within 133 km of the sea, and no point of it is more than 681 km away** —
that point being in Belarus. **89 %** of the land is within 400 km. Measured over a stated study
area: the forty countries the sibling maps carry, **minus Russia** — the frame cuts Russian
territory, and a distance measured to a coastline that stops at the edge of the paper is not a
distance.

## The field is the coastline, and that is this form's own constraint

**An isoline map needs a field its source defines everywhere.** A field made of records is only as
continuous as the records are complete, and a hole in it does not degrade — it is filled by whatever
surrounds it and the reader cannot see anything is missing. Nothing is missing from a polygon.

The distance is an **exact Euclidean distance transform** (Felzenszwalb's separable lower-envelope
pass, twice) on a 7 km mesh, seeded on every sea cell.

**Land is all the land, and that is not the study area.** The transform is seeded on SEA, so every
land cell — Russia and Turkey included — must be land in the mask, or the field would measure the
distance to the edge of the study area rather than to the water.

## The gesture: the reader chooses the STEP between the lines

An isoline map turns a continuous surface into a set of **chosen** levels, so the step between them
decides how much of the surface survives into the picture — and it is the one decision on this page
the reader never sees. They see ten bands and read ten facts, never that somebody picked ten.

- **Too fine** and the map draws detail the field cannot support: the mesh is 7,0 km and the
  equal-area camera's scale error reaches 3 % across the frame, so a 50 km step resolves to
  ±25 km against ±20 km of measurement error.
- **Too coarse** and the story disappears: at 400 km the 133 km median and the 89 % under 400 km all
  fall in the first band, and the map can no longer distinguish anything the headline claims.

So the step is the control — 50 / 100 / 200 / 400 km, opening on 100 — and the answer a pointer gets
keeps its **measured** distance beside the band the chosen step put it in. The same point reads
`à 250–275 km de la mer · la bande 200–300 km au pas de 100 km` and, one click later,
`la bande 0–400 km au pas de 400 km`. A still, a video and a scrolly must each pick one step and can
only say that they did.

**What answers a pointer is the BAND, whole** — every cell of the class the chosen step put that
point in, lit across the continent. Its width IS the step, made visible.

## The architecture: the validated live-map pattern

Rebuilt on `proof/web-choropleth-europe-lowcarbon/` (owner-validated 2026-09-15). Every mark is a
MapLibre layer over MapTiler's own tiles; the map is flat Web Mercator and takes the figure's whole
width; zoom, pan, keyboard and hover come from MapTiler (`queryRenderedFeatures`), never from a
collision test of ours. `skills/map-web/assets/live-contour.ts` carries the arrangement.

**One geometry, four cuts.** The field is quantised once, at a 25 km bin every offered step divides,
and each cell carries its bin index; a step is a `["step", ["get","b"], …]` expression over it. The
isolines are traced once at every multiple of 50 km and filtered by `["%", ["get","level"], km]`.
Four band geometries would be four derivations of one field.

**Two layers.** Under the live map, a frozen image photographed **from this page's own live map** at
the reference window, embedded as a data URI. It is what stands there when a key lapses — MapTiler
invalidates all of an account's keys at 100 % of its spending limit. The committed render carries
`__MAPTILER_KEY__` and nothing else; the runner writes `renders/<direction>.local.html` beside it
with the real key, git-ignored, and that is the file to open.

**What the gesture costs without script**, stated: the map cannot re-cut. What survives is the frozen
picture, the chip row that gains and loses bands in pure CSS (16 / 8 / 4 / 2), the sentence each step
owes the reader, and the table of all 13 traceable levels in which the ones the chosen step does not
draw are **dimmed on the spot** — measured 0 / 7 / 12 dimmed at 50 / 100 / 400 km.

## Web Mercator's cost on this subject, measured

Norway, Sweden, Finland and Iceland occupy **34,9 %** of the land the map draws for **18,2 %** of the
land really there — a factor of **1,92**. The field itself is measured on the equal-area grid
(`camera.ts`, LAEA / EPSG:3035), so **no printed number moves**; the picture does, and the caveat
says so in the reader's own words.

## Treatments spent

`the-key-prints-its-breaks-in-the-data-s-units` — every drawn isoline carries its own break printed
ON the line, as a MapLibre marker in the page's own embedded faces (a symbol layer would fetch glyphs
from a second host, in a typeface nobody here chose). The anchors are **chosen**, not named: the
first version put every break on its line's westernmost point and 100, 200 and 300 km all piled up in
Portugal. Each level now takes the candidate on its own line farthest from every break already
placed, and the tightest pair **a step actually draws together** is asserted against a floor derived
from the label's own box at this scale: 145 km. Measured: 178 km at the 50 km step, 845 km at 100.

## What is measured rather than asserted

- map box **1464 × 501** CSS px at 1512×860, document **860** — nothing scrolls.
- the ramp's neighbouring bands: **1,039:1** at the 50 km step, 1,079 at 100, 1,227 at 200, 1,887 at
  400. That is not a defect hidden: at the finest step the eye no longer separates two bands, and the
  drawn line is what still carries the step. It is half of what the control exists to show.
- the field quantises to **5 494** cells; the delivered page is **2,4 MB**, of which MapLibre's own
  inlined runtime is about a megabyte.

## Source

Distance computed on the same Natural Earth shapes the sibling maps use. `countries.csv` and
`shapes.geojson` are byte-for-byte copies of `proof/static-contour-europe-distance/`.
