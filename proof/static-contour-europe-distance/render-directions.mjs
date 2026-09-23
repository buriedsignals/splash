// twin/proof/static-contour-europe-distance/render-directions.mjs
//
// Europe drawn as a continuous field — distance to the sea — with isolines that carry their own
// values, once per filed direction, through the design base. The first `contour / isoline` beat in
// this tree, and the sixth map beat.
//
// WHY THE FIELD IS GEOMETRY AND NOT THE ENERGY DATA EVERY SIBLING MAP BEAT USES.
// The obvious beat was distance to the nearest low-carbon power station, from the same frozen WRI
// file the dot map and the proportional-symbol map draw. It was built, measured, and refused: the
// field said 54 % of Belarus and 49 % of Latvia are more than 100 km from any low-carbon station,
// and those numbers are the DATABASE'S COVERAGE, not the world's. A density map degrades gracefully
// when a record is missing — one dot fewer in a field of thousands. A distance field does not: one
// missing station rewrites the value of every cell around it, out to the next station. So the form
// asks for something a record-based corpus cannot give, and the beat took the one thing in this tree
// that is complete by construction — the coastline. Nothing is missing from a polygon.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-contour-europe-distance/render-directions.mjs

import { existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { plateGrounds, plateTints } from "#shared/map-beat/tints.mjs";
import { plateWasPaintedWith } from "#shared/map-beat/plate-cache.mjs";
import { frameProjector, markOccupancy, occupancyLine } from "#shared/map-beat/occupancy.mjs";
import { plateWaterField } from "../../scripts/map-beat/plate-water.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, guardColour, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedContourField } from "./DirectedContourField.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
const EYEBROW = "Géographie · Europe";
const refused = [];

// ── the camera, identical to the sibling map beats ──────────────────────────
const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;
const EARTH_KM = 6371;
function laea([lonDeg, latDeg]) {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD - LON0;
  const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
  return [
    k * Math.cos(lat) * Math.sin(lon),
    -k * (Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon)),
  ];
}
const border = [];
for (let i = 0; i <= 120; i++) {
  const t = i / 120;
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.north]));
  border.push(laea([WINDOW.west + t * (WINDOW.east - WINDOW.west), WINDOW.south]));
  border.push(laea([WINDOW.west, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
  border.push(laea([WINDOW.east, WINDOW.south + t * (WINDOW.north - WINDOW.south)]));
}
const BX0 = Math.min(...border.map((p) => p[0]));
const BX1 = Math.max(...border.map((p) => p[0]));
const BY0 = Math.min(...border.map((p) => p[1]));
const BY1 = Math.max(...border.map((p) => p[1]));
const span = Math.max(BX1 - BX0, BY1 - BY0);
const VIEW = 1000;

/** TWO CAMERAS, AND THE BEAT SAYS WHICH DOES WHAT. This is the one map family where the distinction
 *  is not a nicety.
 *
 *  THE FIELD IS MEASURED IN THE EQUAL-AREA CAMERA above and nothing moves it. A Euclidean distance
 *  transform on Mercator pixels is not a distance: the metre-per-pixel scale runs as 1/cos(lat), so
 *  the same 200 km would be 200 near Malta and 100 near Tromsø, and the transform is separable only
 *  when the metric is uniform. Every kilometre this beat prints comes from the LAEA grid.
 *
 *  THE PICTURE IS DRAWN IN THE PLATE'S. Traced contour vertices are carried grid → LAEA → lon/lat →
 *  MapTiler plate, so the lines land on the coastline they belong to. The projection changes where a
 *  line is drawn; it cannot change what the line means, because the level it traces was measured
 *  before any of this. */
const PLATE_SIZE = "1000x760";
/** A PLATE BELONGS TO A DIRECTION AND A SIZE. Keyed on the direction alone, a square run re-baked
 *  over the landscape plate and the next landscape run re-baked over that — the two sizes thrashing
 *  one directory, and whichever ran last was the only one whose plate matched its own render. */
const plateDir = (id) => join(HERE, "plate", SIZE === "landscape" ? id : `${id}-${SIZE}`);
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
    throw new Error(`the ${id} plate was baked on a different camera than ${DIRECTION_FILES[0]}`);
}
const FRAME = plateFacts.frame;
const CORNERS = plateFacts.frameCorners;
const CAMERA_ASPECT = FRAME.width / FRAME.height;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const Y_NORTH = mercY(CORNERS.north);
const Y_SOUTH = mercY(CORNERS.south);
const project = ([lon, lat]) => {
  const px = ((lon - CORNERS.west) / (CORNERS.east - CORNERS.west)) * FRAME.width;
  const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * FRAME.height;
  return [(px / FRAME.width) * VIEW, (py / FRAME.width) * VIEW];
};

/** The inverse of `laea` above, so a point measured in the equal-area grid can be drawn on the
 *  plate. Written out rather than approximated: a contour whose vertices drift is a contour that
 *  labels the wrong place, and the drift of a linear approximation over a 70° window is tens of
 *  kilometres. */
const unlaea = ([x, yNeg]) => {
  const y = -yNeg;
  const rho = Math.hypot(x, y);
  if (rho < 1e-12) return [(LON0 * 180) / Math.PI, (LAT0 * 180) / Math.PI];
  const c = 2 * Math.asin(Math.min(1, rho / 2));
  const lat = Math.asin(Math.cos(c) * Math.sin(LAT0) + (y * Math.sin(c) * Math.cos(LAT0)) / rho);
  const lon =
    LON0 +
    Math.atan2(
      x * Math.sin(c),
      rho * Math.cos(LAT0) * Math.cos(c) - y * Math.sin(LAT0) * Math.sin(c),
    );
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
};

// ── the study area ──────────────────────────────────────────────────────────
/** THE FIELD IS COMPUTED FROM ALL THE LAND IN FRAME, because the sea is the sea whoever governs its
 *  shore. It is MEASURED over a stated study area: the forty European countries the sibling beats
 *  carry, minus Russia — the frame cuts Russian territory, and a distance measured to a coastline
 *  that stops at the edge of the paper is not a distance. */
const geo = JSON.parse(await readFile(join(HERE, "shapes.geojson"), "utf8"));
const dataCsv = (await readFile(join(HERE, "countries.csv"), "utf8")).trim().split(/\r?\n/);
const STUDY = new Set(
  dataCsv.slice(1).map((l) => l.split(",")[1]).filter((c) => c && c !== "RUS"),
);
const inStudy = geo.features.filter((f) => STUDY.has(f.properties.iso));
if (inStudy.length < 30)
  throw new Error(`the study area names ${STUDY.size} countries and the basemap carries ${inStudy.length}`);

// ── the grid ────────────────────────────────────────────────────────────────
const CELL_KM = 6;
const cell = CELL_KM / EARTH_KM;
const W = Math.ceil((BX1 - BX0) / cell);
const H = Math.ceil((BY1 - BY0) / cell);

function rasterize(features) {
  const edges = [];
  for (const f of features)
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const p = ring.map(laea);
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) edges.push([p[j], p[i]]);
      }
  const mask = new Uint8Array(W * H);
  for (let gy = 0; gy < H; gy++) {
    const y = BY0 + (gy + 0.5) * cell;
    const xs = [];
    for (const [a, b] of edges) {
      if ((a[1] <= y) === (b[1] <= y)) continue;
      xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      let x0 = Math.ceil((xs[i] - BX0) / cell - 0.5);
      let x1 = Math.floor((xs[i + 1] - BX0) / cell - 0.5);
      if (x1 < 0 || x0 >= W) continue;
      x0 = Math.max(0, x0);
      x1 = Math.min(W - 1, x1);
      for (let gx = x0; gx <= x1; gx++) mask[gy * W + gx] = 1;
    }
  }
  return mask;
}
const allLand = rasterize(geo.features);
const studyLand = rasterize(inStudy);

/** THE EXACT EUCLIDEAN DISTANCE TRANSFORM, seeded on every sea cell — Felzenszwalb's separable
 *  lower-envelope pass, twice. Exact, not an approximation: an isoline drawn from a rounded field
 *  would wander, and a wandering line labelled `200 km` is a false precision the reader cannot see. */
function edt1d(f, n, stride, off, out) {
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s;
    for (;;) {
      s = (f[off + q * stride] + q * q - (f[off + v[k] * stride] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      if (s <= z[k]) k--;
      else break;
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const d = q - v[k];
    out[off + q * stride] = d * d + f[off + v[k] * stride];
  }
}
const seeded = new Float64Array(W * H);
for (let i = 0; i < W * H; i++) seeded[i] = allLand[i] ? 1e12 : 0;
const pass = new Float64Array(W * H);
for (let gy = 0; gy < H; gy++) edt1d(seeded, W, 1, gy * W, pass);
const squared = new Float64Array(W * H);
for (let gx = 0; gx < W; gx++) edt1d(pass, H, W, gx, squared);
const field = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) field[i] = Math.sqrt(squared[i]) * CELL_KM;

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const values = [];
for (let i = 0; i < W * H; i++) if (studyLand[i]) values.push(field[i]);
values.sort((a, b) => a - b);
const quantile = (p) => values[Math.floor(p * (values.length - 1))];
const median = quantile(0.5);
const deepest = values[values.length - 1];
const landKm2 = values.length * CELL_KM * CELL_KM;
if (!(median < 200))
  throw new Error(`the headline says half of Europe is within 200 km of the sea; the median is ${median.toFixed(0)} km`);
if (!(deepest < 1000))
  throw new Error(`the headline says no point is 1 000 km from the sea; the farthest is ${deepest.toFixed(0)} km`);

/** WHERE THE FARTHEST POINT IS, named by the polygon it falls in rather than by memory. */
let far = -1;
for (let i = 0; i < W * H; i++) if (studyLand[i] && field[i] === deepest) far = i;
const farX = BX0 + ((far % W) + 0.5) * cell;
const farY = BY0 + (Math.floor(far / W) + 0.5) * cell;
const inRing = (ring, x, y) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
let deepestCountry = null;
for (const f of inStudy)
  for (const poly of f.geometry.coordinates) {
    const rings = poly.map((r) => r.map(laea));
    if (inRing(rings[0], farX, farY) && !rings.slice(1).some((r) => inRing(r, farX, farY)))
      deepestCountry = f.properties.iso;
  }
if (!deepestCountry) throw new Error("the farthest point from the sea falls in no study country");

const NAMES = { BLR: "Biélorussie", UKR: "Ukraine", HUN: "Hongrie", SVK: "Slovaquie", POL: "Pologne", CZE: "Tchéquie", ROU: "Roumanie" };
const deepestName = NAMES[deepestCountry] ?? deepestCountry;
const within = (km) => (values.filter((v) => v <= km).length / values.length) * 100;
console.log(
  `${STUDY.size} pays · ${(landKm2 / 1e6).toFixed(2)} M km² · médiane ${median.toFixed(0)} km · ` +
    `p90 ${quantile(0.9).toFixed(0)} km · point le plus continental ${deepest.toFixed(0)} km ` +
    `(${deepestCountry}) · grille ${W} x ${H} de ${CELL_KM} km\n`,
);

// ── the isolines ────────────────────────────────────────────────────────────
/** MARCHING SQUARES on the field, kept only where the cell touches the study area. The ambiguous
 *  saddle cases are drawn as two segments rather than resolved by a guess: a contour that guesses
 *  is a contour that lies about a place a reader can check. */
function segmentsAt(level) {
  const segs = [];
  const at = (x, y) => field[y * W + x];
  for (let y = 0; y + 1 < H; y++)
    for (let x = 0; x + 1 < W; x++) {
      if (
        !studyLand[y * W + x] &&
        !studyLand[y * W + x + 1] &&
        !studyLand[(y + 1) * W + x] &&
        !studyLand[(y + 1) * W + x + 1]
      )
        continue;
      const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
      let idx = 0;
      if (a > level) idx |= 8;
      if (b > level) idx |= 4;
      if (c > level) idx |= 2;
      if (d > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      const T = (p, q, vp, vq) => [
        p[0] + ((level - vp) / (vq - vp)) * (q[0] - p[0]),
        p[1] + ((level - vp) / (vq - vp)) * (q[1] - p[1]),
      ];
      const P = {
        top: T([x, y], [x + 1, y], a, b),
        right: T([x + 1, y], [x + 1, y + 1], b, c),
        bottom: T([x, y + 1], [x + 1, y + 1], d, c),
        left: T([x, y], [x, y + 1], a, d),
      };
      const push = (u, v) => segs.push([P[u], P[v]]);
      switch (idx) {
        case 1: case 14: push("left", "bottom"); break;
        case 2: case 13: push("bottom", "right"); break;
        case 3: case 12: push("left", "right"); break;
        case 4: case 11: push("top", "right"); break;
        case 6: case 9: push("top", "bottom"); break;
        case 7: case 8: push("left", "top"); break;
        case 5: push("left", "top"); push("bottom", "right"); break;
        case 10: push("left", "bottom"); push("top", "right"); break;
      }
    }
  return segs;
}
function joinSegments(segs) {
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const ends = new Map();
  for (const [a, b] of segs)
    for (const [p, q] of [[a, b], [b, a]]) {
      const k = key(p);
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k).push(q);
    }
  const spent = new Set();
  const mark = (a, b) => {
    spent.add(`${key(a)}|${key(b)}`);
    spent.add(`${key(b)}|${key(a)}`);
  };
  const taken = (a, b) => spent.has(`${key(a)}|${key(b)}`);
  const lines = [];
  for (const [a, b] of segs) {
    if (taken(a, b)) continue;
    mark(a, b);
    const line = [a, b];
    for (const end of [0, 1]) {
      for (;;) {
        const tip = end === 0 ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) ?? []).find((n) => !taken(tip, n));
        if (!next) break;
        mark(tip, next);
        if (end === 0) line.push(next);
        else line.unshift(next);
      }
    }
    lines.push(line);
  }
  return lines;
}
/** A traced vertex is a point in the MEASURING grid; this is what carries it onto the DRAWN plate.
 *  Grid → LAEA → lon/lat → MapTiler. */
const toView = ([gx, gy]) =>
  project(unlaea([BX0 + (gx + 0.5) * cell, BY0 + (gy + 0.5) * cell]));

/** THE LADDER IS THE LEVEL SET. A contour map is read by counting lines between two places, so more
 *  lines is more reading — until the lines are too close for their own numbers, at which point it is
 *  less. The component walks these from finest to coarsest and takes the first whose every drawn
 *  line carries its own label. */
const LEVEL_SETS = [
  [100, 200, 300, 400, 500],
  [100, 200, 400, 500],
  [100, 300, 500],
  [200, 500],
];
const contourSets = LEVEL_SETS.map((levels) =>
  levels.map((level) => ({
    level,
    lines: joinSegments(segmentsAt(level)).map((l) => l.map(toView)),
  })),
);
for (const set of contourSets)
  for (const c of set)
    if (Math.max(...c.lines.map((l) => l.length), 0) < 3)
      throw new Error(`the ${c.level} km isoline came out of the field as loose points, not as a line`);
console.log(
  contourSets
    .map((s) => `[${s.map((c) => `${c.level}:${c.lines.length}`).join(" ")}]`)
    .join(" · ") + "\n",
);
/** THE RING THAT ENCLOSES THE SUMMIT IS THE ONE THE PLATE MOST NEEDS, and it is also the shortest —
 *  the two facts pull against each other. Measured here rather than assumed: for the innermost level
 *  of the chosen set, the enclosing ring's length is printed beside the others, so a run that drops
 *  it is visible in the log rather than only on the plate. */
const summitView = project(unlaea([farX, farY]));
const enclosesSummit = (line) => {
  let inside = false;
  for (let i = 0, j = line.length - 1; i < line.length; j = i++) {
    const [xi, yi] = line[i];
    const [xj, yj] = line[j];
    if ((yi > summitView[1]) !== (yj > summitView[1]) &&
        summitView[0] < ((xj - xi) * (summitView[1] - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
};
for (const c of contourSets[0]) {
    const rings = c.lines.map((l) => {
      let len = 0;
      for (let i = 1; i < l.length; i++) len += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
      return { len, holds: enclosesSummit(l) };
    });
    const holder = rings.find((r) => r.holds);
    if (holder)
    console.log(
      `  ${c.level} km : ${rings.length} lines, the one holding the summit is ` +
        `${holder.len.toFixed(0)} view-units of ${Math.max(...rings.map((r) => r.len)).toFixed(0)}`,
    );
}

// ── the basemap ─────────────────────────────────────────────────────────────
const MIN_STEP = VIEW / 1400;
function thin(ring) {
  const out = [ring[0]];
  for (const p of ring.slice(1)) {
    const q = out[out.length - 1];
    if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
  }
  return out.length >= 4 ? out : ring;
}
const shapes = geo.features
  .map((f) => {
    const rings = f.geometry.coordinates.flatMap((poly) => poly).map((ring) => thin(ring.map(project)));
    if (!rings.length) return null;
    return {
      iso: f.properties.iso,
      study: STUDY.has(f.properties.iso),
      d: rings.map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`).join(" "),
    };
  })
  .filter(Boolean);

const facts = beatFacts(
  values
    .filter((_, i) => i % 500 === 0)
    .map((v, i) => ({ key: `cell-${i}`, label: `cell-${i}`, value: v })),
  {
    scaleClasses: LEVEL_SETS[0].length,
    geography: { areas: inStudy.length, settlements: 0, waters: 0, basemap: true },
    declaredSequence: "distance to the sea",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

/** `toLocaleString("fr-FR")` emits U+202F and U+00A0, which no face on the family ladders covers —
 *  the glyph guard then refuses every family and the beat cannot draw at all. Written as escapes
 *  rather than as literal characters, because a literal narrow no-break space is invisible in a diff. */
const plain = (s) => s.replace(/[\u202F\u00A0\u2009]/g, " ");
const n0 = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

/** THE SUMMIT OF THE FIELD CARRIES ITS OWN NUMBER, the way a topographic map spot-heights a peak.
 *  The innermost contour a reader can be given is 500 km; the deepest point is 682, and without a
 *  mark the headline's number would have nothing on the map to sit on. It is the one label on this
 *  plate that may not move. */
const summit = {
  x: ((farX - BX0) / span) * VIEW,
  y: ((farY - BY0) / span) * VIEW,
  label: `${n0(deepest)} km`,
};


/** WHICH OF THE BASEMAP'S GROUNDS THIS FIELD OCCUPIES, MEASURED ON THE PLATE THIS BEAT BAKED.
 *
 *  The quantity is DISTANCE FROM THE WATER, so the field is seeded by the coastline and ought to be
 *  defined on the land alone — but "ought to" is an argument, and the isolines are traced on an
 *  equal-area grid whose cells do not follow a coast, so a 100 km line runs along an estuary the
 *  basemap paints. Every line of every level set is measured, because the level set is a control the
 *  reader works, and so is the summit, which is the one mark drawn in the accent undiluted.
 */
const waterField = plateWaterField(plateDir(DIRECTION_FILES[0].replace(/\.md$/, "")), {
  scale: FRAME.width / VIEW,
});
/** The narrowest map the three filed directions draw this beat at — what the component's own
 *  hairline is put in VIEW units against, a mark being smallest there. */
const NARROWEST_MAP = 596;
const ISOLINE_VIEW = (0.85 / NARROWEST_MAP) * VIEW;
const OCCUPANCY = markOccupancy(
  [
    ...contourSets.flatMap((set) =>
      set.flatMap((c) =>
        c.lines.map((line) => ({ kind: "band", name: `${c.level} km`, points: line, width: ISOLINE_VIEW })),
      ),
    ),
    { kind: "disc", name: "le sommet", x: summit.x, y: summit.y, r: (2.6 / NARROWEST_MAP) * VIEW },
  ],
  waterField,
);
console.log(occupancyLine(OCCUPANCY));

const title = [
  `La moitié de l’Europe est à moins de ${n0(median)} km de la mer, et aucun point à plus de ${n0(deepest)} km`,
  `La moitié de l’Europe est à moins de ${n0(median)} km de la mer`,
  `L’Europe, mesurée depuis la mer`,
];
const limits = [
  `Chaque ligne joint les points situés à la même distance de la mer, mesurée à vol d’oiseau sur ` +
    `une grille de ${CELL_KM} km en projection équivalente. Le point le plus continental des ` +
    `${STUDY.size} pays mesurés est en ${deepestName}, à ${n0(deepest)} km ; la moitié des terres ` +
    `est en deçà de ${n0(median)} km, et ${Math.round(within(400))} % en deçà de 400.`,
  `Chaque ligne joint les points à la même distance de la mer. Le plus continental des ` +
    `${STUDY.size} pays mesurés est en ${deepestName}, à ${n0(deepest)} km.`,
  `Chaque ligne joint les points à la même distance de la mer.`,
];
const reading = [
  `Lecture : entre deux lignes, la distance varie continûment — cette carte ne compte rien, elle ` +
    `mesure partout. Les lignes se resserrent là où la côte avance : le long des mers intérieures.`,
  `Lecture : entre deux lignes, la distance varie continûment. La carte mesure partout.`,
];
const source = `Fond de carte MapTiler (dataviz), teinté par la direction · champ mesuré sur une grille de ${CELL_KM} km en projection équivalente (LAEA), dessiné sur le fond`;
const unit = "distance à la mer, en kilomètres";
const limitNote = `La Russie n’est pas mesurée : le cadre coupe son territoire.`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${limitNote} ${LEVEL_SETS[0].map((l) => `${l} km`).join(" ")} ${unit}`,
  annot: reading.join(" "),
  value: `${n0(median)} ${n0(deepest)}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  console.log(id);
  try {
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
    const filed = readDirection(join(DIRECTIONS, file));
    const colourProblems = guardColour(
      filed,
      plateGrounds(plateTints(filed, { landDose: LAND_DOSE }), OCCUPANCY),
    );
    if (colourProblems.length)
      throw new Error(`this beat's colour cannot be carried here: ${colourProblems.join("; ")}`);
    const direction = resolveDirectionFamilies(filed, textPerRegister);
    await renderStill({
      element: createElement(DirectedContourField, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        plate: `data:image/png;base64,${(await readFile(join(plateDir(id), "plate.png"))).toString("base64")}`,
        shapes,
        contourSets,
        summit,
        aspect: CAMERA_ASPECT,
        unit,
        limitNote,
        title,
        limits,
        reading,
        source,
        alt:
          `Carte de l’Europe en courbes de niveau : chaque ligne joint les points situés à la même ` +
          `distance de la mer et porte sa valeur en kilomètres. Les lignes forment des anneaux ` +
          `emboîtés autour d’un centre continental situé en ${deepestName}. La moitié des terres ` +
          `est à moins de ${n0(median)} km de la mer et aucun point à plus de ${n0(deepest)} km.`,
        eyebrow: EYEBROW,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}
if (refused.length) console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
