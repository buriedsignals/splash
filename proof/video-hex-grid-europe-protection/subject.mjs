// THE SUBJECT OF `static-hex-grid-europe-protection`, LOADED AND ASSERTED — the static beat's grid checked both ways and
// its three assertions — and the countries' shapes the cells are drawn from, in the frame's own pixels.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { clipRing } from "../video-choropleth-europe-lowcarbon/geometry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-hex-grid-europe-protection");
/** Natural Earth 50 m, the extract the cartogram beats freeze: every cell of this grid has its country in it. */
export const SHAPES = join(HERE, "..", "static-cartogram-europe-lowcarbon", "shapes.geojson");
export const ORIGIN = "UKR";
export const SUBJECT = "CZE";
/** The static beat's grid, unchanged: odd rows offset by half a cell. */
export const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
export const NAMES = { DEU: "Allemagne", CZE: "Tchéquie" };
/** The static beat's rate bornes, per 1 000 inhabitants. */
export const RATE_BREAKS = [5, 12, 18, 25];
/** The count bornes, in people — the video's own, so the count's ramp has as many classes as the rate's. */
export const COUNT_BREAKS = [30000, 60000, 150000, 500000];

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const read = (name) => {
    const lines = readFileSync(join(dir, name), "utf8").trim().split(/\r?\n/);
    const header = lines[0].split(",");
    return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
  };
  const protection = read("protection.csv");
  const people = Object.fromEntries(protection.map((r) => [r.code, Number(r.people)]));
  const inhabitants = Object.fromEntries(read("population.csv").map((r) => [r.code, Number(r.population_2023)]));
  const hosts = protection.map((r) => r.code);
  for (const code of hosts) {
    if (!(people[code] > 0)) throw new Error(`${code} has no usable count`);
    if (!(inhabitants[code] > 0)) throw new Error(`${code} has no population in the frozen file`);
  }
  const rate = (code) => (people[code] / inhabitants[code]) * 1000;
  const cells = [];
  GRID.forEach((row, r) => row.trim().split(/\s+/).forEach((code, c) => code !== "." && cells.push({ code, row: r, col: c })));
  const laidOut = new Set(cells.map((c) => c.code));
  for (const c of cells) if (c.code !== ORIGIN && !hosts.includes(c.code)) throw new Error(`the layout places ${c.code}, which the protection file does not report`);
  for (const code of hosts) if (!laidOut.has(code)) throw new Error(`${code} is reported and has no cell in the layout`);
  if (!laidOut.has(ORIGIN)) throw new Error(`the origin ${ORIGIN} has no cell`);

  const byRate = [...hosts].sort((a, b) => rate(b) - rate(a));
  const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
  if (byRate[0] !== SUBJECT) throw new Error(`the title says ${SUBJECT} leads per inhabitant; ${byRate[0]} does`);
  if (byCount[0] === byRate[0]) throw new Error(`the ranking does not turn over: ${byRate[0]} leads both`);
  const largestRank = byRate.indexOf(byCount[0]) + 1;
  if (!(largestRank > 5)) throw new Error(`the video says the largest host falls a long way per inhabitant; it is ${largestRank}th`);
  const classOf = (v, breaks) => breaks.filter((b) => v >= b).length;
  return {
    cells: cells.map((c) => ({
      ...c,
      origin: c.code === ORIGIN,
      countClass: c.code === ORIGIN ? null : classOf(people[c.code], COUNT_BREAKS),
      rateClass: c.code === ORIGIN ? null : classOf(rate(c.code), RATE_BREAKS),
    })),
    largest: byCount[0],
    largestPeople: people[byCount[0]],
    largestRate: rate(byCount[0]),
    largestRank,
    leader: byRate[0],
    leaderRate: rate(byRate[0]),
    month: protection[0].month,
    hosts: hosts.length,
  };
}

const r1 = (v) => Math.round(v * 10) / 10;
const ringArea = (ring) => Math.abs(ring.reduce((s, p, i) => { const q = ring[(i + 1) % ring.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;

/**
 * THE SHAPES THE CELLS ARE DRAWN FROM, IN STAGE PIXELS, projected with the LIVE MAP'S OWN CAMERA (`project`), so the SVG
 * shape a country morphs from lies where MapLibre fills it when the overlay takes over from the map. Every ring is cut
 * against the stage plus a margin; a ring under a pixel and a half is not drawn.
 *
 * The box a country's morph maps onto its hexagon is its LARGEST ring's — the mainland — so the Azores do not stretch
 * Portugal, nor Jan Mayen Norway; the outlying rings travel with it and fade with the shape. A country too small to draw
 * at this camera (Liechtenstein) keeps its box and no path: its hexagon grows from where it is.
 *
 * @param {{ project: (lonLat: number[]) => number[], stage: {width:number,height:number}, margin: number, codes: string[] }} frame
 */
export function shapesOf({ project, stage, margin, codes, path = SHAPES }) {
  const geo = JSON.parse(readFileSync(path, "utf8"));
  const clip = { x0: -margin, x1: stage.width + margin, y0: -margin, y1: stage.height + margin };
  return Object.fromEntries(
    codes.map((code) => {
      const features = geo.features.filter((f) => f.properties.iso === code);
      if (!features.length) throw new Error(`${code} has a cell and no shape in ${path}`);
      const rings = [];
      let largest = null;
      for (const f of features)
        for (const poly of f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates)
          for (const raw of poly) {
            const cut = clipRing(raw.map(project), clip);
            if (cut.length < 3) continue;
            const a = ringArea(cut);
            if (!largest || a > largest.area) largest = { ring: cut, area: a };
            const kept = [cut[0]];
            for (const p of cut.slice(1)) {
              const q = kept[kept.length - 1];
              if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 1) kept.push(p);
            }
            const xs = kept.map((p) => p[0]);
            const ys = kept.map((p) => p[1]);
            if (kept.length < 3 || (Math.max(...xs) - Math.min(...xs) < 1.5 && Math.max(...ys) - Math.min(...ys) < 1.5)) continue;
            rings.push(kept);
          }
      if (!largest) throw new Error(`${code} has no shape near the frame`);
      const xs = largest.ring.map((p) => p[0]);
      const ys = largest.ring.map((p) => p[1]);
      const x0 = Math.min(...xs);
      const y0 = Math.min(...ys);
      const box = { x: r1(x0), y: r1(y0), w: r1(Math.max(1, Math.max(...xs) - x0)), h: r1(Math.max(1, Math.max(...ys) - y0)) };
      const d = rings.map((ring) => `M${ring.map((p) => `${r1(p[0])} ${r1(p[1])}`).join("L")}Z`).join("");
      return [code, { rings, path: d, box }];
    }),
  );
}
