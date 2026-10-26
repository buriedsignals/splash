// THE SUBJECT OF `static-cartogram-europe-lowcarbon`, LOADED AND ASSERTED — and the map and the tiles it is drawn as,
// in the frame's own pixels.
//
// The shares, the designed grid and its two-way check against the data, the area computation and both assertions
// are the static beat's own (`render-directions.mjs` there, which runs them inline and exports nothing), read from
// the static beat's frozen files so the two exports cannot drift apart on the data.
//
// THE MAP IS CLIPPED, NOT CLAMPED. The scrolly's `cartogramGeometry` clamps each ring to a margin; a clamped
// vertex drags the edges leading to it, and a clamped Russia can fold across the frame. Here every projected ring
// is cut against the frame plus a margin with the choropleth video's own Sutherland–Hodgman `clipRing`.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { join } from "node:path";

// ZONE KIT COPY of proof/video-cartogram-europe-lowcarbon/subject.mjs. Kept: the designed grids, the second form of
// every code, the window and `cartogramGeometry`. Changed: the data is beat.mjs's rows, not the static beat's frozen
// CSV; a grid country the story does not give is left out (its tile is empty, its place kept); the static beat's two
// assertions are beat.mjs's `check()`. `areaOf` (Lambert azimuthal equal-area, the static plates') and `clipRing` are
// carried at the end of this file from proof/scrolly-cartogram-europe-lowcarbon/cartogram-geometry.mjs and
// proof/video-choropleth-europe-lowcarbon/geometry.mjs.

/** The layout is designed, not derived — the static plate's own grid, unchanged. */
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
/**
 * THE SAME MAP, RE-CUT FOR A FRAME THAT IS NOT 16:9 — ten columns instead of eleven, the same forty-one tiles.
 *
 * Eleven columns over the 936px a square or portrait frame gives is an 85px cell, and a cell has to hold its
 * country's code at the 36px type floor: the widest wants 79px of tile and 85px of cell leaves 78 (measured
 * 2026-09-24, nocturne). Ten columns give 94px of cell and 86 of tile, which holds. The column that goes is the
 * one that carried a single country — Portugal alone, west of Spain — and Portugal takes the tile under Spain,
 * the south-west corner of the drawing, which is where it is. Nothing is dropped and no reading moves.
 */
export const NARROW_GRID = [
  "ISL ..  ..  ..  ..  ..  ..  NOR SWE FIN",
  "..  ..  ..  ..  ..  ..  ..  ..  ..  EST",
  "..  IRL GBR DNK ..  ..  ..  ..  LVA RUS",
  "..  ..  ..  NLD DEU POL LTU BLR ..  ..",
  "..  ..  BEL LUX CZE SVK UKR ..  ..  ..",
  "ESP FRA CHE AUT HUN MDA ..  ..  ..  ..",
  "PRT ..  ITA SVN HRV SRB ROU ..  ..  ..",
  "..  ..  MLT MNE BIH MKD BGR ..  ..  ..",
  "..  ..  ..  ..  ALB GRC TUR CYP ..  ..",
];

/**
 * THE SECOND FORM OF EVERY CODE — ISO 3166-1 alpha-2, the same standard the grid is written in.
 * A tile names its country by its code, and how much of a code a tile holds is a measurement of the frame: at
 * 1920x1080 a tile is 145px wide and holds « MDA » at the axis size; at 936px of content the widest alpha-3
 * wants 111px of the 86px a tile keeps free (measured 2026-09-24, nocturne), and the alpha-2 form of the same
 * standard wants 79. The frame that cannot keep the third letter keeps the country.
 */
export const ALPHA2 = {
  ISL: "IS", NOR: "NO", SWE: "SE", FIN: "FI", EST: "EE", IRL: "IE", GBR: "GB", DNK: "DK", LVA: "LV", RUS: "RU",
  NLD: "NL", DEU: "DE", POL: "PL", LTU: "LT", BLR: "BY", BEL: "BE", LUX: "LU", CZE: "CZ", SVK: "SK", UKR: "UA",
  PRT: "PT", ESP: "ES", FRA: "FR", CHE: "CH", AUT: "AT", HUN: "HU", MDA: "MD", ITA: "IT", SVN: "SI", HRV: "HR",
  SRB: "RS", ROU: "RO", MLT: "MT", MNE: "ME", BIH: "BA", MKD: "MK", BGR: "BG", ALB: "AL", GRC: "GR", TUR: "TR",
  CYP: "CY",
};

/** The map's window, [west, south, east, north]: Europe as the grid names it (the scrolly's own). */
export const WINDOW = [-25, 34, 50, 72];

/** The countries a grid holds (ISO alpha-3), in reading order. */
export const gridCodes = (grid) => grid.flatMap((line) => line.trim().split(/\s+/).filter((c) => c !== ".."));

const n = (v) => String(+Number(v).toPrecision(4));

/**
 * What the data says, before any claim is checked: the join onto the grid, each country's equal-area territory, the
 * mean by country and the mean by area, the widest country. Refuses only what makes the rows unreadable here.
 *
 * @returns {{ reading, helpers }} `helpers` is what beat.mjs's `check(map)` receives.
 */
export function readingOf(beat, here, grid) {
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("beat.mjs: rows must be a non-empty array of { iso, name, value }");
  const codes = gridCodes(GRID);
  const off = beat.rows.filter((r) => !codes.includes(r.iso)).map((r) => JSON.stringify(r.iso));
  if (off.length) throw new Error(`rows carry codes the grid has no tile for: ${off.join(", ")} — the grid holds ${codes.join(" ")} (ISO alpha-3)`);
  const share = new Map();
  const names = new Map();
  for (const r of beat.rows) {
    if (share.has(r.iso)) throw new Error(`rows hold ${r.iso} twice: keep ONE row per country (filter data.json to one year / one series)`);
    if (r.value !== null && !(typeof r.value === "number" && Number.isFinite(r.value)))
      throw new Error(`the row for ${r.iso} has value ${JSON.stringify(r.value)}: a number, or null for a country the source does not report (never 0)`);
    if (r.value !== null && !(r.value >= 0 && r.value <= 100))
      throw new Error(`the row for ${r.iso} is ${n(r.value)}: the balance is a 0–100 % beam, so value must be a share in percent (0 to 100)`);
    if (typeof r.name !== "string" || !r.name.trim()) throw new Error(`the row for ${r.iso} has no name: give every row the country's name in the story's language`);
    share.set(r.iso, r.value);
    names.set(r.iso, r.name);
  }
  // THE GRID AND THE DATA AGREE: every row has a tile; a tile with no row is left empty (its place kept).
  const placed = [];
  grid.forEach((line, row) =>
    line.trim().split(/\s+/).forEach((code, col) => {
      if (code === ".." || !share.has(code)) return;
      placed.push({ iso: code, col, row });
    }),
  );
  const BREAKS = beat.breaks;
  if (!Array.isArray(BREAKS) || BREAKS.length < 2 || BREAKS.length > 5 || BREAKS.some((b, i) => !(typeof b === "number" && b > 0 && b < 100) || (i > 0 && !(b > BREAKS[i - 1]))))
    throw new Error(`breaks is ${JSON.stringify(BREAKS)}: give 2 to 5 rising numbers between 0 and 100, the class limits`);

  const geo = JSON.parse(readFileSync(join(here, "shapes.geojson"), "utf8"));
  const area = {};
  for (const f of geo.features) area[f.properties.iso] = (area[f.properties.iso] ?? 0) + areaOf(f);
  const withData = [...share.entries()].filter(([, v]) => v !== null);
  if (withData.length < 4) throw new Error(`only ${withData.length} rows carry a value: a cartogram needs the countries the source reports`);
  const byCountry = withData.reduce((s, [, v]) => s + v, 0) / withData.length;
  const areaSum = withData.reduce((s, [c]) => s + (area[c] ?? 0), 0);
  const byArea = withData.reduce((s, [c, v]) => s + v * (area[c] ?? 0), 0) / areaSum;
  const widest = withData.reduce((a, b) => ((area[b[0]] ?? 0) > (area[a[0]] ?? 0) ? b : a))[0];
  const widestShare = ((area[widest] ?? 0) / areaSum) * 100;
  const unreported = [...share.entries()].filter(([, v]) => v === null).map(([c]) => c);
  const classOf = (v) => (v === null ? null : BREAKS.filter((b) => v >= b).length);
  const nameOf = (iso) => names.get(iso);
  const reading = { share, placed, geo, area, byCountry, byArea, widest, widestShare, unreported, classOf, BREAKS, nameOf };
  const helpers = {
    byCountry,
    byArea,
    gap: byCountry - byArea,
    widest: { iso: widest, name: nameOf(widest), value: share.get(widest), areaShare: widestShare },
    value: (iso) => share.get(iso) ?? null,
    ranked: withData.map(([iso, value]) => ({ iso, name: nameOf(iso), value })).sort((a, b) => b.value - a.value),
    unreported: unreported.map(nameOf),
  };
  return { reading, helpers };
}

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * THE SHAPES AND THE TILES, IN STAGE PIXELS.
 *
 * The shapes are projected with the LIVE MAP'S OWN CAMERA (`project`, Web Mercator at the measured camera), so the SVG
 * shape a country morphs from lies where MapLibre fills it when the overlay takes over from the map.
 *
 * @param {ReturnType<typeof loadSubject>} subject
 * @param {{ project: (lonLat: number[]) => number[], tileBox: {x:number,y:number,w:number,h:number},
 *           stage: {width:number,height:number}, margin: number }} frame
 *   `tileBox`: where the grid is centred; `margin`: how far past the stage the rings are kept.
 */
export function cartogramGeometry(subject, { project, tileBox, stage, margin }) {
  const { geo, placed } = subject;
  const clip = { x0: -margin, x1: stage.width + margin, y0: -margin, y1: stage.height + margin };

  const byIso = new Map();
  for (const f of geo.features) {
    const iso = f.properties.iso === "-99" ? `-99:${f.properties.name}` : f.properties.iso;
    const held = byIso.get(iso) ?? { iso, rings: [] };
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const cut = clipRing(ring.map(project), clip);
        if (cut.length < 3) continue;
        const kept = [cut[0]];
        for (const p of cut.slice(1)) {
          const q = kept[kept.length - 1];
          if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 1) kept.push(p);
        }
        const xs = kept.map((p) => p[0]);
        const ys = kept.map((p) => p[1]);
        if (kept.length < 3 || (Math.max(...xs) - Math.min(...xs) < 1.5 && Math.max(...ys) - Math.min(...ys) < 1.5)) continue;
        held.rings.push(kept);
      }
    byIso.set(iso, held);
  }
  const pathOf = (rings) => rings.map((ring) => `M${ring.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`).join("");
  /** The box the morph maps onto a tile: the country's drawn extent, cut to the stage. */
  const boxOf = (rings) => {
    const all = rings.flat();
    const pts = all.filter(([x, y]) => x >= 0 && x <= stage.width && y >= 0 && y <= stage.height);
    const use = pts.length ? pts : all;
    const xs = use.map((p) => p[0]);
    const ys = use.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { x: r1(x0), y: r1(y0), w: r1(Math.max(1, Math.max(...xs) - x0)), h: r1(Math.max(1, Math.max(...ys) - y0)) };
  };

  // THE GRID, centred in `tileBox`, as many columns as the grid uses, each cell as non-square as it requires but
  // never beyond 2.5:1 — the static plate's own cap.
  const cols = Math.max(...placed.map((p) => p.col)) + 1;
  const rows = Math.max(...placed.map((p) => p.row)) + 1;
  const cellH = tileBox.h / rows;
  const cellW = Math.min(tileBox.w / cols, cellH * 2.5);
  const gap = Math.max(Math.min(cellW, cellH) * 0.12, 2);
  const gx = tileBox.x + (tileBox.w - (cols * cellW - gap)) / 2;
  const gy = tileBox.y + (tileBox.h - (rows * cellH - gap)) / 2;

  const tiled = new Set(placed.map((p) => p.iso));
  const countries = placed.map((p) => {
    const held = byIso.get(p.iso);
    if (!held || held.rings.length === 0) throw new Error(`${p.iso} has a tile and no shape inside the frame`);
    return { iso: p.iso, path: pathOf(held.rings), rings: held.rings, box: boxOf(held.rings), tile: { x: r1(gx + p.col * cellW), y: r1(gy + p.row * cellH), w: r1(cellW - gap), h: r1(cellH - gap) } };
  });
  const context = [...byIso.values()].filter((c) => !tiled.has(c.iso) && c.rings.length).map((c) => ({ key: c.iso, path: pathOf(c.rings), rings: c.rings }));
  return { countries, context, grid: { cols, rows, cellW, cellH, gap } };
}

// ── carried from proof/scrolly-cartogram-europe-lowcarbon/cartogram-geometry.mjs (zone kit: a beat cannot import
// another proof): the equal-area projection the static plates measure territory in, and `areaOf` ──

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

// ── carried from proof/video-choropleth-europe-lowcarbon/geometry.mjs ──

/** Sutherland–Hodgman: the part of a closed ring inside an axis-aligned box, each crossing cut where the
 *  edge really crosses the box. */
export function clipRing(pts, box) {
  const cut = (a, b, axis, v) => {
    const t = (v - a[axis]) / (b[axis] - a[axis]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const edges = [
    [(p) => p[0] >= box.x0, (a, b) => cut(a, b, 0, box.x0)],
    [(p) => p[0] <= box.x1, (a, b) => cut(a, b, 0, box.x1)],
    [(p) => p[1] >= box.y0, (a, b) => cut(a, b, 1, box.y0)],
    [(p) => p[1] <= box.y1, (a, b) => cut(a, b, 1, box.y1)],
  ];
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
}
