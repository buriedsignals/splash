// THE MAP THIS VIDEO DRAWS — the scrolly beat's vector geometry, clipped instead of clamped.
//
// `choroplethGeometry` (`proof/scrolly-choropleth-europe-lowcarbon/choropleth-geometry.mjs`) projects the
// frozen Natural Earth rings into the static plate's own camera and seats every name at its country's most
// interior point. It CLAMPS each ring to a margin around the frame. A clamped vertex is moved onto the
// margin, and the edges leading to it swing with it: the scrolly contour session saw a clamped Russia fold
// into a polygon over western Europe. The video's camera travels, so it cannot lean on that happening
// outside the view.
//
// So the rings are CLIPPED first — Sutherland–Hodgman against a box just inside the clamp's margin, the
// algorithm `proof/scrolly-contour-europe-distance/contour-field.mjs` runs as `clipRing` — and handed back
// in degrees, so `choroplethGeometry` finds nothing left to clamp. `clipRing` is local to `contourField`
// there (not exported), so it is written here once more, with its box as a parameter.
//
// NATURAL EARTH'S `-99`. Kosovo and Northern Cyprus both carry iso `-99`; `choroplethGeometry` groups rings
// by iso, which would seat « Kosovo » on the larger of two countries three seas apart. Features with no
// assigned code are keyed `-99:<name>` before the geometry sees them.

import { BEAT } from "../static-choropleth-europe-lowcarbon/bake.mjs";
import { cameraFor, choroplethGeometry } from "../scrolly-choropleth-europe-lowcarbon/choropleth-geometry.mjs";

/** The static plate's camera, in the scrolly's units (`render-directions-scrolly.mjs`, `FRAME`). */
export const FRAME = Object.freeze({ width: 1000, height: 760 });

/** `choroplethGeometry` clamps to 900 × 500 units past the frame; the clip box sits ten units inside it,
 *  where the scrolly's own clip path draws the sea, so a clipped vertex is never a clamped one. */
export const CLIP_MARGIN = Object.freeze({ x: 890, y: 490 });
/** The clamp's own margin, named so a test can say that no drawn vertex was moved onto it. */
export const CLAMP_MARGIN = Object.freeze({ x: 900, y: 500 });

const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));

/** Sutherland–Hodgman: the part of a closed ring inside an axis-aligned box, each crossing cut where the
 *  edge really crosses the box. */
export function clipRing(pts, box) {
  const cut = (a, b, axis, v) => {
    const t = (v - a[axis]) / (b[axis] - a[axis]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const edges = [
    [(p) => p[0] >= box.x0, (a, b) => cut(a, b, 0, box.x0)],
    [(p) => p[0] <= box.x1, (a, b) => cut(a, b, 0, box.x1)],
    [(p) => p[1] >= box.y0, (a, b) => cut(a, b, 1, box.y0)],
    [(p) => p[1] <= box.y1, (a, b) => cut(a, b, 1, box.y1)],
  ];
  let out = pts;
  for (const [inside, cross] of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) {
        if (!inside(prev)) out.push(cross(prev, cur));
        out.push(cur);
      } else if (inside(prev)) out.push(cross(prev, cur));
    }
    if (!out.length) break;
  }
  return out;
}

/** The frozen shapes, every ring clipped to the margin in the camera's own units and returned in degrees. */
export function clippedGeo(geo, { bounds = BEAT.bounds, width = FRAME.width, height = FRAME.height } = {}) {
  const corners = cameraFor(bounds, { width, height });
  const yN = mercY(corners.north);
  const yS = mercY(corners.south);
  const project = ([lon, lat]) => [((lon - corners.west) / (corners.east - corners.west)) * width, ((mercY(lat) - yN) / (yS - yN)) * height];
  const unproject = ([x, y]) => [
    corners.west + (x / width) * (corners.east - corners.west),
    (2 * Math.atan(Math.exp(yN + (y / height) * (yS - yN))) - Math.PI / 2) / RAD,
  ];
  const box = { x0: -CLIP_MARGIN.x, x1: width + CLIP_MARGIN.x, y0: -CLIP_MARGIN.y, y1: height + CLIP_MARGIN.y };
  return {
    ...geo,
    features: geo.features
      .map((f) => ({
        ...f,
        properties: { ...f.properties, iso: f.properties.iso === "-99" ? `-99:${f.properties.name}` : f.properties.iso },
        geometry: {
          ...f.geometry,
          coordinates: f.geometry.coordinates
            .map((poly) => poly.map((ring) => clipRing(ring.map(project), box).map(unproject)).filter((r) => r.length >= 3))
            .filter((poly) => poly.length),
        },
      }))
      .filter((f) => f.geometry.coordinates.length),
  };
}

/** Albania's ring-neighbours that carry no row in the frozen data — derived the way `loadSubject` derives
 *  the measured ones (a vertex within a tenth of a degree), on the raw rings, so Kosovo is found, not typed. */
export function unmeasuredNeighboursOf(subject, iso) {
  const { geo, value } = subject;
  const NEAR_DEGREES = 0.1;
  const keyOf = (f) => (f.properties.iso === "-99" ? `-99:${f.properties.name}` : f.properties.iso);
  const mine = geo.features.filter((f) => f.properties.iso === iso).flatMap((f) => f.geometry.coordinates.flat().flat());
  return geo.features
    .filter((f) => f.properties.iso !== iso && !value.has(f.properties.iso))
    .filter((f) => f.geometry.coordinates.flat().flat().some(([x, y]) => mine.some(([u, v]) => Math.abs(x - u) < NEAR_DEGREES && Math.abs(y - v) < NEAR_DEGREES)))
    .map((f) => ({ key: keyOf(f), name: f.properties.name }));
}

/** The scrolly's geometry on the clipped shapes: `{ shapes: [{ iso, path, seat, box }], project, corners }`. */
export function videoGeometry(subject) {
  return choroplethGeometry(clippedGeo(subject.geo), { bounds: BEAT.bounds, ...FRAME, keep: new Set(subject.studySet) });
}
