---
format: web
type: flow-map
---

# Beat — 4,5 millions d'Ukrainiens sous protection temporaire en Europe (web)

**Type:** flow map (origin-destination fan). **Medium/format:** map / **web**.

## Claim

**4 504 080 Ukrainians held temporary protection in Europe in June 2026, and Germany and Poland
account for 49,1 % of them** — 1 250 825 and 958 885. The beat refuses to render if the total falls
under four million or if the two largest do not take about half.

## Minard, reversed — and his four rules kept

The reference is Minard's 1862 plate: many origins, one destination, band width in tonnes. This is
the same form with the arrow turned round.

- **Width is the quantity**, and nothing else on the page encodes it.
- **The width scale is in the key, in people.** A band width nobody can convert is a ribbon.
- **The route is schematic and the basemap is furniture** — the caveat says the curve is not an
  itinerary, because a curve on a map reads as one. What *is* exact is the width and the bearing each
  band leaves the origin on.
- **A band too thin to see is counted, not drawn**: 9 destinations fall under the floor and are
  reported as a remainder (141 430 people, 3,1 %). A destination outside the frame is not drawn
  either.

**The seat is the centre of the part in frame**, not of the country: Russia's centroid is in Siberia
and Norway's is in the sea north of Trondheim.

## What the web adds

Thirty bands leave room for four labels, and a band's width is a quantity nobody can measure. Every
band answers with the destination, the count, its share, its rank — and the **rate per 1 000
inhabitants**, the reading that inverts the whole ranking and the reason the hex cartogram exists.

## Verification

`verify-web.mjs --file renders/creme.html` — **50 passed, 2 failed, 7 skipped**. Both failures are
phone-only: at 375 px the header wraps to five lines and the figure runs 50 px past the window. The
desktop frame is the validated one; this is recorded rather than papered over.

## Source

Eurostat `migr_asytpsm`, June 2026 · population 2023 via Our World in Data · Natural Earth basemap.
`data.csv` and `shapes.geojson` are byte-for-byte copies of
`proof/static-flow-map-ukraine-protection/`; `population.csv` of the hex-grid beat's own copy.
