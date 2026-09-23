// THE FLOW MAP VIDEO AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15: « comme dans scrolly »).
//
// The basemap draws every country. Each drawn band is its own GeoJSON `line` layer — its arc precomputed in Bun in
// lon/lat, its width a constant in screen px (the camera never moves), its opacity bound to the frame. The node on
// Ukraine is a circle and a symbol layer; each named host a seat dot and a symbol layer, added by `withNames` once the
// names are placed on the measured map (they are not part of the plan the map is measured on).
//
// THE TRACE is not a binding: a `line-gradient` reads `line-progress`, which `validateScrollyPlan` refuses in a bound
// paint. At every frame the composition cuts each band's arc at its drawn share of its length in px (`arcAt`) and
// hands that line to the band's own source (`setData`); `useLiveMap` releases the frame only once the source is
// re-tiled and the map idle — exact and deterministic, where a dash pattern restarts at every tile edge.

import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { cameraFields, lonLatOf, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";

export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
const KEY = "__MAPTILER" + "_KEY__";
/** The static beat's window, [west, south, east, north]; a seat is the centre of a country's part inside it. */
export const WINDOW = Object.freeze([-25, 34, 45, 72]);
/** A seat in the open Bay of Biscay, inside the camera: the colour of its cell is what « the sea » is. */
export const BISCAY = Object.freeze([-5, 45.5]);
/** The focus box's padding, × its span (the static beat's 16 %). */
export const FOCUS_PAD = 0.16;

/** EVERY COUNTRY'S SEAT, in lon/lat: the mean of its vertices inside the window, taken in Web Mercator. */
export function seatsOf(geo) {
  const [west, south, east, north] = WINDOW;
  const sums = {};
  for (const f of geo.features)
    for (const [lon, lat] of f.geometry.coordinates.flat(2)) {
      if (!(lon >= west && lon <= east && lat >= south && lat <= north)) continue;
      const [x, y] = mercatorOf([lon, lat]);
      const s = (sums[f.properties.iso] ??= { x: 0, y: 0, n: 0 });
      s.x += x;
      s.y += y;
      s.n++;
    }
  return Object.fromEntries(Object.entries(sums).map(([iso, s]) => [iso, lonLatOf([s.x / s.n, s.y / s.n])]));
}

/**
 * THE WHOLE-MAP CAMERA: the box the given seats need, padded, fitted "meet" into `box` (the stage right of the key
 * column) and centred in it. The camera never moves.
 */
export function cameraOf(seats, box, stage) {
  const ms = seats.map(mercatorOf);
  let [x0, x1, y0, y1] = [Math.min(...ms.map((p) => p[0])), Math.max(...ms.map((p) => p[0])), Math.min(...ms.map((p) => p[1])), Math.max(...ms.map((p) => p[1]))];
  const px = (x1 - x0) * FOCUS_PAD;
  const py = (y1 - y0) * FOCUS_PAD;
  [x0, x1, y0, y1] = [x0 - px, x1 + px, y0 - py, y1 + py];
  const worldPx = Math.min(box.w / (x1 - x0), box.h / (y1 - y0));
  const camX = (x0 + x1) / 2 - (box.x + box.w / 2 - stage.width / 2) / worldPx;
  const camY = (y0 + y1) / 2 - (box.y + box.h / 2 - stage.height / 2) / worldPx;
  return cameraFields({ center: lonLatOf([camX, camY]), zoom: Math.log2(worldPx / 512) });
}

/** Where MapLibre draws [lon, lat] at a camera with no pitch, bearing or padding — checked against the measured map. */
export function projectorOf(camera, stage) {
  const worldPx = 512 * 2 ** camera.camZoom;
  return (lonLat) => {
    const [x, y] = mercatorOf(lonLat);
    return [stage.width / 2 + (x - camera.camX) * worldPx, stage.height / 2 + (y - camera.camY) * worldPx];
  };
}

/** The [lon, lat] MapLibre draws at a stage point, at the same camera. */
export function unprojectorOf(camera, stage) {
  const worldPx = 512 * 2 ** camera.camZoom;
  return ([x, y]) => lonLatOf([camera.camX + (x - stage.width / 2) / worldPx, camera.camY + (y - stage.height / 2) / worldPx]);
}

const faceOf = (r) => maptilerFace({ ...r, fontWeight: Number(r.fontWeight) === 600 ? 700 : r.fontWeight });
const trackingEm = (r) => Number(r.letterSpacing ?? 0) / Number(r.fontSize);
const point = (seat, properties = {}) => ({ type: "FeatureCollection", features: [{ type: "Feature", properties, geometry: { type: "Point", coordinates: seat } }] });
const r6 = (v) => Math.round(v * 1e6) / 1e6;
const textLayout = (r, anchor = "center") => ({
  "text-field": ["get", "text"],
  "text-font": [faceOf(r)],
  "text-size": r.fontSize,
  "text-letter-spacing": trackingEm(r),
  "text-anchor": anchor,
  "text-max-width": 100,
  "text-allow-overlap": true,
  "text-ignore-placement": true,
});

/**
 * THE PLAN THE MAP IS MEASURED ON: the bands, the smallest under and the largest on top, then the node and its name.
 * A band layer carries `cumulative`, its arc's length in stage px at every vertex — what `arcAt` cuts it by.
 *
 * @param {{ bands: Array<{ code: string, top: boolean, drawn: boolean, width: number, coordinates: number[][], cumulative: number[] }>,
 *   node: { seat: number[], r: number, text: string }, colours: any, strokes: { node: number }, registers: { axis: any },
 *   camera: any }} input
 */
export function mapPlanFor({ bands, node, colours, strokes, registers, camera, stage = REFERENCE }) {
  const lines = bands
    .filter((b) => b.drawn)
    .reverse()
    .map((b) => ({
      id: `band-${b.code}`,
      type: "line",
      data: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: b.coordinates.map(([lon, lat]) => [r6(lon), r6(lat)]) } }] },
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: { "line-color": b.top ? colours.subjectBand : colours.band, "line-width": b.width, "line-opacity": 0 },
      bindings: { "line-opacity": { $state: `band${b.code}` } },
      cumulative: b.cumulative.map((v) => Math.round(v * 100) / 100),
    }));
  const origin = [
    {
      id: "node",
      type: "circle",
      data: point(node.seat),
      // MapLibre strokes outside the radius: the SVG circle's radius less half the stroke.
      paint: { "circle-radius": node.r - strokes.node / 2, "circle-color": colours.ground, "circle-stroke-color": colours.node, "circle-stroke-width": strokes.node, "circle-opacity": 0, "circle-stroke-opacity": 0 },
      bindings: { "circle-opacity": { $state: "furniture" }, "circle-stroke-opacity": { $state: "furniture" } },
    },
    {
      id: "node-name",
      type: "symbol",
      data: point(node.seat, { text: node.text }),
      layout: textLayout(registers.axis),
      paint: { "text-color": colours.text.name, "text-opacity": 0 },
      bindings: { "text-opacity": { $state: "furniture" } },
    },
  ];
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    // The water convention is declined (PALETTE.md): the sea is the bare ground, the land one step off it.
    tints: { water: colours.ground, land: colours.land },
    // THE STAGE THE CAMERA WAS AUTHORED FOR, which is the stage this run draws at — not 1920 x 1080. A consumer that
    // re-fits a plan to its own stage (`zoomShiftFor`) shifts the zoom by the ratio to these numbers, so a portrait
    // plan that declared the landscape frame would hand it a ratio it never had.
    referenceWidth: stage.width,
    referenceHeight: stage.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(camera) },
    layers: [...lines, ...origin],
  };
}

/**
 * THE NAMED HOSTS, added once they are placed on the measured map: for each, a dot on its seat and its name centred on
 * the box `build.mjs` chose, both bound to `name<code>`; under the node, over every band.
 *
 * @param {{ names: Array<{ code: string, seat: number[], at: number[], text: string, ink: string, halo: number, haloColour: string }>,
 *   colours: any, axis: any, dotR: number }} input
 */
export function withNames(plan, { names, colours, axis, dotR }) {
  const layers = names.flatMap((n) => [
    {
      id: `seat-${n.code}`,
      type: "circle",
      data: point(n.seat),
      paint: { "circle-radius": dotR, "circle-color": colours.node, "circle-stroke-color": colours.ground, "circle-stroke-width": 1, "circle-opacity": 0, "circle-stroke-opacity": 0 },
      bindings: { "circle-opacity": { $state: `name${n.code}` }, "circle-stroke-opacity": { $state: `name${n.code}` } },
    },
    {
      id: `name-${n.code}`,
      type: "symbol",
      data: point(n.at, { text: n.text }),
      layout: textLayout(axis),
      paint: { "text-color": n.ink, "text-halo-color": n.haloColour, "text-halo-width": n.halo / 2, "text-opacity": 0 },
      bindings: { "text-opacity": { $state: `name${n.code}` } },
    },
  ]);
  const at = plan.layers.findIndex((l) => l.id === "node");
  return { ...plan, layers: [...plan.layers.slice(0, at), ...layers, ...plan.layers.slice(at)] };
}

/** The seats `measure.mjs` projects on the real map: Biscay (what the sea is), the origin, and the westmost, southmost
 *  and largest hosts — what `projectorOf` is checked against. */
export function mapSeatsOf(seats) {
  return { biscay: [...BISCAY], origin: seats.UKR, largest: seats.DEU, west: seats.IRL, south: seats.ESP };
}
