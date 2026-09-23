// twin/proof/static-calendar-heatmap-geneva/render-directions.mjs
//
// Geneva's 2024, one cell per day, drawn once per filed direction through the design base. The
// eighteenth beat in this tree and the LAST of the nine forms the harvest reached with no directed
// component.
//
// The streak the headline is about is COMPUTED — the longest run of consecutive days at or above a
// stated threshold — and asserted before a mark is drawn, along with the two extremes and the
// warmest month. The impossible dates a calendar carries (31 February and its four siblings) are
// counted rather than assumed, because a leap year moves them.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-calendar-heatmap-geneva/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedCalendarHeatmap } from "./DirectedCalendarHeatmap.tsx";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
/** THE SIZE THIS RUN DRAWS AT, and whether this beat's own type may enter it at all: a tall frame is a
 *  different drawing, not a stretched one, and `type-at-size.mjs` refuses a type whose range nobody has
 *  measured rather than shipping an aspect nobody chose. */
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });
const YEAR = 2024;
const UNIT = "°C";
const THRESHOLD = 20;
const EYEBROW = "Climat · Genève";
const refused = [];

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
/** THE SAME TWELVE, ABBREVIATED, for a frame whose row gutter cannot hold them. They are written
 *  out rather than cut to a fixed number of letters because « Juin » and « Juillet » both truncate
 *  to « Jui » and the two hottest rows of this plate would then carry the same name. */
const MONTHS_SHORT = [
  "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

const rows = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map(([date, mean]) => ({ date, value: Number(mean) }));

const days = rows.map((r) => {
  const [y, m, d] = r.date.split("-").map(Number);
  if (y !== YEAR) throw new Error(`the frozen file carries ${y}, not ${YEAR}`);
  return { date: r.date, month: m - 1, day: d, value: r.value };
});
const daysInMonth = (month) => new Date(YEAR, month + 1, 0).getDate();
const expected = MONTHS.reduce((sum, _, m) => sum + daysInMonth(m), 0);
if (days.length !== expected)
  throw new Error(`expected ${expected} days in ${YEAR}, got ${days.length}`);

/** The positions a 31-column calendar has to hold and the year cannot fill. A leap year moves them,
 *  so they are counted rather than listed. */
const impossibleCells = MONTHS.reduce((sum, _, m) => sum + (31 - daysInMonth(m)), 0);

/** The longest run of consecutive days at or above the threshold — the headline, computed. */
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
if (best.length < 7)
  throw new Error(`the headline is about a run of days; the longest is ${best.length}`);

const hottest = days.reduce((a, b) => (b.value > a.value ? b : a));
const coldest = days.reduce((a, b) => (b.value < a.value ? b : a));
const monthlyMean = MONTHS.map((name, m) => {
  const of = days.filter((d) => d.month === m);
  return { name, month: m, mean: of.reduce((s, d) => s + d.value, 0) / of.length };
});
const warmestMonth = monthlyMean.reduce((a, b) => (b.mean > a.mean ? b : a));
const july = monthlyMean[6];
if (warmestMonth.month === 6)
  throw new Error("the standfirst says the warmest month is not July; on this data it is");

/** Six bins, roughly equal in count — ABC's rule, so no single step swamps the picture. The breaks
 *  are quantiles of the year's own readings, rounded to the degree a reader can hold. */
const sorted = [...days.map((d) => d.value)].sort((a, b) => a - b);
const quantile = (p) => sorted[Math.floor(p * (sorted.length - 1))];
const breaks = [0.166, 0.333, 0.5, 0.666, 0.833].map((p) => Math.round(quantile(p)));
if (new Set(breaks).size !== breaks.length)
  throw new Error(`two bins share a break after rounding: ${breaks.join(", ")}`);

const facts = beatFacts(
  monthlyMean.map((m) => ({ key: m.name, label: m.name, value: m.mean })),
  {
    subject: warmestMonth.name,
    cells: days.map((d) => ({ key: d.date, value: d.value })),
    impossibleCells,
    declaredSequence: "calendar",
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${days.length} jours · ${impossibleCells} cases impossibles · série la plus longue ${best.length} j ` +
    `(${best.from.date} → ${best.to.date}) · mois le plus chaud ${warmestMonth.name} ` +
    `(${warmestMonth.mean.toFixed(1)} contre ${july.mean.toFixed(1)} en juillet) · ` +
    `treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const plainSpaces = (text) => text.replace(/[  ]/g, " ");
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const asDay = (day) => `${day.day} ${MONTHS[day.month].toLowerCase()}`;

/** THE COPY IN FORMS, longest first — R3's rung and R4's, written as copy rather than as a cut.
 *  Landscape takes the first of each. At 1080x1080 the header left the twelve rows 100px and the
 *  month names printed straight through one another, « Janvier » over « Février » over « Mars »;
 *  creme and nocturne REFUSED outright. */
const title = [
  `Genève a tenu ${best.length} jours d’affilée au-dessus de ${THRESHOLD} ${UNIT} en ${YEAR}`,
  `${best.length} jours d’affilée au-dessus de ${THRESHOLD} ${UNIT} à Genève`,
  `Genève, jour par jour, en ${YEAR}`,
];
const limits = [
  `Température moyenne de chaque jour de ${YEAR} à Genève, une case par jour. La série la plus ` +
    `longue au-dessus de ${THRESHOLD} ${UNIT} court du ${asDay(best.from)} au ${asDay(best.to)}. ` +
    `Le mois le plus chaud est ${warmestMonth.name.toLowerCase()} (${one(warmestMonth.mean)}) et non ` +
    `juillet (${one(july.mean)}) ; le jour le plus chaud est le ${asDay(hottest)} ` +
    `(${one(hottest.value)}), le plus froid le ${asDay(coldest)} (${one(coldest.value)}).`,
  `Température moyenne de chaque jour de ${YEAR} à Genève, une case par jour. La série la plus ` +
    `longue au-dessus de ${THRESHOLD} ${UNIT} court du ${asDay(best.from)} au ${asDay(best.to)}.`,
  `Température moyenne de chaque jour de ${YEAR} à Genève, une case par jour.`,
];
const reading = [
  `Lecture : une ligne par mois, une colonne par quantième. Les six classes contiennent à peu près ` +
    `autant de jours chacune et leur borne est écrite en ${UNIT}. Le trait accent entoure la série du ` +
    `titre ; les cases pâles sans valeur sont des dates qui n’existent pas.`,
  `Lecture : une ligne par mois, une colonne par quantième. Les six classes contiennent à peu près ` +
    `autant de jours chacune et leur borne est écrite en ${UNIT}.`,
  `Lecture : une ligne par mois, une colonne par quantième.`,
];
const source =
  `Source : Open-Meteo (réanalyse ERA5), moyenne journalière à 2 m, Genève · données ${YEAR}, gelées le 9 septembre 2026`;

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${MONTHS.join(" ")} ${MONTHS_SHORT.join(" ")} 1 5 10 15 20 25 31 ${breaks.map(format).join(" ")} ${UNIT} moyenne du jour date qui n’existe pas`,
  annot: reading.join(" "),
  value: "",
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 2 };
console.log(
  report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), {
    beat: BEAT_FACTS,
  }),
);
console.log("");

for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);

  console.log(id);
  for (const d of direction.decisions)
    console.log(
      `  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}` +
        (d.refused.length
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  try {
    await renderStill({
      element: createElement(DirectedCalendarHeatmap, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        days,
        months: MONTHS,
        monthsShort: MONTHS_SHORT,
        breaks,
        streak: { from: best.from, to: best.to, length: best.length, threshold: THRESHOLD },
        unit: UNIT,
        title,
        limits,
        reading,
        source,
        alt:
          `Calendrier en couleurs : la température moyenne de chacun des ${days.length} jours de ` +
          `${YEAR} à Genève, une ligne par mois et une colonne par quantième. Le bloc entouré court ` +
          `du ${asDay(best.from)} au ${asDay(best.to)}, ${best.length} jours consécutifs au-dessus de ` +
          `${THRESHOLD} ${UNIT}. Le jour le plus chaud est le ${asDay(hottest)} (${one(hottest.value)}) ` +
          `et le plus froid le ${asDay(coldest)} (${one(coldest.value)}).`,
        eyebrow: EYEBROW,
        format,
        direction,
        treatments: offered.map((t) => t.id),
      }),
      // THE SLOT'S OWN SIZE. `--size` picks it; landscape is what an article's column asks for and
      // what this lineage's tuning was measured at. The frame is half the export size at scale 2.
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`  -> renders/${nameAtSize(id, SIZE)}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"])
      await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
