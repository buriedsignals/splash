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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { areaOf, laea } from "../scrolly-cartogram-europe-lowcarbon/cartogram-geometry.mjs";
import { clipRing } from "../video-choropleth-europe-lowcarbon/geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-cartogram-europe-lowcarbon");
export const YEAR = 2024;
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];

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
/** The map's window, [west, south, east, north]: Europe as the grid names it (the scrolly's own). */
export const WINDOW = [-25, 34, 50, 72];
export const BREAKS = [40, 60, 75, 94];
/** The claim: the two readings are this far apart at least (the static plate's own refusal). */
export const GAP_FLOOR = 15;

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const share = new Map();
  for (const line of csv.slice(1)) {
    const raw = Object.fromEntries(header.map((h, i) => [h, line.split(",")[i]]));
    if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
    const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
    const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
    share.set(raw.code, total > 0 ? (clean / total) * 100 : null);
  }

  // THE GRID AND THE DATA HAVE TO AGREE, BOTH WAYS.
  const placed = [];
  GRID.forEach((line, row) =>
    line.trim().split(/\s+/).forEach((code, col) => {
      if (code === "..") return;
      if (!share.has(code)) throw new Error(`the grid places ${code} and the data has no such code`);
      placed.push({ iso: code, col, row });
    }),
  );
  const missingFromGrid = [...share.keys()].filter((c) => !placed.some((p) => p.iso === c));
  if (missingFromGrid.length) throw new Error(`the data has ${missingFromGrid.join(", ")} and the grid has no tile for them`);

  const geo = JSON.parse(readFileSync(join(dir, "shapes.geojson"), "utf8"));
  const area = {};
  for (const f of geo.features) area[f.properties.iso] = (area[f.properties.iso] ?? 0) + areaOf(f);

  // THE CLAIM, ASSERTED — the static beat's own two checks.
  const withData = [...share.entries()].filter(([, v]) => v !== null);
  const byCountry = withData.reduce((s, [, v]) => s + v, 0) / withData.length;
  const areaSum = withData.reduce((s, [c]) => s + (area[c] ?? 0), 0);
  const byArea = withData.reduce((s, [c, v]) => s + v * (area[c] ?? 0), 0) / areaSum;
  if (!(byCountry - byArea > GAP_FLOOR))
    throw new Error(`the title says the two readings are twenty points apart; they are ${(byCountry - byArea).toFixed(1)} (${byCountry.toFixed(1)} by country, ${byArea.toFixed(1)} by area)`);
  const widest = withData.reduce((a, b) => ((area[b[0]] ?? 0) > (area[a[0]] ?? 0) ? b : a))[0];
  if (!(share.get(widest) < byCountry))
    throw new Error(`the video names the largest country as below the country mean; ${widest} is at ${share.get(widest).toFixed(1)} against ${byCountry.toFixed(1)}`);
  const widestShare = ((area[widest] ?? 0) / areaSum) * 100;
  const unreported = [...share.entries()].filter(([, v]) => v === null).map(([c]) => c);
  if (unreported.length !== 1) throw new Error(`the key names one country with no reading; there are ${unreported.length}`);
  const classOf = (v) => (v === null ? null : BREAKS.filter((b) => v >= b).length);

  return { share, placed, geo, area, byCountry, byArea, widest, widestShare, unreported, classOf, BREAKS };
}

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * THE MAP AND THE TILES, IN STAGE PIXELS.
 *
 * @param {ReturnType<typeof loadSubject>} subject
 * @param {{ mapBox: {x:number,y:number,w:number,h:number}, tileBox: {x:number,y:number,w:number,h:number},
 *           stage: {width:number,height:number}, margin: number }} frame
 *   `mapBox`: where the window is fitted (the map runs past it to the frame's edges); `tileBox`: where the grid is
 *   centred; `margin`: how far past the stage the rings are kept.
 */
export function cartogramGeometry(subject, { mapBox, tileBox, stage, margin }) {
  const { geo, placed } = subject;
  const [west, south, east, north] = WINDOW;
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
      for (const ring of poly) for (const [lon, lat] of ring) if (lon >= west && lon <= east && lat >= south && lat <= north) inBox.push(laea(lon, lat));
  const minY = Math.min(...inBox.map((p) => p[1]));
  const maxY = Math.max(...inBox.map((p) => p[1]));
  const scale = Math.min(mapBox.w / (maxX - minX), mapBox.h / (maxY - minY));
  const offX = mapBox.x + (mapBox.w - (maxX - minX) * scale) / 2;
  const offY = mapBox.y + (mapBox.h - (maxY - minY) * scale) / 2;
  const toStage = ([x, y]) => [offX + (x - minX) * scale, offY + (y - minY) * scale];
  const clip = { x0: -margin, x1: stage.width + margin, y0: -margin, y1: stage.height + margin };

  const byIso = new Map();
  for (const f of geo.features) {
    const iso = f.properties.iso === "-99" ? `-99:${f.properties.name}` : f.properties.iso;
    const held = byIso.get(iso) ?? { iso, rings: [] };
    for (const poly of f.geometry.coordinates)
      for (const ring of poly) {
        const cut = clipRing(ring.map(([lon, lat]) => toStage(laea(lon, lat))), clip);
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
