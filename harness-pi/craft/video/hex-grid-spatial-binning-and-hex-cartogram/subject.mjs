// THE SUBJECT OF `static-hex-grid-europe-protection`, LOADED AND ASSERTED — the static beat's grid checked both ways and
// its three assertions — and the countries' shapes the cells are drawn from, in the frame's own pixels.
//
// Runs in Bun only.

// ZONE KIT COPY of proof/video-hex-grid-europe-protection/subject.mjs. Kept: the designed grid, the second form of every
// code, `shapesOf`. Changed: the data is beat.mjs's rows (a count and a rate per country) instead of the static beat's
// frozen CSVs; a grid country the story does not give is left out (its place kept); the bornes are the beat's; the
// static beat's assertions are beat.mjs's `check()`, except the turn-over the gesture needs (refused here). `clipRing`
// is carried at the end of this file from proof/video-choropleth-europe-lowcarbon/geometry.mjs.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
/** Natural Earth 50 m, the extract the cartogram beats freeze (beside the beat): every cell of this grid has its country in it. */
export const SHAPES = join(HERE, "shapes.geojson");
/** The static beat's grid, unchanged: odd rows offset by half a cell. */
export const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
/**
 * THE SECOND FORM OF EVERY CODE — ISO 3166-1 alpha-2, the same standard as the alpha-3 the layout is written in.
 * A cell names its country by its code, and how much of a code a cell can hold is a measurement of the frame: a
 * landscape hexagon is 131px wide and holds « BGR » at the axis size, a square or portrait one is 92–110px and
 * the widest alpha-3 wants 96px of the 86px a cell keeps free (measured 2026-09-24). So the code is a LADDER of
 * two filed forms, not one string, and the frame that cannot keep the third letter drops to the form that keeps
 * the country — never to a letter under the type floor.
 */
export const ALPHA2 = {
  ISL: "IS", NOR: "NO", SWE: "SE", FIN: "FI", IRL: "IE", DNK: "DK", EST: "EE", LVA: "LV", NLD: "NL", DEU: "DE",
  POL: "PL", LTU: "LT", UKR: "UA", BEL: "BE", LUX: "LU", CHE: "CH", CZE: "CZ", SVK: "SK", HUN: "HU", ROU: "RO",
  PRT: "PT", ESP: "ES", FRA: "FR", LIE: "LI", AUT: "AT", SVN: "SI", HRV: "HR", BGR: "BG", MLT: "MT", ITA: "IT",
  GRC: "GR", CYP: "CY",
};

/** The countries the grid holds (ISO alpha-3), in reading order. */
export const gridCodes = () => GRID.flatMap((row) => row.trim().split(/\s+/).filter((c) => c !== "."));

const n = (v) => String(+Number(v).toPrecision(4));
const rising = (b) => Array.isArray(b) && b.length >= 2 && b.length <= 5 && b.every((x, i) => typeof x === "number" && Number.isFinite(x) && (i === 0 || x > b[i - 1]));

/**
 * What the data says, before any claim is checked: the join onto the grid, both rankings.
 * @returns {{ reading, helpers }} `helpers` is what beat.mjs's `check(map)` receives.
 */
export function readingOf(beat) {
  const codes = gridCodes();
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("beat.mjs: rows must be a non-empty array of { iso, name, count, rate }");
  const off = beat.rows.filter((r) => !codes.includes(r.iso)).map((r) => JSON.stringify(r.iso));
  if (off.length) throw new Error(`rows carry codes the grid has no cell for: ${off.join(", ")} — the grid holds ${codes.join(" ")} (ISO alpha-3)`);
  const ORIGIN = beat.origin ?? null;
  if (ORIGIN !== null && !codes.includes(ORIGIN)) throw new Error(`origin is ${JSON.stringify(ORIGIN)}: the ISO alpha-3 code of a grid country drawn hollow and in no class (UKR), or null for none`);
  const people = {};
  const rateOf = {};
  const names = {};
  for (const r of beat.rows) {
    if (r.iso in people) throw new Error(`rows hold ${r.iso} twice: keep ONE row per country (filter data.json to one month / one series)`);
    if (r.iso === ORIGIN) throw new Error(`rows hold the origin ${r.iso}: it is drawn hollow and in no class — leave it out of rows`);
    for (const field of ["count", "rate"])
      if (!(typeof r[field] === "number" && Number.isFinite(r[field]) && r[field] > 0)) throw new Error(`the row for ${r.iso} has ${field} ${JSON.stringify(r[field])}: a number above 0 (leave out a country with none)`);
    if (typeof r.name !== "string" || !r.name.trim()) throw new Error(`the row for ${r.iso} has no name: give every row the country's name in the story's language`);
    people[r.iso] = r.count;
    rateOf[r.iso] = r.rate;
    names[r.iso] = r.name;
  }
  const hosts = beat.rows.map((r) => r.iso);
  if (hosts.length < 4) throw new Error(`only ${hosts.length} rows: the video re-ranks a field of countries and needs at least four`);
  const byRate = [...hosts].sort((a, b) => rateOf[b] - rateOf[a]);
  const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
  const row = (iso, i) => ({ iso, name: names[iso], count: people[iso], rate: rateOf[iso], rank: i + 1 });
  const helpers = {
    byCount: byCount.map(row),
    byRate: byRate.map(row),
    largest: row(byCount[0], byRate.indexOf(byCount[0])),
    leader: row(byRate[0], 0),
    largestRateRank: byRate.indexOf(byCount[0]) + 1,
  };
  return { reading: { people, rateOf, names, hosts, byRate, byCount, ORIGIN }, helpers };
}

/**
 * What the choreography can show, or a refusal: the ranking must turn over (the largest by count is not the first by
 * rate), and the two sets of bornes must cut as many classes.
 * @returns the shape the proof's `loadSubject` returned, plus the bornes and the names
 */
export function subjectOf({ people, rateOf, names, hosts, byRate, byCount, ORIGIN }, beat) {
  if (byCount[0] === byRate[0])
    throw new Error(`${names[byRate[0]]} leads by count AND by rate: the video re-ranks the same countries from the count to the rate and rings the new leader, so the ranking must turn over — this video cannot tell this story (choose the static or web format)`);
  const countBreaks = beat.countBreaks;
  const rateBreaks = beat.rateBreaks;
  if (!rising(countBreaks)) throw new Error(`countBreaks is ${JSON.stringify(countBreaks)}: give 2 to 5 rising numbers, the class limits of the count`);
  if (!rising(rateBreaks)) throw new Error(`rateBreaks is ${JSON.stringify(rateBreaks)}: give 2 to 5 rising numbers, the class limits of the rate`);
  if (countBreaks.length !== rateBreaks.length)
    throw new Error(`countBreaks has ${countBreaks.length} limits and rateBreaks ${rateBreaks.length}: the two measures are drawn on one ramp, so they must cut as many classes — give both the same number of limits`);
  const cells = [];
  GRID.forEach((line, r) => line.trim().split(/\s+/).forEach((code, c) => code !== "." && (code === ORIGIN || code in people) && cells.push({ code, row: r, col: c })));
  const classOf = (v, breaks) => breaks.filter((b) => v >= b).length;
  const largestRank = byRate.indexOf(byCount[0]) + 1;
  return {
    cells: cells.map((c) => ({
      ...c,
      origin: c.code === ORIGIN,
      countClass: c.code === ORIGIN ? null : classOf(people[c.code], countBreaks),
      rateClass: c.code === ORIGIN ? null : classOf(rateOf[c.code], rateBreaks),
    })),
    largest: byCount[0],
    largestPeople: people[byCount[0]],
    largestRate: rateOf[byCount[0]],
    largestRank,
    leader: byRate[0],
    leaderRate: rateOf[byRate[0]],
    hosts: hosts.length,
    countBreaks,
    rateBreaks,
    names,
    smallest: n(Math.min(...hosts.map((h) => people[h]))),
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
