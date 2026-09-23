// THE PROPORTIONAL SYMBOL VIDEO AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15: « comme dans
// scrolly »).
//
// The basemap draws every country; the stations are MapLibre `circle` layers from GeoJSON. Every bound paint is
// DATA-CONSTANT (`validateScrollyPlan`): each of the hundred arrives at its own time, so each is its own layer, its
// radius a constant in an expression bound to its own arrival `c<k>`; the other 8 800 are one layer bound to `rest`.
// The register and the frame are the dot density video's (the same stations, the same static window): its whole-map
// camera, its projector and its measured seats are reused.

import { viewOf } from "#shared/map-beat/scrolly.mjs";
import { ATLANTIC, camerasOf, mapSeatsOf, projectorOf, REFERENCE } from "../video-dot-density-europe-stations/map-plan.mjs";

export { ATLANTIC, camerasOf, mapSeatsOf, projectorOf, REFERENCE };

const KEY = "__MAPTILER" + "_KEY__";
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
