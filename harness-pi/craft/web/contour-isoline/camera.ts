/**
 * THE CAMERA THIS BEAT PUBLISHES, AND WHY IT IS NOT WEB MERCATOR.
 *
 * Lambert azimuthal equal-area, centred at 52° N 10° E — EPSG:3035, the projection the European
 * Environment Agency and Eurostat publish continental statistics in.
 *
 * A CHOROPLETH IS READ BY AREA. The eye weights a class by how much of the page it covers, so a
 * projection that inflates the north inflates the argument. In Web Mercator, Norway, Sweden and
 * Finland are stretched by about a factor of two at their own latitudes — three of the seven
 * countries this beat is about. An equal-area projection is not a refinement here; it is the
 * difference between a map that supports the sentence and one that manufactures it.
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

/** THE INVERSE, because this beat now has TWO cameras. The field is measured on the equal-area grid
 *  above and DRAWN on a baked MapTiler plate, so every grid coordinate has to become a longitude and
 *  a latitude before the plate can place it. `laea` returns y already negated (north is small y), so
 *  the inverse negates it back before the standard formula. */
export function unlaea([x, yNeg]: [number, number]): [number, number] {
  const y = -yNeg;
  const rho = Math.hypot(x, y);
  if (rho < 1e-12) return [(LON0 * 180) / Math.PI, (LAT0 * 180) / Math.PI];
  const c = 2 * Math.asin(Math.min(1, rho / 2));
  const lat = Math.asin(Math.cos(c) * Math.sin(LAT0) + (y * Math.sin(c) * Math.cos(LAT0)) / rho);
  const lon =
    LON0 +
    Math.atan2(x * Math.sin(c), rho * Math.cos(LAT0) * Math.cos(c) - y * Math.sin(LAT0) * Math.sin(c));
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
}

/** A point of this camera's own unit box back to longitude and latitude. */
export const unproject = ([u, v]: [number, number]): [number, number] =>
  unlaea([BX0 + u * span, BY0 + v * span]);
