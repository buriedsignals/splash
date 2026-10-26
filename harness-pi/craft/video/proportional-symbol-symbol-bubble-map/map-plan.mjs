// THE PROPORTIONAL SYMBOL VIDEO AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15: « comme dans
// scrolly »).
//
// The basemap draws every country; the stations are MapLibre `circle` layers from GeoJSON. Every bound paint is
// DATA-CONSTANT (`validateScrollyPlan`): each of the hundred arrives at its own time, so each is its own layer, its
// radius a constant in an expression bound to its own arrival `c<k>`; the other 8 800 are one layer bound to `rest`.
// The register and the frame are the dot density video's (the same stations, the same static window): its whole-map
// camera, its projector and its measured seats are reused.

import { cameraFields, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";

// ── carried from proof/video-dot-density-europe-stations/map-plan.mjs (zone kit: a beat cannot import another proof):
// its whole-map camera, its projector and its seats. The static plate's window (`plate/creme/geometry.json` bounds)
// is written in, widened as before by every station's own longitude and latitude.
const STATIC_BOUNDS = Object.freeze([[-25, 34], [42, 68]]);
export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
const KEY = "__MAPTILER" + "_KEY__";
/** A seat in the open Atlantic: the colour of its cell is what « the sea » is. */
export const ATLANTIC = Object.freeze([-30, 45]);
/** The widest a size bucket spans: this many px, or this share of its radius, whichever is larger. */
export const BUCKET_PX = 0.25;
export const BUCKET_REL = 0.04;

const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
const latOfWorldY = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) * 180) / Math.PI - 90;

/**
 * THE WHOLE-MAP CAMERA. The static plate's frame stops at 68°N and would cut the 43 stations of the far north, so the
 * frame fitted here is the beat's own: the static window's longitudes and every station's latitude, fitted "meet"
 * into the stage's content box. The camera never moves.
 */
export function camerasOf(subject, content, stage = REFERENCE) {
  const bounds = STATIC_BOUNDS;
  const lats = subject.stations.map((s) => s.lat);
  const lons = subject.stations.map((s) => s.lon);
  const west = Math.min(bounds[0][0], ...lons);
  const east = Math.max(bounds[1][0], ...lons);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const worldPx = Math.min(content.w / (worldX(east) - worldX(west)), content.h / (worldY(south) - worldY(north)));
  const zoom = Math.log2(worldPx / 512);
  // THE FRAME IS CENTRED ON THE CONTENT BOX, and the content box is no longer always centred on the stage: a frame
  // that is not 16:9 reserves a band for the key (`contentOf`), and the map is fitted below it. MapLibre centres its
  // camera on the stage, so the camera's centre carries the offset between the two centres.
  const offX = (content.x + content.w / 2 - stage.width / 2) / worldPx;
  const offY = (content.y + content.h / 2 - stage.height / 2) / worldPx;
  const center = [((worldX(west) + worldX(east)) / 2 - offX) * 360 - 180, latOfWorldY((worldY(south) + worldY(north)) / 2 - offY)];
  return { whole: cameraFields({ center, zoom }), bounds: [[west, south], [east, north]] };
}

/** Where MapLibre draws [lon, lat] at a camera with no pitch, bearing or padding — checked against the measured map. */
export function projectorOf(camera, stage) {
  const worldPx = 512 * 2 ** camera.camZoom;
  return (lonLat) => {
    const [x, y] = mercatorOf(lonLat);
    return [stage.width / 2 + (x - camera.camX) * worldPx, stage.height / 2 + (y - camera.camY) * worldPx];
  };
}


/** A circle arriving starts at this share of its radius (`SymbolFrame`'s key and the old SVG marks alike). */
export const ARRIVAL_FROM = 0.6;

const r5 = (v) => Math.round(v * 1e5) / 1e5;
const pointsOf = (seats) => ({
  type: "FeatureCollection",
  features: seats.map(([lon, lat]) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [r5(lon), r5(lat)] } })),
});
export const arrivalField = (k) => `c${k}`;

/**
 * THE PLAN. The rest's points under everything; then the hundred, largest first, so the smallest outline is never
 * under a larger one. A circle is hollow: no fill, its outline the SVG stroke — MapLibre strokes OUTSIDE the radius,
 * so the radius is the drawn ring's less half the stroke, and the ring grows from `ARRIVAL_FROM` of it as it arrives.
 *
 * @param {{ top: Array<{ lon: number, lat: number, r: number }>, rest: Array<[number, number]>, colours: any,
 *   strokes: { circle: number }, pointR: number, cameras: { whole: any } }} input
 */
export function mapPlanFor({ top, rest, colours, strokes, pointR, cameras, stage = REFERENCE }) {
  const half = strokes.circle / 2;
  const restLayer = {
    id: "rest",
    type: "circle",
    data: pointsOf(rest),
    paint: { "circle-color": colours.point, "circle-radius": pointR, "circle-opacity": 0 },
    bindings: { "circle-opacity": { $state: "rest" } },
  };
  const circles = top.map((c, k) => {
    const t = { $state: arrivalField(k) };
    return {
      id: `top-${k}`,
      type: "circle",
      data: pointsOf([[c.lon, c.lat]]),
      paint: {
        "circle-color": colours.circle,
        "circle-opacity": 0,
        "circle-radius": Math.max(0, ARRIVAL_FROM * c.r - half),
        "circle-stroke-color": colours.circle,
        "circle-stroke-width": strokes.circle,
        "circle-stroke-opacity": 0,
      },
      bindings: {
        "circle-radius": ["max", 0, ["-", ["*", c.r, ["+", ARRIVAL_FROM, ["*", 1 - ARRIVAL_FROM, t]]], half]],
        "circle-stroke-opacity": t,
      },
      r: c.r,
    };
  });
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints: { water: colours.sea, land: colours.land },
    // THE STAGE THE CAMERA WAS AUTHORED FOR, which is the stage this run draws at — not 1920 x 1080. A consumer that
    // re-fits a plan to its own stage (`zoomShiftFor`) shifts the zoom by the ratio to these numbers, so a portrait
    // plan that declared the landscape frame would hand it a ratio it never had.
    referenceWidth: stage.width,
    referenceHeight: stage.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(cameras.whole) },
    layers: [restLayer, ...circles],
  };
}

// ── carried from proof/video-dot-density-europe-stations/map-plan.mjs ──

/** The seats `measure.mjs` projects on the real map: the Atlantic (what the sea is), and the westmost, northmost and
 *  eastmost stations — what `projectorOf` is checked against. */
export function mapSeatsOf(subject) {
  const by = (f) => subject.stations.reduce((a, s) => (f(s) > f(a) ? s : a));
  const seat = (s) => [s.lon, s.lat];
  return { atlantic: ATLANTIC, west: seat(by((s) => -s.lon)), north: seat(by((s) => s.lat)), east: seat(by((s) => s.lon)) };
}
