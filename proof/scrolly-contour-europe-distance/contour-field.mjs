// THE FIELD, ITS LINES AND THE LAND, IN ONE COORDINATE SPACE — computed once in node from the frozen shapes.
//
// The measurement is the static beat's own (`static-contour-europe-distance/render-directions.mjs`): an
// exact Euclidean distance transform (Felzenszwalb's separable lower-envelope pass, twice) on a 6 km grid in
// the Lambert azimuthal equal-area projection centred on 52°N 10°E, seeded on every sea cell, measured over
// the study countries. Nothing here changes a number the static plate prints.
//
// WHAT CHANGES IS WHERE IT IS DRAWN. The static plate carries the lines onto a Web Mercator raster through an
// inverse projection. This page draws the land as vectors IN THE MEASURING PROJECTION, so the lines, the
// land, the swept fill and the summit's mark are all placed by one transform and cannot disagree.
//
// What leaves this module for the page:
//   - `shapes`   every land ring in frame units, clamped to a margin past the frame (the map fills a stage of
//                any aspect, `fitViewBox`), study countries apart from the rest;
//   - `lines`    each level's isolines, simplified, in frame units;
//   - `seats`    for each level, candidate label seats along its lines, each with the room a horizontal
//                number has there against every other level's lines — so the page can refuse a number laid
//                across the next line;
//   - `raster`   the field over the study land, 3 km steps in one byte per cell, gzipped — what the page
//                thresholds to sweep the fill inland;
//   - `within`   the share of the study land within each whole kilometre of the sea.

import { gzipSync } from "node:zlib";

const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;
export const EARTH_KM = 6371;
export const CELL_KM = 6;
/** The raster's step: a byte per cell, and the deepest point (682 km) still inside it. */
export const RASTER_KM = 3;

export function laea([lonDeg, latDeg]) {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD - LON0;
  const cosc = Math.sin(LAT0) * Math.sin(lat) + Math.cos(LAT0) * Math.cos(lat) * Math.cos(lon);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + cosc));
  return [k * Math.cos(lat) * Math.sin(lon), -k * (Math.cos(LAT0) * Math.sin(lat) - Math.sin(LAT0) * Math.cos(lat) * Math.cos(lon))];
}

/**
 * @param {object} geo  the frozen FeatureCollection
 * @param {{study: Set<string>, window: {west: number, east: number, south: number, north: number}, width: number, levels: number[]}} options
 */
export function contourField(geo, { study, window: win, width, levels }) {
  // ── the grid: the static beat's, over the window's projected box ────────────────────────────────
  const border = [];
  for (let i = 0; i <= 120; i++) {
    const t = i / 120;
    border.push(laea([win.west + t * (win.east - win.west), win.north]), laea([win.west + t * (win.east - win.west), win.south]));
    border.push(laea([win.west, win.south + t * (win.north - win.south)]), laea([win.east, win.south + t * (win.north - win.south)]));
  }
  const BX0 = Math.min(...border.map((p) => p[0]));
  const BX1 = Math.max(...border.map((p) => p[0]));
  const BY0 = Math.min(...border.map((p) => p[1]));
  const BY1 = Math.max(...border.map((p) => p[1]));
  const cell = CELL_KM / EARTH_KM;
  const W = Math.ceil((BX1 - BX0) / cell);
  const H = Math.ceil((BY1 - BY0) / cell);

  const inStudy = geo.features.filter((f) => study.has(f.properties.iso));
  const rasterize = (features) => {
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
  };
  const allLand = rasterize(geo.features);
  const studyLand = rasterize(inStudy);

  const edt1d = (f, n, stride, off, out) => {
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    let k = 0;
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
  };
  const seeded = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) seeded[i] = allLand[i] ? 1e12 : 0;
  const pass = new Float64Array(W * H);
  for (let gy = 0; gy < H; gy++) edt1d(seeded, W, 1, gy * W, pass);
  const squared = new Float64Array(W * H);
  for (let gx = 0; gx < W; gx++) edt1d(pass, H, W, gx, squared);
  const field = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) field[i] = Math.sqrt(squared[i]) * CELL_KM;

  // ── the measurement ──────────────────────────────────────────────────────────────────────────────
  const values = [];
  for (let i = 0; i < W * H; i++) if (studyLand[i]) values.push(field[i]);
  values.sort((a, b) => a - b);
  const median = values[Math.floor(0.5 * (values.length - 1))];
  const deepest = values[values.length - 1];
  let far = -1;
  for (let i = 0; i < W * H; i++) if (studyLand[i] && field[i] === deepest) far = i;
  const farLaea = [BX0 + ((far % W) + 0.5) * cell, BY0 + (Math.floor(far / W) + 0.5) * cell];
  const inRing = (ring, [x, y]) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  let deepestIso = null;
  for (const f of inStudy)
    for (const poly of f.geometry.coordinates) {
      const rings = poly.map((r) => r.map(laea));
      if (inRing(rings[0], farLaea) && !rings.slice(1).some((r) => inRing(r, farLaea))) deepestIso = f.properties.iso;
    }
  const within = [];
  for (let km = 0, i = 0; km <= Math.ceil(deepest); km++) {
    while (i < values.length && values[i] <= km) i++;
    within.push(Math.round((i / values.length) * 1000) / 10);
  }
  /** The study land still farther than `km` from the sea, as connected pieces (4-neighbour). */
  const islandsBeyond = (km) => {
    const seen = new Uint8Array(W * H);
    const pieces = [];
    for (let i = 0; i < W * H; i++) {
      if (seen[i] || !studyLand[i] || field[i] <= km) continue;
      const stack = [i];
      seen[i] = 1;
      let cells = 0;
      let x0 = W, x1 = 0, y0 = H, y1 = 0;
      while (stack.length) {
        const j = stack.pop();
        cells++;
        const gx = j % W;
        const gy = Math.floor(j / W);
        x0 = Math.min(x0, gx); x1 = Math.max(x1, gx); y0 = Math.min(y0, gy); y1 = Math.max(y1, gy);
        for (const n of [gx > 0 ? j - 1 : -1, gx < W - 1 ? j + 1 : -1, gy > 0 ? j - W : -1, gy < H - 1 ? j + W : -1])
          if (n >= 0 && !seen[n] && studyLand[n] && field[n] > km) {
            seen[n] = 1;
            stack.push(n);
          }
      }
      pieces.push({ cells, holdsSummit: seen[far] === 1 && pieces.every((p) => !p.holdsSummit), box: { x0, x1, y0, y1 } });
    }
    return pieces;
  };

  // ── the frame: the window's width, the land's height ─────────────────────────────────────────────
  const inBox = [];
  for (const f of geo.features)
    for (const poly of f.geometry.coordinates)
      for (const ring of poly)
        for (const [lon, lat] of ring) if (lon >= win.west && lon <= win.east && lat >= win.south && lat <= win.north) inBox.push(laea([lon, lat]));
  const minY = Math.min(...inBox.map((p) => p[1]));
  const maxY = Math.max(...inBox.map((p) => p[1]));
  const scale = width / (BX1 - BX0);
  const height = Math.round((maxY - minY) * scale);
  const toFrame = ([x, y]) => [(x - BX0) * scale, (y - minY) * scale];
  const gridToFrame = ([gx, gy]) => toFrame([BX0 + (gx + 0.5) * cell, BY0 + (gy + 0.5) * cell]);
  const unitsPerKm = scale / EARTH_KM;
  const r1 = (v) => Math.round(v * 10) / 10;

  /** Shapes are kept this far past the frame: the map fills a stage of any aspect. They are CLIPPED to that
   *  margin, not clamped: Russia runs on to the Pacific, and a ring clamped onto the margin's edges folds into
   *  a polygon that covers Western Europe. */
  const MARGIN_X = 900;
  const MARGIN_Y = 500;
  const clipRing = (pts) => {
    const edges = [
      [(p) => p[0] >= -MARGIN_X, (a, b) => cut(a, b, 0, -MARGIN_X)],
      [(p) => p[0] <= width + MARGIN_X, (a, b) => cut(a, b, 0, width + MARGIN_X)],
      [(p) => p[1] >= -MARGIN_Y, (a, b) => cut(a, b, 1, -MARGIN_Y)],
      [(p) => p[1] <= height + MARGIN_Y, (a, b) => cut(a, b, 1, height + MARGIN_Y)],
    ];
    function cut(a, b, axis, v) {
      const t = (v - a[axis]) / (b[axis] - a[axis]);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    let out = pts;
    for (const [inside, cross] of edges) {
      const input = out;
      out = [];
      for (let i = 0; i < input.length; i++) {
        const cur = input[i];
        const prev = input[(i + input.length - 1) % input.length];
        if (inside(cur)) {
          if (!inside(prev)) out.push(cross(prev, cur));
          out.push(cur);
        } else if (inside(prev)) out.push(cross(prev, cur));
      }
      if (!out.length) break;
    }
    return out;
  };
  const shapes = { study: [], other: [] };
  for (const f of geo.features) {
    const rings = [];
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const pts = clipRing(ring.map((p) => toFrame(laea(p))));
        if (pts.length < 3) continue;
        const kept = [pts[0]];
        for (const p of pts.slice(1)) {
          const q = kept[kept.length - 1];
          if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 0.8) kept.push(p);
        }
        if (kept.length < 3) continue;
        rings.push(`M${kept.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`);
      }
    if (rings.length) (study.has(f.properties.iso) ? shapes.study : shapes.other).push(rings.join(""));
  }

  // ── the isolines: the static beat's marching squares, kept where a cell touches the study land ────
  const segmentsAt = (level) => {
    const segs = [];
    const at = (x, y) => field[y * W + x];
    for (let y = 0; y + 1 < H; y++)
      for (let x = 0; x + 1 < W; x++) {
        if (!studyLand[y * W + x] && !studyLand[y * W + x + 1] && !studyLand[(y + 1) * W + x] && !studyLand[(y + 1) * W + x + 1]) continue;
        const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
        let idx = 0;
        if (a > level) idx |= 8;
        if (b > level) idx |= 4;
        if (c > level) idx |= 2;
        if (d > level) idx |= 1;
        if (idx === 0 || idx === 15) continue;
        const T = (p, q, vp, vq) => [p[0] + ((level - vp) / (vq - vp)) * (q[0] - p[0]), p[1] + ((level - vp) / (vq - vp)) * (q[1] - p[1])];
        const P = { top: T([x, y], [x + 1, y], a, b), right: T([x + 1, y], [x + 1, y + 1], b, c), bottom: T([x, y + 1], [x + 1, y + 1], d, c), left: T([x, y], [x, y + 1], a, d) };
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
  };
  const joinSegments = (segs) => {
    const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    const ends = new Map();
    for (const [a, b] of segs)
      for (const [p, q] of [[a, b], [b, a]]) {
        const k = key(p);
        if (!ends.has(k)) ends.set(k, []);
        ends.get(k).push(q);
      }
    const spent = new Set();
    const mark = (a, b) => { spent.add(`${key(a)}|${key(b)}`); spent.add(`${key(b)}|${key(a)}`); };
    const taken = (a, b) => spent.has(`${key(a)}|${key(b)}`);
    const lines = [];
    for (const [a, b] of segs) {
      if (taken(a, b)) continue;
      mark(a, b);
      const line = [a, b];
      for (const end of [0, 1])
        for (;;) {
          const tip = end === 0 ? line[line.length - 1] : line[0];
          const next = (ends.get(key(tip)) ?? []).find((n) => !taken(tip, n));
          if (!next) break;
          mark(tip, next);
          if (end === 0) line.push(next);
          else line.unshift(next);
        }
      lines.push(line);
    }
    return lines;
  };
  /** Douglas–Peucker: a line holding a vertex per cell carries tens of thousands the eye cannot see. */
  const simplify = (pts, tol) => {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [i, j] = stack.pop();
      const [ax, ay] = pts[i];
      const [bx, by] = pts[j];
      const len = Math.hypot(bx - ax, by - ay) || 1e-9;
      let worst = -1, at = -1;
      for (let k = i + 1; k < j; k++) {
        const d = Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) / len;
        if (d > worst) { worst = d; at = k; }
      }
      if (worst > tol) { keep[at] = 1; stack.push([i, at], [at, j]); }
    }
    return pts.filter((_, k) => keep[k]);
  };
  const lines = levels.map((level) => ({
    level,
    lines: joinSegments(segmentsAt(level)).map((l) => simplify(l.map(gridToFrame), 0.25)).filter((l) => l.length >= 3),
  }));

  // ── the label seats ──────────────────────────────────────────────────────────────────────────────
  const lengthOf = (l) => l.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - l[i - 1][0], p[1] - l[i - 1][1]) : 0), 0);
  const BUCKET = 8;
  const buckets = new Map();
  lines.forEach(({ lines: ls }, li) => {
    for (const l of ls)
      for (let i = 1; i < l.length; i++) {
        // Densified so a long straight run still has points to measure against.
        const [a, b] = [l[i - 1], l[i]];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
        for (let k = 0; k <= n; k++) {
          const p = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
          const key = `${Math.floor(p[0] / BUCKET)},${Math.floor(p[1] / BUCKET)}`;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push([p[0], p[1], li]);
        }
      }
  });
  /** HOW TALL A LABEL MAY BE AT A SEAT, measured as the static plate measures it: against the BOX a
   *  horizontal number occupies, not a circle round it. For each half-width in `HALF_WIDTHS`, the nearest
   *  vertical distance to a line of level `lj` among its points within that half-width across — capped at
   *  `CAP`. The page takes the smallest half-width that covers its label and asks for half the label's
   *  height. */
  const HALF_WIDTHS = [12, 24, 48];
  const CAP = 30;
  const boxClearance = ([x, y], lj, hw) => {
    let best = CAP;
    const bx0 = Math.floor((x - hw) / BUCKET);
    const bx1 = Math.floor((x + hw) / BUCKET);
    const by0 = Math.floor((y - CAP) / BUCKET);
    const by1 = Math.floor((y + CAP) / BUCKET);
    for (let bx = bx0; bx <= bx1; bx++)
      for (let by = by0; by <= by1; by++)
        for (const [px, py, pl] of buckets.get(`${bx},${by}`) ?? [])
          if (pl === lj && Math.abs(px - x) <= hw) best = Math.min(best, Math.abs(py - y));
    return best;
  };
  const seats = lines.map(({ lines: ls }, li) => {
    const out = [];
    for (const l of ls) {
      if (lengthOf(l) < 30) continue;
      let run = 0;
      for (let i = 1; i < l.length; i++) {
        run += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
        if (run < 8) continue;
        run = 0;
        const clear = [];
        for (let lj = 0; lj < lines.length; lj++) for (const hw of HALF_WIDTHS) clear.push(lj === li ? CAP : Math.floor(boxClearance(l[i], lj, hw)));
        out.push([Math.round(l[i][0]), Math.round(l[i][1]), ...clear]);
      }
    }
    const step = Math.max(1, Math.ceil(out.length / 220));
    return out.filter((_, k) => k % step === 0);
  });

  // ── the raster ───────────────────────────────────────────────────────────────────────────────────
  const bytes = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) if (studyLand[i]) bytes[i] = 1 + Math.min(254, Math.round(field[i] / RASTER_KM));
  const [rx, ry] = toFrame([BX0, BY0]);

  return {
    width,
    height,
    unitsPerKm,
    median,
    deepest,
    deepestIso,
    summit: gridToFrame([far % W, Math.floor(far / W)]).map(r1),
    within,
    islandsBeyond: (km) => islandsBeyond(km).map((p) => ({ ...p, box: { x0: gridToFrame([p.box.x0, p.box.y0])[0], y0: gridToFrame([p.box.x0, p.box.y0])[1], x1: gridToFrame([p.box.x1, p.box.y1])[0], y1: gridToFrame([p.box.x1, p.box.y1])[1] } })),
    studyCount: inStudy.length,
    shapes,
    lines: lines.map(({ level, lines: ls }) => ({ level, d: ls.map((l) => `M${l.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}`).join("") })),
    seats,
    seatHalfWidths: HALF_WIDTHS,
    raster: { x: r1(rx), y: r1(ry), w: r1(W * cell * scale), h: r1(H * cell * scale), cols: W, rows: H, stepKm: RASTER_KM, data: gzipSync(bytes, { level: 9 }).toString("base64") },
    /** The transforms back to the measuring projection, unrounded: frame units are `(laea − (x0, frameY0)) · scale`,
     *  raster cell (gx, gy) is centred on `(x0, y0) + (g + 0.5) · cell` — what a Web Mercator map needs to place them. */
    projection: { x0: BX0, y0: BY0, frameY0: minY, scale, cell },
  };
}
