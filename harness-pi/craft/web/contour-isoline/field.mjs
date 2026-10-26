// The contour WEB kit's measurement: the field, measured once. Taken from
// proof/web-contour-europe-distance/render-directions-web.mjs ("the study area" through "the claim,
// measured") with its subject's constants turned into inputs. beat.mjs calls `measureSeaDistance`;
// render-beat.mjs draws what it returns (the `_grid`). Never edited by the model.
//
// THE ONE FIELD THIS KIT DRAWS IS DISTANCE TO THE SEA. An isoline map needs a field its source
// defines EVERYWHERE: a field made of records is only as continuous as the records are complete,
// and a hole in it is filled by whatever surrounds it without the reader seeing anything is missing.
// Nothing is missing from a polygon. The distance is an EXACT Euclidean distance transform
// (Felzenszwalb's separable lower-envelope pass, twice) on the equal-area grid of ./camera.ts (LAEA,
// a 7 km mesh), seeded on every sea cell. LAND IS ALL THE LAND (Russia and Turkey included), and
// that is not the study area: the claim is measured over the study area, the field over the land.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WINDOW, laea, project as rasterProject, unproject, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

/** The raster's longer side, in cells (the worked example's 900: one cell is a 7 km mesh). */
export const SIZE = 900;
const EARTH_KM = 6371;
/** The fine quantum the field is binned at, and the steps the reader is offered — every one a whole
 *  multiple of the bin. The worked example's; the step control is the type's design. */
export const BIN_KM = 25;
export const STEPS_KM = [50, 100, 200, 400];
export const DEFAULT_KM = 100;
/** The equal-area camera's own scale error across the frame (measured on the worked example). */
export const SCALE_ERROR_PC = 3;

const inRing = (ring, x, y) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const INF = 1e12;
/** Felzenszwalb & Huttenlocher's 1-D squared-distance transform. Exact, linear in the cells. */
function edt1d(f, n) {
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q += 1) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k -= 1;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (z[k + 1] < q) k += 1;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
  return d;
}

/**
 * Measures distance to the sea over the study area.
 *
 * @param dir    the beat folder (shapes.geojson beside it)
 * @param study  ISO 3166 alpha-3 codes of the countries the claim is measured over
 * @returns      { kind, study, offFrame, cellKm, cells, median, deepest, deepestIso, within(km) -> %,
 *                 quantile(p), levels, binKm, steps, defaultStep, topKm, scaleErrorPc, errorKm, _grid }
 */
export function measureSeaDistance(dir, { study } = {}) {
  if (!Array.isArray(study) || !study.length)
    throw new Error("study must list the ISO-3 codes of the countries the field is measured over, read from data.json");
  const geo = JSON.parse(readFileSync(join(dir, "shapes.geojson"), "utf8"));
  const known = new Map(geo.features.map((f) => [f.properties.iso, f]));
  const codes = study.map((c) => String(c).trim().toUpperCase());
  const unknown = codes.filter((c) => !known.has(c));
  if (unknown.length)
    throw new Error(
      `study names ${unknown.join(", ")}, which the frozen shapes do not carry (they key on ISO-3 codes: ` +
        `${[...known.keys()].filter((k) => k !== "-99").sort().join(" ")}). Read the ISO-3 column of data.json, ` +
        `or map the names to codes — a country that joins nothing would be silently left out of the field`,
    );
  const twice = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (twice.length) throw new Error(`study names ${twice.join(", ")} twice`);
  // A part the frame's edge runs THROUGH is cut (Russia, on the worked example): a distance measured
  // to a coastline that stops at the edge of the paper is not a distance. A part wholly outside is an
  // off-frame island (Svalbard, the Azores, the Canaries): not measured, named in `offFrame`.
  const inside = ([lon, lat]) => lon >= WINDOW.west && lon <= WINDOW.east && lat >= WINDOW.south && lat <= WINDOW.north;
  const cut = [];
  const offFrame = [];
  const absent = [];
  for (const c of codes) {
    const g = known.get(c).geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    const parts = polys.map((poly) => {
      const n = poly[0].filter(inside).length;
      return n === 0 ? "out" : n === poly[0].length ? "in" : "cut";
    });
    if (parts.includes("cut")) cut.push(c);
    else if (!parts.includes("in")) absent.push(c);
    else if (parts.includes("out")) offFrame.push(c);
  }
  if (cut.length)
    throw new Error(
      `the measuring frame (${WINDOW.west}°–${WINDOW.east}°E, ${WINDOW.south}°–${WINDOW.north}°N) cuts ` +
        `${cut.join(", ")}: a distance measured to a coastline that stops at the edge of the paper is not a ` +
        `distance. Leave ${cut.length > 1 ? "them" : "it"} out of study and say so in limitNote`,
    );
  if (absent.length)
    throw new Error(`${absent.join(", ")} lie${absent.length > 1 ? "" : "s"} wholly outside the measuring frame (Europe, ${WINDOW.west}°–${WINDOW.east}°E, ${WINDOW.south}°–${WINDOW.north}°N): this kit cannot measure ${absent.length > 1 ? "them" : "it"}`);

  // ── rasterise: all the land, and the study area (the owner index) ──────────────────────────
  const rasterW = MEASURE_ASPECT >= 1 ? SIZE : SIZE * MEASURE_ASPECT;
  const rasterH = MEASURE_ASPECT >= 1 ? SIZE / MEASURE_ASPECT : SIZE;
  const toRaster = ([ux, uy]) => [ux * SIZE, uy * SIZE];
  const spanUnits = (() => {
    const a = laea([WINDOW.west, WINDOW.south]);
    const b = laea([WINDOW.east, WINDOW.south]);
    const c = laea([WINDOW.west, WINDOW.north]);
    return Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - a[0], c[1] - a[1]));
  })();
  const KM_PER_CELL = (spanUnits * EARTH_KM) / SIZE;
  const nx = Math.ceil(rasterW);
  const ny = Math.ceil(rasterH);
  const owner = new Int16Array(nx * ny).fill(-1);
  const isLand = new Uint8Array(nx * ny);
  let cellsOnLand = 0;
  for (const f of geo.features) {
    const idx = codes.indexOf(f.properties.iso ?? f.properties.code);
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) {
      const outer = poly[0].map((p) => toRaster(rasterProject(p)));
      const holes = poly.slice(1).map((r) => r.map((p) => toRaster(rasterProject(p))));
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [x, y] of outer) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      const c0 = Math.max(0, Math.floor(minX));
      const c1 = Math.min(nx - 1, Math.ceil(maxX));
      const r0 = Math.max(0, Math.floor(minY));
      const r1 = Math.min(ny - 1, Math.ceil(maxY));
      for (let r = r0; r <= r1; r += 1)
        for (let c = c0; c <= c1; c += 1) {
          const k = r * nx + c;
          if (isLand[k] && owner[k] >= 0) continue;
          const x = c + 0.5;
          const y = r + 0.5;
          if (!inRing(outer, x, y)) continue;
          if (holes.some((h) => inRing(h, x, y))) continue;
          isLand[k] = 1;
          if (idx >= 0 && owner[k] < 0) {
            owner[k] = idx;
            cellsOnLand += 1;
          }
        }
    }
  }
  if (!(cellsOnLand > 1000))
    throw new Error(`the study area covers ${cellsOnLand} cells of ${KM_PER_CELL.toFixed(1)} km — too little land to draw a field over (study more countries)`);

  // ── the exact distance transform ────────────────────────────────────────────────────────────
  const f2 = new Float64Array(nx * ny);
  for (let i = 0; i < f2.length; i += 1) f2[i] = isLand[i] ? INF : 0;
  {
    const col = new Float64Array(ny);
    for (let c = 0; c < nx; c += 1) {
      for (let r = 0; r < ny; r += 1) col[r] = f2[r * nx + c];
      const d = edt1d(col, ny);
      for (let r = 0; r < ny; r += 1) f2[r * nx + c] = d[r];
    }
    const row = new Float64Array(nx);
    for (let r = 0; r < ny; r += 1) {
      for (let c = 0; c < nx; c += 1) row[c] = f2[r * nx + c];
      const d = edt1d(row, nx);
      for (let c = 0; c < nx; c += 1) f2[r * nx + c] = d[c];
    }
  }
  const km = new Float64Array(nx * ny);
  for (let i = 0; i < km.length; i += 1) km[i] = isLand[i] ? Math.sqrt(f2[i]) * KM_PER_CELL : 0;

  // ── the claim's figures, measured over the study area ───────────────────────────────────────
  const landKm = [];
  let farthest = { km: -1, idx: -1 };
  for (let i = 0; i < km.length; i += 1) {
    if (owner[i] < 0) continue;
    landKm.push(km[i]);
    if (km[i] > farthest.km) farthest = { km: km[i], idx: i };
  }
  landKm.sort((a, b) => a - b);
  const median = landKm[Math.floor(landKm.length / 2)];
  const FINEST = Math.min(...STEPS_KM);
  const COARSEST = Math.max(...STEPS_KM);
  const levels = [];
  for (let level = FINEST; level <= farthest.km; level += FINEST) levels.push(level);
  if (levels.length < 2)
    throw new Error(`the study area's farthest point is ${Math.round(farthest.km)} km from the sea: too shallow a field for two isolines (study more inland countries)`);
  const topKm = Math.ceil(farthest.km / COARSEST) * COARSEST;
  return {
    kind: "distance-to-sea",
    study: codes,
    offFrame,
    cellKm: KM_PER_CELL,
    cells: landKm.length,
    median,
    deepest: farthest.km,
    deepestIso: codes[owner[farthest.idx]],
    within: (limit) => (landKm.filter((v) => v <= limit).length / landKm.length) * 100,
    quantile: (p) => landKm[Math.min(landKm.length - 1, Math.floor(p * landKm.length))],
    levels,
    binKm: BIN_KM,
    steps: [...STEPS_KM],
    defaultStep: DEFAULT_KM,
    topKm,
    scaleErrorPc: SCALE_ERROR_PC,
    errorKm: (farthest.km * SCALE_ERROR_PC) / 100,
    _grid: { nx, ny, owner, km, landKm, codes, kmPerCell: KM_PER_CELL, toLonLat: ([px, py]) => unproject([px / SIZE, py / SIZE]) },
  };
}
