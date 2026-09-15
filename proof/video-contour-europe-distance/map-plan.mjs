// THE CONTOUR VIDEO AS A MAP PLAN — the live MapTiler map under the overlay (owner, 2026-09-15: « comme dans scrolly »).
//
// The field is still the static beat's, measured in Bun on its frozen shapes (6 km grid, LAEA). What moves here is how
// it is drawn: the study land a MapTiler Countries fill beneath the basemap's water, the land outside the measurement
// the basemap's own land (the key's « hors mesure »), the isolines GeoJSON line layers unprojected to lon/lat, their
// numbers symbol layers at their seats, the farthest point a circle and a symbol layer. Every paint is data-constant
// and bound to a frame field (`scene.mjs`, `mapStateAt`).
//
// THE SWEEP is a MapLibre `canvas` source, not a plan layer: the field resampled in Bun onto a Web Mercator grid
// (`sweepOf`), thresholded per frame in the composition, its texture uploaded once per frame (`DirectedContourVideo`).
// It is mounted between the study land and the land outside, so Russia's edge stays the Countries border.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { maptilerFace } from "#shared/map-beat/glyphs.mjs";
import { cameraFields, lonLatOf, mercatorOf, viewOf } from "#shared/map-beat/scrolly.mjs";
import { laea } from "../scrolly-contour-europe-distance/contour-field.mjs";
import { lonLatOfFrame, STATIC_DIR, unlaea } from "./subject.mjs";

export const REFERENCE = Object.freeze({ width: 1920, height: 1080 });
export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
const KEY = "__MAPTILER" + "_KEY__";
const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${KEY}` };
/** Malta has no level-0 polygon below tile zoom 4 (the choropleth pilot's measurement): painted from its level-1 units. */
const SMALL_BELOW_Z4 = ["MT"];
/** The layer the sweep is mounted beneath: the land outside the measurement. */
export const SWEEP_BENEATH = "outside";
/** Stage pixels per sweep texel at the whole-map camera — about the 6 km cell there, as the SVG canvas was. */
export const SWEEP_PX = 2;
/** A seat in the open Atlantic: the colour of its cell is what « the sea » is. */
export const ATLANTIC = Object.freeze([-30, 45]);

/** ISO 3166-1 alpha-2, the join key MapTiler Countries carries (the choropleth pilot's table, this study's rows). */
const ISO2 = {
  ALB: "AL", AUT: "AT", BLR: "BY", BEL: "BE", BIH: "BA", BGR: "BG", HRV: "HR", CYP: "CY", CZE: "CZ", DNK: "DK",
  EST: "EE", FIN: "FI", FRA: "FR", DEU: "DE", GRC: "GR", HUN: "HU", ISL: "IS", IRL: "IE", ITA: "IT", LVA: "LV",
  LTU: "LT", LUX: "LU", MLT: "MT", MDA: "MD", MNE: "ME", NLD: "NL", MKD: "MK", NOR: "NO", POL: "PL", PRT: "PT",
  ROU: "RO", RUS: "RU", SRB: "RS", SVK: "SK", SVN: "SI", ESP: "ES", SWE: "SE", CHE: "CH", TUR: "TR", UKR: "UA",
  GBR: "GB",
};
export const iso2Of = (iso) => {
  if (!ISO2[iso]) throw new Error(`no ISO A2 code recorded for ${iso} — the live map joins MapTiler Countries on it`);
  return ISO2[iso];
};

const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
const latOfWorldY = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) * 180) / Math.PI - 90;

/** THE WHOLE-MAP CAMERA: the static plate's bounds fitted into its frame, that frame fitted "meet" into the stage (the
 *  choropleth pilot's rule, on the same bounds and frame). The camera never moves. */
export function camerasOf() {
  const { bounds, frame } = JSON.parse(readFileSync(join(STATIC_DIR, "plate", "creme", "geometry.json"), "utf8"));
  const [[west, south], [east, north]] = bounds;
  const frameWorldPx = Math.min(frame.width / (worldX(east) - worldX(west)), frame.height / (worldY(south) - worldY(north)));
  const zoom = Math.log2((frameWorldPx * Math.min(REFERENCE.width / frame.width, REFERENCE.height / frame.height)) / 512);
  const center = [(west + east) / 2, latOfWorldY((worldY(south) + worldY(north)) / 2)];
  return { whole: cameraFields({ center, zoom }), bounds };
}

/** Where MapLibre draws [lon, lat] at a camera with no pitch, bearing or padding — checked against the measured map. */
export function projectorOf(camera, stage) {
  const worldPx = 512 * 2 ** camera.camZoom;
  return (lonLat) => {
    const [x, y] = mercatorOf(lonLat);
    return [stage.width / 2 + (x - camera.camX) * worldPx, stage.height / 2 + (y - camera.camY) * worldPx];
  };
}

/** Kilometres per stage pixel at a latitude, at a camera. */
export const kmPerPxAt = (camera, lat) => (40075.017 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** camera.camZoom);

/** The field's polylines, in frame units (`M x yL x y…`), as [lon, lat] lines. */
export const lonLatLinesOf = (field, d) =>
  d
    .split("M")
    .filter(Boolean)
    .map((part) => part.split("L").map((q) => lonLatOfFrame(field, q.split(" ").map(Number))));

/**
 * THE SWEEP'S RASTER ON A WEB MERCATOR GRID. The field's bytes (`1 + distance / stepKm` over the study land, 0
 * elsewhere) are in LAEA cells; a canvas source is stretched between four corners in Mercator, so every texel's centre
 * is taken back to LAEA and reads its cell (nearest). The grid covers the study land's extent, `SWEEP_PX` stage
 * pixels a texel at `camera`.
 */
export function sweepOf(subject, camera) {
  const { field, bytes } = subject;
  const { x0, y0, cell } = field.projection;
  const { cols: W, rows: H, stepKm } = field.raster;
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (let gy = 0; gy < H; gy++)
    for (let gx = 0; gx < W; gx++) {
      if (!bytes[gy * W + gx]) continue;
      const [lon, lat] = unlaea([x0 + (gx + 0.5) * cell, y0 + (gy + 0.5) * cell]);
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  const pad = 0.2;
  const [mx0, my0] = mercatorOf([west - pad, north + pad]);
  const [mx1, my1] = mercatorOf([east + pad, south - pad]);
  const step = SWEEP_PX / (512 * 2 ** camera.camZoom);
  const cols = Math.ceil((mx1 - mx0) / step);
  const rows = Math.ceil((my1 - my0) / step);
  const out = new Uint8Array(cols * rows);
  const lons = Float64Array.from({ length: cols }, (_, i) => lonLatOf([mx0 + (i + 0.5) * step, 0.5])[0]);
  for (let j = 0; j < rows; j++) {
    const lat = lonLatOf([0.5, my0 + (j + 0.5) * step])[1];
    for (let i = 0; i < cols; i++) {
      const [lx, ly] = laea([lons[i], lat]);
      const gx = Math.floor((lx - x0) / cell);
      const gy = Math.floor((ly - y0) / cell);
      if (gx >= 0 && gy >= 0 && gx < W && gy < H) out[j * cols + i] = bytes[gy * W + gx];
    }
  }
  const lonAt = (mx) => lonLatOf([mx, 0.5])[0];
  const latAt = (my) => lonLatOf([0.5, my])[1];
  const [xa, xb, ya, yb] = [lonAt(mx0), lonAt(mx0 + cols * step), latAt(my0), latAt(my0 + rows * step)];
  return {
    cols,
    rows,
    stepKm,
    /** Top-left, top-right, bottom-right, bottom-left — the canvas source's order. */
    coordinates: [
      [xa, ya],
      [xb, ya],
      [xb, yb],
      [xa, yb],
    ],
    bytes: Buffer.from(out).toString("base64"),
  };
}

const faceOf = (r) => maptilerFace({ ...r, fontWeight: Number(r.fontWeight) === 600 ? 700 : r.fontWeight });
const trackingEm = (r) => Number(r.letterSpacing ?? 0) / Number(r.fontSize);
const lines = (coordinates) => ({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates } }] });
const point = (seat, properties = {}) => ({ type: "FeatureCollection", features: [{ type: "Feature", properties, geometry: { type: "Point", coordinates: seat } }] });
const r5 = (v) => Math.round(v * 1e5) / 1e5;

/**
 * THE PLAN THE MAP IS MEASURED ON: the land, the lines and the farthest point. The lines' numbers are placed from the
 * measurement and added by `withNumbers`, so they are not part of it.
 *
 * @param {{ subject: any, study: string[], colours: any, strokes: { line: number, median: number, dot: number },
 *   registers: { value: any }, cameras: { whole: any }, summit: { seat: [number, number], text: string } }} input
 */
export function mapPlanFor({ subject, study, colours, strokes, registers, cameras, summit }) {
  const { field, MEDIAN } = subject;
  const codes = study.map(iso2Of);
  const small = codes.filter((c) => SMALL_BELOW_Z4.includes(c));
  const byCode = (list) => ["match", ["get", ISO], list, true, false];
  const land = [
    { id: "study", type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, filter: ["all", ["==", ["get", LEVEL], 0], byCode(codes)], paint: { "fill-color": colours.land } },
    ...(small.length
      ? [{ id: "study-small", type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, maxzoom: 4, filter: ["all", ["==", ["get", LEVEL], 1], byCode(small)], paint: { "fill-color": colours.land } }]
      : []),
    // THE LAND OUTSIDE THE MEASUREMENT, over the sweep: the basemap's own land colour, so Russia reads « hors mesure »
    // and the sweep's cells stop at the Countries border.
    { id: SWEEP_BENEATH, type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, filter: ["all", ["==", ["get", LEVEL], 0], ["!", byCode(codes)]], paint: { "fill-color": colours.outside } },
  ];
  const isolines = field.lines.map(({ level, d }) => ({
    id: `line-${level}`,
    type: "line",
    data: lines(lonLatLinesOf(field, d).map((l) => l.map(([lon, lat]) => [r5(lon), r5(lat)]))),
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": colours.lines[level], "line-width": level === MEDIAN ? strokes.median : strokes.line, "line-opacity": 0 },
    bindings: { "line-opacity": { $state: `line${level}` } },
  }));
  const { value } = registers;
  const farthest = [
    {
      id: "summit-ring",
      type: "circle",
      data: point(summit.seat),
      paint: { "circle-radius": 2.2 * strokes.dot, "circle-color": "rgba(0,0,0,0)", "circle-stroke-color": colours.text.median, "circle-stroke-width": strokes.line, "circle-stroke-opacity": 0 },
      bindings: { "circle-stroke-opacity": { $state: "summit" } },
    },
    {
      id: "summit-dot",
      type: "circle",
      data: point(summit.seat),
      paint: { "circle-radius": strokes.dot, "circle-color": colours.text.median, "circle-stroke-color": colours.land, "circle-stroke-width": strokes.line, "circle-opacity": 0, "circle-stroke-opacity": 0 },
      bindings: { "circle-opacity": { $state: "summit" }, "circle-stroke-opacity": { $state: "summit" } },
    },
    {
      id: "summit-number",
      type: "symbol",
      data: point(summit.seat, { text: summit.text }),
      layout: {
        "text-field": ["get", "text"],
        "text-font": [faceOf(value)],
        "text-size": value.fontSize,
        "text-letter-spacing": trackingEm(value),
        "text-anchor": "left",
        "text-offset": [summit.offset / value.fontSize, 0],
        "text-max-width": 100,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
      },
      paint: { "text-color": colours.text.median, "text-halo-color": colours.land, "text-halo-width": summit.halo / 2, "text-opacity": 0 },
      bindings: { "text-opacity": { $state: "summit" } },
    },
  ];
  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${KEY}`,
    styleName: "dataviz",
    projection: "mercator",
    tints: { water: colours.ground, land: colours.outside },
    referenceWidth: REFERENCE.width,
    referenceHeight: REFERENCE.height,
    degreesPerPixel: 1,
    camera: { view: viewOf(cameras.whole) },
    layers: [...land, ...isolines, ...farthest],
  };
}

/** The lines' numbers, one symbol layer per level (a data-constant opacity each), at the seats `build.mjs` chose on the
 *  measured map, under the farthest point's mark. */
export function withNumbers(plan, { labels, colours, axis }) {
  const numbers = Object.entries(labels).map(([level, label]) => ({
    id: `number-${level}`,
    type: "symbol",
    data: point(label.seat, { text: label.text }),
    layout: {
      "text-field": ["get", "text"],
      "text-font": [faceOf(axis)],
      "text-size": axis.fontSize,
      "text-letter-spacing": trackingEm(axis),
      "text-anchor": "center",
      "text-max-width": 100,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": label.ink, "text-halo-color": colours.land, "text-halo-width": label.halo / 2, "text-opacity": 0 },
    bindings: { "text-opacity": { $state: `label${level}` } },
  }));
  const at = plan.layers.findIndex((l) => l.id === "summit-ring");
  return { ...plan, layers: [...plan.layers.slice(0, at), ...numbers, ...plan.layers.slice(at)] };
}

/** The seats `measure.mjs` projects on the real map: the Atlantic (what the sea is), the farthest point, and a vertex of
 *  the innermost and the outermost line — what `projectorOf` is checked against. */
export function mapSeatsOf(subject) {
  const { field } = subject;
  const first = (level) => lonLatLinesOf(field, field.lines.find((l) => l.level === level).d)[0][0];
  return { atlantic: ATLANTIC, summit: lonLatOfFrame(field, field.summit), line100: first(100), line500: first(500) };
}
