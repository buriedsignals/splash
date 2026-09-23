// twin/proof/web-contour-europe-distance/render-directions-web.mjs
//
// How far every point of Europe is from the sea, as a LIVE MapTiler map. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
//
// THE READER CHOOSES THE STEP BETWEEN THE LINES, which is this form's own hidden decision — see
// `DirectedContourWeb.tsx` for the argument. The field is measured once on the equal-area grid,
// quantised once at a fine bin every offered step divides, and re-cut by a paint expression: four
// band geometries would be four derivations of one field.
//
// THE FIELD IS THE COASTLINE, AND THAT IS THE FORM'S OWN CONSTRAINT. An isoline map needs a field its
// source defines EVERYWHERE: a field made of records is only as continuous as the records are
// complete, and a hole in it does not degrade — it is filled by whatever surrounds it and the reader
// cannot see that anything is missing. Nothing is missing from a polygon.
//
// THE DISTANCE IS AN EXACT EUCLIDEAN DISTANCE TRANSFORM (Felzenszwalb's separable lower-envelope
// pass, twice) on a grid in the same equal-area projection the sibling maps use, seeded on every sea
// cell. Exact rather than approximate: an isoline drawn from a rounded field wanders, and a wandering
// line labelled "200 km" is a false precision a reader cannot see.
//
// Usage:  bun proof/web-contour-europe-distance/render-directions-web.mjs

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";
import { adjustToContrast, contrast, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, guardColour, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { countryGround } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { plateWaterField } from "../../scripts/map-beat/plate-water.mjs";
import { MAP_DRAWING_SHARE, renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  liveContourPlan,
  liveContourScript,
  assertSteppingReachesTheLayers,
} from "../../skills/map-web/assets/live-contour.ts";
import {
  CHANGE_MS,
  STEP_ID_PREFIX,
  DirectedContourWeb,
  contourRamp,
} from "./DirectedContourWeb.tsx";
import { project as rasterProject, laea, unproject, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Géographie · Europe";
const SIZE = 900;
const EXCLUDE = new Set(["RUS"]);
const EARTH_KM = 6371;
/** The study area's own names, in French. `countries.csv` carries the source's English labels; a page
 *  in French that prints "Slovakia" in a tooltip is a page nobody proofread. */
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne",
  SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};
const frName = (code) => {
  const n = NAMES[code];
  if (!n) throw new Error(`${code} is in the study area and has no French name filed`);
  return n;
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 0) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));

// ── the study area ────────────────────────────────────────────────────────────────────────────
const countriesCsv = (await readFile(join(HERE, "countries.csv"), "utf8")).trim().split(/\r?\n/);
const header = countriesCsv[0].split(",");
const codeAt = header.indexOf("code");
const nameAt = header.indexOf("entity");
const study = new Map();
for (const line of countriesCsv.slice(1)) {
  const c = line.split(",");
  if (!EXCLUDE.has(c[codeAt])) study.set(c[codeAt], c[nameAt]);
}

const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
// ── THE CAMERA IS THE PLATE'S ─────────────────────────────────────────────────────────────────
//
// The equal-area camera in `camera.ts` is still this beat's own, and it is what MEASURES. It no
// longer PLACES anything. What places every mark is the baked MapTiler plate's own recorded camera —
// `frameCorners`, read back with `map.unproject()` after the camera settled, not the nominal bounds
// handed to `fitBounds`, which fitBounds widens to keep the frame's aspect. Longitude is linear in
// pixel-x under Web Mercator; latitude is not, and needs the inverse Mercator formula, because
// pixel-y is linear in Mercator-y.
//
// ONE PLATE PER FILED DIRECTION, baked in that direction's own tints. The three share a camera by
// construction, and that is asserted below rather than assumed: three plates that disagreed about
// where 10°E is would put the same mark in three places and nothing here would notice.
const PLATE_SIZE = "1600x1216";
const plateDir = (id) => join(HERE, "plate", id);
function ensurePlate(id, water, land) {
  const dir = plateDir(id);
  // AND IN THE TINTS IT WAS PAINTED WITH, not merely that a file is there. A plate cached on
  // `existsSync` alone is blind to the pair it was baked in, so a change to the trunk's tints ships
  // over a stale basemap in silence — which is exactly what happened to the Danube's three plates.
  if (plateWasPaintedWith(dir, { water, land })) return;
  console.log(`baking the ${id} plate (MapTiler, ${PLATE_SIZE}, water ${water}, land ${land})…`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--countries", join(HERE, "shapes.geojson"),
     "--water", water, "--land", land, "--out", dir],
    { cwd: HERE, stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status} for ${id}`);
}

/** The two tints a basemap is allowed on a directed plate, both derived from the direction and
 *  neither invented: `water-is-a-tint-not-a-grey` says the sea takes a little of the accent, and the
 *  land takes a step off the ground toward the ink. Nothing else on the basemap carries colour. */
// THE PAIR COMES FROM THE TRUNK, AND THE WATER IS NOT THIS BEAT'S TO CHOOSE. What stood here was
// `water: mix(d.ground, d.accent, 0.16)` — the sea tinted with the very accent this beat's marks are
// drawn in, so the ground followed the mark and no accent could be picked out of it. Only the LAND's
// weight is measured per beat; the water is the filed convention, once, in `shared/map-beat/tints.mjs`.
const LAND_DOSE = 0.07;

const DIRECTION_FILES = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort();
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const t = plateTints(readDirection(join(DIRECTIONS, file)), { landDose: LAND_DOSE });
  ensurePlate(id, t.water, t.land);
}
const factsOf = async (id) => JSON.parse(await readFile(join(plateDir(id), "geometry.json"), "utf8"));
const plateFacts = await factsOf(DIRECTION_FILES[0].replace(/\.md$/, ""));
for (const file of DIRECTION_FILES.slice(1)) {
  const id = file.replace(/\.md$/, "");
  const other = await factsOf(id);
  if (
    other.frame.width !== plateFacts.frame.width ||
    other.frame.height !== plateFacts.frame.height ||
    JSON.stringify(other.frameCorners) !== JSON.stringify(plateFacts.frameCorners)
  )
    throw new Error(
      `the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]}: three plates that ` +
        `disagree about where a degree is would put the same mark in three places, and nothing ` +
        `else here would notice`,
    );
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
if (!CORNERS || !(FRAME?.width > 0))
  throw new Error("this plate predates the camera facts: re-bake it with bake.mjs");
const CAMERA_ASPECT = FRAME.width / FRAME.height;
console.log(
  `camera qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · ` +
    `zoom ${plateFacts.zoom}\n`,
);

/** The drawn frame's middle latitude — what a degree of longitude is worth in kilometres on this
 *  map, used both by the label floor and by the derived zoom ceiling. */
const MID_LAT = (CORNERS.north + CORNERS.south) / 2;

/** TWO CAMERAS, AND THE BEAT SAYS WHICH DOES WHAT.
 *
 *  The RASTER is the equal-area grid in `camera.ts`: the distance transform, the median, the share
 *  under 400 km and the farthest point are all measured on it, and they have to be — a grid whose
 *  cells change size with latitude would make the median a weighted average of nothing in
 *  particular. Nothing about that changed.
 *
 *  The VIEW is the MapTiler plate. Every raster coordinate is turned back into a longitude and a
 *  latitude and handed to the plate's own camera before it is drawn, so the bands and the isolines
 *  land on MapTiler's coastline rather than on a coastline this file drew itself. */
const rasterW = MEASURE_ASPECT >= 1 ? SIZE : SIZE * MEASURE_ASPECT;
const rasterH = MEASURE_ASPECT >= 1 ? SIZE / MEASURE_ASPECT : SIZE;
const toRaster = ([ux, uy]) => [ux * SIZE, uy * SIZE];

/** Kilometres per drawn pixel. The projection's own unit is the earth's radius, and `project`
 *  normalises the camera's longer span to 1, so one drawn pixel is `spanKm / SIZE` on the ground.
 *  LAEA is equal-area, not equidistant: at this camera the scale error is under 3 % across the
 *  frame, which is stated rather than hidden. */
const spanUnits = (() => {
  const a = laea([-25, 34]);
  const b = laea([45, 34]);
  const c = laea([-25, 72]);
  return Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - a[0], c[1] - a[1]));
})();
const KM_PER_PX = ((spanUnits * EARTH_KM) / SIZE) * (1 / 1);

// ── rasterise the study area ──────────────────────────────────────────────────────────────────
// One pixel per cell at this camera is a 7 km mesh — the resolution the field deserves, and close
// to the 6 km the static sibling uses. The cost is 135 000 cells, which is why the bands below are
// written out as merged RUNS rather than one rectangle per cell.
const STEP = 1;
const nx = Math.ceil(rasterW / STEP);
const ny = Math.ceil(rasterH / STEP);
const owner = new Int16Array(nx * ny).fill(-1);
/** LAND IS ALL THE LAND, AND THAT IS NOT THE SAME SET AS THE STUDY AREA. The distance transform is
 *  seeded on SEA cells, so every cell that is land — Russia and Turkey included — must be land in the
 *  mask, or the field would measure the distance to the edge of the study area rather than to the
 *  water. The study area is what the CLAIM is measured over; the mask is what the field is computed
 *  on, and conflating the two is how a coastline map ends up reporting a border. */
const isLand = new Uint8Array(nx * ny);
const codes = [...study.keys()];

const inRing = (ring, x, y) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

let cellsOnLand = 0;
for (const f of geo.features) {
  const iso = f.properties.iso ?? f.properties.code;
  const idx = codes.indexOf(iso);
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
    const c0 = Math.max(0, Math.floor(minX / STEP));
    const c1 = Math.min(nx - 1, Math.ceil(maxX / STEP));
    const r0 = Math.max(0, Math.floor(minY / STEP));
    const r1 = Math.min(ny - 1, Math.ceil(maxY / STEP));
    for (let r = r0; r <= r1; r += 1)
      for (let c = c0; c <= c1; c += 1) {
        const k = r * nx + c;
        if (isLand[k] && owner[k] >= 0) continue;
        const x = c * STEP + STEP / 2;
        const y = r * STEP + STEP / 2;
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
if (!(cellsOnLand > 1000)) throw new Error(`the raster found only ${cellsOnLand} land cells — the study area did not project`);

// ── the exact distance transform ──────────────────────────────────────────────────────────────
const INF = 1e12;
const f2 = new Float64Array(nx * ny);
for (let i = 0; i < f2.length; i += 1) f2[i] = isLand[i] ? INF : 0;

/** Felzenszwalb & Huttenlocher's 1-D squared-distance transform, applied down the columns then
 *  across the rows. Exact, and linear in the number of cells. */
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
const KM_PER_CELL = KM_PER_PX * STEP;
const km = new Float64Array(nx * ny);
for (let i = 0; i < km.length; i += 1) km[i] = isLand[i] ? Math.sqrt(f2[i]) * KM_PER_CELL : 0;

// ── THE CLAIM, MEASURED ───────────────────────────────────────────────────────────────────────
const landKm = [];
let farthest = { km: -1, idx: -1 };
for (let i = 0; i < km.length; i += 1) {
  if (owner[i] < 0) continue;
  landKm.push(km[i]);
  if (km[i] > farthest.km) farthest = { km: km[i], idx: i };
}
landKm.sort((a, b) => a - b);
const median = landKm[Math.floor(landKm.length / 2)];
const under400 = (landKm.filter((v) => v <= 400).length / landKm.length) * 100;
const farthestCountry = frName(codes[owner[farthest.idx]]);
if (!(median > 60 && median < 250)) throw new Error(`the headline names a median near 130 km; it is ${fr(median)}`);
if (!(under400 > 80)) throw new Error(`the headline says most of the land is within 400 km; ${fr(under400)} % is`);
console.log(
  `${fr(landKm.length)} cellules de terre · médiane ${fr(median)} km · maximum ${fr(farthest.km)} km ` +
    `(${farthestCountry}) · ${fr(under400)} % à moins de 400 km · maille ${fr(KM_PER_CELL, 1)} km\n`,
);



// ── THE FIELD, QUANTISED ONCE ─────────────────────────────────────────────────────────────────
//
// ONE GEOMETRY, FOUR CUTS. The field is binned at a fine quantum every offered step is a whole
// multiple of, and each band cell carries its bin index. A step is then a `step` expression over
// that index: the map re-cuts with `setPaintProperty` and no source ever reloads. Four band
// geometries would be four derivations of one field, which is precisely the defect
// `assertSteppingReachesTheLayers` exists to refuse.
const BIN_KM = 25;
const STEPS_KM = [50, 100, 200, 400];
const DEFAULT_KM = 100;
const COARSEST = Math.max(...STEPS_KM);
/** The top of the ramp, rounded up to a multiple of the COARSEST step, so every step tiles the same
 *  range and no two of them disagree about where the field ends. */
const TOP_KM = Math.ceil(farthest.km / COARSEST) * COARSEST;
const BINS = Math.round(TOP_KM / BIN_KM);
for (const km of STEPS_KM)
  if (km % BIN_KM !== 0 || TOP_KM % km !== 0)
    throw new Error(
      `the ${km} km step does not tile the ${TOP_KM} km range in whole ${BIN_KM} km bins — a band ` +
        `edge inside a bin paints one cell two classes`,
    );
const binOf = (value) => Math.min(BINS - 1, Math.floor(value / BIN_KM));
const classOf = (bin, km) => Math.floor(((bin + 0.5) * BIN_KM) / km);

/** A raster coordinate straight to longitude and latitude. The equal-area grid is what MEASURES; the
 *  live map is what DRAWS, and it draws in degrees. Nothing is projected to pixels here any more. */
const toLonLat = ([px, py]) => unproject([px / SIZE, py / SIZE]);
const round3 = (v) => Math.round(v * 1000) / 1000;

/** THE FIELD IS COMPUTED AT 7 km AND PAINTED AT 28. The transform, the claim and every answer read
 *  the fine mesh; only the FILL is drawn four cells at a time, as merged horizontal RUNS broken
 *  wherever the bin OR the country changes — the country, because the answer names it and a run that
 *  straddled a border would answer with whichever side it started on. */
const FILL = 4;
const BLEED = 0.4;
const bandFeatures = [];
{
  const emit = (c0, c1, r, b, o) => {
    /* A RUN IS A RECTANGLE ON THE GRID AND A QUAD IN DEGREES. The two cameras differ smoothly, so
       four reprojected corners is exact to well under a pixel across a run this short — and adjacent
       runs share their corners exactly (they are rounded identically), which keeps the bands
       seamless. A third of a cell of bleed, because two quads that share an edge exactly do not
       join: each antialiases its own edge to half coverage and the seam composites lighter than
       either band. */
    const x0 = c0 * STEP - BLEED;
    const x1 = Math.min(nx, c1) * STEP + BLEED;
    const y0 = r * STEP - BLEED;
    const y1 = Math.min(ny, r + FILL) * STEP + BLEED;
    const ring = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]].map((p) => {
      const [lon, lat] = toLonLat(p);
      return [round3(lon), round3(lat)];
    });
    bandFeatures.push({
      type: "Feature",
      properties: { b, o },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  };
  for (let r = 0; r < ny; r += FILL) {
    let start = -1;
    let curB = -1;
    let curO = -1;
    for (let c = 0; c < nx + FILL; c += FILL) {
      const k = r * nx + c;
      const on = c < nx && owner[k] >= 0;
      const b = on ? binOf(km[k]) : -1;
      const o = on ? owner[k] : -1;
      if (on && start >= 0 && b === curB && o === curO) continue;
      if (start >= 0) emit(start, c, r, curB, curO);
      start = on ? c : -1;
      curB = b;
      curO = o;
    }
  }
}
if (!(bandFeatures.length > 500))
  throw new Error(`the field quantised to ${bandFeatures.length} cells — it did not project`);

/** Marching squares. The FIELD is the fine one; the marching cell is three of it, because a contour
 *  traced cell-by-cell at 7 km is megabytes of coordinates and a contour traced at 21 km is visually
 *  identical against every step this page offers. The ambiguous cases are drawn as two separate
 *  segments rather than joined — an unstated disambiguation is a silent choice. */
const LINE_STRIDE = 3;
const isolineFor = (level) => {
  const seg = [];
  const at = (c, r) => (owner[r * nx + c] < 0 ? -1 : km[r * nx + c] - level);
  for (let r = 0; r < ny - LINE_STRIDE; r += LINE_STRIDE)
    for (let c = 0; c < nx - LINE_STRIDE; c += LINE_STRIDE) {
      const a = at(c, r);
      const b = at(c + LINE_STRIDE, r);
      const d = at(c + LINE_STRIDE, r + LINE_STRIDE);
      const e = at(c, r + LINE_STRIDE);
      if ([a, b, d, e].some((v) => v === -1)) continue;
      const x = c * STEP;
      const y = r * STEP;
      const t = (p, q) => p / (p - q);
      const push = (p1, p2) => {
        const [ax, ay] = toLonLat(p1);
        const [bx, by] = toLonLat(p2);
        seg.push([[round3(ax), round3(ay)], [round3(bx), round3(by)]]);
      };
      const cell = STEP * LINE_STRIDE;
      const top_ = [x + cell * t(a, b), y];
      const right = [x + cell, y + cell * t(b, d)];
      const bottom = [x + cell * t(e, d), y + cell];
      const left = [x, y + cell * t(a, e)];
      const code = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (d > 0 ? 4 : 0) | (e > 0 ? 8 : 0);
      if (code === 1 || code === 14) push(left, top_);
      else if (code === 2 || code === 13) push(top_, right);
      else if (code === 3 || code === 12) push(left, right);
      else if (code === 4 || code === 11) push(right, bottom);
      else if (code === 6 || code === 9) push(top_, bottom);
      else if (code === 7 || code === 8) push(left, bottom);
      else if (code === 5 || code === 10) {
        push(left, top_);
        push(right, bottom);
      }
    }
  return seg;
};

/** EVERY TRACEABLE LEVEL, ONCE. The lines a step draws are a SUBSET of these, picked by a filter —
 *  never a second tracing, which is how one control ends up drawing two fields. The set is the
 *  multiples of the FINEST offered step, so every coarser step's own multiples are already in it. */
const FINEST = Math.min(...STEPS_KM);
const LEVELS = [];
for (let level = FINEST; level <= farthest.km; level += FINEST) LEVELS.push(level);
const isolineFeatures = [];
const labels = [];
const candidates = [];
/** Every point of the land the level actually passes through, sampled — the pool an anchor is
 *  CHOSEN from rather than the single point a rule happens to name. */
const ANCHOR_SAMPLE = 5;
const anchorCandidatesFor = (level) => {
  const out = [];
  for (let r = 0; r < ny; r += ANCHOR_SAMPLE)
    for (let c = 0; c < nx; c += ANCHOR_SAMPLE) {
      const k = r * nx + c;
      if (owner[k] < 0) continue;
      if (Math.abs(km[k] - level) > KM_PER_CELL) continue;
      out.push([c, r]);
    }
  return out;
};
for (const level of LEVELS) {
  const coordinates = isolineFor(level);
  if (!coordinates.length) continue;
  isolineFeatures.push({
    type: "Feature",
    properties: { level },
    geometry: { type: "MultiLineString", coordinates },
  });
  candidates.push({ level, cells: anchorCandidatesFor(level) });
}
if (!isolineFeatures.length) throw new Error("no isoline was traced — the field is flat or empty");

/** WHICH OF THE BASEMAP'S GROUNDS THESE CONTOURS OCCUPY, MEASURED ON THE PLATE THIS BEAT BAKED.
 *
 *  The quantity this field carries is DISTANCE FROM THE WATER, so the field is seeded by the
 *  coastline and defined on the land — but that is an argument, not a measurement, and the cells
 *  are rectangles on an equal-area grid whose edges do not follow a coast. So the bands and the
 *  isolines are put back over the plate's own pixels and asked where they landed.
 */
const toFrame = frameProjector(plateFacts);
const waterField = plateWaterField(plateDir(DIRECTION_FILES[0].replace(/\.md$/, "")));
const OCCUPANCY = markOccupancy(
  // THE BANDS AND NOT THE ISOLINES. What `guardColour` measures is the ACCENT, and the accent paints
  // the field's bands; the isolines are drawn in the direction's own ink, walked to 3:1 against the
  // land. A ground an ink crosses is not a ground the accent sits on, and counting it here would
  // hand the guard a mark it is not asking about.
  bandFeatures.map((f) => ({
    kind: "area",
    rings: (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)
      .flatMap((poly) => poly)
      .map((ring) => ring.map(toFrame)),
  })),
  waterField,
);
console.log(occupancyLine(OCCUPANCY));

/** WHERE EACH LEVEL PRINTS ITS OWN BREAK, AND WHY IT IS CHOSEN RATHER THAN NAMED.
 *
 *  The first version put every label on the westernmost point of its own line. On this field the
 *  100, 200 and 300 km lines all reach their westernmost point in Portugal, so three breaks landed
 *  on top of each other and the map read "300 2 100" in a pile — measured on the delivered page, not
 *  guessed. An anchor is now CHOSEN: for each level in turn, the candidate on its own line that
 *  stands farthest from every break already placed. Greedy and deterministic, and the separation it
 *  reaches is asserted rather than hoped for, in raster cells (one cell is the 7 km mesh).
 *
 *  AND THE FLOOR IS DERIVED FROM THE LABEL'S OWN BOX, not typed. A break's box measures about 34 CSS
 *  px; 40 px of clearance is one box plus a margin. What that is worth ON THE GROUND comes from the
 *  scale the delivered view actually has: the plate records degrees per pixel at 1600 px, the
 *  delivered box is 1464 px over the same longitude span, and a degree of longitude at this map's
 *  mid-latitude is a known number of kilometres. Typed in cells it would have been a number nobody
 *  could defend — and it would have refused the 550/650 pair, which is a NESTED pair on a field whose
 *  innermost rings are genuinely close together, not a collision.
 *
 *  THE CHECK IS PER STEP, because a step is what decides which breaks are on the map AT ONCE. Two
 *  levels that no step draws together can never collide. */
const LABEL_CLEARANCE_PX = 40;
const DELIVERED_BOX_PX = 1464;
const KM_PER_DEG_LON = 111.32 * Math.cos((MID_LAT * Math.PI) / 180);
const ANCHOR_MIN_KM =
  LABEL_CLEARANCE_PX *
  plateFacts.degreesPerPixel *
  (FRAME.width / DELIVERED_BOX_PX) *
  KM_PER_DEG_LON;
{
  const placed = [];
  for (const { level, cells } of candidates) {
    if (!cells.length) continue;
    let best = null;
    for (const [c, r] of cells) {
      let nearest = Infinity;
      for (const [pc, pr] of placed) nearest = Math.min(nearest, Math.hypot(c - pc, r - pr));
      if (!best || nearest > best.nearest) best = { c, r, nearest };
    }
    placed.push([best.c, best.r]);
    const [lon, lat] = toLonLat([best.c * STEP, best.r * STEP]);
    labels.push({ level, lon: round3(lon), lat: round3(lat), text: `${level}` });
  }
  for (const step of STEPS_KM) {
    const on = labels
      .map((label, i) => ({ level: label.level, at: placed[i] }))
      .filter((x) => x.level % step === 0);
    let worst = Infinity;
    let worstPair = null;
    for (let i = 0; i < on.length; i += 1)
      for (let j = i + 1; j < on.length; j += 1) {
        const gap =
          Math.hypot(on[i].at[0] - on[j].at[0], on[i].at[1] - on[j].at[1]) * KM_PER_CELL;
        if (gap < worst) {
          worst = gap;
          worstPair = [on[i].level, on[j].level];
        }
      }
    console.log(
      `pas ${step} km · ${on.length} étiquettes · la paire la plus serrée est ` +
        `${worstPair ? worstPair.join(" / ") : "—"} à ` +
        `${worst === Infinity ? "—" : `${fr(worst)} km`} (plancher ${fr(ANCHOR_MIN_KM)} km)`,
    );
    if (worst < ANCHOR_MIN_KM)
      throw new Error(
        `at the ${step} km step two level breaks (${worstPair.join(" and ")}) stand ${fr(worst)} km ` +
          `apart, under the ${fr(ANCHOR_MIN_KM)} km their own boxes need at this scale: the map ` +
          `would print one number on top of another`,
      );
  }
  console.log("");
}

// ── WHAT EACH STEP COSTS, IN THE FIELD'S OWN UNITS ────────────────────────────────────────────
const CELL_AREA_KM2 = KM_PER_CELL * KM_PER_CELL;
const beyondCount = (level) => landKm.length - landKm.filter((v) => v <= level).length;
/** The equal-area camera's own scale error across the frame, and what it is worth at the farthest
 *  point — the number that makes "a finer step invents detail" a measurement rather than a taste. */
const SCALE_ERROR_PC = 3;
const ERROR_KM = (farthest.km * SCALE_ERROR_PC) / 100;

const STEPS = STEPS_KM.map((step) => {
  const classes = TOP_KM / step;
  const drawn = LEVELS.filter((l) => l % step === 0).length;
  const half = step / 2;
  const note =
    step <= 50
      ? `${classes} bandes, ${drawn} courbes : à ±${fr(half)} km près, sous les ±${fr(ERROR_KM)} km ` +
        `d'erreur d'échelle du cadre — ce pas dessine plus de détail que le champ n'en porte.`
      : step >= COARSEST
        ? `${classes} bandes, ${drawn} courbe : la médiane de ${fr(median)} km et les ` +
          `${fr(under400)} % à moins de 400 km tombent dans la première — ce pas ne distingue plus ` +
          `rien de ce que le titre affirme.`
        : `${classes} bandes, ${drawn} courbes : un point reste indéterminé à ±${fr(half)} km dans ` +
          `sa bande, contre ±${fr(ERROR_KM)} km d'erreur de mesure — pas et mesure du même ordre.`;
  return {
    km: step,
    slug: `pas-${step}`,
    label: `${step} km`,
    announce: `Intervalle de ${step} km entre deux courbes`,
    note: plain(note),
    isDefault: step === DEFAULT_KM,
    classes,
  };
});
if (!STEPS.some((s) => s.isDefault)) throw new Error(`no offered step is the default ${DEFAULT_KM}`);
const CHIPS = Math.max(...STEPS.map((s) => s.classes));

/** WHAT A BAND SAYS IT IS, per step and per class — written once, read by the answer. */
const bandDetailFor = (step) =>
  Array.from({ length: TOP_KM / step }, (_, k) =>
    plain(`la bande ${k * step}–${(k + 1) * step} km au pas de ${step} km`),
  );
/** WHAT A FINE BIN SAYS IT IS. The measured distance is what the web adds to this form: the reader
 *  gets the number the lines only imply, beside the band the chosen step put it in. */
const binDetail = Array.from({ length: BINS }, (_, b) =>
  plain(`à ${fr(b * BIN_KM)}–${fr((b + 1) * BIN_KM)} km de la mer`),
);

/** THE TABLE: every traceable level, what lies beyond it, and the area the table does NOT print. */
const levelRows = LEVELS.map((level) => {
  const cells = beyondCount(level);
  const drawnBy = STEPS_KM.filter((s) => level % s === 0);
  return {
    level,
    beyond: `${fr((cells / landKm.length) * 100, 1)} %`,
    detail: plain(
      `${level} km : ${fr(cells * CELL_AREA_KM2)} km² de terres sont plus loin de la mer que ` +
        `cette courbe, et elle n'est tracée qu'aux pas de ${drawnBy.join(", ")} km.`,
    ),
  };
});

/** The narrowest thing this map counts, for the derived zoom ceiling: one painted mesh cell. Past
 *  the zoom that makes it 28 px wide the reader is looking at a quantisation, not at a field. */
const SMALLEST = {
  name: "une maille peinte",
  spanDeg: (FILL * KM_PER_CELL) / (111.32 * Math.cos((MID_LAT * Math.PI) / 180)),
};

// ── WHAT WEB MERCATOR COSTS THIS SUBJECT, MEASURED ────────────────────────────────────────────
//
// The field is MEASURED on the equal-area grid, so no printed number moves. The PICTURE moves: a
// contour map is read as a picture of how much land is far from the sea, and Mercator stretches the
// north. Measured on this beat's own cells, page area against true area.
const RAD = Math.PI / 180;
const mercStretch = (lat) => 1 / Math.cos(lat * RAD);
let pageArea = 0;
let trueArea = 0;
const NORTHERN = new Set(["NOR", "SWE", "FIN", "ISL"]);
let northPage = 0;
let northTrue = 0;
for (let i = 0; i < km.length; i += 1) {
  if (owner[i] < 0) continue;
  const r = Math.floor(i / nx);
  const c = i - r * nx;
  const [, lat] = toLonLat([c * STEP, r * STEP]);
  const drawn = mercStretch(lat) ** 2;
  pageArea += drawn;
  trueArea += 1;
  if (NORTHERN.has(codes[owner[i]])) {
    northPage += drawn;
    northTrue += 1;
  }
}
const NORTH_PAGE_PC = (northPage / pageArea) * 100;
const NORTH_TRUE_PC = (northTrue / trueArea) * 100;
console.log(
  `Mercator sur ce sujet : Norvège, Suède, Finlande et Islande couvrent ` +
    `${fr(NORTH_PAGE_PC, 1)} % de la terre DESSINÉE pour ${fr(NORTH_TRUE_PC, 1)} % de la terre ` +
    `réellement mesurée (facteur ${fr(NORTH_PAGE_PC / NORTH_TRUE_PC, 2)}). Le champ, lui, est ` +
    `mesuré en LAEA et aucun chiffre imprimé ne bouge.\n`,
);

const facts = beatFacts(
  LEVELS.map((l) => ({ key: String(l), label: `${l} km`, value: l })),
  { subject: farthestCountry, declaredSequence: "km" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `La moitié de l'Europe est à moins de ${fr(median)} km de la mer`;
const caveat =
  `Chaque courbe relie les points également distants de la CÔTE — pas d'un réseau de stations : ` +
  `un champ fait d'enregistrements n'est continu que si les enregistrements sont complets, et rien ` +
  `ne manque à un polygone. Dessinée en Web Mercator, qui étire le nord : Norvège, Suède, Finlande ` +
  `et Islande occupent ${fr(NORTH_PAGE_PC, 1)} % de la terre dessinée pour ${fr(NORTH_TRUE_PC, 1)} % ` +
  `de la terre réelle. Les distances, elles, sont mesurées sur une grille équivalente.`;
const claimNote =
  `Médiane ${fr(median)} km · ${fr(under400)} % des terres à moins de 400 km · point le plus ` +
  `éloigné ${fr(farthest.km)} km, en ${farthestCountry}.`;
const limitNote =
  `Aire d'étude : les ${study.size} pays des cartes voisines, MOINS la Russie — le cadre coupe le ` +
  `territoire russe, et une distance mesurée jusqu'à une côte qui s'arrête au bord du papier n'est ` +
  `pas une distance. Maille de ${fr(KM_PER_CELL, 1)} km en projection équivalente (LAEA) : c'est ` +
  `ce qui MESURE, et l'erreur d'échelle y reste sous ${SCALE_ERROR_PC} % sur le cadre. Le champ ` +
  `est rangé une fois pour toutes en paliers de ${BIN_KM} km, dont chaque pas proposé est un ` +
  `multiple : changer de pas recoupe le même champ, ça ne le remesure pas.`;
const readingLine =
  `Lecture : le pas entre deux courbes est le seul choix de cette carte que le lecteur ne voit ` +
  `jamais. Choisissez-le, puis survolez la terre : la bande entière qu'il donne à ce point ` +
  `s'allume, et la réponse garde la distance mesurée à côté d'elle.`;
const liveHint =
  `La carte est vivante : molette ou boutons pour zoomer, glisser pour déplacer, flèches du ` +
  `clavier une fois la carte au focus. Survolez la terre pour la distance mesurée, le pays et la ` +
  `bande que le pas choisi lui donne.`;
const source =
  `Source : distance calculée sur les mêmes formes que les cartes voisines, transformée en ` +
  `distance euclidienne exacte · fond de carte MapTiler (dataviz), teinté par la direction`;

const STEP_LEGEND = "Pas entre deux courbes";
const NEAR_LABEL = "la mer";
const FAR_LABEL = `${fr(TOP_KM)} km`;
const TABLE_CAPTION = `Les ${LEVELS.length} courbes traçables, et celles que le pas choisi laisse tomber`;
const COLUMNS = ["Courbe (km)", "Terres au-delà"];

const interaction = {
  earns:
    "A still, a video and a scrolly must each pick one contour interval and can only SAY that they " +
    "did; none can put four intervals on the same measured field and let the reader watch the same " +
    "point go from a fifty-kilometre band to a four-hundred-kilometre one without moving.",
  controls: [
    {
      question: "Dix bandes — dix selon quel pas, et que disparaît-il si on coupe plus large ?",
      gesture: "toggle-a-comparison",
      changes: plain(
        `Le champ se recoupe entre ${CHIPS} bandes et ${TOP_KM / COARSEST} sans qu'aucune ` +
          `mesure ne change ; les courbes que le pas ne retient pas cessent d'être tracées et ` +
          `leurs lignes du tableau s'éteignent sur place ; une phrase dit ce que ce pas coûte, en ` +
          `kilomètres, face à la maille de ${fr(KM_PER_CELL, 1)} km et aux ±${fr(ERROR_KM)} km ` +
          `d'erreur d'échelle.`,
      ),
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "l'intervalle entre deux courbes",
      authorPicked: "100",
      readerPicks: ["50", "100", "200", "400"],
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Ce point-là, il est à combien exactement — et de quelle bande le pas le rend-il ?",
      gesture: "ask-a-mark",
      changes: plain(
        `La bande ENTIÈRE où le pas choisi range ce point s'allume d'un bout à l'autre du ` +
          `continent — sa largeur EST le pas, rendue visible — et la réponse donne le pays, la ` +
          `distance mesurée au palier de ${BIN_KM} km, et la bande que le pas lui donne.`,
      ),
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "quel point du champ est en question",
      authorPicked: "Zaporijjia",
      readerPicks: "every mark",
      heldStill: [".chart-header", ".chart-source"],
    },
    {
      question: "Et si je veux toutes les courbes, sans la carte — ou sans JavaScript ?",
      gesture: "open-the-full-table",
      changes: plain(
        `Les ${LEVELS.length} courbes traçables s'ouvrent sous la carte, chacune avec la part des ` +
          `terres au-delà et, à la réponse, la surface que cela représente en km². Celles que le ` +
          `pas choisi ne trace pas y sont éteintes en CSS pur : c'est là que le geste survit quand ` +
          `la carte, elle, ne peut pas — un fond MapLibre n'est atteignable par aucune feuille de ` +
          `style.`,
      ),
      // The free parameter this control hands the reader — the decision this beat's own
      // `earns` already argues a fixed frame is forced to settle on their behalf.
      parameter: "sous quelle forme les lectures sont lues",
      authorPicked: "l'image",
      readerPicks: ["l'image", "la table"],
      heldStill: [".chart-header", ".chart-source"],
    },
  ],
};

// ── THE FROZEN FALLBACK, BAKED FROM THE PAGE ITSELF ───────────────────────────────────────────
//
// The second layer, and it is what stands there when the key lapses. The plate `bake.mjs` makes is
// MapTiler's geography and nothing else — the field, its bands and its isolines are MapLibre layers
// now, so a plate baked before them pictures a map with the whole beat rubbed out. So the fallback
// is baked FROM THE PAGE: the runner renders a draft, substitutes the key into a copy that lives
// outside the repository, opens it, waits for the live map to announce itself, photographs the map's
// own box, and renders again with that image. There is no second plan and no second mount to
// disagree with the first — it is the page. Re-baked only when the plan or the shape changes.
const FALLBACK_DIR = join(HERE, "fallback");
/** THE REFERENCE WINDOW, not a box: the fallback is photographed at the window the beat is reviewed
 *  at, so the image is the delivered box's own shape and `slice` crops nothing there. At 2x, so it
 *  is not soft on the screen the owner reviews on. */
const FALLBACK_WINDOW = { width: 1512, height: 860, scale: 2 };
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const KEY =
  process.env.MAPTILER_KEY ??
  process.env.REMOTION_MAPTILER_KEY ??
  process.env.VITE_MAPTILER_KEY ??
  "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source} ${liveHint}`,
  axis: `${STEP_LEGEND} ${NEAR_LABEL} ${FAR_LABEL} ${TABLE_CAPTION} ${COLUMNS.join(" ")} ${STEPS.map((s) => `${s.label} ${s.announce}`).join(" ")} ${levelRows.map((r) => `${r.level} ${r.beyond}`).join(" ")}`,
  annot: `${claimNote} ${limitNote} ${STEPS.map((s) => s.note).join(" ")}`,
  value: LEVELS.map((l) => String(l)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── WHAT THE SECOND LAYER IS MADE OF, READ ONCE ──────────────────────────────────────────────
//
// MapLibre and its stylesheet are INLINED into every page rather than linked: a `<script src>` would
// trade the payload for a SECOND third-party host, and inlining keeps the count at one —
// api.maptiler.com. `style.mjs` travels as SOURCE with its `export` keywords stripped, because a
// page script cannot import.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, and write it where the page will embed it.
 *
 * The key is substituted into a copy under the system temp directory, never beside the page and
 * never inside the repository — `no-key-in-the-repository` scans the working tree. The copy is
 * removed whether the bake succeeds or not. It REFUSES rather than writing something: a fallback
 * baked from a map that never loaded is a picture of the failure it exists to replace.
 */
async function bakeFallback(pagePath, outFile, id) {
  if (!KEY)
    throw new Error(
      "the frozen fallback is photographed from this page's own live map, so the bake needs a " +
        "MapTiler key in the environment (MAPTILER_KEY). Without one the page would ship with the " +
        "basemap and no field on it, which is the defect this bake exists to close.",
    );
  const html = (await readFile(pagePath, "utf8")).split(PLACEHOLDER).join(KEY);
  const dir = mkdtempSync(join(tmpdir(), "mw-fallback-"));
  const keyed = join(dir, `${id}.local.html`);
  await writeFile(keyed, html);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: FALLBACK_WINDOW.width,
      height: FALLBACK_WINDOW.height,
      deviceScaleFactor: FALLBACK_WINDOW.scale,
    });
    await page.goto(`file://${keyed}`, { waitUntil: "networkidle0", timeout: 180000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), {
      timeout: 180000,
    });
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const map = window.__mwMap;
          if (map.loaded() && map.areTilesLoaded()) return resolve();
          map.once("idle", resolve);
        }),
    );
    await new Promise((r) => setTimeout(r, 800));
    const box = await page.$(".map-layer");
    if (!box) throw new Error("the page carries no live map box to photograph");
    await mkdir(dirname(outFile), { recursive: true });
    const png = `${outFile}.png`;
    const shot = await box.boundingBox();
    await box.screenshot({ path: png });
    const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
    if (encode.status !== 0) throw new Error(`cwebp exited with ${encode.status} baking ${id}'s fallback`);
    rmSync(png, { force: true });
    console.log(
      `fallback ${id} → ${outFile.replace(`${HERE}/`, "")} · ${Math.round(shot.width)}x${Math.round(shot.height)} CSS px`,
    );
    return { width: Math.round(shot.width), height: Math.round(shot.height) };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const filed = readDirection(join(DIRECTIONS, file));
  /** THE GUARD REACHES THE PAINT, WHICH IS THE HALF OF THE DANUBE'S REPAIR THAT APPLIES HERE.
   *
   *  What this beat draws is `direction.accent`, and until now nothing measured that colour against
   *  the basemap it is drawn over: `composeDirections` printed a report above and its result was
   *  dropped on the floor. `guardColour` is the same rule the composer refuses on, run on the colour
   *  that is actually painted, against the grounds this beat's marks were MEASURED to occupy.
   *
   *  NOT `composeDirection`, and the reason is this beat's own record. `PALETTE.md` here is
   *  `origin: newsroom`, and a house palette is taken WHOLE by `colourAxis` — composing would paint
   *  all three of these renders in one ground and one accent and collapse the bench they exist to
   *  be. The four beats in this family whose marks ARE seated on water record a hue instead, and
   *  those do compose. */
  const base = filed;
  const colourProblems = guardColour(base, plateGrounds(plateTints(base, { landDose: LAND_DOSE }), OCCUPANCY));
  if (colourProblems.length) {
    // A COLOUR REFUSAL IS A REFUSAL LIKE THE OTHERS, and takes the same path: named on the console,
    // counted at the end, and the previous render removed so it cannot be mistaken for this one.
    const why = `the ${id} direction cannot carry this beat's colour: ${colourProblems.join("; ")}`;
    refused.push({ id, why });
    console.log(`${id} REFUSED — ${why}`);
    await rm(join(OUT, `${id}.html`), { force: true });
    await rm(localPageOf(join(OUT, `${id}.html`)), { force: true });
    continue;
  }
  const direction = resolveDirectionFamilies(base, textPerRegister);
  const tints = plateTints(base, { landDose: LAND_DOSE });
  const furniture = deriveFurniture(base.ground);
  const dirFacts = await factsOf(id);
  // ONE DERIVATION OF THE RAMP, READ BY BOTH HALVES. The component draws the chip row from it and
  // this file builds the live map's per-step fill expressions from the SAME array.
  const { ramp, activeRamp } = contourRamp({
    ground: base.ground,
    accent: base.accent,
    ink: furniture.ink,
    plateLand: tints.land,
    tones: CHIPS,
  });
  /** THE RAMP A STEP ACTUALLY WEARS. The chip row holds the FINEST step's classes; a coarser step
   *  uses as many rungs, spread over the same range, so the darkest band is the darkest band under
   *  every step and the ramp's ends never move when the reader re-cuts. */
  const rampFor = (step) => {
    const classes = TOP_KM / step;
    return Array.from({ length: classes }, (_, k) =>
      ramp[Math.min(ramp.length - 1, Math.round((k * (ramp.length - 1)) / Math.max(1, classes - 1)))],
    );
  };
  const activeFor = (step) => {
    const classes = TOP_KM / step;
    return Array.from({ length: classes }, (_, k) =>
      activeRamp[Math.min(activeRamp.length - 1, Math.round((k * (activeRamp.length - 1)) / Math.max(1, classes - 1)))],
    );
  };
  const rampOf = (slug) => rampFor(STEPS.find((s) => s.slug === slug).km);

  // THE SEPARATION EACH STEP REACHES, MEASURED AND PRINTED rather than asserted: at the finest step
  // two neighbouring bands are nearly the same colour, and that is half of what the control is for.
  if (id === DIRECTION_FILES[0].replace(/\.md$/, ""))
    for (const step of STEPS) {
      const r = rampFor(step.km);
      let worst = Infinity;
      for (let i = 1; i < r.length; i += 1) worst = Math.min(worst, contrast(r[i], r[i - 1]));
      console.log(
        `pas ${step.km} km · ${r.length} bandes · deux voisines au plus près : ` +
          `${worst === Infinity ? "—" : `${worst.toFixed(3)}:1`}`,
      );
    }

  const ground = countryGround({
    ground: base.ground,
    land: tints.land,
    water: tints.water,
    ink: furniture.ink,
  });
  const countryGround_ = ground;
  const live = {
    style: dirFacts.style,
    tints,
    // THE BEAT DRAWS THE COUNTRIES ITSELF (31539d1e, extended here). The owner's verdict on the
    // pages this replaces: « les cartes ne sont pas stylisées derrière ». Keeping MapTiler's own
    // frontier lines and re-inking them reads as a provider basemap with our tints on it; the
    // choropleth reads as OUR map because it draws its countries itself. Same mechanism here, and
    // the one difference is what a fill MEANS: there a class, here neutral ground — the land these
    // marks were ALREADY measured against, never a second one derived beside it.
    countryGround: countryGround_,
    studyBounds: {
      west: dirFacts.bounds[0][0],
      south: dirFacts.bounds[0][1],
      east: dirFacts.bounds[1][0],
      north: dirFacts.bounds[1][1],
    },
    frame: FRAME,
    degreesPerPixel: dirFacts.degreesPerPixel,
    binKm: BIN_KM,
    bins: BINS,
    bands: { type: "FeatureCollection", features: bandFeatures },
    isolines: { type: "FeatureCollection", features: isolineFeatures },
    labels,
    steps: STEPS.map((step) => {
      const fills = rampFor(step.km);
      const actives = activeFor(step.km);
      return {
        km: step.km,
        slug: step.slug,
        label: step.label,
        announce: step.announce,
        note: step.note,
        fillByBin: Array.from({ length: BINS }, (_, b) => fills[classOf(b, step.km)]),
        activeByBin: Array.from({ length: BINS }, (_, b) => actives[classOf(b, step.km)]),
        classByBin: Array.from({ length: BINS }, (_, b) => classOf(b, step.km)),
        bandDetail: bandDetailFor(step.km),
      };
    }),
    defaultSlug: STEPS.find((s) => s.isDefault).slug,
    line: {
      colour: adjustToContrast(furniture.ink, tints.land, 3) ?? furniture.ink,
      width: 1.1,
    },
    countries: codes.map((code) => frName(code)),
    binDetail,
    locale: { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" },
    changeMs: CHANGE_MS,
    smallest: SMALLEST,
  };

  /** THE SECOND DERIVATION THE GUARD HOLDS THE PLAN AGAINST — walked from the BREAKS rather than
   *  from the arithmetic the plan was built with, so a mutation that wrongs one side does not wrong
   *  both together and pass green. */
  const expected = (slug) => {
    const step = STEPS.find((s) => s.slug === slug);
    const fills = rampFor(step.km);
    const breaks = Array.from({ length: fills.length }, (_, k) => (k + 1) * step.km);
    return Array.from({ length: BINS }, (_, b) => {
      const mid = (b + 0.5) * BIN_KM;
      for (let k = 0; k < breaks.length; k += 1) if (mid < breaks[k]) return fills[k];
      return fills[fills.length - 1];
    });
  };

  const pageOf = (plate, box) =>
    renderWeb({
      // This catalogue is written in French; the renderer defaults to English and never guesses.
      lang: "fr",
      // A MAP BEAT'S DRAWING KEEPS ITS SHARE OF THE WINDOW AND THE WORDS GIVE WAY — the share is
      // declared once, in the trunk, and refused there on the file this call writes.
      drawing: { share: MAP_DRAWING_SHARE },
      component: DirectedContourWeb,
      props: {
        plate,
        plateLand: tints.land,
        steps: STEPS,
        levelRows,
        chips: CHIPS,
        rampOf,
        livePlan: liveContourPlan(live),
        liveScript: liveContourScript(live, {
          scope: ".chart-figure",
          styleModule: STYLE_MODULE,
          controlName: STEP_ID_PREFIX,
        }),
        liveHint,
        maplibreCss: MAPLIBRE_CSS,
        maplibreJs: MAPLIBRE_JS,
        stepLegendLabel: STEP_LEGEND,
        nearLabel: NEAR_LABEL,
        farLabel: FAR_LABEL,
        tableCaption: TABLE_CAPTION,
        columns: COLUMNS,
        aspect: box.width / box.height,
        size: box.width,
        title,
        eyebrow: EYEBROW,
        caveat,
        source,
        reading: readingLine,
        claimNote,
        limitNote,
        alt:
          `Une carte d'Europe sur fond MapTiler où la terre est teintée par bandes selon sa ` +
          `distance à la mer, du plus clair au bord des côtes au plus foncé au cœur du continent, ` +
          `et traversée de courbes de niveau dont chacune porte son propre chiffre. Les bandes ` +
          `claires enveloppent tout le pourtour ; les plus foncées forment une tache unique en ` +
          `Europe de l'Est, dont le point le plus éloigné, en ${farthestCountry}, est à ` +
          `${fr(farthest.km)} km de la mer. Une commande à ${STEPS.length} positions recoupe le ` +
          `même champ mesuré en ${CHIPS}, ${TOP_KM / 100}, ${TOP_KM / 200} ou ${TOP_KM / 400} ` +
          `bandes, et la carte elle-même se zoome et se déplace avec les contrôles de MapTiler.`,
        interaction,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });

  try {
    const stamp = createHash("sha256")
      .update(JSON.stringify(liveContourPlan(live)))
      .update(JSON.stringify(FALLBACK_WINDOW))
      .digest("hex")
      .slice(0, 16);
    const image = join(FALLBACK_DIR, `${id}.webp`);
    const stampFile = join(FALLBACK_DIR, `${id}.sha`);
    let record = null;
    if (existsSync(image) && existsSync(stampFile)) {
      try {
        const kept = JSON.parse(readFileSync(stampFile, "utf8"));
        if (kept.stamp === stamp) record = kept;
      } catch (err) {
        record = null;
      }
    }
    if (!record) {
      // A DRAFT FIRST, with nothing under the live map, because the thing being photographed is the
      // live map on THIS page rather than a second rendering of the same plan somewhere else.
      await pageOf(BLANK_PNG, { width: 1464, height: 520 });
      const shot = await bakeFallback(join(OUT, `${id}.html`), image, id);
      await mkdir(FALLBACK_DIR, { recursive: true });
      record = { stamp, ...shot };
      await writeFile(stampFile, `${JSON.stringify(record)}\n`);
    }
    const plate = `data:image/webp;base64,${(await readFile(image)).toString("base64")}`;
    const { outPath } = await pageOf(plate, record);
    // THE KEYED COPY FOR REVIEW, beside the page and git-ignored. The owner: « non, comme pour les
    // scrolly il faut toujours une clé sinon ça sert à rien ». The COMMITTED page keeps the
    // placeholder, because this repository is public.
    if (KEY) {
      const html = await readFile(outPath, "utf8");
      if (!html.includes(PLACEHOLDER))
        throw new Error("the rendered page carries no delivery placeholder to substitute a key into");
      await writeFile(localPageOf(outPath), html.split(PLACEHOLDER).join(KEY));
    }
    // The page is read back from disk, not from the string the renderer happened to return — the
    // file a reader opens is the only artefact any of these refusals is about.
    const written = await readFile(join(OUT, `${id}.html`), "utf8");
    assertSteppingReachesTheLayers(written, live, expected, dirFacts.style, {
      where: `renders/${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  // A runner that swallows a refusal makes a refused page look like a produced one, and leaves the
  // previous render on disk to be mistaken for this one.
  process.exitCode = 1;
}
