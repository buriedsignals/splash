// The contour kit's machinery: the field, measured, and carried onto the plate. Taken from
// proof/static-contour-europe-distance/render-directions.mjs with its subject's constants turned
// into inputs. Never edited by the model; beat.mjs calls `measureSeaDistance`, render-beat.mjs calls
// `drawableField`.
//
// THE ONE FIELD THIS KIT DRAWS IS DISTANCE TO THE SEA, and that is not a shortcut. An isoline map
// needs a field its source defines EVERYWHERE (the type sheet's `no-build-field-records`): the proof
// built distance-to-the-nearest-station first and refused it, because one missing record rewrites the
// value of every cell around it. The coastline is complete by construction — nothing is missing from
// a polygon — so the field is the exact Euclidean distance transform, seeded on every sea cell, on a
// 6 km grid in an equal-area (LAEA) projection. What the story chooses is the STUDY AREA: the
// countries the field is measured over, named by ISO-3 code from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

// ── the measuring camera, identical to the proof's ──────────────────────────
export const WINDOW = { west: -25, east: 45, south: 34, north: 72 };
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;
const EARTH_KM = 6371;
export const CELL_KM = 6;
const VIEW = 1000;
/** The levels a reader is offered, finest first: the component takes the first set whose every line
 *  carries its own number. Trimmed to what the study area's own field reaches. */
const LEVEL_SETS = [
  [100, 200, 300, 400, 500],
  [100, 200, 400, 500],
  [100, 300, 500],
  [200, 500],
];

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
const unlaea = ([x, yNeg]) => {
  const y = -yNeg;
  const rho = Math.hypot(x, y);
  if (rho < 1e-12) return [(LON0 * 180) / Math.PI, (LAT0 * 180) / Math.PI];
  const c = 2 * Math.asin(Math.min(1, rho / 2));
  const lat = Math.asin(Math.cos(c) * Math.sin(LAT0) + (y * Math.sin(c) * Math.cos(LAT0)) / rho);
  const lon =
    LON0 + Math.atan2(x * Math.sin(c), rho * Math.cos(LAT0) * Math.cos(c) - y * Math.sin(LAT0) * Math.sin(c));
  return [(lon * 180) / Math.PI, (lat * 180) / Math.PI];
};

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

/** Felzenszwalb's exact separable distance transform, one dimension. */
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

const inRing = (ring, x, y) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Distance to the sea, measured over the study area.
 *
 * @param dir    the beat folder (shapes.geojson sits in it)
 * @param study  ISO-3 codes of the countries the field is MEASURED over (the field itself is computed
 *               from all the land in frame: the sea is the sea whoever governs its shore)
 * @returns      { kind, study, offFrame (study countries with islands outside the frame), cellKm, median, deepest, deepestIso, quantile(p), within(km) -> %,
 *                 landKm2, levels } — every number a sentence may state
 *
 * Refuses, by name: a code with no frozen shape (the loud join), a code twice, and a country the
 * measuring frame cuts — a distance measured to a coastline that stops at the edge of the paper is
 * not a distance (the proof left Russia out for exactly this).
 */
export function measureSeaDistance(dir, { study }) {
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
  // A polygon part the frame's edge runs THROUGH is cut (Russia, for the proof); a part wholly
  // outside it is an off-frame island (Svalbard, the Azores, the Canaries) — not measured, named in
  // `offFrame` so the standfirst can say so; a country with nothing inside the frame is refused.
  const inside = ([lon, lat]) => lon >= WINDOW.west && lon <= WINDOW.east && lat >= WINDOW.south && lat <= WINDOW.north;
  const cut = [];
  const offFrame = [];
  const absent = [];
  for (const c of codes) {
    const parts = known.get(c).geometry.coordinates.map((poly) => {
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
  const inStudy = codes.map((c) => known.get(c));
  const allLand = rasterize(geo.features);
  const studyLand = rasterize(inStudy);

  const seeded = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) seeded[i] = allLand[i] ? 1e12 : 0;
  const pass = new Float64Array(W * H);
  for (let gy = 0; gy < H; gy++) edt1d(seeded, W, 1, gy * W, pass);
  const squared = new Float64Array(W * H);
  for (let gx = 0; gx < W; gx++) edt1d(pass, H, W, gx, squared);
  const grid = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) grid[i] = Math.sqrt(squared[i]) * CELL_KM;

  const values = [];
  for (let i = 0; i < W * H; i++) if (studyLand[i]) values.push(grid[i]);
  if (values.length < 50)
    throw new Error(`the study area covers ${values.length} cells of ${CELL_KM} km — too little land to draw a field over`);
  values.sort((a, b) => a - b);
  const quantile = (p) => values[Math.floor(p * (values.length - 1))];
  const deepest = values[values.length - 1];
  let far = -1;
  for (let i = 0; i < W * H; i++) if (studyLand[i] && grid[i] === deepest) far = i;
  const farX = BX0 + ((far % W) + 0.5) * cell;
  const farY = BY0 + (Math.floor(far / W) + 0.5) * cell;
  let deepestIso = null;
  for (const f of inStudy)
    for (const poly of f.geometry.coordinates) {
      const rings = poly.map((r) => r.map(laea));
      if (inRing(rings[0], farX, farY) && !rings.slice(1).some((r) => inRing(r, farX, farY)))
        deepestIso = f.properties.iso;
    }
  if (!deepestIso) throw new Error("the farthest point from the sea falls in no study country");

  // The level sets, trimmed to the levels the field reaches; fewer than two lines is not a contour map.
  const reach = (set) => set.filter((l) => l < deepest);
  const sets = [];
  for (const set of LEVEL_SETS) {
    const kept = reach(set);
    if (kept.length >= 2 && !sets.some((s) => s.join() === kept.join())) sets.push(kept);
  }
  if (!sets.length)
    throw new Error(
      `the study area's deepest point is ${deepest.toFixed(0)} km from the sea: fewer than two isolines ` +
        `(${LEVEL_SETS[0].join(", ")} km) cross it, and a contour map with one line cannot be read — ` +
        `this is a single figure, not a field`,
    );

  return Object.freeze({
    kind: "distance-to-sea",
    study: codes,
    offFrame,
    cellKm: CELL_KM,
    median: quantile(0.5),
    deepest,
    deepestIso,
    quantile,
    within: (km) => (values.filter((v) => v <= km).length / values.length) * 100,
    landKm2: values.length * CELL_KM * CELL_KM,
    levels: sets[0],
    // Internals render-beat.mjs carries onto the plate; never read by a beat.
    _grid: { grid, studyLand, farX, farY, sets, geo, codes: new Set(codes) },
  });
}

/** The field carried onto a baked plate: isolines per level set (traced on the measuring grid, then
 *  grid → LAEA → lon/lat → plate), the land shapes, the summit, in the component's VIEW units. */
export function drawableField(field, { frame, corners }, { summitLabel }) {
  const { grid, studyLand, farX, farY, sets, geo, codes } = field._grid;
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const Y_NORTH = mercY(corners.north);
  const Y_SOUTH = mercY(corners.south);
  const project = ([lon, lat]) => {
    const px = ((lon - corners.west) / (corners.east - corners.west)) * frame.width;
    const py = ((mercY(lat) - Y_NORTH) / (Y_SOUTH - Y_NORTH)) * frame.height;
    return [(px / frame.width) * VIEW, (py / frame.width) * VIEW];
  };

  function segmentsAt(level) {
    const segs = [];
    const at = (x, y) => grid[y * W + x];
    for (let y = 0; y + 1 < H; y++)
      for (let x = 0; x + 1 < W; x++) {
        if (!studyLand[y * W + x] && !studyLand[y * W + x + 1] && !studyLand[(y + 1) * W + x] && !studyLand[(y + 1) * W + x + 1])
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
  const toView = ([gx, gy]) => project(unlaea([BX0 + (gx + 0.5) * cell, BY0 + (gy + 0.5) * cell]));
  const contourSets = sets.map((levels) =>
    levels.map((level) => ({ level, lines: joinSegments(segmentsAt(level)).map((l) => l.map(toView)) })),
  );
  for (const set of contourSets)
    for (const c of set)
      if (Math.max(...c.lines.map((l) => l.length), 0) < 3)
        throw new Error(`the ${c.level} isoline came out of the field as loose points, not as a line`);

  const MIN_STEP = VIEW / 1400;
  const thin = (ring) => {
    const out = [ring[0]];
    for (const p of ring.slice(1)) {
      const q = out[out.length - 1];
      if (Math.abs(p[0] - q[0]) > MIN_STEP || Math.abs(p[1] - q[1]) > MIN_STEP) out.push(p);
    }
    return out.length >= 4 ? out : ring;
  };
  const shapes = geo.features
    .map((f) => {
      const rings = f.geometry.coordinates.flatMap((poly) => poly).map((ring) => thin(ring.map(project)));
      if (!rings.length) return null;
      return {
        iso: f.properties.iso,
        study: codes.has(f.properties.iso),
        d: rings.map((ring) => `M ${ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`).join(" "),
      };
    })
    .filter(Boolean);
  // The summit is carried onto the plate the way every contour vertex is (LAEA → lon/lat → plate).
  // The proof placed it at its LAEA grid position scaled to the view instead, which is a different
  // space from the lines it sits among; on the plate that put the dot off the deepest point.
  const [sx, sy] = project(unlaea([farX, farY]));
  const summit = { x: sx, y: sy, label: summitLabel };
  return { contourSets, shapes, summit };
}
