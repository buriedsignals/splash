---
format: web
type: contour
---

# Beat — La moitié de l'Europe est à moins de 133 km de la mer (web)

**Type:** contour / isoline (map). **Medium/format:** map / **web**.

## Claim

**Half of Europe's land is within 133 km of the sea, and no point of it is more than 681 km away** —
that point being in Belarus. **89 %** of the land is within 400 km. Measured over a stated study
area: the forty countries the sibling maps carry, **minus Russia** — the frame cuts Russian
territory, and a distance measured to a coastline that stops at the edge of the paper is not a
distance.

The three figures are computed here, independently of the static sibling, and land within a few
kilometres of it (132 / 682 / 89 there).

## The field is the coastline, and that is this form's own constraint

**An isoline map needs a field its source defines everywhere.** A field made of records is only as
continuous as the records are complete, and a hole in it does not degrade — it is filled by whatever
surrounds it and the reader cannot see anything is missing. Nothing is missing from a polygon.

The distance is an **exact Euclidean distance transform** (Felzenszwalb's separable lower-envelope
pass, twice) on a 7 km mesh, seeded on every sea cell.

**Land is all the land, and that is not the study area.** The transform is seeded on SEA, so every
land cell — Russia and Turkey included — must be land in the mask, or the field would measure the
distance to the edge of the study area rather than to the water. Getting that wrong the first time
put the farthest point in Slovakia at 630 km; getting it right puts it in Belarus at 681, which is
where the static sibling puts it.

## Treatments spent

`the-key-prints-its-breaks-in-the-data-s-units` — the interval is stated once, in kilometres, and
each drawn contour carries **its own break printed on the line**. A contour set's value only exists
if the reader knows what one band represents.

## What the web adds

Between two contour lines a reader must interpolate by eye — exactly what the form asks and exactly
what nobody does accurately. Every point of the land answers with the measured distance and the
country it falls in.

## The size budget, stated

The field is computed at 7 km and **painted at 28**: one rectangle per fine cell is 2,2 MB of path
data in a page whose whole point is that it loads, and merged runs four cells wide are a band edge
nobody can tell from the fine one at this camera. The isolines are traced on a three-cell marching
grid — visually identical against a 200 km interval — and they are what a reader measures against.
The delivered page is **107 KB**.

## Verification

`verify-web.mjs --file renders/creme.html` — **50 passed, 2 failed, 7 skipped**; both failures are
phone-only vertical fit (28 px), the desktop frame being the validated one.

## Source

Distance computed on the same Natural Earth shapes the sibling maps use. `countries.csv` and
`shapes.geojson` are byte-for-byte copies of `proof/static-contour-europe-distance/`.
