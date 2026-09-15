// THE SUBJECT OF `static-contour-europe-distance`, MEASURED AND ASSERTED — the scrolly's `contourField`, run once in
// Bun on the static beat's frozen shapes and study list, with the static beat's own assertions.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { contourField } from "../scrolly-contour-europe-distance/contour-field.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-contour-europe-distance");
/** The static beat's window, identical to the sibling map beats. */
export const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
export const FRAME_WIDTH = 1000;
export const NAMES = { BLR: "Biélorussie" };

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const geo = JSON.parse(readFileSync(join(dir, "shapes.geojson"), "utf8"));
  const rows = readFileSync(join(dir, "countries.csv"), "utf8").trim().split(/\r?\n/);
  /** Russia is not measured: the frame cuts its territory, and a distance to a coastline that stops at the edge of
   *  the paper is not a distance. */
  const study = new Set(rows.slice(1).map((l) => l.split(",")[1]).filter((c) => c && c !== "RUS"));
  const probe = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: [] });
  if (probe.studyCount < 30) throw new Error(`the study area names ${study.size} countries and the shapes carry ${probe.studyCount}`);
  if (!(probe.median < 200)) throw new Error(`the title says half of Europe is within 200 km of the sea; the median is ${probe.median.toFixed(0)} km`);
  if (!(probe.deepest < 1000)) throw new Error(`the video says no point is 1 000 km from the sea; the farthest is ${probe.deepest.toFixed(0)} km`);
  if (!NAMES[probe.deepestIso]) throw new Error(`the farthest point falls in ${probe.deepestIso}, which has no French name filed here`);
  const MEDIAN = Math.round(probe.median);
  const LEVELS = [100, MEDIAN, 200, 300, 400, 500];
  const field = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: LEVELS });
  for (const { level, d } of field.lines) if (d.length < 40) throw new Error(`the ${level} km isoline came out as loose points, not a line`);
  const pct = (km) => Math.round(field.within[km]);
  if (pct(MEDIAN) !== 50) throw new Error(`the title says ${MEDIAN} km holds half the land; it holds ${field.within[MEDIAN]} %`);
  /** The raster, raw: one byte per 6 km cell, `1 + distance / stepKm` over the study land, 0 elsewhere. */
  const bytes = gunzipSync(Buffer.from(field.raster.data, "base64"));
  return { field, study, MEDIAN, LEVELS, pct, bytes, LAST: Math.ceil(field.deepest) + 6 };
}

// ── back to the globe: the field was measured in LAEA, the live map is Web Mercator ─────────────────────────────
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;

/** The inverse of `contour-field.mjs`'s `laea` (the static beat's `unlaea`, written out): a vertex that drifts labels
 *  the wrong place. */
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
