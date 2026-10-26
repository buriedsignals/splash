// The tile cartogram's machinery, taken from proof/static-cartogram-europe-lowcarbon/render-directions.mjs
// with everything about ITS subject removed: the designed grid, the join of a story's values onto it
// (loud, both ways), the class index, and the area-weighted reading computed from the same frozen
// shapes in the same equal-area projection the sibling choropleth uses. Copied into the beat with the
// kit; never edited by the model.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HERE = import.meta.dirname;

/** THE LAYOUT IS DESIGNED, NOT DERIVED. A person placed these tiles to keep each country roughly where
 *  a reader expects it. The kit draws ONLY these 41 countries, keyed by ISO 3166-1 alpha-3: a story
 *  about another region cannot use this kit, and a key outside the grid is refused, never dropped. */
export const GRID = [
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

export const GRID_CODES = GRID.flatMap((l) => l.trim().split(/\s+/)).filter((c) => c !== "..");

/**
 * Place a story's values on the grid. `values` is [{ code, value }] (value null = the source does not
 * report it, drawn hollow). Every code must be a grid tile; grid tiles the story does not study are
 * left out and the empty edge rows/columns trimmed, so the layout keeps its relative positions.
 */
export function placeTiles(values) {
  const byCode = new Map();
  for (const { code, value } of values) {
    if (byCode.has(code)) throw new Error(`values names ${code} twice: one entry per country`);
    byCode.set(code, value);
  }
  const off = [...byCode.keys()].filter((c) => !GRID_CODES.includes(c));
  if (off.length)
    throw new Error(
      `the grid has no tile for ${off.join(", ")}. Codes must be ISO 3166-1 alpha-3 (FRA, DEU, GBR…) from the ${GRID_CODES.length} the grid holds: ${GRID_CODES.join(" ")}. ` +
        `Read the column that holds such codes as keyColumn, or leave out what the grid cannot place (and say so in the limits)`,
    );
  const placed = [];
  GRID.forEach((line, row) =>
    line.trim().split(/\s+/).forEach((code, col) => {
      if (code !== ".." && byCode.has(code)) placed.push({ iso: code, col, row, value: byCode.get(code) });
    }),
  );
  if (placed.length < 6) throw new Error(`only ${placed.length} countries on the grid: a cartogram of so few tiles is not a map — draw a bar chart instead`);
  const minCol = Math.min(...placed.map((p) => p.col));
  const minRow = Math.min(...placed.map((p) => p.row));
  for (const p of placed) {
    p.col -= minCol;
    p.row -= minRow;
  }
  return {
    tiles: placed,
    cols: Math.max(...placed.map((p) => p.col)) + 1,
    rows: Math.max(...placed.map((p) => p.row)) + 1,
  };
}

/** Which class a value falls in: the number of breaks it reaches (null stays null, outside the ramp). */
export const classOf = (breaks) => (v) => (v === null ? null : breaks.filter((b) => v >= b).length);

/** Quantile breaks (n classes → n-1 breaks), rounded to `step`, for a beat with no conventional breaks. */
export function quantileBreaks(values, classes = 5, step = 1) {
  const v = values.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < classes; i++) {
    const b = Math.round(v[Math.floor((i / classes) * v.length)] / step) * step;
    if (!out.includes(b)) out.push(b);
  }
  return out;
}

// ── the territory reading: what a choropleth of the same values would weigh ──
const RAD = Math.PI / 180;
const LAT0 = 52 * RAD;
const LON0 = 10 * RAD;
const laea = (lon, lat) => {
  const la = lat * RAD;
  const lo = lon * RAD - LON0;
  const c = Math.sin(LAT0) * Math.sin(la) + Math.cos(LAT0) * Math.cos(la) * Math.cos(lo);
  const k = Math.sqrt(2 / Math.max(1e-9, 1 + c));
  return [k * Math.cos(la) * Math.sin(lo), -k * (Math.cos(LAT0) * Math.sin(la) - Math.sin(LAT0) * Math.cos(la) * Math.cos(lo))];
};
let AREA;
function areas() {
  if (AREA) return AREA;
  const geo = JSON.parse(readFileSync(join(HERE, "shapes.geojson"), "utf8"));
  AREA = {};
  for (const f of geo.features) {
    let a = 0;
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const pts = ring.map(([x, y]) => laea(x, y));
        let s = 0;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) s += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
        a += Math.abs(s) / 2;
      }
    AREA[f.properties.iso] = (AREA[f.properties.iso] ?? 0) + a;
  }
  return AREA;
}

/**
 * The two readings of one dataset: the mean by country (what this plate shows, one tile each) and the
 * mean weighted by the territory each country takes on a choropleth, from the frozen shapes in the
 * LAEA projection. Also the country taking the most territory and its share of the drawing.
 * @param values [{ code, value }]
 * @returns { byCountry, byArea, widest: { code, value, areaShare } }
 */
export function meansOf(values) {
  const area = areas();
  const withData = values.filter((v) => v.value !== null && Number.isFinite(v.value));
  const noShape = withData.filter((v) => !area[v.code]).map((v) => v.code);
  if (noShape.length) throw new Error(`no frozen shape for ${noShape.join(", ")}: the territory reading cannot weigh them`);
  const byCountry = withData.reduce((s, v) => s + v.value, 0) / withData.length;
  const areaSum = withData.reduce((s, v) => s + area[v.code], 0);
  const byArea = withData.reduce((s, v) => s + v.value * area[v.code], 0) / areaSum;
  const w = withData.reduce((a, b) => (area[b.code] > area[a.code] ? b : a));
  return { byCountry, byArea, widest: { code: w.code, value: w.value, areaShare: (area[w.code] / areaSum) * 100 } };
}
