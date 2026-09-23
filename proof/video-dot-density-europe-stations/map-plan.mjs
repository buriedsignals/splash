// THE DOT DENSITY VIDEO AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15: « comme dans scrolly »).
//
// The basemap draws every country; the 8 900 stations are MapLibre `circle` layers from GeoJSON. Every bound paint is
// DATA-CONSTANT (`validateScrollyPlan`): MapLibre relays out a source whenever a data-driven paint changes, so the
// growth of every dot into its weight is not one `["get", …]` radius per fuel. The stations are split instead by fuel
// and by the radius they grow to, one layer per (fuel, size bucket), each bucket's radius a constant in an expression
// bound to the frame's `weight` — the area carried linearly from the dot's to the bucket's. A bucket's radius is the
// root of its members' mean square, so the area it draws is exactly the sum of its members'; no member differs from it
// by more than `BUCKET_PX` or `BUCKET_REL` of it.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cameraFields, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";
import { STATIC_DIR, SUBJECT } from "./subject.mjs";

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
  const { bounds } = JSON.parse(readFileSync(join(STATIC_DIR, "plate", "creme", "geometry.json"), "utf8"));
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

export const slugOf = (fuel) => fuel.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * THE SIZE BUCKETS OF ONE FUEL, largest first (a small station is never under a large one). `stations` carry `w`, the
 * radius at their weight in px. Returns `[{ r1, members }]`.
 */
export function bucketsOf(stations) {
  const sorted = [...stations].sort((a, b) => a.w - b.w);
  const out = [];
  let open = null;
  for (const s of sorted) {
    if (!open || s.w > open.from + Math.max(BUCKET_PX, BUCKET_REL * open.from)) {
      open = { from: s.w, members: [] };
      out.push(open);
    }
    open.members.push(s);
  }
  return out
    .map(({ members }) => ({ r1: Math.sqrt(members.reduce((a, s) => a + s.w * s.w, 0) / members.length), members }))
    .reverse();
}

const W = { $state: "weight" };
const r5 = (v) => Math.round(v * 1e5) / 1e5;
const points = (members) => ({
  type: "FeatureCollection",
  features: members.map((s) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [r5(s.lon), r5(s.lat)] } })),
});
/** A dot's radius at the frame's weight: its area from the dot's to the bucket's, linearly (`scene.mjs`, `radiusAt`). */
const grownRadius = (r0, r1) => ["sqrt", ["+", ["*", ["-", 1, W], r0 * r0], ["*", W, r1 * r1]]];

/**
 * THE PLAN. Fuels in their arrival order, the subject last; in each fuel the buckets largest first; the subject's rings
 * over every dot. A dot's fill and outline opacities are its fuel's (`fill<i>`, `edge<i>`); the ring closes onto the
 * disc as it grows, its stroke thinning (MapLibre strokes outside the radius: the radius is the SVG ring's less half the
 * stroke).
 *
 * @param {{ fuels: Array<{ fuel: string }>, stations: Record<string, Array<{ lon: number, lat: number, w: number }>>,
 *   colours: any, strokes: { hairline: number, ring: number }, dotR: number, ringR: number, cameras: { whole: any } }} input
 */
export function mapPlanFor({ fuels, stations, colours, strokes, dotR, ringR, cameras, stage = REFERENCE }) {
  const layers = [];
  const rings = [];
  fuels.forEach(({ fuel }, i) => {
    const isSubject = fuel === SUBJECT;
    bucketsOf(stations[fuel]).forEach(({ r1, members }, b) => {
      const id = `${slugOf(fuel)}-${b}`;
      const data = points(members);
      layers.push({
        id: `dot-${id}`,
        type: "circle",
        data,
        paint: { "circle-color": isSubject ? colours.subject : colours.dot, "circle-radius": dotR, "circle-opacity": 0, "circle-stroke-color": colours.land, "circle-stroke-width": strokes.hairline, "circle-stroke-opacity": 0 },
        bindings: { "circle-radius": grownRadius(dotR, r1), "circle-opacity": { $state: `fill${i}` }, "circle-stroke-opacity": { $state: `edge${i}` } },
        r1,
        n: members.length,
      });
      if (isSubject) {
        const halfStroke = ["*", strokes.ring / 2, ["-", 1, ["*", 0.4, W]]];
        rings.push({
          id: `ring-${id}`,
          type: "circle",
          data,
          paint: { "circle-color": colours.subject, "circle-radius": ringR - strokes.ring / 2, "circle-opacity": 0, "circle-stroke-color": colours.subject, "circle-stroke-width": strokes.ring, "circle-stroke-opacity": 0 },
          bindings: {
            "circle-radius": ["max", 0, ["-", ["max", ["*", ringR, ["-", 1, W]], grownRadius(dotR, r1)], halfStroke]],
            "circle-stroke-width": ["*", strokes.ring, ["-", 1, ["*", 0.4, W]]],
            "circle-stroke-opacity": { $state: "named" },
          },
          r1,
          n: members.length,
        });
      }
    });
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
    layers: [...layers, ...rings],
  };
}

/** The seats `measure.mjs` projects on the real map: the Atlantic (what the sea is), and the westmost, northmost and
 *  eastmost stations — what `projectorOf` is checked against. */
export function mapSeatsOf(subject) {
  const by = (f) => subject.stations.reduce((a, s) => (f(s) > f(a) ? s : a));
  const seat = (s) => [s.lon, s.lat];
  return { atlantic: ATLANTIC, west: seat(by((s) => -s.lon)), north: seat(by((s) => s.lat)), east: seat(by((s) => s.lon)) };
}
