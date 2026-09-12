// twin/proof/web-contour-europe-distance/render-directions-web.mjs
//
// How far every point of Europe is from the sea, as an isoline map. Rendered once per FILED
// DIRECTION into a self-contained interactive page.
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
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { DirectedContourWeb } from "./DirectedContourWeb.tsx";
import { project as rasterProject, laea, unproject, CAMERA_ASPECT as MEASURE_ASPECT } from "./camera.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Géographie · Europe";
const SIZE = 900;
const EXCLUDE = new Set(["RUS"]);
const INTERVAL = 100;
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
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png"))) return;
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
const plateTints = (d) => ({
  water: mix(d.ground, d.accent, 0.16),
  land: mix(d.ground, deriveFurniture(d.ground).ink, 0.07),
});

const DIRECTION_FILES = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).sort();
for (const file of DIRECTION_FILES) {
  const id = file.replace(/\.md$/, "");
  const t = plateTints(readDirection(join(DIRECTIONS, file)));
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
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
/** Into the drawing's own unit box: divided by the frame's WIDTH on both axes, so one scale serves
 *  both and nothing is sheared. */
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [px / FRAME.width, py / FRAME.width];
};
console.log(
  `camera qui DESSINE : plaque MapTiler ${FRAME.width}x${FRAME.height} · ` +
    `${CORNERS.west.toFixed(2)}..${CORNERS.east.toFixed(2)}E ` +
    `${CORNERS.south.toFixed(2)}..${CORNERS.north.toFixed(2)}N · aspect ${CAMERA_ASPECT.toFixed(2)}:1 · ` +
    `zoom ${plateFacts.zoom}\n`,
);

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
const width = SIZE;
const height = SIZE / CAMERA_ASPECT;
/** A raster pixel to a view pixel: grid → equal-area unit box → lon/lat → the plate. */
const toView = ([px, py]) => {
  const [ux, uy] = project(unproject([px / SIZE, py / SIZE]));
  return [ux * SIZE, uy * SIZE];
};

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

// ── bands and isolines ────────────────────────────────────────────────────────────────────────
const top = Math.ceil(farthest.km / INTERVAL) * INTERVAL;
const levels = Array.from({ length: top / INTERVAL }, (_, i) => (i + 1) * INTERVAL);

/** THE FIELD IS COMPUTED AT 7 km AND PAINTED AT 28. The transform, the claim and every probe read
 *  the fine mesh; only the FILL is drawn four cells at a time, as merged horizontal RUNS. One
 *  rectangle per fine cell is 2,2 MB of path data in a page whose whole point is that it loads; four
 *  cells at a time is a band edge nobody can tell from the fine one at this camera. The isolines are
 *  traced separately, and they are what a reader measures against. */
const FILL = 4;
const bandPaths = levels.map((level, i) => {
  const lo = i === 0 ? 0 : levels[i - 1];
  const parts = [];
  for (let r = 0; r < ny; r += FILL) {
    let runStart = -1;
    for (let c = 0; c <= nx; c += FILL) {
      const k = r * nx + c;
      const inBand = c < nx && owner[k] >= 0 && km[k] > lo && km[k] <= level;
      if (inBand && runStart < 0) runStart = c;
      if ((!inBand || c + FILL > nx) && runStart >= 0) {
        /* A RUN IS A RECTANGLE ON THE GRID AND A QUAD ON THE PLATE. The two cameras differ smoothly,
           so four reprojected corners is exact to well under a pixel across a run this short — and
           adjacent runs share their corners exactly, which is what keeps the bands seamless. */
        /* AND A THIRD OF A CELL OF BLEED, because two quads that share an edge exactly do not join:
           each antialiases its own edge to half coverage and the seam between them composites
           lighter than either band. The old axis-aligned runs landed on whole pixels and never
           showed it. The bleed is smaller than the band interval's own step, and the next band up is
           painted after this one, so it costs a third of a pixel at a boundary and nothing else. */
        const BLEED = 0.4;
        const x0 = runStart * STEP - BLEED;
        const x1 = Math.min(nx, c + FILL) * STEP + BLEED;
        const y0 = r * STEP - BLEED;
        const y1 = Math.min(ny, r + FILL) * STEP + BLEED;
        const quad = [toView([x0, y0]), toView([x1, y0]), toView([x1, y1]), toView([x0, y1])];
        parts.push(`M${quad.map(([X, Y]) => `${X.toFixed(1)} ${Y.toFixed(1)}`).join("L")}Z`);
        runStart = -1;
      }
    }
  }
  return parts.join("");
});

/** Marching squares. The FIELD is the fine one; the marching cell is three of it, because a contour
 *  traced cell-by-cell at 7 km is 1,8 MB of path data per page and a contour traced at 21 km is
 *  visually identical against a 200 km interval. The ambiguous cases are drawn as two separate
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
      const mix = (p, q) => p / (p - q);
      const push = (p1, p2) => {
        const [ax, ay] = toView(p1);
        const [bx, by] = toView(p2);
        seg.push(`M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`);
      };
      const cell = STEP * LINE_STRIDE;
      const top_ = [x + cell * mix(a, b), y];
      const right = [x + cell, y + cell * mix(b, d)];
      const bottom = [x + cell * mix(e, d), y + cell];
      const left = [x, y + cell * mix(a, e)];
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
  return seg.join("");
};

const lines = levels.filter((l) => l % 200 === 0).map((level) => {
  // The label sits on the westernmost point of the line, which on this field is always inland and
  // never in the frame's own margin.
  let best = null;
  for (let r = 0; r < ny; r += 1)
    for (let c = 0; c < nx; c += 1) {
      const k = r * nx + c;
      if (owner[k] < 0) continue;
      if (Math.abs(km[k] - level) > KM_PER_CELL) continue;
      if (!best || c < best.c) best = { c, r };
    }
  return {
    level,
    label: `${level}`,
    d: isolineFor(level),
    lx: best ? toView([best.c * STEP, best.r * STEP])[0] : width / 2,
    ly: best ? toView([best.c * STEP, best.r * STEP])[1] : height / 2,
  };
});

// ── the probes: read the field anywhere ───────────────────────────────────────────────────────
const PROBE_STEP = 34; // cells — one probe roughly every 34 px, dense enough to cover the land
const probes = [];
for (let r = 2; r < ny; r += PROBE_STEP)
  for (let c = 2; c < nx; c += PROBE_STEP) {
    const k = r * nx + c;
    if (owner[k] < 0) continue;
    probes.push({
      key: `${c}-${r}`,
      cx: toView([c * STEP + STEP / 2, r * STEP + STEP / 2])[0],
      cy: toView([c * STEP + STEP / 2, r * STEP + STEP / 2])[1],
      detail: `${frName(codes[owner[k]])} · à ${fr(km[k])} km de la mer`,
    });
  }

const facts = beatFacts(
  levels.map((l) => ({ key: String(l), label: `${l} km`, value: l })),
  { subject: farthestCountry, declaredSequence: "km" },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

const title = `La moitié de l'Europe est à moins de ${fr(median)} km de la mer`;
const caveat =
  `Chaque ligne relie les points également distants de la côte. Le champ est la distance à la ` +
  `CÔTE — pas à un réseau de stations : un champ fait d'enregistrements n'est continu que si les ` +
  `enregistrements sont complets, et un trou dedans ne se dégrade pas, il ment. Rien ne manque à un ` +
  `polygone.`;
const intervalNote = `Intervalle des bandes : ${INTERVAL} km. Les courbes tracées sont celles des multiples de 200 km, chacune portant son propre chiffre sur elle-même.`;
const claimNote =
  `Médiane ${fr(median)} km · ${fr(under400)} % des terres à moins de 400 km · point le plus ` +
  `éloigné ${fr(farthest.km)} km, en ${farthestCountry}.`;
const limitNote =
  `Aire d'étude : les ${study.size} pays des cartes voisines, MOINS la Russie — le cadre coupe le ` +
  `territoire russe, et une distance mesurée jusqu'à une côte qui s'arrête au bord du papier n'est ` +
  `pas une distance. Maille de ${fr(KM_PER_CELL, 1)} km en projection équivalente (LAEA) : c'est ce ` +
  `qui MESURE, et l'erreur d'échelle y reste sous 3 % sur le cadre. Le fond sur lequel tout est ` +
  `DESSINÉ est une plaque MapTiler en Web Mercator ; les deux ne sont pas la même carte, et le ` +
  `chiffre est toujours celui de la grille équivalente.`;
const readingLine =
  `Lecture : survolez, touchez ou tabulez n'importe quel point de terre pour lire la distance ` +
  `mesurée et le pays. Entre deux courbes, une carte d'isolignes demande au lecteur d'interpoler à ` +
  `l'œil — ce que personne ne fait juste.`;
const source = `Source : distance calculée sur les mêmes formes que les cartes voisines, transformée en distance euclidienne exacte · fond de carte MapTiler (dataviz), teinté par la direction`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: levels.map((l) => `${l} km`).join(" "),
  annot: `${intervalNote} ${claimNote} ${limitNote}`,
  value: levels.filter((l) => l % 200 === 0).map((l) => String(l)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const plate = `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`;
  try {
    await renderWeb({
      component: DirectedContourWeb,
      props: {
        plate,
        bandPaths, lines, probes, levels, intervalNote,
        aspect: CAMERA_ASPECT,
        size: SIZE,
        title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote, limitNote,
        alt:
          `Une carte d'Europe où la terre est teintée par bandes selon sa distance à la mer, du plus ` +
          `clair au bord des côtes au plus foncé au cœur du continent, et traversée de courbes de ` +
          `niveau tous les ${INTERVAL} km. Les bandes claires enveloppent tout le pourtour ; les plus ` +
          `foncées forment une tache unique en Europe de l'Est, dont le point le plus éloigné, en ` +
          `${farthestCountry}, est à ${fr(farthest.km)} km de la mer.`,
        direction,
        ground: direction.ground,
        accent: direction.accent,
      },
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
