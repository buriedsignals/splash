// World population, 1800–2023, rendered once per FILED DIRECTION into a self-contained scrolly page. The `area` type in
// the scrolly format.
//
// THE SUBJECT OF `static-world-population`, CHOREOGRAPHED. The series and the claim are the static beat's own; the
// static predates the design base and is set in English, so this beat is set in French through the filed directions.
// The scroll tells it with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. 1800 to 1805: the first billion;
//   2. to 1927: the second, 122 years later;
//   3. to 2023: every billion marked as it is crossed;
//   4. the years each billion took, as bars;
//   5. the area turned into the annual growth rate: its peak, and its fall;
//   6. the static plate.
//
// Usage:  bun proof/scrolly-world-population/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedPopulationScrolly } from "./DirectedPopulationScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Démographie · Monde";
const NB = "\u00A0";
const FIRST = 1800;
const LAST = 2023;
const BILLIONS = 8;

// ── the series, and the static beat's own assertions ───────────────────────────────────────────
const lines = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const rows = lines.slice(1).map((l) => {
  const [entity, , year, population] = l.split(",");
  return { entity, year: Number(year), population: Number(population) };
});
if (rows.some((r) => r.entity !== "World")) throw new Error("the frozen file holds something other than World");
rows.sort((a, b) => a.year - b.year);
if (rows[0].year !== FIRST || rows[rows.length - 1].year !== LAST || rows.length !== LAST - FIRST + 1) throw new Error(`expected every year from ${FIRST} to ${LAST}`);
const crossings = [];
for (let b = 1; b <= BILLIONS; b++) {
  const r = rows.find((d) => d.population >= b * 1e9);
  if (!r) throw new Error(`the series never reaches ${b} billion`);
  crossings.push({ billion: b, year: r.year });
}
crossings.forEach((k, i) => (k.gap = i ? k.year - crossings[i - 1].year : null));
const eight = crossings[BILLIONS - 1];
if (eight.year !== 2022) throw new Error(`the headline says the world passed 8 billion in 2022; the series says ${eight.year}`);
if (crossings[0].year !== 1805) throw new Error(`card 1 says the first billion came in 1805; the series says ${crossings[0].year}`);
const second = crossings[1];
const recent = crossings.slice(3);
if (!(second.gap > 100 && recent.every((k) => k.gap <= 15))) throw new Error(`card 4 says the second billion took over a century and each of the last five 15 years or less; ${crossings.map((k) => k.gap).join(", ")}`);
const rate = rows.map((r, i) => (i ? (r.population / rows[i - 1].population - 1) * 100 : null));
let peakIndex = 1;
for (let i = 2; i < rows.length; i++) if (rate[i] > rate[peakIndex]) peakIndex = i;
const peak = { year: rows[peakIndex].year, value: rate[peakIndex] };
const lastRate = rate[rate.length - 1];
if (!(peak.year >= 1960 && peak.year <= 1970 && lastRate < peak.value / 2)) throw new Error(`card 5 says growth peaked in the 1960s and has more than halved since; peak ${peak.year} ${peak.value.toFixed(2)}, last ${lastRate.toFixed(2)}`);
if (!(lastRate > 0)) throw new Error("card 5 says the population is still rising");
const lastPop = rows[rows.length - 1].population;
console.log(`${crossings.map((k) => `${k.billion}:${k.year}`).join(" ")} · pic ${peak.year} ${peak.value.toFixed(2)} % · ${LAST} ${lastRate.toFixed(2)} % · ${(lastPop / 1e9).toFixed(2)} Md\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const two = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const listOf = (xs) => (xs.length === 1 ? xs[0] : `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`);
const crossingsOut = crossings.map((k) => ({
  ...k,
  label: `${k.billion}${NB}Md · ${k.year}`,
  gapText: k.gap === null ? "" : `${k.gap}${NB}ans`,
  gapName: `${k.billion - 1} à ${k.billion}${NB}Md`,
}));

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `La population mondiale a dépassé 8 milliards en ${eight.year}`,
  `8 milliards d’humains depuis ${eight.year}`,
  `La population mondiale depuis ${FIRST}`,
];
const prose = [
  [`En ${FIRST}, la Terre compte ${two(rows[0].population / 1e9)}${NB}milliard d’habitants. Le premier milliard est atteint en ${crossings[0].year}.`],
  [`Le deuxième arrive en ${second.year}, ${second.gap}${NB}ans plus tard.`],
  [`Puis tout s’accélère : ${listOf(crossings.slice(2).map((k) => `${k.billion} milliards en ${k.year}`))}. En ${LAST}, ${two(lastPop / 1e9)}${NB}milliards.`],
  [`Le temps qu’a pris chaque milliard : ${second.gap}${NB}ans pour le deuxième, ${crossings[2].gap} pour le troisième, puis ${listOf(recent.map((k) => String(k.gap)))} ans.`],
  [`La croissance, elle, ralentit. Elle a culminé à ${one(peak.value)}${NB}% par an en ${peak.year} ; en ${LAST}, ${one(lastRate)}${NB}%. La population monte encore, mais moins vite.`],
  [`Lecture : la surface est la population mondiale, de ${FIRST} à ${LAST}, en milliards.`],
];
const source = "Source : HYDE (2023), Gapminder (2022) et ONU, World Population Prospects (2024), via Our World in Data";
const words = {
  unit: "population mondiale, en milliards",
  gapUnit: "années pour chaque milliard",
  rateUnit: "croissance annuelle, en %",
  firstNote: `${crossings[0].year}${NB}: 1 milliard`,
  secondNote: `${second.year}${NB}: 2 milliards`,
  allNote: `${eight.year}${NB}: 8 milliards`,
  gapNote: `${second.gap} ans, puis ${recent[recent.length - 1].gap}`,
  rateNote: `pic${NB}: ${one(peak.value)}${NB}% en ${peak.year}`,
  readNote: `${two(lastPop / 1e9)}${NB}milliards en ${LAST}`,
  lastLabel: `${two(lastPop / 1e9)}${NB}Md`,
  rateLast: `${one(lastRate)}${NB}%`,
};
const alt =
  `Aire : la population mondiale de ${FIRST} à ${LAST}, de ${two(rows[0].population / 1e9)} à ${two(lastPop / 1e9)} milliards. ` +
  `Le premier milliard est atteint en ${crossings[0].year}, le deuxième en ${second.year}, le huitième en ${eight.year} ; la croissance annuelle a culminé en ${peak.year}.`;

/** One state per card; see `population-drive.mjs` for what each field paints. */
const STATES = [
  { year: crossings[0].year, gaps: 0, rate: 0, last: 0, note: 0 },
  { year: second.year, gaps: 0, rate: 0, last: 0, note: 1 },
  { year: LAST, gaps: 0, rate: 0, last: 1, note: 2 },
  { year: LAST, gaps: 1, rate: 0, last: 0, note: 3 },
  { year: LAST, gaps: 0, rate: 1, last: 0, note: 4 },
  { year: LAST, gaps: 0, rate: 0, last: 1, note: 5 },
];
const xTicks = [1800, 1850, 1900, 1950, 2023];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.gapUnit} ${words.rateUnit} ${xTicks.join(" ")} 0 1 2 3 4 5 6 7 8 0 % 1 % 2 %`,
  annot: `${crossingsOut.map((k) => `${k.label} ${k.gapName}`).join(" ")}`,
  value: `${crossingsOut.map((k) => k.gapText).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note") || k === "lastLabel" || k === "rateLast").map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "population-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["premier-milliard", "deuxieme", "huit-milliards", "annees", "croissance", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedPopulationScrolly, {
          years: rows.map((r) => r.year),
          population: rows.map((r) => r.population / 1e9),
          rate,
          crossings: crossingsOut,
          peak: { year: peak.year, text: `${one(peak.value)}${NB}% · ${peak.year}` },
          xTicks,
          words,
          alt,
          regs,
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applyPopulationState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
