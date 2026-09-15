// THE CONTOUR SCROLLY AS A MAP PLAN — matching the validated video beat's visual treatment
// (`proof/video-contour-europe-distance` on `quality/video`, owner 2026-09-15: « comme dans la vidéo »).
//
// The field is `contour-field.mjs`'s own (unchanged): an exact distance transform on a 6 km LAEA grid. What
// changes is where it is drawn — the study land a MapTiler Countries fill beneath the basemap's water, the
// land outside the measurement (Russia, cut by the frame) the basemap's own land, so the sweep's fill and
// every isoline are placed in lon/lat over a real basemap rather than a hand-drawn SVG projection.
//
// THE SWEEP is a MapLibre `canvas` source, not a plan layer: `sweepOf` resamples the field's raster (LAEA) onto
// a Web Mercator grid once in Bun; `contour-drive.mjs` thresholds it per frame and uploads the texture. It is
// mounted beneath the "outside" layer (Russia stays on top, its own edge unblurred by the fill).
//
// NUMBERS ARE SEATED ONCE, not re-seated every frame: `bestSeatOf` picks, from the field's own candidate seats,
// the one with the most room against every OTHER level's lines at once — valid whichever subset of lines the
// scroll has drawn so far, since fewer visible lines only leaves MORE room. The static plate's own per-frame
// re-seeding (the room a number needs changes with which lines are shown) is simplified away here: one seat
// per level, chosen for the crowded case. Noted in the report.

import { laea, CELL_KM, EARTH_KM } from "./contour-field.mjs";
import { mercatorOf, lonLatOf } from "#shared/map-beat/scrolly.mjs";

const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;

/** The inverse of `contour-field.mjs`'s `laea`. Ported from the validated video beat's `subject.mjs`. */
export function unlaea([x, yNeg]) {
  const y = -yNeg;
  const rho = Math.hypot(x, y);
  if (rho < 1e-12) return [LON0 / RAD, LAT0 / RAD];
  const c = 2 * Math.asin(Math.min(1, rho / 2));
  const lat = Math.asin(Math.cos(c) * Math.sin(LAT0) + (y * Math.sin(c) * Math.cos(LAT0)) / rho);
  const lon = LON0 + Math.atan2(x * Math.sin(c), rho * Math.cos(LAT0) * Math.cos(c) - y * Math.sin(LAT0) * Math.sin(c));
  return [lon / RAD, lat / RAD];
}

/** A point in the field's frame units, as [lon, lat]. */
export const lonLatOfFrame = (field, [fx, fy]) => {
  const { x0, frameY0, scale } = field.projection;
  return unlaea([fx / scale + x0, fy / scale + frameY0]);
};

/** The field's polylines, in frame units (`M x yL x y…`), as [lon, lat] lines. Ported from the validated video
 *  beat's `map-plan.mjs`. */
export const lonLatLinesOf = (field, d) =>
  d
    .split("M")
    .filter(Boolean)
    .map((part) => part.split("L").map((q) => lonLatOfFrame(field, q.split(" ").map(Number))));

export const LAYER = "administrative";
export const LEVEL = "level";
export const ISO = "iso_a2";
export const SWEEP_BENEATH = "outside";
/** Malta has no level-0 polygon below tile zoom 4 (the choropleth pilot's measurement): painted from its level-1 units. */
const SMALL_BELOW_Z4 = ["MT"];
/** ISO 3166-1 alpha-2, the join key MapTiler Countries carries (ported from the validated video beat). */
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

/**
 * THE SWEEP'S RASTER ON A WEB MERCATOR GRID, ported from the validated video beat's `sweepOf`: the field's
 * bytes (`1 + distance / stepKm` over the study land, 0 elsewhere) live in LAEA cells; a canvas source is
 * stretched between four corners in Mercator, so every texel's centre is taken back to LAEA and reads its
 * cell (nearest).
 */
export function sweepOf(field, bytes, camera, referenceWidth) {
  const { x0, frameY0 } = field.projection;
  const cell = CELL_KM / EARTH_KM;
  const W = field.raster.cols;
  const H = field.raster.rows;
  const laeaOf = (gx, gy) => [x0 + (gx + 0.5) * cell, frameY0 + (gy + 0.5) * cell];
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (let gy = 0; gy < H; gy++)
    for (let gx = 0; gx < W; gx++) {
      if (!bytes[gy * W + gx]) continue;
      const [lon, lat] = unlaea(laeaOf(gx, gy));
      west = Math.min(west, lon);
      east = Math.max(east, lon);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  const pad = 0.2;
  const [mx0, my0] = mercatorOf([west - pad, north + pad]);
  const [mx1, my1] = mercatorOf([east + pad, south - pad]);
  const SWEEP_PX = 2 * (referenceWidth / 1920);
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
      const gy = Math.floor((ly - frameY0) / cell);
      if (gx >= 0 && gy >= 0 && gx < W && gy < H) out[j * cols + i] = bytes[gy * W + gx];
    }
  }
  const lonAt = (mx) => lonLatOf([mx, 0.5])[0];
  const latAt = (my) => lonLatOf([0.5, my])[1];
  return {
    cols,
    rows,
    stepKm: field.raster.stepKm,
    coordinates: [
      [lonAt(mx0), latAt(my0)],
      [lonAt(mx0 + cols * step), latAt(my0)],
      [lonAt(mx0 + cols * step), latAt(my0 + rows * step)],
      [lonAt(mx0), latAt(my0 + rows * step)],
    ],
    bytes: out,
  };
}

/** THE BEST STATIC SEAT for a level's number: among the field's own candidates, the one whose smallest
 *  clearance against every OTHER level (at the narrowest half-width its text needs) is largest — valid
 *  whichever subset of lines is currently drawn, since a hidden line only frees room. */
export function bestSeatOf(field, li, hwIndex) {
  const others = field.seats.map((_, lj) => lj).filter((lj) => lj !== li);
  let best = null;
  let bestScore = -1;
  for (const s of field.seats[li]) {
    const room = (lj) => s[2 + lj * field.seatHalfWidths.length + hwIndex];
    const score = Math.min(...others.map(room));
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

const fill = (colour, extra = {}) => ({ "fill-color": colour, ...extra });
const point = (seat, properties = {}) => ({ type: "FeatureCollection", features: [{ type: "Feature", properties, geometry: { type: "Point", coordinates: seat } }] });
const multiline = (lines) => ({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiLineString", coordinates: lines } }] });
const r5 = (v) => Math.round(v * 1e5) / 1e5;

/**
 * @param {{ field: any, study: string[], levels: number[], medianLevel: number, colours: any, strokes: any,
 *   cameras: any[], statesForCards: any[], referenceWidth: number, referenceHeight: number, numberSeats: any,
 *   summit: { seat: number[], text: string, offset: number } }} input
 */
export function contourMapPlan({ field, study, levels, medianLevel, colours, strokes, cameras, statesForCards, referenceWidth, referenceHeight, numberSeats, summit }) {
  const codes = study.map(iso2Of);
  const small = codes.filter((c) => SMALL_BELOW_Z4.includes(c));
  const countries = { type: "vector", url: `https://api.maptiler.com/tiles/countries/tiles.json?key=${"__MAPTILER" + "_KEY__"}` };
  const byCode = (list) => ["match", ["get", ISO], list, true, false];
  const land = [
    { id: "study", type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, filter: ["all", ["==", ["get", LEVEL], 0], byCode(codes)], paint: fill(colours.land) },
    ...(small.length ? [{ id: "study-small", type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, maxzoom: 4, filter: ["all", ["==", ["get", LEVEL], 1], byCode(small)], paint: fill(colours.land) }] : []),
    // THE LAND OUTSIDE THE MEASUREMENT (Russia, cut by the frame): the basemap's own land colour, named so the
    // sweep can mount beneath it and its own edge stays the Countries border, unblurred by the fill.
    { id: SWEEP_BENEATH, type: "fill", beneath: "water", source: countries, sourceLayer: LAYER, filter: ["all", ["==", ["get", LEVEL], 0], ["!", byCode(codes)]], paint: fill(colours.outside) },
  ];

  const isolines = levels.map((L) => {
    const near = L !== medianLevel && Math.abs(L - medianLevel) < 50;
    const reached = ["min", 1, ["max", 0, ["+", ["/", ["-", { $state: "level" }, L], 6], 1]]];
    const opacity = L === medianLevel ? ["*", reached, ["min", 1, ["max", 0, { $state: "median" }]]] : near ? ["*", reached, ["-", 1, ["min", 1, ["max", 0, { $state: "median" }]]]] : reached;
    return {
      id: `line-${L}`,
      type: "line",
      data: multiline(lonLatLinesOf(field, field.lines.find((l) => l.level === L).d).map((l) => l.map(([lon, lat]) => [r5(lon), r5(lat)]))),
      layout: { "line-join": "round", "line-cap": "round" },
      paint: { "line-color": colours.lines[L], "line-width": L === medianLevel ? strokes.median : strokes.line, "line-opacity": 0 },
      bindings: { "line-opacity": opacity },
    };
  });

  const numbers = levels.map((L) => {
    const seat = numberSeats[L];
    const near = L !== medianLevel && Math.abs(L - medianLevel) < 50;
    const reached = ["min", 1, ["max", 0, ["+", ["/", ["-", { $state: "level" }, L + 14], 10], 0]]];
    const opacity = L === medianLevel ? ["*", reached, ["min", 1, ["max", 0, { $state: "median" }]]] : near ? ["*", reached, ["-", 1, ["min", 1, ["max", 0, { $state: "median" }]]]] : reached;
    return {
      id: `number-${L}`,
      type: "symbol",
      data: point(seat.lonLat, { text: seat.text }),
      layout: { "text-field": ["get", "text"], "text-font": [strokes.face], "text-size": strokes.axisPx, "text-anchor": "center", "text-allow-overlap": true, "text-ignore-placement": true },
      paint: { "text-color": L === medianLevel ? colours.text.median : colours.text.plain, "text-halo-color": colours.land, "text-halo-width": strokes.rule * 1.7, "text-opacity": 0 },
      bindings: { "text-opacity": opacity },
    };
  });

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
      layout: { "text-field": ["get", "text"], "text-font": [strokes.face], "text-size": strokes.axisPx, "text-anchor": "left", "text-offset": [summit.offset / strokes.axisPx, 0], "text-allow-overlap": true, "text-ignore-placement": true },
      paint: { "text-color": colours.text.median, "text-halo-color": colours.land, "text-halo-width": strokes.rule * 1.7, "text-opacity": 0 },
      bindings: { "text-opacity": { $state: "summit" } },
    },
  ];

  return {
    styleUrl: `https://api.maptiler.com/maps/dataviz/style.json?key=${"__MAPTILER" + "_KEY__"}`,
    styleName: "dataviz",
    tints: { water: colours.ground, land: colours.outside },
    cameras,
    statesForCards,
    referenceWidth,
    referenceHeight,
    warmSamples: 3,
    degreesPerPixel: 1,
    layers: [...land, ...isolines, ...numbers, ...farthest],
  };
}
