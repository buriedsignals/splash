// Switzerland's territorial CO₂ emissions, 1950–2024, rendered once per FILED DIRECTION into a self-contained scrolly
// page. The `line` type in the scrolly format.
//
// THE SUBJECT OF `co2-suisse`, CHOREOGRAPHED. The readings, the 1967 reference and the claim — in 2024 the curve is back
// under its 1967 level — are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. the line drawn from 1950 to 1967, the 1967 level set as a rule;
//   2. on to the 1973 peak;
//   3. the plateau to 2010 read as a band, 1991 within a hair of the peak;
//   4. the fall, crossing the rule in 2023;
//   5. a close-up on the last ten years, every year written;
//   6. the static plate, its limit stated.
//
// Usage:  bun proof/scrolly-line-swiss-co2/render-directions-scrolly.mjs

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
import { DirectedLineScrolly } from "./DirectedLineScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const EYEBROW = "Climat · Suisse";
const NB = "\u00A0";
const FROM = 1950;
const REFERENCE_YEAR = 1967;
const PLATEAU_TO = 2010;
const ZOOM_FROM = 2015;

// ── the readings, and every sentence's assertion ───────────────────────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const cells = csv.slice(1).map((l) => l.split(","));
const entities = new Set(cells.map((c) => c[header.indexOf("Entity")]));
if (entities.size !== 1 || !entities.has("Switzerland")) throw new Error(`expected only Switzerland in the frozen data, got ${[...entities].join(", ")}`);
const valueAt = header.findIndex((h) => h.startsWith("Annual CO"));
const everyYear = cells.map((c) => ({ year: Number(c[header.indexOf("Year")]), mt: Number(c[valueAt]) / 1e6 })).filter((r) => Number.isFinite(r.mt)).sort((a, b) => a.year - b.year);
const readings = everyYear.filter((r) => r.year >= FROM);
const LAST = readings[readings.length - 1].year;
for (let y = FROM; y <= LAST; y++) if (!readings.some((r) => r.year === y)) throw new Error(`${y} is missing from the series`);
const at = (year) => readings.find((r) => r.year === year).mt;
const reference = at(REFERENCE_YEAR);
const start = at(FROM);
const ratio = reference / start;
if (!(ratio >= 3 && ratio < 3.5)) throw new Error(`card 1 says emissions tripled from ${FROM} to ${REFERENCE_YEAR}; the ratio is ${ratio.toFixed(2)}`);
const peak = everyYear.reduce((a, b) => (b.mt > a.mt ? b : a));
if (peak.year !== 1973) throw new Error(`card 2 names 1973 the highest year of the whole series; it is ${peak.year}`);
const plateauYears = readings.filter((r) => r.year > peak.year && r.year <= PLATEAU_TO);
const floor = plateauYears.reduce((a, b) => (b.mt < a.mt ? b : a));
const runnerUp = readings.filter((r) => r !== peak).reduce((a, b) => (b.mt > a.mt ? b : a));
if (runnerUp.year !== 1991 || !(peak.mt - runnerUp.mt < 0.1)) throw new Error(`card 3 names 1991 within 0.1 Mt of the peak; the runner-up is ${runnerUp.year}, ${(peak.mt - runnerUp.mt).toFixed(2)} Mt below`);
const after = readings.filter((r) => r.year > PLATEAU_TO);
if (!after.every((r) => r.mt < at(PLATEAU_TO))) throw new Error(`card 4 says the curve came down after ${PLATEAU_TO}; a later year is higher`);
const under = readings.filter((r) => r.year > REFERENCE_YEAR && r.mt < reference);
const cross = under[0];
if (!cross || cross.year !== 2023) throw new Error(`card 4 says the curve first went under the ${REFERENCE_YEAR} level in 2023; it is ${cross ? cross.year : "never"}`);
const last = readings[readings.length - 1];
if (!(last.mt < reference)) throw new Error(`the headline says ${LAST} is under the ${REFERENCE_YEAR} level; it is not`);
if (!(last.mt > cross.mt)) throw new Error(`card 5 says ${LAST} rose a little from ${cross.year}; it did not`);
const zoomReadings = readings.filter((r) => r.year >= ZOOM_FROM);
console.log(`${FROM} ${start.toFixed(2)} · ${REFERENCE_YEAR} ${reference.toFixed(2)} · pic ${peak.year} ${peak.mt.toFixed(2)} · ${runnerUp.year} ${runnerUp.mt.toFixed(2)} · plancher ${floor.year} ${floor.mt.toFixed(2)} · sous ${REFERENCE_YEAR} dès ${cross.year} ${cross.mt.toFixed(2)} · ${LAST} ${last.mt.toFixed(2)}\n`);

// Rounded to tenths first, so every sentence and every label round a reading the same way.
const one = (v) => plainSpaces((Math.round(v * 10) / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const two = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const mt = (v) => `${one(v)}${NB}Mt`;
const gap = reference - last.mt;
const zoomValues = zoomReadings.map((r) => r.mt);
const domains = {
  wide: { x: [FROM, LAST], y: [0, 50] },
  zoom: { x: [ZOOM_FROM - 0.5, LAST + 0.5], y: [Math.floor(Math.min(...zoomValues)) - 2, Math.ceil(Math.max(...zoomValues)) + 1] },
};
const zoomTicks = [];
for (let t = Math.ceil(domains.zoom.y[0] / 2) * 2; t <= domains.zoom.y[1]; t += 2) zoomTicks.push(t);
const ticks = {
  wide: { x: [1950, 1970, 1990, 2010], y: [0, 10, 20, 30, 40, 50] },
  zoom: { x: [2015, 2018, 2021, LAST], y: zoomTicks },
};

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `En ${LAST}, la Suisse a émis moins de CO₂ sur son territoire qu’en ${REFERENCE_YEAR}`,
  `Le CO₂ émis en Suisse, repassé sous son niveau de ${REFERENCE_YEAR}`,
  `Le CO₂ émis en Suisse, ${FROM}–${LAST}`,
];
const prose = [
  [`Le CO₂ émis sur le territoire suisse, année après année. De ${FROM} à ${REFERENCE_YEAR}, il triple : de ${mt(start)} à ${mt(reference)}. Gardons ce niveau de ${REFERENCE_YEAR} en repère.`],
  [`La montée continue six ans de plus, jusqu’à ${mt(peak.mt)} en ${peak.year} : le plus haut de toute la série.`],
  [`Puis un long plateau. De ${peak.year + 1} à ${PLATEAU_TO}, jamais sous ${mt(floor.mt)} ; en ${runnerUp.year}, ${mt(runnerUp.mt)}, à ${two(peak.mt - runnerUp.mt)}${NB}Mt du pic.`],
  [`Après ${PLATEAU_TO}, la courbe descend. En ${cross.year}, elle passe sous le niveau de ${REFERENCE_YEAR}, pour la première fois.`],
  [`De près : ${mt(cross.mt)} en ${cross.year}, ${mt(last.mt)} en ${LAST}. Une légère remontée, mais toujours ${mt(gap)} sous ${REFERENCE_YEAR}.`],
  [`Lecture : émissions sur le territoire suisse seulement, hors biens importés et aviation internationale.`],
];
const source = `Source : Global Carbon Budget 2025, via Our World in Data · données ${LAST}`;
const words = {
  unit: "millions de tonnes de CO₂ (Mt)",
  startNote: `${REFERENCE_YEAR}${NB}: ${mt(reference)}`,
  peakNote: `${peak.year}${NB}: ${mt(peak.mt)}`,
  plateauNote: `${peak.year}–${PLATEAU_TO}${NB}: le plateau`,
  crossNote: `${cross.year}${NB}: ${mt(cross.mt)}, sous ${REFERENCE_YEAR}`,
  zoomNote: `${ZOOM_FROM}–${LAST}, de près`,
  readNote: `${LAST}${NB}: ${mt(last.mt)}`,
};
const alt =
  `Courbe des émissions territoriales suisses de CO₂, ${FROM} à ${LAST} : une montée jusqu’à un pic en ${peak.year}, ` +
  `un plateau jusqu’en ${PLATEAU_TO}, puis une baisse qui repasse sous le niveau de ${REFERENCE_YEAR} en ${cross.year} et y reste en ${LAST}.`;

/** One state per card; see `line-drive.mjs` for what each field paints. */
const STATES = [
  { reach: REFERENCE_YEAR, peak: 0, band: 0, runner: 0, cross: 0, zoom: 0, end: 0, note: 0 },
  { reach: peak.year, peak: 1, band: 0, runner: 0, cross: 0, zoom: 0, end: 0, note: 1 },
  { reach: PLATEAU_TO, peak: 1, band: 1, runner: 1, cross: 0, zoom: 0, end: 0, note: 2 },
  { reach: LAST, peak: 0, band: 0, runner: 0, cross: 1, zoom: 0, end: 0, note: 3 },
  { reach: LAST, peak: 0, band: 0, runner: 0, cross: 1, zoom: 1, end: 0, note: 4 },
  { reach: LAST, peak: 1, band: 0, runner: 0, cross: 0, zoom: 0, end: 1, note: 5 },
];

// The annotation register is set in capitals by some directions, where "Mt" would read as another unit: the
// furniture labels carry numbers only, the unit stands in the header.
const labels = {
  reference: { year: REFERENCE_YEAR, value: reference, text: `niveau de ${REFERENCE_YEAR}${NB}: ${one(reference)}` },
  peak: { year: peak.year, value: peak.mt, text: `${peak.year}${NB}: ${one(peak.mt)}` },
  runnerUp: { year: runnerUp.year, value: runnerUp.mt, text: `${runnerUp.year}${NB}: ${one(runnerUp.mt)}` },
  cross: { year: cross.year, value: cross.mt, text: `${cross.year}${NB}: ${mt(cross.mt)}` },
  end: { year: LAST, value: last.mt, text: `${LAST}${NB}: ${mt(last.mt)}` },
};
const plateau = { from: peak.year, to: PLATEAU_TO, lo: floor.mt, hi: peak.mt, text: `${peak.year}–${PLATEAU_TO}${NB}: jamais sous ${one(floor.mt)}` };
const zoomYears = zoomReadings.map((r) => ({ year: r.year, value: r.mt, text: one(r.mt) }));

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${[...ticks.wide.x, ...ticks.wide.y, ...ticks.zoom.x, ...ticks.zoom.y].join(" ")}`,
  annot: `${labels.reference.text} ${labels.peak.text} ${labels.runnerUp.text} ${plateau.text}`,
  value: `${labels.cross.text} ${labels.end.text} ${zoomYears.map((z) => z.text).join(" ")} ${Object.entries(words).filter(([k]) => k.endsWith("Note")).map(([, v]) => v).join(" ")}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "line-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["montee", "pic", "plateau", "passage", "loupe", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedLineScrolly, {
          points: readings.map((r) => [r.year, r.mt]),
          ...labels,
          plateau,
          zoomYears,
          domains,
          ticks,
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
        apply: "applyLineState",
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
