// France's per-capita CO₂ emissions, 1950–2024, by decade, rendered once per FILED DIRECTION into a self-contained
// scrolly page. The `box plot` type in the scrolly format.
//
// THE SUBJECT OF `more-boxplot-france-co2-decades`, CHOREOGRAPHED. The readings, the decades, the whisker rule and the
// claim are the static beat's own; the static is set in English, so this beat is set in French through the filed
// directions. The scroll tells it with its own gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. every year a point in time: the rise, the 1973 peak, the fall;
//   2. the points gathered into their decades;
//   3. each column closed into its box;
//   4. the medians joined: the 1970s peak, then lower every decade;
//   5. the spread: the widest decade, and the partial last one;
//   6. the static plate, its whisker rule stated.
//
// Usage:  bun proof/scrolly-boxplot-france-co2-decades/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { quantile } from "d3-array";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedBoxplotScrolly } from "./DirectedBoxplotScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · France";
const NB = "\u00A0";
const FROM = 1950;
const FENCE = 1.5;

// ── the readings, and the static beat's own assertions ─────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rows = csv.slice(1).map((l) => l.split(","));
const entities = new Set(rows.map((r) => r[header.indexOf("Entity")]));
if (entities.size !== 1 || !entities.has("France")) throw new Error(`expected only France in the frozen data, got ${[...entities].join(", ")}`);
const valueAt = header.findIndex((h) => h.startsWith("CO"));
const readings = rows.map((r) => ({ year: Number(r[header.indexOf("Year")]), value: Number(r[valueAt]) })).filter((r) => r.year >= FROM && Number.isFinite(r.value)).sort((a, b) => a.year - b.year);
const lastYear = readings[readings.length - 1].year;
for (let y = FROM; y <= lastYear; y++) if (!readings.some((r) => r.year === y)) throw new Error(`${y} is missing from the series`);
const decades = [...new Set(readings.map((r) => Math.floor(r.year / 10) * 10))];
const boxesRaw = decades.map((d) => {
  const values = readings.filter((r) => Math.floor(r.year / 10) * 10 === d).map((r) => r.value);
  const q1 = quantile(values, 0.25);
  const median = quantile(values, 0.5);
  const q3 = quantile(values, 0.75);
  const iqr = q3 - q1;
  const inFence = values.filter((v) => v >= q1 - FENCE * iqr && v <= q3 + FENCE * iqr);
  return { decade: d, n: values.length, q1, median, q3, lo: Math.min(...inFence), hi: Math.max(...inFence), fence: [q1 - FENCE * iqr, q3 + FENCE * iqr], min: Math.min(...values), max: Math.max(...values) };
});
const peakBox = boxesRaw.reduce((a, b) => (b.median > a.median ? b : a));
if (peakBox.decade !== 1970) throw new Error(`the headline says the median peaked in the 1970s; it peaked in the ${peakBox.decade}s`);
for (let i = boxesRaw.indexOf(peakBox) + 1; i < boxesRaw.length; i++) if (!(boxesRaw[i].median < boxesRaw[i - 1].median)) throw new Error(`card 4 says every decade after the peak is lower; ${boxesRaw[i].decade}s is not`);
const partial = boxesRaw.filter((b) => b.n < 10);
if (partial.length !== 1 || partial[0] !== boxesRaw[boxesRaw.length - 1]) throw new Error(`card 5 says only the last decade is partial; ${partial.map((b) => b.decade).join(", ")}`);
const peakYear = readings.reduce((a, b) => (b.value > a.value ? b : a));
if (peakYear.year !== 1973) throw new Error(`card 1 names 1973 as the highest year; it is ${peakYear.year}`);
const outliers = readings.filter((r) => {
  const b = boxesRaw.find((x) => x.decade === Math.floor(r.year / 10) * 10);
  return r.value < b.fence[0] || r.value > b.fence[1];
});
if (outliers.length !== 1 || outliers[0].year !== 1980) throw new Error(`card 3 names one outlier, 1980; the fence finds ${outliers.map((o) => o.year).join(", ") || "none"}`);
const widestExtent = boxesRaw.reduce((a, b) => (b.max - b.min > a.max - a.min ? b : a));
if (widestExtent.decade !== 1980) throw new Error(`card 5 says the 1980s spread widest; the widest is the ${widestExtent.decade}s`);
const [first, last] = [boxesRaw[0], boxesRaw[boxesRaw.length - 1]];
console.log(`${boxesRaw.map((b) => `${b.decade}:${b.median.toFixed(2)}`).join(" ")} · pic ${peakYear.year} ${peakYear.value.toFixed(2)} · aberrant ${outliers.map((o) => `${o.year} ${o.value.toFixed(2)}`).join(", ")}\n`);

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const two = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const label = (d) => `${d}`;
const boxes = boxesRaw.map((b) => ({
  label: label(b.decade),
  decade: b.decade,
  n: b.n,
  q1: b.q1,
  median: b.median,
  q3: b.q3,
  lo: b.lo,
  hi: b.hi,
  medianText: `${two(b.median)}${NB}t`,
  nText: `${b.n}${NB}ans`,
  spreadText: `${one(b.min)} à ${one(b.max)}${NB}t`,
  focus: b === widestExtent || b === last,
}));
const all = readings.map((r) => r.value);
const domain = [Math.floor(Math.min(...all)) - 0.5, Math.ceil(Math.max(...all)) + 0.5];
const ticks = [];
for (let t = Math.ceil(domain[0]); t <= Math.floor(domain[1]); t += 2) ticks.push(t);
const drop = ((peakBox.median - last.median) / peakBox.median) * 100;
const out = outliers[0];

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Les émissions de CO₂ par Français ont culminé dans les années ${peakBox.decade}`,
  `Le CO₂ par Français, au plus haut dans les années ${peakBox.decade}`,
  `Le CO₂ par Français, décennie par décennie`,
];
const prose = [
  [`Les émissions de CO₂ d’un Français moyen, chaque année de ${FROM} à ${lastYear}. Elles montent jusqu’à ${one(peakYear.value)}${NB}tonnes en ${peakYear.year}, puis redescendent.`],
  [`Rangeons chaque année dans sa décennie.`],
  [`Chaque décennie devient une boîte : la moitié centrale des années, la médiane en trait, les moustaches jusqu’aux années les plus éloignées. ${out.year}, à ${one(out.value)}${NB}t, reste un point à part.`],
  [`Les médianes : ${two(first.median)}${NB}t dans les années ${first.decade}, ${two(peakBox.median)}${NB}t au sommet dans les années ${peakBox.decade}, puis plus bas à chaque décennie, jusqu’à ${two(last.median)}${NB}t.`],
  [`Les années ${widestExtent.decade} sont les plus étalées : de ${one(widestExtent.min)} à ${one(widestExtent.max)}${NB}t. La dernière boîte ne compte que ${last.n}${NB}ans, de ${last.decade} à ${lastYear}.`],
  [`Lecture : chaque boîte couvre la moitié centrale des années de sa décennie ; les moustaches s’arrêtent à ${plainSpaces(FENCE.toLocaleString("fr-FR"))}${NB}fois l’écart interquartile, au-delà une année est un point.`],
];
const source = "Source : Global Carbon Budget 2025, via Our World in Data · France";
const words = {
  unit: "tonnes de CO₂ par personne",
  rule: `moustaches${NB}: ${plainSpaces(FENCE.toLocaleString("fr-FR"))}${NB}× l’écart interquartile`,
  yearsNote: `${peakYear.year}${NB}: ${one(peakYear.value)}${NB}t`,
  decadesNote: `${boxes.length} décennies`,
  boxNote: `1 année aberrante${NB}: ${out.year}`,
  medianNote: `médiane${NB}: ${two(peakBox.median)} puis ${two(last.median)}${NB}t, −${Math.round(drop)}${NB}%`,
  spreadNote: `années ${widestExtent.decade}${NB}: les plus étalées`,
  ruleNote: `${FROM}–${lastYear}, par décennie`,
};
const alt =
  `Boîtes à moustaches : les émissions annuelles de CO₂ par Français, regroupées par décennie de ${FROM} à ${lastYear}. ` +
  `La médiane culmine dans les années ${peakBox.decade} à ${two(peakBox.median)} tonnes, puis baisse à chaque décennie jusqu’à ${two(last.median)} tonnes.`;

/** One state per card; see `boxplot-drive.mjs` for what each field paints. */
const STATES = [
  { group: 0, box: 0, medians: 0, spread: 0, rule: 0, note: 0 },
  { group: 1, box: 0, medians: 0, spread: 0, rule: 0, note: 1 },
  { group: 1, box: 1, medians: 0, spread: 0, rule: 0, note: 2 },
  { group: 1, box: 1, medians: 1, spread: 0, rule: 0, note: 3 },
  { group: 1, box: 1, medians: 0, spread: 1, rule: 0, note: 4 },
  { group: 1, box: 1, medians: 0, spread: 0, rule: 1, note: 5 },
];
const xTicks = [1950, 1970, 1990, 2010, lastYear];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${words.rule} ${ticks.join(" ")} ${xTicks.join(" ")} ${boxes.map((b) => `${b.nText} ${b.spreadText}`).join(" ")} ${out.year} ${one(out.value)} t`,
  annot: boxes.map((b) => b.label).join(" "),
  value: `${boxes.map((b) => b.medianText).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")} ${peakYear.year} ${one(peakYear.value)} t`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "boxplot-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["annees", "decennies", "boites", "medianes", "dispersion", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedBoxplotScrolly, {
          boxes,
          points: readings.map((r) => ({ year: r.year, value: r.value, decade: Math.floor(r.year / 10) * 10, outlier: outliers.includes(r) })),
          domain,
          ticks,
          xTicks,
          peakYear: { year: peakYear.year, text: `${peakYear.year}${NB}: ${one(peakYear.value)}${NB}t` },
          outlierText: `${out.year}${NB}: ${one(out.value)}${NB}t`,
          words,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
          grid,
        }),
        states: STATES,
        driver,
        apply: "applyBoxplotState",
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
