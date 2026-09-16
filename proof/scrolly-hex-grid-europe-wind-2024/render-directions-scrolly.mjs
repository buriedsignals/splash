// Europe's wind electricity in 2024, one hexagon per reporting country, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `hex grid` type in the scrolly format.
//
// Subject: where the continent's wind electricity is actually generated, and how much of it rides on a handful of
// countries. Frozen data: `data.csv` (per-country generation by source, 2024), copied unmodified from
// `proof/static-heatmap-europe-electricity/data.csv`.
//
//   1. the grid, uncoloured;
//   2. coloured by absolute output (TWh): Germany darkest, then UK, Spain, France, Sweden;
//   3. the same cells recoloured by wind's share of each country's OWN electricity mix: Denmark darkest;
//   4. the cells leave the map for a ranking by share — the order turns over, Germany falls well down;
//   5. back on the map, Denmark and Germany ringed, both shares written in;
//   6. the pull back: the concentration reading.
//
// Usage:  bun proof/scrolly-hex-grid-europe-wind-2024/render-directions-scrolly.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateScrollyPlan } from "#shared/map-beat/scrolly.mjs";
import { plateTints } from "#shared/map-beat/tints.mjs";
import { fitCamera, hexMapPlan, iso2Of } from "./plan.mjs";
import { DirectedEuropeWindHexScrolly } from "./DirectedEuropeWindHexScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The Splash repo root — the nearest ancestor whose package.json declares the "#shared/*" import — found by
 *  walking up rather than counting levels, so this runner works unchanged from proof/<beat>/ or a story's own
 *  stories/<slug>/beats/<id>/. */
function splashRoot(startDir) {
  const looked = [];
  for (let dir = startDir; ; ) {
    looked.push(dir);
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;
      } catch {
        // an unparsable package.json is not this function's business — keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no Splash root above ${startDir} — looked in:\n  ${looked.join("\n  ")}`);
    dir = parent;
  }
}

const ROOT = splashRoot(HERE);
const { renderScrolly } = await import(join(ROOT, "skills", "scrolly", "scripts", "render-scrolly.mjs"));
const { openLiveMapCards, renderWithCardImages } = await import(join(ROOT, "skills", "scrolly", "scripts", "live-map-cards-bake.mjs"));
const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FALLBACK = join(HERE, "fallback");
/** The live map's window and reference stage: a plain, unmoving backdrop (this beat's grid is "designed, not
 *  measured" — see `plan.mjs`), so neither has to align with the hex layout's own pixels. */
const WINDOW = [-25, 34, 45, 72];
const REFERENCE = { width: 1200, height: 700 };
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const EYEBROW = "Energy · Europe";
const NB = " ";
/** Expected outcome, known from having looked at the data — a beat whose numbers drift must refuse to render. */
const SUBJECT = "DNK"; // wind's share of the country's own mix: the leader
const LARGEST = "DEU"; // absolute wind generation: the leader
/** Designed layout, odd rows offset by half a cell — no origin country: every reporting country is a "host". */
const GRID = [
  "ISL .   .   NOR SWE FIN .   .",
  ".   IRL GBR DNK .   EST LVA RUS",
  ".   .   NLD DEU POL LTU BLR .",
  ".   BEL LUX CHE AUT CZE SVK HUN",
  "PRT ESP FRA ITA SVN HRV ROU MDA",
  ".   .   .   MLT BIH SRB BGR UKR",
  ".   .   .   .   MNE MKD GRC TUR",
  ".   .   .   .   .   ALB CYP .",
];
const NAMES = {
  DEU: "Germany", GBR: "United Kingdom", ESP: "Spain", FRA: "France", SWE: "Sweden", TUR: "Turkey",
  NLD: "the Netherlands", POL: "Poland", ITA: "Italy", FIN: "Finland", DNK: "Denmark", NOR: "Norway",
  PRT: "Portugal", BEL: "Belgium", GRC: "Greece", IRL: "Ireland", AUT: "Austria", ROU: "Romania",
  RUS: "Russia", LTU: "Lithuania", HRV: "Croatia", BGR: "Bulgaria", SRB: "Serbia", EST: "Estonia",
  HUN: "Hungary", CZE: "Czechia", LUX: "Luxembourg", BIH: "Bosnia and Herzegovina", LVA: "Latvia",
  MNE: "Montenegro", CYP: "Cyprus", MDA: "Moldova", BLR: "Belarus", CHE: "Switzerland",
  MKD: "North Macedonia", ISL: "Iceland", SVN: "Slovenia", ALB: "Albania", MLT: "Malta",
  SVK: "Slovakia", UKR: "Ukraine",
};

// ── the readings, the layout checked both ways, the claim asserted ─────────────────────────────
const readCsv = async (name) => {
  const lines = (await readFile(join(HERE, name), "utf8")).trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [header[i], v])));
};
const rows = await readCsv("data.csv");
const SOURCE_COLS = Object.keys(rows[0]).filter((k) => k.endsWith("__twh"));
const wind = Object.fromEntries(rows.map((r) => [r.code, Number(r.wind_generation__twh)]));
const totalGeneration = Object.fromEntries(rows.map((r) => [r.code, SOURCE_COLS.reduce((s, c) => s + Number(r[c]), 0)]));
const share = (code) => (100 * wind[code]) / totalGeneration[code];
const allCodes = rows.map((r) => r.code);
/** Ukraine reports 0 across every source in the frozen file — a wartime gap, not a real zero. It is on the grid and
 *  outside the measure, painted the neutral no-data fill with no in-map label (arrives with the classes). */
const NO_DATA = "UKR";
const hosts = allCodes.filter((code) => code !== NO_DATA);
for (const code of hosts) {
  if (!(wind[code] >= 0)) throw new Error(`${code} has no usable wind figure`);
  if (!(totalGeneration[code] > 0)) throw new Error(`${code} has no usable total generation`);
}
if (totalGeneration[NO_DATA] !== 0) throw new Error(`${NO_DATA} is expected to be the frozen file's own no-data gap (0 across every source) — it is not`);
const cells = [];
GRID.forEach((row, r) => row.trim().split(/\s+/).forEach((code, col) => code !== "." && cells.push({ code, row: r, col })));
const laidOut = new Set(cells.map((c) => c.code));
for (const c of cells) {
  if (!allCodes.includes(c.code)) throw new Error(`the layout places ${c.code}, which the frozen data does not report`);
  if (!NAMES[c.code]) throw new Error(`${c.code} has no name filed`);
}
for (const code of allCodes) if (!laidOut.has(code)) throw new Error(`${code} is reported and has no cell in the layout`);

const rankedByShare = [...hosts].sort((a, b) => share(b) - share(a));
const rankedByTwh = [...hosts].sort((a, b) => wind[b] - wind[a]);
const [top, largest] = [rankedByShare[0], rankedByTwh[0]];
// SCAFFOLD -> ADAPTED: assertions — this beat's own claim, checked against its own data. A beat whose numbers drift
// must refuse to render, not ship a stale claim.
if (top !== SUBJECT) throw new Error(`the headline says ${SUBJECT} leads by wind's share of its own mix; ${top} does`);
if (largest !== LARGEST) throw new Error(`the headline says ${LARGEST} generates the most wind, absolute; ${largest} does`);
if (largest === top) throw new Error("the headline says the ranking turns over between absolute output and share; the same country leads both");
const largestShareRank = rankedByShare.indexOf(largest) + 1;
if (!(largestShareRank > 5)) throw new Error(`a card says the absolute leader falls well down by share; it is ${largestShareRank}th`);
const topTwhRank = rankedByTwh.indexOf(top) + 1;
if (!(topTwhRank > 5)) throw new Error(`a card says the share leader is not among the top absolute producers; it is ${topTwhRank}th`);
const TOP5 = rankedByTwh.slice(0, 5);
const EXPECTED_TOP5 = ["DEU", "GBR", "ESP", "FRA", "SWE"];
if (TOP5.join() !== EXPECTED_TOP5.join()) throw new Error(`the top five absolute producers drifted: ${TOP5.join()}`);
const totalTwh = hosts.reduce((s, code) => s + wind[code], 0);
const top5Share = (100 * TOP5.reduce((s, code) => s + wind[code], 0)) / totalTwh;
if (!(top5Share > 55 && top5Share < 62)) throw new Error(`the concentration figure drifted out of the checked range: ${top5Share.toFixed(1)}%`);
const last = rankedByShare[rankedByShare.length - 1];

const COUNT_BREAKS = [1, 5, 15, 40];
const RATE_BREAKS = [5, 15, 25, 40];
const classBy = (breaks, v) => breaks.filter((b) => v >= b).length;
const n1 = (v) => plainSpaces(v.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const tiles = cells.map((c) => {
  const noData = c.code === NO_DATA;
  return {
    ...c,
    name: NAMES[c.code],
    count: noData ? null : wind[c.code],
    rate: noData ? null : share(c.code),
    countClass: noData ? null : classBy(COUNT_BREAKS, wind[c.code]),
    rateClass: noData ? null : classBy(RATE_BREAKS, share(c.code)),
    rateText: noData ? "" : `${n1(share(c.code))}%`,
  };
});
console.log(`${hosts.length} countries · by output ${largest} ${wind[largest].toFixed(1)} TWh · by share ${top} ${n1(share(top))}% · top 5 = ${top5Share.toFixed(1)}%\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────────────────
const title = [
  `${NAMES[largest]} generates a fifth of Europe's wind power — five countries produce ${n1(top5Share)}%${NB}of it between them`,
  `Five countries generate ${n1(top5Share)}%${NB}of Europe's wind power`,
  `Europe's wind power, concentrated`,
];
const prose = [
  [`One hexagon per country that reported wind generation in 2024 — ${hosts.length} in all, laid out roughly as the map.`],
  [`Coloured by output, the grid puts ${NAMES[largest]} in the darkest class at ${wind[largest].toFixed(1)}${NB}TWh, with ${NAMES[TOP5[1]]}, ${NAMES[TOP5[2]]}, ${NAMES[TOP5[3]]} and ${NAMES[TOP5[4]]} close behind.`],
  [`Recolour the same cells by how much of each country's OWN electricity comes from wind, and ${NAMES[top]} is darkest instead, at ${n1(share(top))}%${NB}— ${NAMES[largest]} drops to a lighter class.`],
  [`Ranked by that share, the order turns over: ${NAMES[top]} leads, ${NAMES[largest]} falls to ${largestShareRank}th, ${NAMES[last]} closes the list at ${n1(share(last))}%.`],
  [`${NAMES[top]}: ${n1(share(top))}%${NB}of its own electricity from wind. ${NAMES[largest]}: ${n1(share(largest))}%${NB}— despite generating ${(wind[largest] / wind[top]).toFixed(1)}× more of it.`],
  [`Reading: ${TOP5.map((c) => NAMES[c]).join(", ")} generate ${n1(top5Share)}%${NB}of Europe's wind electricity between them.`],
];
const source = "Source: per-country electricity generation by source, 2024";
const words = {
  countUnit: "wind generation, TWh",
  rateUnit: "share of national electricity from wind",
  countNote: `${NAMES[largest]}${NB}: ${wind[largest].toFixed(1)}${NB}TWh`,
  rateNote: `${NAMES[top]}${NB}: ${n1(share(top))}%`,
  rankNote: `${NAMES[largest]} ${largestShareRank}th of ${hosts.length} by share`,
  pairNote: `${n1(share(top))}%${NB}vs${NB}${n1(share(largest))}%`,
  originNote: `${NAMES[NO_DATA]} reports 0 across every source for 2024, a wartime gap — it is on the grid, outside the measure.`,
};
const alt =
  `Grid of hexagons, one per European country. By output, ${NAMES[largest]} generates the most wind electricity; ` +
  `by share of each country's own mix, ${NAMES[top]} leads at ${n1(share(top))}%, ${NAMES[largest]} is ${largestShareRank}th at ${n1(share(largest))}%.`;

/** One state per card; see `hex-drive.mjs` for what each field paints. */
const STATES_RAW = [
  { fill: 0, rate: 0, rank: 0, pair: 0 },
  { fill: 1, rate: 0, rank: 0, pair: 0 },
  { fill: 1, rate: 1, rank: 0, pair: 0 },
  { fill: 1, rate: 1, rank: 1, pair: 0 },
  { fill: 1, rate: 1, rank: 0, pair: 1 },
  { fill: 1, rate: 1, rank: 0, pair: 0 },
];
/** The live map's one, unmoving camera; every card carries it (`hex-drive.mjs`, `plan.mjs`). */
const camera = fitCamera({ west: WINDOW[0], south: WINDOW[1], east: WINDOW[2], north: WINDOW[3] }, REFERENCE);
const STATES = STATES_RAW.map((state) => ({ ...state, ...camera, card: 0 }));
/** The map never changes: one frozen card image covers every scroll card. */
const BAKE_STATES = STATES.slice(0, 1);

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.countUnit} ${words.rateUnit} ${words.originNote} ${tiles.map((t) => t.code).join(" ")} 1 5 15 40 0123456789,%`,
  annot: "",
  value: `${words.countNote} ${words.rateNote} ${words.rankNote} ${words.pairNote} ${tiles.map((t) => t.rateText).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 4 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

for (const code of allCodes) iso2Of(code); // every host (and the no-data country) joins MapTiler Countries, or refuses loudly here

const cards = await openLiveMapCards();
const driver = `${cards.mapScript}\n${await readFile(join(HERE, "hex-drive.mjs"), "utf8")}`;
const refused = [];
try {
  for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    if (ONLY && id !== ONLY) continue;
    const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
    const { ink, muted, grid } = deriveFurniture(direction.ground);
    const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
    try {
      const ground = direction.ground;
      const { water: sea, land } = plateTints(direction);
      const floorOnGround = (colour, what) => {
        if (contrast(colour, ground) >= NON_TEXT_CONTRAST_MIN) return colour;
        const lifted = adjustToContrast(colour, ground, NON_TEXT_CONTRAST_MIN);
        if (!lifted) throw new Error(`${what} cannot be told from the ground: nothing clears ${NON_TEXT_CONTRAST_MIN}:1 against ${ground}`);
        return lifted;
      };
      const neutral = floorOnGround(mix(ground, ink, 0.22), "the map's countries");
      const originFill = floorOnGround(mix(ground, ink, 0.16), "the map's unused origin fill");
      const mutedInk = adjustToContrast(muted, ground, NON_TEXT_CONTRAST_MIN) ?? muted;
      const colours = { sea, land, neutral, originFill, originEdge: mutedInk, border: grid };
      const strokes = { border: direction.stroke?.hairline ?? 0.6 };

      const mapPlan = hexMapPlan({ hosts, origin: NO_DATA, colours, strokes, camera, referenceWidth: REFERENCE.width, referenceHeight: REFERENCE.height });
      const violations = [...validateScrollyPlan(mapPlan, STATES), ...validateExpressions(mapPlan)];
      if (violations.length) throw new Error(`the plan is not renderable:\n  ${violations.join("\n  ")}`);

      const renderPage = (fallbacks) =>
        renderScrolly({
          steps: prose.map((p, i) => ({ id: ["grille", "par-sortie", "par-part", "classement", "danemark-allemagne", "lecture"][i], prose: p })),
          reveal: {
            element: createElement(DirectedEuropeWindHexScrolly, {
              plan: mapPlan,
              fallbacks,
              reference: REFERENCE,
              tiles,
              ranked: rankedByShare,
              subject: top,
              largest,
              countBreaks: COUNT_BREAKS.map((b) => `${b}${NB}TWh`),
              rateBreaks: RATE_BREAKS.map((b) => `${b}%`),
              words,
              alt,
              regs,
              ground: direction.ground,
              accent: direction.accent,
              ink,
              muted,
            }),
            states: STATES,
            driver,
            apply: "applyEuropeWindHexState",
          },
          vendor: [{ js: cards.maplibreJs, css: cards.maplibreCss }],
          title,
          eyebrow: EYEBROW,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: "en",
          outDir: OUT,
          name: `${id}.html`,
        });

      const { outPath } = await renderWithCardImages(cards, {
        id,
        plan: mapPlan,
        states: BAKE_STATES,
        fallbackDir: FALLBACK,
        stageGround: ground,
        cardOf: (baked) => ({ zoom: baked.zoom }),
        renderPage,
        noBake: process.argv.includes("--no-bake"),
      });
      console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
    } catch (error) {
      await rm(join(OUT, `${id}.html`), { force: true });
      refused.push({ id, why: error.message });
      console.log(`${id} REFUSED — ${error.message}`);
    }
  }
} finally {
  await cards.close();
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
