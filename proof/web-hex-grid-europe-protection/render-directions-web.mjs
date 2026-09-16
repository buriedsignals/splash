// twin/proof/web-hex-grid-europe-protection/render-directions-web.mjs
//
// Ukrainians under temporary protection per 1 000 inhabitants, one hexagon per host country.
// Rendered once per FILED DIRECTION into a self-contained interactive page whose marks are MapLibre
// layers over MapTiler's own tiles — the pattern the owner validated on
// `proof/web-choropleth-europe-lowcarbon/` on 2026-09-15.
//
// THE LAYOUT IS DESIGNED, NOT DERIVED, and the page says so. It is CHECKED BOTH WAYS: every code in
// the layout has a reading and every reading has a cell.
//
// THE GRID IS BUILT IN WEB MERCATOR METRES and unprojected to lon/lat, which is the one thing that
// keeps thirty-two congruent hexagons congruent on the screen. A grid laid out in DEGREES would be
// drawn taller in the north than in the south, and six equal edges is the whole purchase of the type.
//
// WHAT THE WEB ADDS is the GRAIN: over how many cells a cell adds up its own numerator and its own
// denominator before it divides. `skills/map-web/assets/pool.ts` is the vocabulary,
// `skills/map-web/assets/live-hex.ts` is the live layer, and `BRIEF.md` argues both.
//
// Usage:  bun proof/web-hex-grid-europe-protection/render-directions-web.mjs

import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture, measureText } from "#shared/chart-beat/render-still.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces } from "#shared/design-base/web.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { MAP_DRAWING_SHARE, renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import {
  assertOnePool,
  assertPoolDeclaration,
  poolFiguresForMarkup,
  poolPartitionOf,
  poolSlugOf,
  pooledValues,
} from "../../skills/map-web/assets/pool.ts";
import {
  NOTO_SENTINEL_BYTES,
  assertPoolReachesTheLayers,
  liveHexPlan,
  liveHexScript,
} from "../../skills/map-web/assets/live-hex.ts";
import { DirectedHexGridWeb, POOL_MS, hexRamp } from "./DirectedHexGridWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK_DIR = join(HERE, "fallback");
const EYEBROW = "Migrations · Europe";
const ORIGIN = "UKR";
const RADIUS = 44;
const BREAKS = [5, 10, 20, 30];
const PAD = 3;
/** The published MapTiler style. One style for the three directions, repainted in each direction's
 *  own two tints by `style.mjs` — `the-basemap-gives-up-its-contrast` cannot be satisfied by picking
 *  between two published styles, so the geography is MapTiler's and the palette is the beat's. */
const MAP_STYLE = "dataviz-light";
/** THE REVIEW WINDOW, and the stage it leaves. The owner judges at 1512 x 860; the format's figure
 *  caps at the window, so the map box is the full figure width and whatever height the header, the
 *  control, the key and the notes leave. Measured on the validated pattern: 1464 x 519,6. */
const REVIEW_WINDOW = { width: 1512, height: 860, scale: 2 };
const STAGE = { width: 1464, height: 520 };

/** This beat's own copy of the designed layout — odd rows offset by half a cell, which is what makes
 *  every neighbour an EDGE neighbour. Duplicated rather than imported from the static sibling: a
 *  beat renders on its own. */
const GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie",
  SVK: "Slovaquie", NLD: "Pays-Bas", IRL: "Irlande", BEL: "Belgique", AUT: "Autriche",
  NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande", PRT: "Portugal",
  FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie",
  ISL: "Islande", LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein", UKR: "Ukraine",
};

/** THE THIRD GRAIN'S BLOCKS, named the way a reader already holds Europe. They are an EDITORIAL
 *  partition and the page says so: the point of the control is precisely that a grouping is a choice
 *  somebody made. Checked both ways below. */
const REGIONS = {
  Nordiques: ["ISL", "NOR", "SWE", "FIN", "DNK"],
  Baltes: ["EST", "LVA", "LTU"],
  "Europe centrale": ["DEU", "POL", "CZE", "SVK", "AUT", "HUN", "SVN"],
  "Europe de l'Ouest": ["IRL", "NLD", "BEL", "LUX", "CHE", "FRA", "LIE"],
  "Europe du Sud": ["PRT", "ESP", "ITA", "MLT", "GRC", "CYP", "HRV"],
  "Europe du Sud-Est": ["ROU", "BGR"],
};

const plain = (s) => plainSpaces(s);
const fr = (v, d = 1) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const count = (v) => plain(Math.round(v).toLocaleString("fr-FR"));

const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const protection = await readCsv("protection.csv");
const population = await readCsv("population.csv");
const people = Object.fromEntries(protection.map((r) => [r.code, Number(r.people)]));
const inhabitants = Object.fromEntries(population.map((r) => [r.code, Number(r.population_2023)]));
const month = protection[0].month;

const hosts = protection.map((r) => r.code);
for (const code of hosts) {
  if (!Number.isFinite(people[code]) || people[code] <= 0) throw new Error(`${code} has no usable count`);
  if (!Number.isFinite(inhabitants[code]) || inhabitants[code] <= 0)
    throw new Error(`${code} has no population in the frozen file`);
}
const rate = (code) => (people[code] / inhabitants[code]) * 1000;

// ── the layout, checked both ways ──────────────────────────────────────────────────────────────
const seats = [];
GRID.forEach((row, r) =>
  row.trim().split(/\s+/).forEach((code, c) => {
    if (code !== ".") seats.push({ code, row: r, col: c });
  }),
);
const laidOut = new Set(seats.map((s) => s.code));
for (const s of seats) {
  if (!NAMES[s.code]) throw new Error(`${s.code} sits in the layout and has no French name filed`);
  if (s.code !== ORIGIN && !hosts.includes(s.code))
    throw new Error(`${s.code} sits in the layout and has no reading`);
}
for (const code of hosts)
  if (!laidOut.has(code)) throw new Error(`${NAMES[code] ?? code} has a reading and no cell in the layout`);

// ── the blocks, checked both ways as well ─────────────────────────────────────────────────────
const regionOf = {};
for (const [name, members] of Object.entries(REGIONS))
  for (const code of members) {
    if (!hosts.includes(code)) throw new Error(`the block ${JSON.stringify(name)} names ${code}, which has no reading`);
    if (regionOf[code]) throw new Error(`${code} sits in two blocks: ${regionOf[code]} and ${name}`);
    regionOf[code] = name;
  }
for (const code of hosts)
  if (!regionOf[code])
    throw new Error(
      `${NAMES[code]} has a reading and sits in no block. A grain that leaves a cell out sets its ` +
        `colour by no rule, so it would keep the one the state before it painted.`,
    );

// ── THE CLAIM, ASSERTED ───────────────────────────────────────────────────────────────────────
const byRate = [...hosts].sort((a, b) => rate(b) - rate(a));
const byCount = [...hosts].sort((a, b) => people[b] - people[a]);
if (byRate[0] === byCount[0])
  throw new Error(`the pair has nothing to show: ${NAMES[byRate[0]]} leads both rankings`);
const subject = byRate[0];
const biggest = byCount[0];
console.log(
  `${hosts.length} pays d'accueil · par habitant : ${NAMES[subject]} ${fr(rate(subject))} pour 1 000 · ` +
    `en nombre : ${NAMES[biggest]} ${count(people[biggest])} (${fr(rate(biggest))} pour 1 000, ` +
    `${byRate.indexOf(biggest) + 1}e) · dernier ${NAMES[byRate[byRate.length - 1]]} ` +
    `${fr(rate(byRate[byRate.length - 1]))}\n`,
);

const klassOf = (v) => {
  let i = 0;
  while (i < BREAKS.length && v >= BREAKS[i]) i += 1;
  return i;
};
const klassLabel = (i) =>
  i === 0 ? `moins de ${BREAKS[0]}` : i === BREAKS.length ? `${BREAKS[BREAKS.length - 1]} et plus` : `${BREAKS[i - 1]}–${BREAKS[i]}`;
const classes = Array.from({ length: BREAKS.length + 1 }, (_, i) => ({ label: klassLabel(i) }));

// ── the grid, in its own units, derived from what the cells actually occupy ───────────────────
const DX = RADIUS * Math.sqrt(3);
const DY = RADIUS * 1.5;
const HALF_W = DX / 2;
const rawX = (s) => s.col * DX + (s.row % 2 ? HALF_W : 0);
const rawY = (s) => s.row * DY;
const minX = Math.min(...seats.map((s) => rawX(s) - HALF_W));
const maxX = Math.max(...seats.map((s) => rawX(s) + HALF_W));
const minY = Math.min(...seats.map((s) => rawY(s) - RADIUS));
const maxY = Math.max(...seats.map((s) => rawY(s) + RADIUS));
const gridW = Number((maxX - minX + PAD * 2).toFixed(2));
const gridH = Number((maxY - minY + PAD * 2).toFixed(2));
const centreOf = (s) => ({
  cx: Number((rawX(s) - minX + PAD).toFixed(2)),
  cy: Number((rawY(s) - minY + PAD).toFixed(2)),
});
for (const s of seats) {
  const { cx, cy } = centreOf(s);
  if (cx - HALF_W < 0 || cx + HALF_W > gridW || cy - RADIUS < 0 || cy + RADIUS > gridH)
    throw new Error(`${NAMES[s.code]}'s hexagon runs outside the ${gridW} x ${gridH} grid box.`);
}

// ── THE GRID, PLACED ON THE EARTH — in Web Mercator METRES, never in degrees ──────────────────
//
// A hex cartogram has no geography: its geometry IS the data. But the pattern the owner validated
// draws every mark as a MapLibre layer over MapTiler's tiles, so the grid has to be handed over as
// lon/lat. Building it in METRES and unprojecting is what keeps the thirty-two cells congruent: one
// degree of latitude is NOT one degree of longitude on a Mercator screen, and a grid laid out in
// degrees would be stretched taller in the north — six equal edges is the whole purchase of this
// type, so it is the one thing that may not be traded for convenience.
//
// The anchor is a SEATING, not a geolocation, and the page says so: the grid sits over Europe
// because the layout is arranged like Europe, and the real coastline showing around it is exactly
// what the type sheet says a cartogram gives up.
const EARTH_R = 6378137;
const ANCHOR = { lon: 14.5, lat: 53.5 };
/** Metres of Web Mercator per grid unit, chosen so the grid spans a Europe-sized box (~57° of
 *  longitude). One number, and every cell is the same size in metres by construction. */
const M_PER_UNIT = 8700;
const mercX = (lon) => (EARTH_R * lon * Math.PI) / 180;
const mercY = (lat) => EARTH_R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const lonOf = (x) => (x / EARTH_R) * (180 / Math.PI);
const latOf = (y) => (2 * Math.atan(Math.exp(y / EARTH_R)) - Math.PI / 2) * (180 / Math.PI);
const X0 = mercX(ANCHOR.lon) - (gridW / 2) * M_PER_UNIT;
const Y0 = mercY(ANCHOR.lat) + (gridH / 2) * M_PER_UNIT;
const geo = (cx, cy) => [
  Number(lonOf(X0 + cx * M_PER_UNIT).toFixed(6)),
  Number(latOf(Y0 - cy * M_PER_UNIT).toFixed(6)),
];
const STUDY = {
  west: geo(0, 0)[0],
  east: geo(gridW, 0)[0],
  north: geo(0, 0)[1],
  south: geo(0, gridH)[1],
};
const vertexOf = (cx, cy, i) => {
  const a = (Math.PI / 180) * (60 * i - 30);
  return [cx + RADIUS * Math.cos(a), cy + RADIUS * Math.sin(a)];
};
const ringOf = (s) => {
  const { cx, cy } = centreOf(s);
  const ring = Array.from({ length: 6 }, (_, i) => geo(...vertexOf(cx, cy, i)));
  return [...ring, ring[0]];
};
console.log(
  `grille ${gridW} x ${gridH} unités · ${seats.length} hexagones · fenêtre ` +
    `${fr(STUDY.west, 2)}°..${fr(STUDY.east, 2)}° E, ${fr(STUDY.south, 2)}°..${fr(STUDY.north, 2)}° N\n`,
);

// ── WHAT MERCATOR COSTS THIS SUBJECT, measured on the grid this page really draws ─────────────
//
// The cells are equal ON THE SCREEN by construction — they are equal in Mercator metres. What is not
// equal is the GROUND under them: a Mercator map inflates area by 1/cos²(lat), so the seat at the
// top of the grid stands over less real land than the seat at the bottom, by a factor this beat
// measures and prints rather than buries.
const centreLat = (s) => geo(centreOf(s).cx, centreOf(s).cy)[1];
const northSeat = seats.reduce((a, s) => (centreLat(s) > centreLat(a) ? s : a));
const southSeat = seats.reduce((a, s) => (centreLat(s) < centreLat(a) ? s : a));
const inflate = (lat) => 1 / Math.cos((lat * Math.PI) / 180);
const MERCATOR_COST = (inflate(centreLat(northSeat)) / inflate(centreLat(southSeat))) ** 2;
const mercatorNote = plain(
  `Carte MapTiler plate, en Web Mercator : les cases restent rigoureusement égales — elles sont ` +
    `construites en mètres de Mercator, c'est l'achat du type — mais la terre sous elles ne l'est ` +
    `pas. Sous la case la plus au nord (${NAMES[northSeat.code]}, ${fr(centreLat(northSeat))}° N) ` +
    `le sol est dessiné ${fr(MERCATOR_COST)} fois plus grand que sous la plus au sud ` +
    `(${NAMES[southSeat.code]}, ${fr(centreLat(southSeat))}° N).`,
);
console.log(`${mercatorNote}\n`);

// ── the grain ─────────────────────────────────────────────────────────────────────────────────
const EDGE_DIRS = {
  even: [[0, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0]],
  odd: [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0], [-1, 1]],
};
const seatAt = new Map(seats.map((s) => [`${s.row},${s.col}`, s]));
const neighbourAcross = (s, edge) => {
  const [dr, dc] = EDGE_DIRS[s.row % 2 ? "odd" : "even"][edge];
  return seatAt.get(`${s.row + dr},${s.col + dc}`) ?? null;
};
const seatOf = new Map(seats.map((s) => [s.code, s]));
const neighbourhoodOf = (code) => {
  const s = seatOf.get(code);
  const out = [code];
  for (let edge = 0; edge < 6; edge += 1) {
    const n = neighbourAcross(s, edge);
    if (n && n.code !== ORIGIN) out.push(n.code);
  }
  return out;
};

const pool = {
  label: plain("À quelle échelle la case met sa valeur en commun"),
  unit: plain("pour 1 000 habitants"),
  scale: 1000,
  breaks: BREAKS,
  cells: hosts.map((code) => ({ key: code, numerator: people[code], denominator: inhabitants[code] })),
  grains: [
    {
      key: "pays",
      label: plain("le pays"),
      announce: plain("Chaque case mesure le pays, et le pays seul — le pays"),
      note: null,
      windows: hosts.map((code) => ({ cell: code, with: [code] })),
    },
    {
      key: "voisinage",
      label: plain("le voisinage"),
      announce: plain("Chaque case est mise en commun avec ses voisines par une arête — le voisinage"),
      note: null,
      windows: hosts.map((code) => ({ cell: code, with: neighbourhoodOf(code) })),
    },
    {
      key: "region",
      label: plain("la région"),
      announce: plain("Chaque case prend le taux de son bloc régional — la région"),
      note: null,
      windows: hosts.map((code) => ({ cell: code, with: REGIONS[regionOf[code]] })),
    },
  ],
};

const classesUnder = (grain) => {
  const values = pooledValues(pool, grain);
  return new Map([...values].map(([k, v]) => [k, klassOf(v)]));
};
const baseClasses = classesUnder(pool.grains[0]);
const movedUnder = (grain) =>
  [...baseClasses.keys()].filter((k) => classesUnder(grain).get(k) !== baseClasses.get(k)).length;
const valueUnder = (grain, code) => pooledValues(pool, grain).get(code);
const hoodMoved = movedUnder(pool.grains[1]);
const regionMoved = movedUnder(pool.grains[2]);
const swing = [...hosts]
  .map((code) => ({ code, from: rate(code), to: valueUnder(pool.grains[1], code) }))
  .sort((a, b) => Math.abs(b.to - b.from) - Math.abs(a.to - a.from))[0];
const swingNeighbour = neighbourhoodOf(swing.code)
  .filter((c) => c !== swing.code)
  .sort((a, b) => inhabitants[b] - inhabitants[a])[0];
const widestBlock = Object.keys(REGIONS)
  .map((name) => {
    const pooledRate = valueUnder(pool.grains[2], REGIONS[name][0]);
    const mean = REGIONS[name].reduce((a, c) => a + rate(c), 0) / REGIONS[name].length;
    return { name, pooledRate, mean, gap: Math.abs(mean - pooledRate) };
  })
  .sort((a, b) => b.gap - a.gap)[0];
const wholeRate = (hosts.reduce((a, c) => a + people[c], 0) / hosts.reduce((a, c) => a + inhabitants[c], 0)) * 1000;
const meanOfRates = hosts.reduce((a, c) => a + rate(c), 0) / hosts.length;

pool.grains[1].note = plain(
  `Chaque case additionne ses personnes et ses habitants avec ceux de ses voisines par une arête, ` +
    `puis divise : ${hoodMoved} cases sur ${hosts.length} changent de classe. ` +
    `${NAMES[swing.code]} passe de ${fr(swing.from)} à ${fr(swing.to)} pour 1 000, parce que ses ` +
    `${count(inhabitants[swing.code])} habitants sont mis en commun avec les ` +
    `${count(inhabitants[swingNeighbour])} de ${NAMES[swingNeighbour]}, assis à côté ` +
    `de lui DANS LE DESSIN. Un voisinage n'est pas un découpage : les fenêtres se recouvrent, donc ` +
    `il n'y a aucun bloc à contourner ici.`,
);
pool.grains[2].note = plain(
  `Les blocs sont ${Object.keys(REGIONS).length} ensembles de pays nommés à la main — ` +
    `${Object.keys(REGIONS).join(", ")} — et chaque bloc divise la somme de ses personnes par la ` +
    `somme de ses habitants, si bien que toutes ses cases affichent le MÊME chiffre. Le trait épais ` +
    `tombe partout où deux cases voisines ne sont pas dans le même bloc : ${regionMoved} cases sur ` +
    `${hosts.length} changent de classe. ` +
    `${widestBlock.name} tombe à ${fr(widestBlock.pooledRate)} quand la moyenne des taux de ses ` +
    `${REGIONS[widestBlock.name].length} membres est ${fr(widestBlock.mean)} : le quotient des ` +
    `sommes n'est pas la moyenne des quotients, et c'est ce que coûte un découpage.`,
);

assertPoolDeclaration(pool, hosts, { where: "web-hex-grid-europe-protection", changeFloor: 4 });

console.log(
  `grains · ${pool.grains
    .map((g) => `${g.label}: ${new Set(classesUnder(g).values()).size} classes`)
    .join(" · ")} · voisinage bouge ${hoodMoved}/${hosts.length}, région ${regionMoved}/${hosts.length}`,
);
console.log(
  `toute l'Europe mise en commun : ${fr(wholeRate)} pour 1 000, moyenne des ${hosts.length} taux : ` +
    `${fr(meanOfRates)}\n`,
);

// ── the block outline, as lon/lat segments tagged with their grain ────────────────────────────
//
// A SEAM IS A WALL BETWEEN TWO NEIGHBOURS, NEVER A BOX AROUND ONE GROUP — and that is a correction,
// made by looking at the delivered page. The owner opened `la région` and wrote « je comprends pas le
// filtre la région qui met des bouts d'encadrés ».
//
// He was right and the cause is geometry, not drawing. MEASURED on this layout: the six named blocks
// fall into **nine connected pieces** — `Nordiques` is ISL alone plus NOR+DNK+SWE+FIN, and
// `Europe du Sud` is PRT+ESP, ITA+MLT and GRC+HRV+CYP — so there is no union to put ONE outline
// around, and MapLibre cannot dissolve what is not connected. Outlining each piece drew nine
// free-standing boxes for six groupings, which is exactly the false reading the owner got.
//
// Of the 128 segments that shipped, **61 lay on an edge with NO neighbour at all** — the outer rim of
// the grid. Those are the ones that closed a shape into a box. They are dropped: a seam is drawn only
// where two ADJACENT cells are NOT pooled together (67 segments), so the heavy line always separates
// two things a reader can see, and a lone cell like ISL is never ringed on its own. What ties the
// scattered pieces of one block together is then what it always was and what a reader can read: every
// member of a block carries the SAME pooled number and therefore the same fill.
//
// A grain that is a MOVING WINDOW rather than a partition has no such edge set at all — the windows
// overlap — and `poolPartitionOf` says so by returning `null`. Every grain's segments live in ONE
// source and it is `line-opacity` that moves, so the feature set never changes between states.
const seamFeatures = [];
for (const grain of pool.grains) {
  const partition = poolPartitionOf(grain);
  const slug = poolSlugOf(grain.key);
  if (!partition) continue;
  const blockOf = (code) => partition.get(code) ?? null;
  for (const s of seats) {
    const mine = blockOf(s.code);
    if (mine === null || grain.windows.find((w) => w.cell === s.code).with.length < 2) continue;
    const { cx, cy } = centreOf(s);
    for (let edge = 0; edge < 6; edge += 1) {
      const n = neighbourAcross(s, edge);
      // NO NEIGHBOUR, NO WALL. An edge on the outer rim has nothing on its far side, so a line there
      // says nothing about a grouping — it only closes the shape into a box.
      if (!n || blockOf(n.code) === mine) continue;
      seamFeatures.push({
        grain: slug,
        line: [geo(...vertexOf(cx, cy, edge)), geo(...vertexOf(cx, cy, edge + 1))],
      });
    }
  }
}
/** EVERY SEAM SEPARATES TWO DRAWN CELLS, and nothing else. The refusal is the regression guard for
 *  the defect the owner found: a segment on an edge with no far side is a box, and a box around one
 *  piece of a block that has three pieces teaches a reader that the piece IS the grouping. */
const seamKeys = new Set();
for (const s of seats)
  for (let edge = 0; edge < 6; edge += 1)
    if (neighbourAcross(s, edge)) {
      const [a, b] = [vertexOf(centreOf(s).cx, centreOf(s).cy, edge), vertexOf(centreOf(s).cx, centreOf(s).cy, edge + 1)];
      seamKeys.add([geo(...a), geo(...b)].flat().map((v) => v.toFixed(5)).sort().join("|"));
    }
for (const feature of seamFeatures)
  if (!seamKeys.has(feature.line.flat().map((v) => v.toFixed(5)).sort().join("|")))
    throw new Error(
      `a block seam is drawn on an edge that has no cell on its far side. A seam is a WALL between ` +
        `two neighbours; on the outer rim it is a BOX around one group — and the owner refused ` +
        `exactly that (« des bouts d'encadrés »), because six blocks fall into nine connected ` +
        `pieces here and a box around a piece reads as the grouping itself.`,
    );
const piecesOf = (members) => {
  const set = new Set(members);
  const seen = new Set();
  let pieces = 0;
  for (const code of members) {
    if (seen.has(code)) continue;
    pieces += 1;
    const stack = [code];
    seen.add(code);
    while (stack.length) {
      const cur = stack.pop();
      for (let edge = 0; edge < 6; edge += 1) {
        const n = neighbourAcross(seatOf.get(cur), edge);
        if (n && set.has(n.code) && !seen.has(n.code)) {
          seen.add(n.code);
          stack.push(n.code);
        }
      }
    }
  }
  return pieces;
};
const BLOCK_PIECES = Object.values(REGIONS).reduce((a, m) => a + piecesOf(m), 0);
console.log(
  `contours · ${pool.grains
    .map((g) => {
      const slug = poolSlugOf(g.key);
      const n = seamFeatures.filter((f) => f.grain === slug).length;
      return `${slug}: ${n ? `${n} murs entre deux cases` : "aucun (une fenêtre n'a pas de frontière)"}`;
    })
    .join(" · ")} · ${Object.keys(REGIONS).length} blocs en ${BLOCK_PIECES} morceaux connexes\n`,
);

// ── the cells ─────────────────────────────────────────────────────────────────────────────────
const cells = seats.map((s) => {
  const isOrigin = s.code === ORIGIN;
  const figures = isOrigin
    ? pool.grains.map((g, i) => ({ slug: poolSlugOf(g.key), text: plain("origine"), klass: 0, isDefault: i === 0 }))
    : poolFiguresForMarkup(pool, s.code, (v) => fr(v));
  return {
    code: s.code,
    name: NAMES[s.code],
    isOrigin,
    ring: ringOf(s),
    figures,
    people: isOrigin ? plain("—") : count(people[s.code]),
    detail: isOrigin
      ? plain(
          `${NAMES[s.code]} · pays d'origine — la carte compte les personnes qui en sont parties, pas ` +
            `celles qui y sont, et aucun regroupement ne l'inclut`,
        )
      : plain(
          `${NAMES[s.code]} · seul ${fr(rate(s.code))} pour 1 000 · avec ses voisines ` +
            `${fr(valueUnder(pool.grains[1], s.code))} · ${regionOf[s.code]} ` +
            `${fr(valueUnder(pool.grains[2], s.code))} · ${count(people[s.code])} personnes pour ` +
            `${count(inhabitants[s.code])} habitants · ` +
            `${byRate.indexOf(s.code) + 1}e par habitant, ${byCount.indexOf(s.code) + 1}e en nombre absolu`,
        ),
  };
});

const facts = beatFacts(
  hosts.map((c) => ({ key: c, label: NAMES[c], value: rate(c) })),
  {
    subject: NAMES[subject],
    declaredSequence: "pour 1 000 habitants",
    units: { count: hosts.length, thing: "un pays" },
    interaction: { controls: 2, readerParameter: true },
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ") || "(none)"}\n`);

// ── the words ─────────────────────────────────────────────────────────────────────────────────
const title = `Par habitant, ce n'est pas l'${NAMES[biggest]} : la ${NAMES[subject]} accueille ${fr(rate(subject))} Ukrainiens pour 1 000 habitants`;
const caveat =
  `Une case par pays d'accueil, toutes de la même taille : la carte abandonne la surface et achète ` +
  `ce qu'un choroplèthe des mêmes données ne peut pas donner — chaque pays également visible. Six ` +
  `voisins, tous par une arête. ${mercatorNote} Ce que la planche fixe a dû trancher pour vous est ` +
  `en dessous : à quelle échelle une case met sa valeur en commun.`;
const claimNote =
  `En nombre absolu l'ordre s'inverse : ${NAMES[biggest]} ${count(people[biggest])} personnes ` +
  `(${byRate.indexOf(biggest) + 1}e par habitant), ${NAMES[subject]} ${count(people[subject])} ` +
  `(1re par habitant). Aucun des deux chiffres n'est le plus vrai — ils répondent à deux questions.`;
const readingLine =
  `Lecture : changez le grain et les mêmes 32 cases, aux mêmes 32 places et sous la même légende, ` +
  `disent autre chose — ${hoodMoved} sur ${hosts.length} changent de classe d'un grain à l'autre. ` +
  `Mise en commun sur toute l'Europe, la protection vaut ${fr(wholeRate)} pour 1 000 quand la ` +
  `moyenne des ${hosts.length} taux vaut ${fr(meanOfRates)}. Survolez une case pour lire ses trois ` +
  `taux d'un coup, les personnes, la population qui les divise et son rang dans LES DEUX classements.`;
const liveHint = plain(
  `Carte vivante : zoomez avec les boutons de MapTiler, la molette ou les touches + et −, ` +
    `déplacez-la en la faisant glisser ou avec les flèches du clavier, et survolez une case pour la ` +
    `lire. Le tableau sous la carte porte les mêmes lectures, et il change de grain sans JavaScript.`,
);
const source = `Source : Eurostat, migr_asytpsm — bénéficiaires de la protection temporaire, ${month} · population 2023, via Our World in Data · fond de carte MapTiler`;
const alt =
  `Une grille d'hexagones disposés à peu près comme l'Europe, posée sur un fond de carte MapTiler ` +
  `où l'on voit les vraies côtes autour d'elle. Un hexagone par pays d'accueil, tous de la même ` +
  `taille et teintés selon le nombre d'Ukrainiens sous protection pour 1 000 habitants. Chaque case ` +
  `porte le code du pays et son taux. Les cases les plus foncées sont en Europe centrale — la ` +
  `${NAMES[subject]} à ${fr(rate(subject))} en tête — tandis que l'${NAMES[biggest]}, la plus ` +
  `grande en nombre absolu, n'est qu'à ${fr(rate(biggest))}. La case de l'${NAMES[ORIGIN]} est ` +
  `neutre : c'est le pays d'origine. Un choix sous le titre change l'échelle à laquelle une case ` +
  `met sa valeur en commun — le pays seul, le pays avec ses voisines, ou le bloc régional — et ` +
  `${hoodMoved} cases sur ${hosts.length} changent de classe sans qu'aucune ne bouge : ` +
  `${NAMES[swing.code]} passe de ${fr(swing.from)} à ${fr(swing.to)}. La carte se zoome, se ` +
  `déplace et se survole avec les contrôles de MapTiler.`;

const TABLE_CAPTION = plain(`Les ${seats.length} cases, leur taux au grain choisi et ce qu'il compte`);
const COLUMNS = ["Pays", "Taux au grain choisi", "Personnes", "Classe"];

const interaction = {
  earns: plain(
    `Une planche fixe doit choisir l'échelle à laquelle elle met les cases en commun, l'imprimer ` +
      `dans le chapô et demander qu'on lui fasse confiance ; une vidéo ou un scrolly ne peuvent ` +
      `jouer les trois grains que dans l'ordre de l'auteur, une seule fois. Ici le lecteur tient le ` +
      `grain, fait l'aller-retour autant qu'il veut sur une grille dont aucune case ne bouge et ` +
      `sous une légende qui ne change pas, et chaque case répond avec ses trois taux à la fois — ce ` +
      `qu'aucune image fixe ne peut dire, puisqu'elle n'a qu'un grain.`,
  ),
  controls: [
    {
      question: plain("Ce taux-là, il est calculé sur quoi au juste ?"),
      gesture: "toggle-a-comparison",
      changes: plain(
        `chaque case garde sa place et son code, et change de teinte et de chiffre : le taux est ` +
          `recalculé sur le pays seul, sur le pays plus ses voisines par une arête, ou sur son bloc ` +
          `régional — et au grain régional un trait épais apparaît partout où deux cases voisines ` +
          `ne sont pas dans le même bloc.`,
      ),
    },
    {
      question: plain("Et les 32 lectures en toutes lettres, elles sont où ?"),
      gesture: "open-the-full-table",
      changes: plain(
        `Les ${seats.length} lignes s'ouvrent sous la carte, chacune avec son taux au grain choisi, ` +
          `les personnes qu'il compte et sa pastille de classe. Cette pastille ET ce taux suivent le ` +
          `grain en CSS pur : c'est là que le geste survit quand la carte, elle, ne peut pas — ` +
          `aucune feuille de style n'atteint une couche MapLibre, donc la moitié carte du geste est ` +
          `du script et la moitié tableau n'en est pas.`,
      ),
    },
    {
      question: plain("Cette case-là, c'est qui, et combien fait-elle aux trois grains ?"),
      gesture: "ask-a-mark",
      changes: plain(
        `la case elle-même s'assombrit depuis son propre remplissage et répond avec le pays, ses ` +
          `trois taux d'un coup, les personnes, la population qui les divise et son rang dans les ` +
          `deux classements.`,
      ),
    },
  ],
};

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${caveat} ${readingLine} ${source}`,
  axis: `${classes.map((c) => c.label).join(" ")} ${NAMES[ORIGIN]} origine ${seats.map((s) => s.code).join(" ")} ${TABLE_CAPTION} ${COLUMNS.join(" ")} ${seats.map((s) => NAMES[s.code]).join(" ")} Zoomer Dézoomer Carte`,
  annot: `${claimNote} ${liveHint} ${pool.label} ${pool.grains.map((g) => `${g.label} ${g.announce} ${g.note ?? ""}`).join(" ")}`,
  value: cells.flatMap((c) => c.figures.map((f) => f.text)).join(" "),
};
for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plain(textPerRegister[key]);

// ── NO MAGNITUDE THIS PAGE PRINTS MAY ROUND TO NOTHING ────────────────────────────────────────
//
// Found by looking, not by reasoning: hovering Iceland answered *"4 800 personnes pour 0 millions
// d'habitants"*, on a page whose whole subject is that the denominator is what changes.
const ROUNDED_TO_NOTHING = /\b0\s+(millions?|milliers?|milliards?)\b/;
const spokenWords = [
  title, caveat, claimNote, readingLine, alt, liveHint, pool.label, mercatorNote,
  ...pool.grains.flatMap((g) => [g.label, g.announce, g.note ?? ""]),
  ...cells.flatMap((c) => [c.detail, ...c.figures.map((f) => f.text)]),
];
for (const said of spokenWords) {
  const hit = ROUNDED_TO_NOTHING.exec(said);
  if (hit)
    throw new Error(
      `a sentence this page says out loud reads ${JSON.stringify(hit[0])}: ` +
        `${JSON.stringify(said.slice(Math.max(0, hit.index - 60), hit.index + 60))}. A quantity ` +
        `divided into a scale it is smaller than prints as none, and a reader is told a real ` +
        `population is zero.`,
    );
}

const filed = readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md")).map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

// ── WHAT THE SECOND LAYER IS MADE OF, READ ONCE ───────────────────────────────────────────────
//
// MapLibre and its stylesheet are INLINED into every page rather than linked: a `<script src>` would
// trade the payload for a SECOND third-party host, and inlining keeps the count at one —
// api.maptiler.com. `style.mjs` travels as SOURCE with its `export` keywords stripped, because a
// page script cannot import.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js"), "utf8");
const MAPLIBRE_CSS = await readFile(requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css"), "utf8");
const STYLE_MODULE = (
  await readFile(join(HERE, "..", "..", "skills", "map-web", "assets", "style.mjs"), "utf8")
).replace(/^export /gm, "");

const KEY = process.env.MAPTILER_KEY ?? process.env.REMOTION_MAPTILER_KEY ?? process.env.VITE_MAPTILER_KEY ?? "";
const PLACEHOLDER = `__MAPTILER${"_KEY__"}`;
const localPageOf = (pagePath) => pagePath.replace(/\.html$/, ".local.html");
const BLANK_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** THE FONTSTACK A CELL LABEL IS DRAWN IN, and it is PROBED rather than assumed.
 *
 *  MapTiler Cloud serves eighteen families and answers **200 with Noto Sans** for every other name —
 *  the same 83 352 bytes, with nothing at all to say so. Seventeen of the eighteen are Google Fonts
 *  and `resolve-families.mjs` resolves this tree's registers onto Google Fonts, so the map's type
 *  and the page's type can be the SAME face rather than cousins: measured on the three filed
 *  directions, every family a label here needs (Open Sans, Montserrat, Merriweather) is one MapTiler
 *  serves. The silent fallback is the failure mode, so the sentinel size is what is refused. */
const variantFor = (weight) => (weight >= 600 ? "Bold" : weight >= 500 ? "Medium" : "Regular");
const probed = new Map();
async function servedStack(family, weight, what) {
  const stack = `${family} ${variantFor(weight)}`;
  if (!KEY) return stack;
  if (probed.has(stack)) {
    if (probed.get(stack)) return stack;
  } else {
    const url = new URL(`https://api.maptiler.com/fonts/${encodeURIComponent(stack)}/0-255.pbf`);
    url.searchParams.set("key", KEY);
    const response = await fetch(url);
    const bytes = response.ok ? (await response.arrayBuffer()).byteLength : 0;
    probed.set(stack, response.ok && bytes !== NOTO_SENTINEL_BYTES);
    if (probed.get(stack)) return stack;
  }
  throw new Error(
    `MapTiler does not serve the fontstack ${JSON.stringify(stack)} for ${what}: it answered with ` +
      `the ${NOTO_SENTINEL_BYTES}-byte Noto Sans range every unknown family gets, and nothing in ` +
      `MapLibre would ever say so. The cell labels would silently be in a face this page does not ` +
      `carry, beside a legend that is.`,
  );
}

/**
 * PHOTOGRAPH THE PAGE'S OWN LIVE MAP, and write it where the page will embed it.
 *
 * The key is substituted into a copy under the system temp directory, never beside the page and
 * never inside the repository. It REFUSES rather than writing something: a frozen picture taken from
 * a map that never loaded is a picture of the failure it exists to replace, and it would ship
 * looking like a success.
 */
async function bakeFallback(pagePath, outFile, id) {
  if (!KEY)
    throw new Error(
      "the frozen fallback is photographed from this page's own live map, so it needs a MapTiler " +
        "key in the environment (MAPTILER_KEY). Without one the page would ship with a blank second " +
        "layer, which is the defect this bake exists to close.",
    );
  const html = (await readFile(pagePath, "utf8")).split(PLACEHOLDER).join(KEY);
  const dir = mkdtempSync(join(tmpdir(), "mw-fallback-"));
  const keyed = join(dir, `${id}.local.html`);
  await writeFile(keyed, html);
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: REVIEW_WINDOW.width,
      height: REVIEW_WINDOW.height,
      deviceScaleFactor: REVIEW_WINDOW.scale,
    });
    await page.goto(`file://${keyed}`, { waitUntil: "networkidle0", timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("mw-live"), { timeout: 120000 });
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const map = window.__mwMap;
          if (map.loaded() && map.areTilesLoaded()) return resolve();
          map.once("idle", resolve);
        }),
    );
    await new Promise((r) => setTimeout(r, 600));
    const box = await page.$(".map-layer");
    if (!box) throw new Error("the page carries no live map box to photograph");
    await mkdir(dirname(outFile), { recursive: true });
    const png = `${outFile}.png`;
    const shot = await box.boundingBox();
    await box.screenshot({ path: png });
    const encode = spawnSync("cwebp", ["-quiet", "-q", "92", png, "-o", outFile], { stdio: "inherit" });
    if (encode.status !== 0) throw new Error(`cwebp exited with ${encode.status} baking ${id}'s fallback`);
    rmSync(png, { force: true });
    console.log(
      `fallback ${id} → ${outFile.replace(`${HERE}/`, "")} · ${Math.round(shot.width)}x${Math.round(shot.height)} CSS px`,
    );
    return { width: Math.round(shot.width), height: Math.round(shot.height) };
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The two tints a basemap is allowed on a directed page, neither invented: the sea takes a little
 *  of the accent, the land takes a step off the ground toward the ink. */
// THE PAIR COMES FROM THE TRUNK, AND THE WATER IS NOT THIS BEAT'S TO CHOOSE. What stood here was
// `water: mix(d.ground, d.accent, 0.16)` — the sea tinted with the very accent this beat's marks are
// drawn in, so the ground followed the mark and no accent could be picked out of it. Only the LAND's
// weight is measured per beat; the water is the filed convention, once, in `shared/map-beat/tints.mjs`.
const LAND_DOSE = 0.07;

const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const base = readDirection(join(DIRECTIONS, file));
  const direction = resolveDirectionFamilies(base, textPerRegister);
  try {
    const tints = plateTints(base, { landDose: LAND_DOSE });
    const furniture = deriveFurniture(base.ground);
    // ONE DERIVATION OF THE RAMP, READ BY BOTH HALVES: the component draws the table's swatches from
    // it and this file builds the live map's per-grain expressions from the SAME arrays.
    const { ramp, activeRamp, inkRamp, origin, seamInk } = hexRamp({
      ground: base.ground,
      accent: base.accent,
      ink: furniture.ink,
      plateLand: tints.land,
      plateWater: tints.water,
      tones: classes.length,
    });

    const axisReg = direction.registers.axis;
    const valueReg = direction.registers.value;
    const CODE_SIZE = { fontSize: 13, fontWeight: axisReg.weight ?? 500, fontFamily: axisReg.family };
    const VALUE_SIZE = { fontSize: 14, fontWeight: valueReg.weight ?? 700, fontFamily: valueReg.family };

    // ── A CELL TOO NARROW TO HOLD ITS OWN CODE IS A REFUSAL, not a smaller type size ───────────
    //
    // The type sheet's own rule, carried from the static sibling and re-derived for a live map: the
    // label is drawn by MapLibre at a FIXED pixel size, so what it has to fit inside is the cell's
    // width AT THE PUBLISHED FRAMING — the tightest the reader ever sees it, since the zoom floor is
    // that framing. `fitBounds` with no padding fits the grid box into the stage, and the grid is
    // linear in Mercator metres, so the scale is one number.
    const pxPerUnit = Math.min(STAGE.width / gridW, STAGE.height / gridH);
    const cellWidthPx = DX * pxPerUnit;
    const cellHeightPx = 2 * RADIUS * pxPerUnit;
    const widthOf = (text, size) => measureText(text, size);
    const codeOwes = Math.max(...cells.map((c) => widthOf(c.code, CODE_SIZE))) + 6;
    const valueOwes = Math.max(...cells.flatMap((c) => c.figures.map((f) => widthOf(f.text, VALUE_SIZE)))) + 6;
    if (cellWidthPx < codeOwes || cellWidthPx < valueOwes)
      throw new Error(
        `at the published framing a hexagon is ${cellWidthPx.toFixed(1)} px wide and it has to hold ` +
          `a code that owes ${codeOwes.toFixed(1)} and a number that owes ${valueOwes.toFixed(1)}. ` +
          `A grid nobody can read cell by cell is a pattern, not a map — and the answer is a bigger ` +
          `cell or a shorter label, never a smaller type size.`,
      );
    // AND THE TWO LABELS MAY NOT TOUCH EACH OTHER. They are stacked at one place, offset in ems of
    // their own size, so the only pair that can collide is a cell's own code and its own number.
    const CODE_OFFSET_EM = -0.55;
    const VALUE_OFFSET_EM = 0.8;
    const codeBottom = CODE_OFFSET_EM * CODE_SIZE.fontSize + CODE_SIZE.fontSize * 0.5;
    const valueTop = VALUE_OFFSET_EM * VALUE_SIZE.fontSize - VALUE_SIZE.fontSize * 0.5;
    if (!(codeBottom < valueTop))
      throw new Error(
        `a cell's code and its number overlap: the code ends at ${codeBottom.toFixed(1)} px below ` +
          `the seat's centre and the number starts at ${valueTop.toFixed(1)}.`,
      );
    const stackedHeight = VALUE_OFFSET_EM * VALUE_SIZE.fontSize + VALUE_SIZE.fontSize - CODE_OFFSET_EM * CODE_SIZE.fontSize;
    if (stackedHeight > cellHeightPx)
      throw new Error(
        `a cell is ${cellHeightPx.toFixed(1)} px tall at the published framing and its two labels ` +
          `stack to ${stackedHeight.toFixed(1)} px. A label that leaves its own seat belongs to the ` +
          `cell beside it as far as a reader can tell.`,
      );

    const live = {
      style: MAP_STYLE,
      tints,
      studyBounds: STUDY,
      cells: cells.map((c) => ({
        code: c.code,
        ring: c.ring,
        isOrigin: c.isOrigin,
        figures: Object.fromEntries(c.figures.map((f) => [f.slug, { text: f.text, klass: f.klass }])),
      })),
      seams: seamFeatures,
      slugs: pool.grains.map((g) => poolSlugOf(g.key)),
      defaultSlug: poolSlugOf(pool.grains[0].key),
      ramp,
      activeRamp,
      inkRamp,
      origin: { ...origin, text: plain("origine") },
      cellEdge: base.ground,
      seam: { ink: seamInk, width: 2.5 },
      labels: {
        code: { font: await servedStack(axisReg.family, CODE_SIZE.fontWeight, "a cell's code"), size: CODE_SIZE.fontSize, offsetEm: CODE_OFFSET_EM },
        value: { font: await servedStack(valueReg.family, VALUE_SIZE.fontWeight, "a cell's number"), size: VALUE_SIZE.fontSize, offsetEm: VALUE_OFFSET_EM },
      },
      details: Object.fromEntries(cells.map((c) => [c.code, c.detail])),
      locale: { title: "Carte", zoomIn: "Zoomer", zoomOut: "Dézoomer" },
      changeMs: POOL_MS,
    };

    const pageOf = (plate, box) =>
      renderWeb({
        // A MAP BEAT'S DRAWING KEEPS ITS SHARE OF THE WINDOW AND THE WORDS GIVE WAY — the share is
        // declared once, in the trunk, and refused there on the file this call writes.
        drawing: { share: MAP_DRAWING_SHARE },
        component: DirectedHexGridWeb,
        props: {
          cells,
          pool,
          classes,
          originLabel: `${NAMES[ORIGIN]} · origine`,
          plate,
          plateLand: tints.land,
          plateWater: tints.water,
          aspect: box.width / box.height,
          size: box.width,
          livePlan: liveHexPlan(live),
          liveScript: liveHexScript(live, {
            scope: ".chart-figure",
            styleModule: STYLE_MODULE,
            poolName: "mw-stack",
          }),
          liveHint,
          maplibreCss: MAPLIBRE_CSS,
          maplibreJs: MAPLIBRE_JS,
          tableCaption: TABLE_CAPTION,
          columns: COLUMNS,
          title, eyebrow: EYEBROW, caveat, source, reading: readingLine, claimNote, alt,
          interaction,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir: OUT,
        name: `${id}.html`,
      });

    const stamp = createHash("sha256")
      .update(JSON.stringify(liveHexPlan(live)))
      .update(JSON.stringify(REVIEW_WINDOW))
      .digest("hex")
      .slice(0, 16);
    const image = join(FALLBACK_DIR, `${id}.webp`);
    const stampFile = join(FALLBACK_DIR, `${id}.sha`);
    let record = null;
    if (existsSync(image) && existsSync(stampFile)) {
      try {
        const kept = JSON.parse(readFileSync(stampFile, "utf8"));
        if (kept.stamp === stamp) record = kept;
      } catch (err) {
        record = null;
      }
    }
    if (!record) {
      // A DRAFT FIRST, with nothing under the live map, because the thing being photographed is the
      // live map on THIS page rather than a second rendering of the same plan somewhere else.
      await pageOf(BLANK_PNG, STAGE);
      const shot = await bakeFallback(join(OUT, `${id}.html`), image, id);
      await mkdir(FALLBACK_DIR, { recursive: true });
      record = { stamp, ...shot };
      await writeFile(stampFile, `${JSON.stringify(record)}\n`);
    }
    const plate = `data:image/webp;base64,${(await readFile(image)).toString("base64")}`;
    const { outPath } = await pageOf(plate, record);
    // THE KEYED COPY FOR REVIEW, beside the page and git-ignored. The owner: « non, comme pour les
    // scrolly il faut toujours une clé sinon ça sert à rien ». The COMMITTED page keeps the
    // placeholder, because this repository is public.
    if (KEY) {
      const html = await readFile(outPath, "utf8");
      if (!html.includes(PLACEHOLDER))
        throw new Error("the rendered page carries no delivery placeholder to substitute a key into");
      await writeFile(localPageOf(outPath), html.split(PLACEHOLDER).join(KEY));
    }
    // READ THE WRITTEN PAGE BACK. The file a reader opens is the only artefact any of these refusals
    // is about.
    const written = await readFile(join(OUT, `${id}.html`), "utf8");
    assertOnePool(written, pool, { where: `renders/${id}.html`, property: "background-color" });
    // THE SAME QUESTION, ASKED OF THE OTHER HALF. `assertOnePool` holds the MARKUP against the pooled
    // classes; this holds the LIVE PLAN against the same pooled classes. Neither can see the other's
    // mechanism, and the crossing between them is exactly where this architecture can put one
    // grouping on the map and a different one in the table.
    assertPoolReachesTheLayers(written, live, pool, ramp, MAP_STYLE, { where: `renders/${id}.html` });
    console.log(`${id} -> renders/${id}.html`);
  } catch (error) {
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
    // A refused direction must not leave its previous render on disk to be mistaken for this one.
    await rm(join(OUT, `${id}.html`), { force: true });
    await rm(localPageOf(join(OUT, `${id}.html`)), { force: true });
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
