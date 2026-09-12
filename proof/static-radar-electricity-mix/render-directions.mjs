// twin/proof/static-radar-electricity-mix/render-directions.mjs
//
// France and Germany's 2024 electricity mixes, drawn once per filed direction, through the design
// base. The eleventh beat in this tree to go through it, and the second of the nine forms the
// harvest reached that had no directed component.
//
// Every figure is computed from the frozen CSV and printed before a mark is drawn: the two totals,
// the nine shares per country, and each of the three comparisons the headline and the standfirst
// make. The claim is ASSERTED — this beat throws rather than draw a sentence its own data no longer
// supports.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-radar-electricity-mix/render-directions.mjs

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
import { DirectedRadar } from "./DirectedRadar.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const SUBJECT = "France";
const OTHER = "Germany";
/** The data is OWID's, so its entities are English; the plate is French. Copy, not data — every
 *  number stays computed — and an entity with no French name throws rather than falling back. */
const FRENCH = { France: "France", Germany: "Allemagne" };
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};
const refused = [];

/** THE SPOKE ORDER IS AN EDITORIAL DECISION, and `references/types/radar.md` says so outright: a
 *  polygon's AREA — the thing the eye judges — moves with the order and the count of its axes, and
 *  the type sheet calls that its structural weak point rather than a bug to fix in code. So the
 *  nine sources run renewables, then nuclear, then fossil, clockwise from twelve o'clock, and the
 *  order is stated on the plate rather than left to be inferred. */
const SPOKES = [
  { column: "Wind", label: "Éolien", family: "renouvelable" },
  { column: "Solar", label: "Solaire", family: "renouvelable" },
  { column: "Hydropower", label: "Hydraulique", family: "renouvelable" },
  { column: "Bioenergy", label: "Bioénergie", family: "renouvelable" },
  { column: "Other renewables", label: "Autres renouv.", family: "renouvelable" },
  { column: "Nuclear", label: "Nucléaire", family: "nucléaire" },
  { column: "Gas", label: "Gaz", family: "fossile" },
  { column: "Coal", label: "Charbon", family: "fossile" },
  { column: "Oil", label: "Pétrole", family: "fossile" },
];

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rows = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

const rowFor = (entity) => {
  const row = rows.find((r) => r.Entity === entity && Number(r.Year) === YEAR);
  if (!row) throw new Error(`no ${YEAR} row for ${entity} in the frozen data`);
  return row;
};
const totalOf = (row) => SPOKES.reduce((sum, s) => sum + Number(row[s.column]), 0);

const items = [SUBJECT, OTHER];
const perCountry = items.map((entity) => {
  const row = rowFor(entity);
  const total = totalOf(row);
  return {
    entity,
    total,
    shares: Object.fromEntries(
      SPOKES.map((s) => [s.column, (Number(row[s.column]) / total) * 100]),
    ),
  };
});

const [fr, de] = perCountry;
const shareOf = (country, ...columns) =>
  columns.reduce((sum, c) => sum + country.shares[c], 0);

// THE CLAIM, ASSERTED. Each of these is a sentence the plate prints, and a data refresh that broke
// one of them would otherwise ship a false headline over true numbers.
const ratio = Math.max(fr.total, de.total) / Math.min(fr.total, de.total);
if (ratio > 1.25)
  throw new Error(
    `the headline says the two make nearly the same electricity; they are ${ratio.toFixed(2)}x apart`,
  );
if (shareOf(de, "Nuclear") !== 0)
  throw new Error(`the headline says Germany has no nuclear; it has ${shareOf(de, "Nuclear")} %`);
if (shareOf(fr, "Nuclear") < 50)
  throw new Error(`the headline rests on nuclear being most of France's mix; it is ${shareOf(fr, "Nuclear").toFixed(1)} %`);
if (shareOf(de, "Wind", "Solar") <= shareOf(fr, "Wind", "Solar"))
  throw new Error("the standfirst says Germany draws more of its power from wind and solar than France does");

const spokes = SPOKES.map((s) => ({
  key: s.column,
  label: s.label,
  family: s.family,
  shares: perCountry.map((c) => c.shares[s.column]),
}));

const facts = beatFacts(
  spokes.map((s) => ({ key: s.key, label: s.label, value: Math.max(...s.shares) })),
  {
    subject: SUBJECT,
    spokes: spokes.map((s) => ({ key: s.key })),
    namedSeries: items,
    declaredSequence: "family",
  },
);
const offered = applicableTreatments(facts);
console.table(
  spokes.map((s) => ({
    source: s.label,
    [`${SUBJECT} %`]: s.shares[0].toFixed(1),
    [`${OTHER} %`]: s.shares[1].toFixed(1),
  })),
);
console.log(
  `${SUBJECT} ${fr.total.toFixed(1)} TWh · ${OTHER} ${de.total.toFixed(1)} TWh · rapport ${ratio.toFixed(2)} · ` +
    `treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

const one = (v) =>
  v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** The `%` sign is carried by the ring label and the reading line, once each, rather than eighteen
 *  times around the wheel: at nine spokes and two countries the pairs were 110px wide against a
 *  44px radius — the wheel was smaller than its own labels. */
const format = (v) => one(v);
const percent = (v) => `${one(v)} %`;
/** The ceiling is the drawn maximum: the next round ring above the largest share on the plate, so
 *  the outer circle is a number a reader can hold rather than the data's own ragged maximum. */
const largest = Math.max(...spokes.flatMap((s) => s.shares));
const ceiling = Math.ceil(largest / 10) * 10;
const rings = [ceiling / 4, ceiling / 2, (ceiling * 3) / 4, ceiling];

const title = `La France et l’Allemagne produisent presque autant d’électricité, avec des mix opposés`;
const limits =
  `Part de chaque source dans la production électrique du pays, en ${YEAR}. ` +
  `${french(SUBJECT)} ${one(fr.total)} TWh, ${french(OTHER)} ${one(de.total)} TWh. ` +
  `Le nucléaire fait ${one(shareOf(fr, "Nuclear"))} % du mix français et ${one(shareOf(de, "Nuclear"))} % du mix allemand ; ` +
  `l’éolien et le solaire réunis, ${one(shareOf(de, "Wind", "Solar"))} % en Allemagne contre ${one(shareOf(fr, "Wind", "Solar"))} % en France.`;
/** The reading line and its short form. A direction that sets the annot register in tracked capitals
 *  turns three lines into seven, so the component takes the longest rung that fits its column. */
const reading = [
  `Lecture : chaque rayon est une part de la production du pays lui-même — les neuf parts d’un ` +
    `polygone font 100 %. Rayons rangés par famille dans le sens horaire : renouvelables, nucléaire, ` +
    `fossiles. Cercle extérieur ${percent(ceiling)} ; chaque nombre est une part, en %.`,
  `Lecture : part de la production du pays lui-même, en %. Rayons par famille, sens horaire. ` +
    `Cercle extérieur ${percent(ceiling)}.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: percent(ceiling),
  annot: `${spokes.map((s) => s.label).join(" ")} ${reading.join(" ")} ${items.map(french).join(" ")}`,
  value: spokes.map((s) => s.shares.map(format).join(" · ")).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
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
      element: createElement(DirectedRadar, {
        spokes,
        items: items.map(french),
        subject: french(SUBJECT),
        ceiling,
        ceilingLabel: percent(ceiling),
        rings,
        title,
        limits,
        reading,
        source,
        alt:
          `Radar à neuf rayons comparant la part de chaque source dans la production électrique de ` +
          `${french(SUBJECT)} et de ${french(OTHER)} en ${YEAR}. Le polygone français est étiré vers le nucléaire ` +
          `(${one(shareOf(fr, "Nuclear"))} %), celui de l’Allemagne vers l’éolien et le solaire ` +
          `(${one(shareOf(de, "Wind", "Solar"))} % à eux deux) et le charbon ` +
          `(${one(shareOf(de, "Coal"))} %). L’Allemagne n’a plus de nucléaire.`,
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
