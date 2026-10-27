// The AREA maps' geometry, one function per variant, in one place every format's component draws from: the
// choropleth's frozen country shapes in an equal-area projection, the tile cartogram's designed square grid, the hex
// cartogram's designed hexagon grid, and a dot map's points over the same land. Forked from the per-type kits
// (static/cartogram…/tile-grid.mjs GRID, static/hex-grid…/render-beat.mjs EUROPE_GRID, the choropleth's shapes.geojson
// and window) so the four variants share one layout contract:
//
//   layoutCells(variant, { rows, shapes, grid, points, box }) → { cells, land, dots, box }
//     cells  [{ key, name, value, d, seat: { x, y }, size }] — one drawn place per study row (value null = no data)
//     land   [{ d }] — land outside the study (choropleth, dot map), drawn as ground furniture, never a mark
//     dots   [{ x, y, key }] — a dot map's points, key = the group the dot belongs to
//
// Everything is pure: the caller (render-beat, Node) reads shapes.geojson and passes it in. Browser-safe.

/** The tile cartogram's designed layout (static/cartogram-area-distortion-and-tile-cartogram/tile-grid.mjs). */
export const TILE_GRID = [
  "..  ISL ..  ..  ..  ..  ..  ..  NOR SWE FIN ..",
  "..  ..  ..  ..  ..  ..  ..  ..  ..  ..  EST ..",
  "..  ..  IRL GBR DNK ..  ..  ..  ..  LVA RUS ..",
  "..  ..  ..  ..  NLD DEU POL LTU BLR ..  ..  ..",
  "..  ..  ..  BEL LUX CZE SVK UKR ..  ..  ..  ..",
  "PRT ESP FRA CHE AUT HUN MDA ..  ..  ..  ..  ..",
  "..  ..  ..  ITA SVN HRV SRB ROU ..  ..  ..  ..",
  "..  ..  ..  MLT MNE BIH MKD BGR ..  ..  ..  ..",
  "..  ..  ..  ..  ..  ALB GRC TUR CYP ..  ..  ..",
];

/** The hex cartogram's designed layout (static/hex-grid-…/render-beat.mjs EUROPE_GRID); odd rows sit half right. */
export const HEX_GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];

/** The choropleth's window (static/choropleth/bake.mjs BEAT.bounds): Europe and its neighbours. */
export const WINDOW = { west: -25, south: 34, east: 42, north: 68 };

const RAD = Math.PI / 180;
const LON0 = 10 * RAD;
const LAT0 = 52 * RAD;

/** Lambert azimuthal equal-area on Europe (the projection the cartogram's area reading uses): x east, y SOUTH. */
export function laea(lon, lat) {
  const l = lon * RAD;
  const p = lat * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l - LON0)));
  return [k * Math.cos(p) * Math.sin(l - LON0), -k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l - LON0))];
}

const cellsOfGrid = (grid, sep) => {
  const out = [];
  grid.forEach((line, row) =>
    line.trim().split(/\s+/).forEach((code, col) => {
      if (code !== sep) out.push({ code, row, col });
    }),
  );
  return out;
};

/** The grid codes a variant can place (a story outside them cannot use the grid). */
export const gridCodes = (variant, grid) =>
  cellsOfGrid(grid ?? (variant === "hex-grid-spatial-binning-and-hex-cartogram" ? HEX_GRID : TILE_GRID), variant === "hex-grid-spatial-binning-and-hex-cartogram" ? "." : "..").map((c) => c.code);

function fit(points, box, pad = 0) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((box.width - 2 * pad) / (x1 - x0 || 1), (box.height - 2 * pad) / (y1 - y0 || 1));
  const ox = box.x + (box.width - (x1 - x0) * k) / 2 - x0 * k;
  const oy = box.y + (box.height - (y1 - y0) * k) / 2 - y0 * k;
  return { k, at: ([x, y]) => [ox + x * k, oy + y * k], width: (x1 - x0) * k, height: (y1 - y0) * k };
}

const polygonsOf = (geometry) => (geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : []);
const ringArea = (ring) => ring.reduce((s, [x, y], i) => {
  const [u, v] = ring[(i + 1) % ring.length];
  return s + (x * v - u * y);
}, 0) / 2;

/** A grid of squares or hexes: the designed cartograms. Every row must have a cell (the runner joins loud). */
function layoutGrid(variant, { rows, grid, box }) {
  const hex = variant === "hex-grid-spatial-binning-and-hex-cartogram";
  const all = cellsOfGrid(grid ?? (hex ? HEX_GRID : TILE_GRID), hex ? "." : "..");
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const off = rows.filter((r) => !all.some((c) => c.code === r.key)).map((r) => r.key);
  if (off.length) throw new Error(`the grid has no cell for ${off.join(", ")}; it places ${all.map((c) => c.code).join(" ")}: leave those rows out (and say so in limits), or pass your own grid`);
  const placed = all.filter((c) => byKey.has(c.code));
  const minCol = Math.min(...placed.map((c) => c.col));
  const minRow = Math.min(...placed.map((c) => c.row));
  const cols = Math.max(...placed.map((c) => c.col)) - minCol + 1;
  const nrows = Math.max(...placed.map((c) => c.row)) - minRow + 1;
  const ROOT3 = Math.sqrt(3);
  let w;
  let h;
  if (hex) {
    w = Math.min(box.width / (cols + 0.5), (box.height / (nrows * 0.75 + 0.25)) * (ROOT3 / 2));
    h = (w * 2) / ROOT3;
  } else {
    w = Math.min(box.width / cols, box.height / nrows);
    h = w;
  }
  const gridW = hex ? (cols + 0.5) * w : cols * w;
  const gridH = hex ? nrows * 0.75 * h + 0.25 * h : nrows * h;
  const ox = box.x + (box.width - gridW) / 2;
  const oy = box.y + (box.height - gridH) / 2;
  const cells = placed.map((c) => {
    const col = c.col - minCol;
    const row = c.row - minRow;
    const r = byKey.get(c.code);
    let cx;
    let cy;
    let d;
    if (hex) {
      cx = ox + (col + (c.row % 2 === 1 ? 0.5 : 0) + 0.5) * w;
      cy = oy + row * 0.75 * h + h / 2;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = RAD * (60 * i - 90);
        return [cx + (w / 2) * Math.cos(a) * (2 / ROOT3) * (ROOT3 / 2), cy + (h / 2) * Math.sin(a)];
      });
      d = `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`;
    } else {
      const gap = Math.max(1, w * 0.06);
      const x = ox + col * w + gap / 2;
      const y = oy + row * h + gap / 2;
      cx = x + (w - gap) / 2;
      cy = y + (h - gap) / 2;
      d = `M ${x.toFixed(1)} ${y.toFixed(1)} h ${(w - gap).toFixed(1)} v ${(h - gap).toFixed(1)} h ${(-(w - gap)).toFixed(1)} Z`;
    }
    return { key: r.key, name: r.name, value: r.value, d, seat: { x: cx, y: cy }, size: w };
  });
  return { cells, land: [], dots: [], box, cellSize: w };
}

/** Country shapes in LAEA, fitted to the window: study rows are cells, the rest of the window is land. */
function layoutShapes({ rows, shapes, box, points = [], groups = [] }) {
  const corners = [];
  for (let i = 0; i <= 10; i++) {
    const lon = WINDOW.west + ((WINDOW.east - WINDOW.west) * i) / 10;
    const lat = WINDOW.south + ((WINDOW.north - WINDOW.south) * i) / 10;
    corners.push(laea(lon, WINDOW.south), laea(lon, WINDOW.north), laea(WINDOW.west, lat), laea(WINDOW.east, lat));
  }
  const f = fit(corners, box);
  const pathOf = (geometry) =>
    polygonsOf(geometry)
      .map((poly) => poly.map((ring) => `M ${ring.map(([lon, lat]) => f.at(laea(lon, lat)).map((v) => v.toFixed(1)).join(" ")).join(" L ")} Z`).join(" "))
      .join(" ");
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const features = (shapes?.features ?? []).filter((ft) => ft.properties?.iso && ft.properties.iso !== "-99");
  const known = new Set(features.map((ft) => ft.properties.iso));
  const off = rows.filter((r) => !known.has(r.key)).map((r) => r.key);
  if (off.length) throw new Error(`no shape for ${off.join(", ")}: the map holds ${known.size} countries keyed by ISO alpha-3 (FRA, DEU…); fix the code, or leave the row out and say so`);
  const cells = [];
  const land = [];
  for (const ft of features) {
    const d = pathOf(ft.geometry);
    const r = byKey.get(ft.properties.iso);
    if (!r) {
      land.push({ d, key: ft.properties.iso });
      continue;
    }
    // The seat: the vertex mean of the largest ring (the static choropleth's own rule), projected.
    const rings = polygonsOf(ft.geometry).map((p) => p[0]);
    const big = rings.reduce((a, b) => (Math.abs(ringArea(b)) > Math.abs(ringArea(a)) ? b : a), rings[0]);
    const xy = big.map(([lon, lat]) => f.at(laea(lon, lat)));
    const seat = { x: xy.reduce((s, p) => s + p[0], 0) / xy.length, y: xy.reduce((s, p) => s + p[1], 0) / xy.length };
    const xs = xy.map((p) => p[0]);
    cells.push({ key: r.key, name: r.name, value: r.value, d, seat, size: Math.max(...xs) - Math.min(...xs) });
  }
  const dots = points.map((p) => {
    const [x, y] = f.at(laea(p.lon, p.lat));
    return { x, y, key: p.key };
  });
  // A dot map's groups seat at the mean of their own dots (its marks are groups, not places).
  if (groups.length)
    for (const g of groups) {
      const mine = dots.filter((d) => d.key === g.key);
      cells.push({
        key: g.key,
        name: g.name,
        value: g.value,
        d: "",
        seat: mine.length ? { x: mine.reduce((s, d) => s + d.x, 0) / mine.length, y: mine.reduce((s, d) => s + d.y, 0) / mine.length } : { x: box.x, y: box.y },
        size: 0,
      });
    }
  return { cells, land, dots, box, cellSize: null };
}

export function layoutCells(variant, { rows, shapes, grid, points, box }) {
  if (variant === "cartogram-area-distortion-and-tile-cartogram" || variant === "hex-grid-spatial-binning-and-hex-cartogram")
    return layoutGrid(variant, { rows, grid, box });
  if (variant === "choropleth") return layoutShapes({ rows, shapes, box });
  if (variant === "dot-density") return layoutShapes({ rows: [], shapes, box, points, groups: rows });
  throw new Error(`no area layout for ${variant}`);
}

/** The bounding box, in frame px, of a set of cells' seats (a zoom's close-up frames it). */
export function seatsBox(cells, keys, pad = 40) {
  const s = cells.filter((c) => keys.includes(c.key)).map((c) => c.seat);
  if (!s.length) return null;
  const xs = s.map((p) => p.x);
  const ys = s.map((p) => p.y);
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, width: Math.max(...xs) - Math.min(...xs) + 2 * pad, height: Math.max(...ys) - Math.min(...ys) + 2 * pad };
}
