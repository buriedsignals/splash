// The map this beat starts from and the tiles it ends on, both in ONE coordinate space, computed once
// in node from the frozen shapes. The page morphs each country from the first to the second.
//
// PROJECTION. The sibling plates' own: Lambert azimuthal equal-area centred on 52°N 10°E, so the area a
// country takes on the map is its territory and the "par kilomètre carré" reading is the one this
// drawing actually shows.
//
// WINDOW. Europe as the tile grid names it — Iceland to Cyprus, Portugal to western Russia. Russia runs
// on to the Pacific; drawn whole, Europe would be a corner of the frame. The window is stated, and the
// area figures the cards print are computed on the WHOLE of each country, never on what the window shows.
//
// SIMPLIFICATION. The shapes are clamped to a margin around the window (a clamp is invisible under the
// clip and shortens Russia's coastline to the window's edge), rings too small to see at this scale are
// dropped, and consecutive points closer than a unit are merged. The static plates draw the 50 m shapes;
// the page carries 23 000 points less.

const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;

export function laea(lon, lat) {
  const la = lat * RAD;
  const lo = lon * RAD - LON0;
  const c = Math.sin(LAT0) * Math.sin(la) + Math.cos(LAT0) * Math.cos(la) * Math.cos(lo);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + c));
  return [k * Math.cos(la) * Math.sin(lo), -k * (Math.cos(LAT0) * Math.sin(la) - Math.sin(LAT0) * Math.cos(la) * Math.cos(lo))];
}

/** The unprojected area of one feature, in the projection's own units — the static beats' `areaOf`. */
export function areaOf(feature) {
  let a = 0;
  for (const poly of feature.geometry.coordinates)
    for (const ring of poly) {
      const pts = ring.map(([x, y]) => laea(x, y));
      let s = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
      a += Math.abs(s) / 2;
    }
  return a;
}

/**
 * @param {object} geo       the frozen FeatureCollection
 * @param {{iso: string, col: number, row: number}[]} placed  the tile grid
 * @param {{cols: number, rows: number, width: number, height: number, window: [number, number, number, number]}} frame
 *        `window` is [west, south, east, north] in degrees
 */
export function cartogramGeometry(geo, placed, { cols, rows, width, height, window }) {
  const [west, south, east, north] = window;
  // The window's projected bounds, sampled along its edges (a projected lon/lat box is not a rectangle).
  const edge = [];
  for (let t = 0; t <= 40; t++) {
    const lon = west + ((east - west) * t) / 40;
    const lat = south + ((north - south) * t) / 40;
    edge.push(laea(lon, south), laea(lon, north), laea(west, lat), laea(east, lat));
  }
  const minX = Math.min(...edge.map((p) => p[0]));
  const maxX = Math.max(...edge.map((p) => p[0]));
  // The vertical extent is the land's, not the box's: the box's southern corners sweep far below Cyprus.
  const inBox = [];
  for (const f of geo.features)
    for (const poly of f.geometry.coordinates)
      for (const ring of poly)
        for (const [lon, lat] of ring) if (lon >= west && lon <= east && lat >= south && lat <= north) inBox.push(laea(lon, lat));
  const minY = Math.min(...inBox.map((p) => p[1]));
  const maxY = Math.max(...inBox.map((p) => p[1]));
  const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
  const offX = (width - (maxX - minX) * scale) / 2;
  const offY = (height - (maxY - minY) * scale) / 2;
  const toFrame = ([x, y]) => [offX + (x - minX) * scale, offY + (y - minY) * scale];

  /** Shapes are kept this far past the frame: the map fills a stage of any aspect (`fitViewBox`). */
  const MARGIN_X = 900;
  const MARGIN_Y = 500;
  const clampPt = ([x, y]) => [Math.min(Math.max(x, -MARGIN_X), width + MARGIN_X), Math.min(Math.max(y, -MARGIN_Y), height + MARGIN_Y)];
  const r1 = (v) => Math.round(v * 10) / 10;

  const byIso = new Map();
  for (const f of geo.features) {
    const iso = f.properties.iso;
    const rings = [];
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const pts = ring.map(([lon, lat]) => clampPt(toFrame(laea(lon, lat))));
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const w = Math.max(...xs) - Math.min(...xs);
        const h = Math.max(...ys) - Math.min(...ys);
        if (w < 1.2 && h < 1.2) continue;
        const kept = [pts[0]];
        for (const p of pts.slice(1)) {
          const q = kept[kept.length - 1];
          if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 1) kept.push(p);
        }
        if (kept.length < 3) continue;
        // A ring flattened onto the clamp line is all edge and no land.
        if (kept.every((p) => p[0] <= -MARGIN_X || p[0] >= width + MARGIN_X || p[1] <= -MARGIN_Y || p[1] >= height + MARGIN_Y)) continue;
        rings.push(kept);
      }
    const held = byIso.get(iso) ?? { iso, rings: [], area: 0 };
    held.rings.push(...rings);
    held.area += areaOf(f);
    byIso.set(iso, held);
  }

  const pathOf = (rings) => rings.map((ring) => `M${ring.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`).join("");
  /** The box the morph maps onto a tile: the country's drawn extent, cut to the frame. */
  const boxOf = (rings) => {
    const pts = rings.flat().filter(([x, y]) => x >= 0 && x <= width && y >= 0 && y <= height);
    const use = pts.length ? pts : rings.flat();
    const xs = use.map((p) => p[0]);
    const ys = use.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { x: r1(x0), y: r1(y0), w: r1(Math.max(1, Math.max(...xs) - x0)), h: r1(Math.max(1, Math.max(...ys) - y0)) };
  };

  // The tile grid, centred in the same frame, each cell as non-square as the grid requires but never
  // beyond 2.5:1 — the static plate's own cap.
  const cellH = height / rows;
  const cellW = Math.min(width / cols, cellH * 2.5);
  const gap = Math.max(Math.min(cellW, cellH) * 0.12, 2);
  const gridW = cols * cellW - gap;
  const gridH = rows * cellH - gap;
  const gx = (width - gridW) / 2;
  const gy = (height - gridH) / 2;

  const tiled = new Set(placed.map((p) => p.iso));
  const countries = placed.map((p) => {
    const held = byIso.get(p.iso);
    if (!held || held.rings.length === 0) throw new Error(`${p.iso} has a tile and no shape inside the window`);
    return {
      iso: p.iso,
      path: pathOf(held.rings),
      box: boxOf(held.rings),
      tile: { x: r1(gx + p.col * cellW), y: r1(gy + p.row * cellH), w: r1(cellW - gap), h: r1(cellH - gap) },
      area: held.area,
    };
  });
  const context = [...byIso.values()].filter((c) => !tiled.has(c.iso) && c.rings.length).map((c) => pathOf(c.rings));
  return { countries, context, area: Object.fromEntries([...byIso.values()].map((c) => [c.iso, c.area])) };
}
