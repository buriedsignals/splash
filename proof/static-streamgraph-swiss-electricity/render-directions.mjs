// twin/proof/static-streamgraph-swiss-electricity/render-directions.mjs
//
// Swiss electricity by source, 2000–2024, drawn once per filed direction through the design base.
// The sixteenth beat in this tree and the seventh of the nine forms the harvest reached with no
// directed component.
//
// The claim is a RANK over time — solar becoming the third source — so it is computed year by year
// and asserted: the year it is first reached, and that it has held every year since. A streamgraph
// is the form least able to prove such a claim by eye, which is exactly why the numbers are printed.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-streamgraph-swiss-electricity/render-directions.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { composeDirections, report } from "../../scripts/design-base/compose.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { DirectedStreamgraph } from "./DirectedStreamgraph.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FIRST = 2000;
/** 2025 is in the frozen file and is PARTIAL — 65.0 TWh against 78.4, hydropower 34.0 against 44.9.
 *  Drawn on a stream it reads as a collapse, so the beat stops at the last complete year and says so
 *  in its own BRIEF. */
const LAST = 2024;
const UNIT = "TWh";
const TRACKED = "Solar";
const RANK = 3;
const EYEBROW = "Énergie · Suisse";
const refused = [];

const LABELS = {
  Hydropower: "Hydraulique",
  Nuclear: "Nucléaire",
  Solar: "Solaire",
  Oil: "Pétrole",
  Gas: "Gaz",
  Bioenergy: "Bioénergie",
  "Other renewables": "Autres renouv.",
  Wind: "Éolien",
  Coal: "Charbon",
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const keys = header.slice(3);
const readings = csv
  .slice(1)
  .map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])))
  .filter((r) => Number(r.Year) >= FIRST && Number(r.Year) <= LAST)
  .map((r) => ({
    year: Number(r.Year),
    ...Object.fromEntries(keys.map((k) => [k, Number(r[k])])),
  }))
  .sort((a, b) => a.year - b.year);

if (readings.length !== LAST - FIRST + 1)
  throw new Error(`expected every year from ${FIRST} to ${LAST}, got ${readings.length}`);
const entities = new Set(
  csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])).Entity),
);
if (entities.size !== 1 || !entities.has("Switzerland"))
  throw new Error(`expected only Switzerland in the frozen data, got: ${[...entities].join(", ")}`);

/** The rank of the tracked source, year by year. The claim is about a rank, so the rank is what is
 *  computed — not a share, not a threshold. */
const rankIn = (reading) =>
  keys
    .map((k) => ({ k, v: reading[k] }))
    .sort((a, b) => b.v - a.v)
    .findIndex((r) => r.k === TRACKED) + 1;
const ranks = readings.map((r) => ({ year: r.year, rank: rankIn(r) }));
const reachedAt = ranks.find((r) => r.rank <= RANK);
if (!reachedAt) throw new Error(`${TRACKED} never reaches rank ${RANK} in this file`);
const held = ranks.filter((r) => r.year >= reachedAt.year).every((r) => r.rank <= RANK);
if (!held)
  throw new Error(
    `the headline says it has held rank ${RANK} since ${reachedAt.year}; it has not: ` +
      ranks
        .filter((r) => r.year >= reachedAt.year && r.rank > RANK)
        .map((r) => `${r.year} rank ${r.rank}`)
        .join(", "),
  );

const first = readings[0];
const last = readings[readings.length - 1];
const facts = beatFacts(
  keys.map((k) => ({ key: k, label: LABELS[k], value: last[k] })),
  {
    subject: TRACKED,
    layers: keys.map((k) => ({ key: k, peak: Math.max(...readings.map((r) => r[k])) })),
    freeBaseline: true,
    namedSeries: keys.map((k) => LABELS[k]),
    declaredSequence: "inside-out",
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${keys.length} couches · ${readings.length} années · ${TRACKED} atteint le rang ${RANK} en ` +
    `${reachedAt.year} et le tient depuis · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const plainSpaces = (text) => text.replace(/[  ]/g, " ");
const two = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => (v < 1 ? two(v) : one(v));
const totalOf = (r) => keys.reduce((sum, k) => sum + r[k], 0);

const title = `En ${reachedAt.year}, le solaire est devenu la troisième source d’électricité suisse`;
const limits =
  `Production électrique suisse par source, ${FIRST}–${LAST}, en ${UNIT}. Le solaire passe de ` +
  `${format(first[TRACKED])} à ${format(last[TRACKED])} ${UNIT} et double le pétrole en ` +
  `${reachedAt.year} ; l’hydraulique monte de ${format(first.Hydropower)} à ${format(last.Hydropower)}, ` +
  `le nucléaire descend de ${format(first.Nuclear)} à ${format(last.Nuclear)}.`;
const reading =
  `Lecture : l’épaisseur d’une bande est sa production, sa position ne veut rien dire — les couches ` +
  `sont empilées des plus grandes au centre vers les plus fines à l’extérieur. Il n’y a donc pas ` +
  `d’axe vertical : les quantités sont écrites.`;
const source =
  `Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · ` +
  `${LAST + 1} exclue, année incomplète`;

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: `${FIRST} ${LAST}`,
  annot: `${keys.map((k) => LABELS[k]).join(" ")} ${reading} Total`,
  value: `${format(first[TRACKED])} ${format(last[TRACKED])} ${UNIT}`,
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
      element: createElement(DirectedStreamgraph, {
        readings,
        keys,
        labels: LABELS,
        tracked: TRACKED,
        unit: UNIT,
        title,
        limits,
        reading,
        source,
        alt:
          `Streamgraph : la production électrique suisse par source de ${FIRST} à ${LAST}, neuf bandes ` +
          `empilées sans axe vertical. La bande solaire, en accent, passe de ${format(first[TRACKED])} ` +
          `à ${format(last[TRACKED])} ${UNIT} et devient la troisième source en ${reachedAt.year} ; ` +
          `l’hydraulique et le nucléaire restent les deux plus épaisses. Total ${first.year} : ` +
          `${format(totalOf(first))} ${UNIT}, ${last.year} : ${format(totalOf(last))} ${UNIT}.`,
        eyebrow: EYEBROW,
        format,
        direction,
        treatments: offered.map((t) => t.id),
      }),
      // The beat pins `landscape` (1920 x 1080); 960 x 540 at scale 2 delivers exactly that.
      width: 960,
      height: 540,
      outDir: OUT,
      name: id,
      scale: 2,
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
