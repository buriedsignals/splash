/**
 * THE CAMERA THIS BEAT MEASURES WITH — AND, SINCE RULING R1, THE ONE IT DOES NOT DRAW IN.
 *
 * Lambert azimuthal equal-area, centred at 46° N 19° E — the middle of the Danube basin rather than
 * the middle of Europe, because everything this page counts is counted inside a band roughly five
 * degrees of latitude deep and a projection centred on Brussels would put its tangent point outside
 * the subject entirely.
 *
 * WHY EQUAL-AREA HERE, IN THIS SUBJECT'S OWN TERMS. Two of this beat's three measures are lengths on
 * the sphere (great-circle sums along the frozen route) and the third divides one of those lengths
 * by an AREA — each territory's own ground, integrated on the sphere from this beat's own frozen
 * shapes. A number divided by a Mercator area would be a number about the page rather than about the
 * ground, and Serbia would lose its lead to whichever country sits furthest north. So the arithmetic
 * happens here and the drawing happens somewhere else.
 *
 * WHAT THE PAGE DRAWS IN IS WEB MERCATOR, because the owner has ruled that a directed web map is a
 * flat live MapTiler map (« oui une carte MapLibre plate pas un globe ») and MapTiler reprojects the
 * route itself. This file no longer PLACES anything.
 *
 * WHAT MERCATOR COSTS **THIS** SUBJECT, AND IT IS NEITHER A CHOROPLETH'S COST NOR A FAN'S. A
 * choropleth is read by area, so the inflation of the north inflates its argument. A fan pays on the
 * LENGTH OF ITS ARMS. A river pays on the LENGTH OF ITS OWN COURSE, and it pays it unevenly along
 * its own length: the Danube runs from 48,1° N at its source down to 43,7° N at the Iron Gates, and
 * drawn ground scale runs as 1/cos(latitude), so the upstream half is drawn longer per real
 * kilometre than the downstream half. The runner derives the ratio per territory on every render —
 * it measures 1,088 between the German stretch and the Bulgarian one — and the caveat carries it in
 * the reader's own words, because the beat's OPENING measure is a length and the drawn length is the
 * first thing a reader reads off a route map.
 *
 * This file is this beat's own copy. The static sibling carries its own camera and neither imports
 * the other.
 */

/** The window this beat publishes: the frozen route spans 8,18°–28,75° E and 43,65°–49,03° N, and
 *  this is that box with a little air on every side. Held by `bake.mjs`'s own `BEAT.bounds`. */
export const WINDOW = { west: 7.2, east: 29.8, south: 42.8, north: 49.9 };
const RAD = Math.PI / 180;
/** The projection's own centre: the middle of the basin, not the middle of the continent. */
const LAT0 = 46 * RAD;
const LON0 = 19 * RAD;

export function laea([lonDeg, latDeg]: [number, number]): [number, number] {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD - LON0;
  const cosc =
    Math.sin(LAT0) * Math.sin(lat) +
    Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
  return [
    k * Math.cos(lat) * Math.sin(lon),
    -k *
      (Math.cos(LAT0) * Math.sin(lat) -
        Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon)),
  ];
}

/** MECHANISM, not a choice: the camera's box is the projected border of the declared window —
 *  SAMPLED, because a projected rectangle is not a rectangle and its four corners would crop the
 *  bulge in the middle of each edge. */
const border: [number, number][] = [];
for (let i = 0; i <= 120; i += 1) {
  const t = i / 120;
  border.push(
    laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.north]),
  );
  border.push(
    laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.south]),
  );
  border.push(
    laea([WINDOW.west, WINDOW.south + t * (WINDOW.north - WINDOW.south)]),
  );
  border.push(
    laea([WINDOW.east, WINDOW.south + t * (WINDOW.north - WINDOW.south)]),
  );
}
const BX0 = Math.min(...border.map((p) => p[0]));
const BX1 = Math.max(...border.map((p) => p[0]));
const BY0 = Math.min(...border.map((p) => p[1]));
const BY1 = Math.max(...border.map((p) => p[1]));

/** MECHANISM: ONE SCALE FOR BOTH AXES. A map whose aspect is stretched to fill a frame is a map
 *  that lies about shape, so the shapes go into a unit box on the LONGER side and the caller is
 *  told the aspect. */
const spanX = BX1 - BX0;
const spanY = BY1 - BY0;
const span = Math.max(spanX, spanY);
export const CAMERA_ASPECT = spanX / spanY;

export const project = (lonLat: [number, number]): [number, number] => {
  const [x, y] = laea(lonLat);
  return [(x - BX0) / span, (y - BY0) / span];
};
