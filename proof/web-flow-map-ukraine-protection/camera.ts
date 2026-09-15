/**
 * THE CAMERA THIS BEAT MEASURES WITH — AND, SINCE 2026-09-15, THE ONE IT DOES NOT DRAW IN.
 *
 * Lambert azimuthal equal-area, centred at 52° N 10° E — EPSG:3035, the projection the European
 * Environment Agency and Eurostat publish continental statistics in.
 *
 * WHAT THE PAGE DRAWS IN IS WEB MERCATOR, because the owner has ruled that a directed web map is a
 * flat live MapTiler map (« oui une carte MapLibre plate pas un globe ») and MapTiler reprojects the
 * bands itself. This file no longer PLACES anything. It stays because it is what MEASURES: the
 * runner prints both cameras on every render, and it is against an equal-area ground that the cost
 * of the flat one is stated rather than buried.
 *
 * WHAT THAT COST IS ON A FAN, AND IT IS NOT THE COST A CHOROPLETH PAYS. A choropleth is read by
 * AREA, so Mercator's inflation of the north inflates its argument directly. A flow map's argument
 * rides on WIDTH, which is drawn in screen pixels and is therefore untouched. What Mercator
 * stretches here is the LENGTH OF THE ARMS: measured on this beat's own seats, the band to Iceland
 * is drawn about 1,41 times longer per real kilometre than the band to Cyprus, so a reader reads the
 * northern destinations as further away than they are. The page's caveat carries the number.
 *
 * This file is this beat's own copy. The static sibling carries the same arithmetic and neither
 * imports the other: a beat is readable and renderable on its own, which is the rule this tree keeps
 * between beats.
 */

export const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;

export function laea([lonDeg, latDeg]: [number, number]): [number, number] {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD - LON0;
  const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
  return [
    k * Math.cos(lat) * Math.sin(lon),
    -k * (Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon)),
  ];
}

/** The camera's box is the projected border of the declared window — SAMPLED, because a projected
 *  rectangle is not a rectangle and its four corners would crop the bulge in the middle of each
 *  edge. */
const border: [number, number][] = [];
for (let i = 0; i <= 120; i += 1) {
  const t = i / 120;
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.north]));
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.south]));
  border.push(laea([WINDOW.west, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
  border.push(laea([WINDOW.east, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
}
const BX0 = Math.min(...border.map((p) => p[0]));
const BX1 = Math.max(...border.map((p) => p[0]));
const BY0 = Math.min(...border.map((p) => p[1]));
const BY1 = Math.max(...border.map((p) => p[1]));

/** ONE SCALE FOR BOTH AXES. A map whose aspect is stretched to fill a frame is a map that lies about
 *  shape, so the shapes go into a unit box on the LONGER side and the caller is told the aspect. */
const spanX = BX1 - BX0;
const spanY = BY1 - BY0;
const span = Math.max(spanX, spanY);
export const CAMERA_ASPECT = spanX / spanY;

export const project = (lonLat: [number, number]): [number, number] => {
  const [x, y] = laea(lonLat);
  return [(x - BX0) / span, (y - BY0) / span];
};
