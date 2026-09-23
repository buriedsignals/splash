// twin/proof/static-diverging-stacked-electricity/render-directions.mjs
//
// Six electricity mixes drawn as a lean — fossil left, renewables right, nuclear on the anchor —
// once per filed direction, through the design base. The seventeenth beat in this tree and the
// eighth of the nine forms the harvest reached with no directed component.
//
// The three groups are a CLASSIFICATION, not a judgement: nuclear is neither a fossil fuel nor a
// renewable, which is what lets it be the neutral this form puts on the centre. The headline's
// comparison is asserted before a mark is drawn.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-diverging-stacked-electricity/render-directions.mjs

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
import { DirectedDivergingStack } from "./DirectedDivergingStack.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const refused = [];

/** Ordered OUTWARD from the centre, which is what the ramp encodes: the level furthest from the
 *  anchor is the deepest step of its own side. */
const FOSSIL = [
  { column: "Gas", label: "Gaz" },
  { column: "Oil", label: "Pétrole" },
  { column: "Coal", label: "Charbon" },
];
const RENEWABLE = [
  { column: "Bioenergy", label: "Bioénergie" },
  { column: "Other renewables", label: "Autres renouv." },
  { column: "Hydropower", label: "Hydraulique" },
  { column: "Solar", label: "Solaire" },
  { column: "Wind", label: "Éolien" },
];
const CENTRE = { column: "Nuclear", label: "Nucléaire" };
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
const raw = csv
  .slice(1)
  .map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])))
  .filter((r) => Number(r.Year) === YEAR);

// Every source in the file belongs to exactly one of the three groups: a classification that leaves
// a column out would draw a lean from a partial mix.
const classified = [...FOSSIL, ...RENEWABLE, CENTRE].map((s) => s.column);
const missing = sources.filter((c) => !classified.includes(c));
if (missing.length) throw new Error(`unclassified source(s): ${missing.join(", ")}`);

const rows = raw
  .map((r) => {
    const total = sources.reduce((sum, c) => sum + Number(r[c]), 0);
    const share = (column) => (Number(r[column]) / total) * 100;
    return {
      key: r.Entity,
      label: french(r.Entity),
      left: FOSSIL.map((s) => ({ key: s.column, label: s.label, value: share(s.column) })),
      centre: { key: CENTRE.column, label: CENTRE.label, value: share(CENTRE.column) },
      right: RENEWABLE.map((s) => ({ key: s.column, label: s.label, value: share(s.column) })),
    };
  })
  .map((row) => ({
    ...row,
    fossil: row.left.reduce((s, l) => s + l.value, 0),
    renewable: row.right.reduce((s, l) => s + l.value, 0),
  }))
  .sort((a, b) => b.fossil - a.fossil);

for (const row of rows) {
  const sum = row.fossil + row.renewable + row.centre.value;
  if (Math.abs(sum - 100) > 1e-9)
    throw new Error(`${row.key}: the three groups sum to ${sum.toFixed(6)} %, not 100`);
}

const subject = rows.reduce((a, b) => (b.centre.value > a.centre.value ? b : a));
if (subject.centre.value <= subject.fossil + subject.renewable)
  throw new Error(
    `the headline says the neutral outweighs both sides put together in ${subject.key}; ` +
      `${subject.centre.value.toFixed(1)} against ${(subject.fossil + subject.renewable).toFixed(1)}`,
  );
const leaningLeft = rows[0];
const leaningRight = rows.reduce((a, b) => (b.renewable > a.renewable ? b : a));

const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.renewable - r.fossil })),
  {
    subject: subject.key,
    sides: { left: FOSSIL.length, right: RENEWABLE.length, centre: CENTRE.column },
    namedSeries: rows.map((r) => r.label),
    declaredSequence: "fossil share",
  },
);
const offered = applicableTreatments(facts);
console.table(
  rows.map((r) => ({
    pays: r.label,
    fossile: r.fossil.toFixed(1),
    nucléaire: r.centre.value.toFixed(1),
    renouvelable: r.renewable.toFixed(1),
  })),
);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const plainSpaces = (text) => text.replace(/[  ]/g, " ");
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => (v < 0.05 ? "0" : one(v));

const title = `Le nucléaire tient le centre : en ${french(subject.key)} il pèse plus que le fossile et le renouvelable réunis`;
const limits =
  `Mix électrique ${YEAR}, en parts de la production de chaque pays. À gauche le fossile, à droite ` +
  `le renouvelable, et au centre le nucléaire — qui n’est ni l’un ni l’autre. ` +
  `${french(subject.key)} : ${one(subject.centre.value)} % de nucléaire contre ` +
  `${one(subject.fossil)} % de fossile et ${one(subject.renewable)} % de renouvelable. ` +
  `${french(leaningLeft.key)} penche le plus à gauche (${one(leaningLeft.fossil)} %), ` +
  `${french(leaningRight.key)} le plus à droite (${one(leaningRight.renewable)} %).`;
const reading =
  `Lecture : chaque rang fait 100 %. La masse nucléaire est posée À CHEVAL sur l’axe, moitié de ` +
  `chaque côté, donc elle ne fait pencher ni l’un ni l’autre — le penchant se lit au côté le plus ` +
  `long. Dans chaque camp, la teinte fonce vers l’extérieur : gaz, pétrole, charbon à gauche ; ` +
  `bioénergie, autres, hydraulique, solaire, éolien à droite.`;
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: "100 50 0 50 100 %",
  annot: `${rows.map((r) => r.label).join(" ")} ${reading} Fossile Renouvelable Nucléaire`,
  value: rows.map((r) => `${format(r.fossil)} ${format(r.renewable)}`).join(" "),
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
      element: createElement(DirectedDivergingStack, {
        rows,
        subject: subject.key,
        leftName: "Fossile",
        rightName: "Renouvelable",
        centreName: CENTRE.label,
        unit: "%",
        title,
        limits,
        reading,
        source,
        alt:
          `Barres empilées divergentes : le mix électrique de six pays européens en ${YEAR}, fossile ` +
          `à gauche, renouvelable à droite, nucléaire à cheval sur l’axe. ` +
          `${french(subject.key)} porte ${one(subject.centre.value)} % de nucléaire, plus que ses ` +
          `${one(subject.fossil)} % de fossile et ses ${one(subject.renewable)} % de renouvelable ` +
          `réunis ; ${french(leaningLeft.key)} penche à gauche avec ${one(leaningLeft.fossil)} % de ` +
          `fossile et ${french(leaningRight.key)} à droite avec ${one(leaningRight.renewable)} %.`,
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
