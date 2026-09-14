// Geneva's 2024, one cell per day, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `calendar heatmap` type in the scrolly format.
//
// THE SUBJECT OF `static-calendar-heatmap-geneva`, CHOREOGRAPHED. The streak search, the extremes, the
// warmest month, the quantile bins, the assertions and the colour rules are the static beat's own; the
// scroll tells them with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. one cell a day — the year fills, day by day;
//   2. the six bins — the key arrives under the full year;
//   3. how many days passed 20 °C — the others step back to a neutral;
//   4. the longest run — July and August open, print their values, the outline traces and counts to 31;
//   5. August, not July — back to the year, every month's mean beside its row;
//   6. the two extremes — ringed and named.
//
// Usage:  bun proof/scrolly-calendar-heatmap-geneva/render-directions-scrolly.mjs

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
import { DirectedCalendarScrolly } from "./DirectedCalendarScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const UNIT = "°C";
const THRESHOLD = 20;
const EYEBROW = "Climat · Genève";
/** A number and its unit never part at a line end: "20 °C", not "20 / °C" (measured on a phone title). */
const NB = "\u00A0";
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// ── the days, and the static beat's own assertions ─────────────────────────────────────────────
const days = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map(([date, mean], index) => {
    const [y, m, d] = date.split("-").map(Number);
    if (y !== YEAR) throw new Error(`the frozen file carries ${y}, not ${YEAR}`);
    return { date, index, month: m - 1, day: d, value: Number(mean) };
  });
for (let i = 1; i < days.length; i++)
  if (days[i].month * 40 + days[i].day <= days[i - 1].month * 40 + days[i - 1].day)
    throw new Error(`the frozen file is not in calendar order at ${days[i].date}; the year fills day by day in file order`);
const daysInMonth = (month) => new Date(YEAR, month + 1, 0).getDate();
const expected = MONTHS.reduce((sum, _, m) => sum + daysInMonth(m), 0);
if (days.length !== expected) throw new Error(`expected ${expected} days in ${YEAR}, got ${days.length}`);

let best = { length: 0, from: null, to: null };
let run = [];
for (const day of days) {
  if (day.value >= THRESHOLD) run.push(day);
  else {
    if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
    run = [];
  }
}
if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
if (best.length < 7) throw new Error(`the headline is about a run of days; the longest is ${best.length}`);

const hottest = days.reduce((a, b) => (b.value > a.value ? b : a));
const coldest = days.reduce((a, b) => (b.value < a.value ? b : a));
const monthlyMean = MONTHS.map((name, m) => {
  const of = days.filter((d) => d.month === m);
  return { name, month: m, mean: of.reduce((s, d) => s + d.value, 0) / of.length };
});
const warmestMonth = monthlyMean.reduce((a, b) => (b.mean > a.mean ? b : a));
const july = monthlyMean[6];
if (warmestMonth.month === 6) throw new Error("a card says the warmest month is not July; on this data it is");

/** Six bins, roughly equal in count, their breaks quantiles of the year's own readings. */
const sorted = [...days.map((d) => d.value)].sort((a, b) => a - b);
const quantile = (p) => sorted[Math.floor(p * (sorted.length - 1))];
const breaks = [0.166, 0.333, 0.5, 0.666, 0.833].map((p) => Math.round(quantile(p)));
if (new Set(breaks).size !== breaks.length) throw new Error(`two bins share a break after rounding: ${breaks.join(", ")}`);

/** A count the third card states and the filter draws. */
const warmDays = days.filter((d) => d.value >= THRESHOLD).length;
if (!(warmDays > best.length)) throw new Error(`the streak is part of the warm days; ${warmDays} warm days against a run of ${best.length}`);

/** One box per month the streak crosses. */
const runs = [];
for (let month = best.from.month; month <= best.to.month; month++)
  runs.push({ month, from: month === best.from.month ? best.from.day : 1, to: month === best.to.month ? best.to.day : daysInMonth(month) });

/** A negative reading takes the minus sign, not the hyphen `toLocaleString` writes. */
const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })).replace(/^-/, "\u2212");
const format = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const asDay = (day) => `${day.day} ${MONTHS[day.month].toLowerCase()}`;

// ── the words: the static beat's, one reading per card ─────────────────────────────────────────
const title = [
  `Genève a tenu ${best.length} jours d’affilée au-dessus de ${THRESHOLD}${NB}${UNIT} en ${YEAR}`,
  `${best.length} jours d’affilée au-dessus de ${THRESHOLD}${NB}${UNIT} à Genève`,
  `${best.length} jours au-dessus de ${THRESHOLD}${NB}${UNIT}`,
];
const prose = [
  [`Température moyenne de chaque jour de ${YEAR} à Genève, une case par jour, une ligne par mois.`],
  [`Six classes, qui contiennent à peu près autant de jours chacune ; leur borne est écrite en ${UNIT}.`],
  [`${warmDays} jours de ${YEAR} ont dépassé ${THRESHOLD}${NB}${UNIT} en moyenne.`],
  [`La série la plus longue court du ${asDay(best.from)} au ${asDay(best.to)} : ${best.length} jours d’affilée.`],
  [`Le mois le plus chaud est ${warmestMonth.name.toLowerCase()} (${one(warmestMonth.mean)}), et non juillet (${one(july.mean)}).`],
  [
    `Le jour le plus chaud est le ${asDay(hottest)} (${one(hottest.value)}), le plus froid le ${asDay(coldest)} (${one(coldest.value)}). Les cases pâles sans valeur sont des dates qui n’existent pas.`,
  ],
];
const counterSuffix = `jours au-dessus de ${THRESHOLD}${NB}${UNIT}`;
const meansLabel = "moyenne";
const means = monthlyMean.map((m) => ({ value: m.mean, label: one(m.mean) }));
const hotText = `${asDay(hottest)} · ${one(hottest.value)}${NB}${UNIT}`;
const coldText = `${asDay(coldest)} · ${one(coldest.value)}${NB}${UNIT}`;
const source = `Source : Open-Meteo (réanalyse ERA5), moyenne journalière à 2 m, Genève · données ${YEAR}, gelées le 9 septembre 2026`;
const keyLabel = `moyenne du jour, en ${UNIT}`;
const missingLabel = "date qui n’existe pas";
const alt =
  `Calendrier en couleurs : la température moyenne de chacun des ${days.length} jours de ${YEAR} à Genève, une ligne par ` +
  `mois et une colonne par quantième. Le bloc entouré court du ${asDay(best.from)} au ${asDay(best.to)}, ${best.length} jours ` +
  `consécutifs au-dessus de ${THRESHOLD}${NB}${UNIT}. Le jour le plus chaud est le ${asDay(hottest)} (${one(hottest.value)}) et le ` +
  `plus froid le ${asDay(coldest)} (${one(coldest.value)}).`;

/** One state per card; see `calendar-drive.mjs`. */
const STATES = [
  { fill: 0, key: 0, filter: 0, zoom: 0, outline: 0, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 0, zoom: 0, outline: 0, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 1, zoom: 0, outline: 0, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 1, zoom: 1, outline: 1, means: 0, extremes: 0 },
  { fill: 1, key: 1, filter: 0, zoom: 0, outline: 1, means: 1, extremes: 0 },
  { fill: 1, key: 1, filter: 0, zoom: 0, outline: 1, means: 1, extremes: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${MONTHS.join(" ")} 1 5 10 15 20 25 31 ${breaks.map(format).join(" ")} ${keyLabel} ${missingLabel} ${meansLabel} ${days.map((d) => one(d.value)).join(" ")}`,
  annot: `${hotText} ${coldText}`,
  value: `${best.length} ${counterSuffix} ${means.map((m) => m.label).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "calendar-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["calendrier", "classes", "chauds", "serie", "mois", "extremes"][i], prose: p })),
      reveal: {
        element: createElement(DirectedCalendarScrolly, {
          days: days.map(({ index, month, day, value }) => ({ index, month, day, value, label: one(value) })),
          months: MONTHS,
          breaks,
          threshold: THRESHOLD,
          runs,
          counterSuffix,
          streakLength: best.length,
          means,
          meansLabel,
          warmest: warmestMonth.month,
          hot: { month: hottest.month, day: hottest.day, text: hotText },
          cold: { month: coldest.month, day: coldest.day, text: coldText },
          keyLabel,
          missingLabel,
          format,
          alt,
          regs,
          pad: direction.pad,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applyCalendarState",
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
