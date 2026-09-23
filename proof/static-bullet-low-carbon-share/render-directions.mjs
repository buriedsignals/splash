// twin/proof/static-bullet-low-carbon-share/render-directions.mjs
//
// Low-carbon share of electricity, 2015 against 2024, drawn once per filed direction through the
// design base. The fifteenth beat in this tree and the sixth of the nine forms the harvest reached
// with no directed component.
//
// The two shares and the change are computed from the frozen file; both halves of the headline —
// that one country moved furthest, and that it is the only one still under half — are asserted
// before a mark is drawn.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-bullet-low-carbon-share/render-directions.mjs

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
import { DirectedBullet } from "./DirectedBullet.tsx";
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
const BEFORE = 2015;
const AFTER = 2024;
const EYEBROW = "Énergie · Europe";
const refused = [];

/** Low-carbon: nuclear and every renewable. The split is the one Ember's own columns make, not a
 *  judgement of this beat's — and it is named on the plate rather than left in a footnote. */
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const FRENCH = {
  France: "France",
  Germany: "Allemagne",
  Norway: "Norvège",
  Poland: "Pologne",
  Sweden: "Suède",
  Switzerland: "Suisse",
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const sources = header.slice(3);
const rowsRaw = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));

const shareFor = (entity, year) => {
  const row = rowsRaw.find((r) => r.Entity === entity && Number(r.Year) === year);
  if (!row) throw new Error(`no ${year} row for ${entity} in the frozen data`);
  const total = sources.reduce((sum, c) => sum + Number(row[c]), 0);
  const low = LOW_CARBON.reduce((sum, c) => sum + Number(row[c]), 0);
  return (low / total) * 100;
};

const entities = [...new Set(rowsRaw.map((r) => r.Entity))];
const rows = entities
  .map((entity) => ({
    key: entity,
    label: french(entity),
    marker: shareFor(entity, BEFORE),
    measure: shareFor(entity, AFTER),
  }))
  .sort((a, b) => b.measure - b.marker - (a.measure - a.marker));

const moved = rows[0];
const underHalf = rows.filter((r) => r.measure < 50);
if (underHalf.length !== 1 || underHalf[0].key !== moved.key)
  throw new Error(
    `the headline says the country that moved furthest is also the only one still under half; ` +
      `${underHalf.length} are under half (${underHalf.map((r) => r.key).join(", ")}) and the ` +
      `furthest is ${moved.key}`,
  );

/** The standfirst's second clause is a claim about a group, so the group is computed and the claim
 *  is asserted: a plate that says "the four already above 90 % gained less than a point" must be
 *  told when the data stops saying it. `claims-grounded-in-data` caught the `90` as a typed literal
 *  before this existed, which is the guard doing exactly its job. */
/** 95, not 90 — and the correction came from the assertion, not from re-reading the table. Written
 *  first as "the four already above 90 %", it threw: France was at 92.2 % in 2015 and gained 2.7
 *  points, so the sentence was false about one of its own four. */
const SATURATED = 95;
const alreadyHigh = rows.filter((r) => r.marker >= SATURATED);
if (!alreadyHigh.every((r) => r.measure - r.marker < 1))
  throw new Error(
    `the standfirst says every country already above ${SATURATED} % gained less than a point; ` +
      alreadyHigh
        .filter((r) => r.measure - r.marker >= 1)
        .map((r) => `${r.key} gained ${(r.measure - r.marker).toFixed(1)}`)
        .join(", "),
  );

const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.measure })),
  {
    subject: moved.key,
    markers: rows.map((r) => ({ key: r.key, value: r.marker })),
    scaleCeiling: 100,
    namedSeries: rows.map((r) => r.label),
    declaredSequence: "change",
  },
);
const offered = applicableTreatments(facts);
console.table(
  rows.map((r) => ({
    pays: r.label,
    [`${BEFORE} %`]: r.marker.toFixed(1),
    [`${AFTER} %`]: r.measure.toFixed(1),
    "points": (r.measure - r.marker).toFixed(1),
  })),
);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six"];
const plainSpaces = (text) => text.replace(/[  ]/g, " ");
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const verdict = (row) => `+${one(row.measure - row.marker)} pts`;

/** THE COPY IN FORMS, LONGEST FIRST — R3's rung and R4's, written as copy rather than as a cut.
 *  This plate had no ladder at all: at 1920x1080 the header takes a third of the frame and the six
 *  rows share the rest, and at 1080x1080 the same header takes all of it. Measured 2026-09-23, all
 *  three directions REFUSED at square with the headline printed through « Norvège » and the
 *  standfirst through the reading line. Only the longest form of each is used at landscape. */
const title = [
  `${french(moved.key)} : +${one(moved.measure - moved.marker)} points de bas-carbone depuis ${BEFORE}, et toujours la seule des six sous la moitié`,
  `${french(moved.key)} : +${one(moved.measure - moved.marker)} points depuis ${BEFORE}, et toujours sous la moitié`,
  `${french(moved.key)} : +${one(moved.measure - moved.marker)} points de bas-carbone`,
];
const limits = [
  `Part du bas-carbone — nucléaire et renouvelables — dans la production électrique de chaque pays, ` +
    `en ${BEFORE} et en ${AFTER}. ${french(moved.key)} passe de ${one(moved.marker)} % à ` +
    `${one(moved.measure)} % ; les ${SPELLED[alreadyHigh.length] ?? alreadyHigh.length} pays déjà ` +
    `au-dessus de ${SATURATED} % en ${BEFORE} gagnent moins d’un point chacun.`,
  `Part du bas-carbone — nucléaire et renouvelables — dans la production électrique, en ${BEFORE} ` +
    `et en ${AFTER}. ${french(moved.key)} passe de ${one(moved.marker)} % à ${one(moved.measure)} %.`,
  `Le bas-carbone — nucléaire et renouvelables — dans l’électricité, en ${BEFORE} et en ${AFTER}.`,
];
const reading = [
  `Lecture : la barre épaisse et pâle est ${BEFORE}, la fine et saturée ${AFTER} — deux états d’une ` +
    `même mesure, donc une seule teinte à deux intensités. La piste va jusqu’à 100 %, si bien que ce ` +
    `qui reste à parcourir se lit aussi. Aucun objectif n’est dessiné ici : ${BEFORE} est une date, pas ` +
    `une cible.`,
  `Lecture : la barre épaisse et pâle est ${BEFORE}, la fine et saturée ${AFTER}. La piste va ` +
    `jusqu’à 100 %, si bien que ce qui reste à parcourir se lit aussi.`,
  `Lecture : la barre épaisse et pâle est ${BEFORE}, la fine et saturée ${AFTER}.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `0 50 100 %`,
  annot: `${rows.map((r) => r.label).join(" ")} ${reading.join(" ")} ${BEFORE} ${AFTER}`,
  value: rows.map(verdict).join(" "),
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
      element: createElement(DirectedBullet, {
        // THE FRAME THIS RENDER DRAWS IN. The component used to hold a module constant; it takes the
        // run's own frame now, so one component serves landscape, portrait and square.
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        subject: moved.key,
        ceiling: 100,
        markerName: String(BEFORE),
        measureName: String(AFTER),
        unit: "%",
        title,
        limits,
        reading,
        source,
        alt:
          `Graphique à puces : la part du bas-carbone dans l’électricité de six pays européens, ` +
          `${BEFORE} contre ${AFTER}, sur une piste allant jusqu’à 100 %. ` +
          `${french(moved.key)} progresse de ${one(moved.marker)} % à ${one(moved.measure)} %, ` +
          `soit +${one(moved.measure - moved.marker)} points, et reste la seule des six sous la moitié.`,
        eyebrow: EYEBROW,
        format,
        verdict,
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
