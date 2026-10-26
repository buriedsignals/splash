// THE SUBJECT OF `static-contour-europe-distance`, MEASURED AND ASSERTED — the scrolly's `contourField`, run once in
// Bun on the static beat's frozen shapes and study list, with the static beat's own assertions.
//
// Runs in Bun only.

// ZONE KIT COPY of proof/video-contour-europe-distance/subject.mjs. The field is the proof's (`./contour-field.mjs`, a
// byte-identical copy of proof/scrolly-contour-europe-distance/contour-field.mjs), measured over the beat's study area
// instead of the static beat's frozen list; the static beat's assertions are beat.mjs's `check()`; the lines drawn are
// the proof's hundreds below the farthest point, with the median among them.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { contourField } from "./contour-field.mjs";
/** The static beat's window, identical to the sibling map beats. */
export const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
export const FRAME_WIDTH = 1000;
/** The lines the proof draws besides the median, in km (each kept only below the farthest point). */
export const ROUND_LEVELS = Object.freeze([100, 200, 300, 400, 500]);

const n = (v) => String(+Number(v).toPrecision(4));

/**
 * The field over the study area, before any claim is checked. Refuses only a study area the field cannot measure: a
 * code with no shape, a code twice, a country the frame cuts (Russia), too few countries.
 *
 * @returns {{ geo, study, probe, helpers }} `helpers` is what beat.mjs's `check(map)` receives.
 */
export function readingOf(beat, here) {
  const geo = JSON.parse(readFileSync(join(here, "shapes.geojson"), "utf8"));
  if (!Array.isArray(beat.study) || !beat.study.length) throw new Error("beat.mjs: study must be the ISO alpha-3 codes of the countries the claim is measured over");
  const known = new Set(geo.features.map((f) => f.properties.iso).filter((c) => c !== "-99"));
  const unknown = beat.study.filter((c) => !known.has(c));
  if (unknown.length) throw new Error(`study names codes the map has no country for: ${unknown.map((c) => JSON.stringify(c)).join(", ")} — use ISO alpha-3 (FRA, not FR or France)`);
  const twice = beat.study.filter((c, i) => beat.study.indexOf(c) !== i);
  if (twice.length) throw new Error(`study names ${[...new Set(twice)].join(", ")} twice`);
  // A COUNTRY THE FRAME CUTS IS NOT MEASURED (the proof's Russia): a distance to a coastline that stops at the edge of
  // the paper is not a distance. A polygon the frame's edge runs THROUGH is cut; one wholly outside is an off-frame
  // island (Svalbard, the Azores, the Canaries), not measured (the web kit's rule, field.mjs).
  const inside = ([lon, lat]) => lon >= WINDOW.west && lon <= WINDOW.east && lat >= WINDOW.south && lat <= WINDOW.north;
  const cut = [];
  const absent = [];
  for (const iso of beat.study) {
    const parts = geo.features
      .filter((f) => f.properties.iso === iso)
      .flatMap((f) => f.geometry.coordinates)
      .map((poly) => {
        const n = poly[0].filter(inside).length;
        return n === 0 ? "out" : n === poly[0].length ? "in" : "cut";
      });
    if (parts.includes("cut")) cut.push(iso);
    else if (!parts.includes("in")) absent.push(iso);
  }
  if (cut.length) throw new Error(`the measuring frame (${WINDOW.west}..${WINDOW.east}° E, ${WINDOW.south}..${WINDOW.north}° N) cuts ${cut.join(", ")}: leave ${cut.length > 1 ? "them" : "it"} out of study (and say so in the source or the title's limits)`);
  if (absent.length) throw new Error(`${absent.join(", ")} lie${absent.length > 1 ? "" : "s"} wholly outside the measuring frame (${WINDOW.west}..${WINDOW.east}° E, ${WINDOW.south}..${WINDOW.north}° N): this kit measures Europe only`);
  const study = new Set(beat.study);
  const probe = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: [] });
  if (probe.studyCount < 3) throw new Error(`the study area holds ${probe.studyCount} measured countries: a distance-to-the-sea map needs a region`);
  const helpers = {
    median: probe.median,
    deepest: probe.deepest,
    deepestIso: probe.deepestIso,
    within: (km) => probe.within[Math.max(0, Math.min(Math.round(km), probe.within.length - 1))],
    studyCount: probe.studyCount,
  };
  return { geo, study, probe, helpers };
}

/**
 * What the choreography draws for this field: the median among the proof's hundreds, every line a line.
 * @returns the shape the proof's `loadSubject` returned: `{ field, study, MEDIAN, LEVELS, pct, bytes, LAST }`
 */
export function subjectOf({ geo, study, probe }) {
  const MEDIAN = Math.round(probe.median);
  if (!(MEDIAN > 0)) throw new Error(`the median distance to the sea rounds to ${MEDIAN} km: the study area is all coast, and the sweep has nothing to cross`);
  const LEVELS = [...new Set([...ROUND_LEVELS.filter((l) => l < probe.deepest), MEDIAN])].sort((a, b) => a - b);
  if (LEVELS.length < 2) throw new Error(`the farthest point is ${n(probe.deepest)} km from the sea: the video draws the 100 km line and the median, and this study area is too shallow for two lines`);
  const field = contourField(geo, { study, window: WINDOW, width: FRAME_WIDTH, levels: LEVELS });
  for (const { level, d } of field.lines) if (d.length < 40) throw new Error(`the ${level} km isoline came out as loose points, not a line: the study area is too small or too broken for it`);
  const pct = (km) => Math.round(field.within[km]);
  if (Math.abs(field.within[MEDIAN] - 50) > 1) throw new Error(`${MEDIAN} km should hold half the land and holds ${n(field.within[MEDIAN])} % (a kit bug)`);
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
