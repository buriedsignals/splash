// twin/proof/static-gantt-top-ten-tenure/render-directions.mjs
//
// Tenure in the world's ten largest CO2 emitters, 1990–2024, drawn once per filed direction through
// the design base. The fourteenth beat in this tree and the fifth of the nine forms the harvest
// reached with no directed component.
//
// The spans are COMPUTED from the frozen ranking, not listed: for every year the top ten is taken,
// and a country's runs are the maximal stretches of consecutive years it held a place. A row drawn
// in two pieces is a row with a gap, and a gap is a finding — Italy has one, South Korea has one,
// and the beat says so rather than smoothing them into a single bar.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-gantt-top-ten-tenure/render-directions.mjs

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
import { DirectedGantt } from "./DirectedGantt.tsx";
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
const FIRST = 1990;
const LAST = 2024;
const SLOTS = 10;
const EYEBROW = "Climat · Monde";
const refused = [];

const FRENCH = {
  China: "Chine",
  "United States": "États-Unis",
  India: "Inde",
  Russia: "Russie",
  Japan: "Japon",
  Germany: "Allemagne",
  Canada: "Canada",
  "United Kingdom": "Royaume-Uni",
  Italy: "Italie",
  Ukraine: "Ukraine",
  Kuwait: "Koweït",
  "South Korea": "Corée du Sud",
  France: "France",
  Iran: "Iran",
  "Saudi Arabia": "Arabie saoudite",
  Indonesia: "Indonésie",
};
const french = (entity) => {
  if (!FRENCH[entity])
    throw new Error(
      `${entity} reached the top ${SLOTS} and this plate has no French name for it — the membership ` +
        `is computed, so the copy has to follow the data rather than last year's members`,
    );
  return FRENCH[entity];
};

const readings = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map((c) => ({ entity: c[0], code: c[1], year: Number(c[2]), value: Number(c[3]) }))
  .filter(
    (r) =>
      /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value) && r.year >= FIRST && r.year <= LAST,
  );

const years = [...new Set(readings.map((r) => r.year))].sort((a, b) => a - b);
if (years.length !== LAST - FIRST + 1)
  throw new Error(`expected every year from ${FIRST} to ${LAST}, got ${years.length}`);

/** Who held a place each year — the same membership the bump beat draws as rank. */
const held = new Map();
for (const year of years)
  for (const r of readings
    .filter((r) => r.year === year)
    .sort((a, b) => b.value - a.value)
    .slice(0, SLOTS)) {
    if (!held.has(r.entity)) held.set(r.entity, []);
    held.get(r.entity).push(year);
  }

/** A row's RUNS: maximal stretches of consecutive years. Two runs mean the row was interrupted, and
 *  the plate draws the interruption rather than one bar from first to last. */
const rows = [...held.entries()]
  .map(([entity, ys]) => {
    const runs = [];
    let from = ys[0];
    let prev = ys[0];
    for (const y of ys.slice(1)) {
      if (y !== prev + 1) {
        runs.push({ from, to: prev, open: false });
        from = y;
      }
      prev = y;
    }
    runs.push({ from, to: prev, open: prev === LAST });
    return {
      key: entity,
      label: french(entity),
      runs,
      years: ys.length,
      throughout: ys.length === years.length,
      firstYear: ys[0],
    };
  })
  .sort((a, b) => a.firstYear - b.firstYear || b.years - a.years);

const throughout = rows.filter((r) => r.throughout);
const interrupted = rows.filter((r) => r.runs.length > 1);
const openRows = rows.filter((r) => r.runs.some((run) => run.open));
if (throughout.length < 2)
  throw new Error(`the headline says several countries never left; ${throughout.length} did not`);

const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.years })),
  {
    subject: throughout[0].key,
    spans: rows.flatMap((r) =>
      r.runs.map((run) => ({ key: r.key, from: run.from, to: run.open ? null : run.to })),
    ),
    namedSeries: rows.map((r) => r.label),
    declaredSequence: "entry",
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${rows.length} pays · ${throughout.length} présents chaque année · ${interrupted.length} rangs interrompus · ` +
    `${facts.openSpanCount} spans ouverts · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const spelled = (n) => SPELLED[n] ?? String(n);
/** ABBREVIATE THE CLOSING YEAR, NEVER THE OPENING ONE — ABC's own corollary — and write a still
 *  running span as a trailing dash, which is ABC's whole notation for it. */
const shortEnd = (from, to) =>
  Math.floor(from / 100) === Math.floor(to / 100) ? String(to).slice(-2) : String(to);
const spanLabel = (row) =>
  row.runs
    .map((run) =>
      run.open
        ? `${run.from}–`
        : // A one-year span is one year, not `1990–90`: the abbreviation rule is there to shorten a
          // range, and a range of one is a date.
          run.from === run.to
          ? `${run.from}`
          : `${run.from}–${shortEnd(run.from, run.to)}`,
    )
    .join(", ");

const title = `${spelled(throughout.length).replace(/^s/, "S")} pays n’ont jamais quitté le top ${SLOTS} des émetteurs depuis ${FIRST}`;
/** The standfirst and its short form. The component spends the reading line first and this second;
 *  sixteen rows keep their labels either way. */
const limits = [
  `Présence dans les ${SLOTS} plus gros émetteurs annuels de CO2 du monde, année par année, de ${FIRST} à ${LAST}. ` +
    `${rows.length} pays y ont figuré au moins une fois ; ${throughout.length} chaque année, ` +
    `${rows.length - throughout.length} sont entrés, sortis, ou les deux.`,
  `Présence dans les ${SLOTS} plus gros émetteurs annuels de CO2, ${FIRST}–${LAST} : ${rows.length} pays ` +
    `au moins une fois, ${throughout.length} chaque année.`,
];
/** The reading line and its short forms: sixteen rows need their pitch more than the plate needs
 *  this sentence, and the component drops to the next rung rather than to an unlabelled row. */
const reading = [
  `Lecture : chaque barre est une présence continue, posée sur l’axe des dates — sa position dit ` +
    `QUAND, sa longueur COMBIEN DE TEMPS, et les deux années sont écrites dans l’étiquette. Une ` +
    `barre qui touche le bord droit est toujours en cours ; ${interrupted.length} rangs sont ` +
    `interrompus, et le trou est réel.`,
  `Lecture : position = quand, longueur = combien de temps ; les deux années sont dans l’étiquette, ` +
    `une barre au bord droit est en cours, et un trou dans un rang est réel.`,
  `Lecture : les deux années sont dans l’étiquette ; une barre au bord droit est toujours en cours.`,
];
const source =
  "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${FIRST} ${LAST}`,
  annot: `${rows.map((r) => `${r.label} ${spanLabel(r)}`).join(" ")} ${reading.join(" ")}`,
  value: rows.map((r) => spanLabel(r)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: 3 };
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
      element: createElement(DirectedGantt, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        first: FIRST,
        last: LAST,
        title,
        limits,
        reading,
        source,
        alt:
          `Diagramme de Gantt : la présence de ${rows.length} pays dans les ${SLOTS} plus gros émetteurs ` +
          `mondiaux de CO2 entre ${FIRST} et ${LAST}. ${throughout.length} barres traversent tout le ` +
          `graphique — ${throughout.map((r) => r.label).join(", ")} — les autres commencent ou ` +
          `s’arrêtent en chemin, et ${interrupted.length} sont coupées en deux.`,
        eyebrow: EYEBROW,
        spanLabel,
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
    console.log(`  -> renders/${id}.png\n`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${id}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`  REFUSED — ${error.message}\n`);
  }
}

if (refused.length)
  console.log(`refused by ${refused.length}: ${refused.map((r) => r.id).join(", ")}`);
