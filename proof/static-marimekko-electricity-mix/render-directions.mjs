// twin/proof/static-marimekko-electricity-mix/render-directions.mjs
//
// Six countries' electricity mixes as variable-width columns, 2024, drawn once per filed direction
// through the design base. The thirteenth beat in this tree and the fourth of the nine forms the
// harvest reached with no directed component.
//
// A marimekko multiplies two scales, so a band's AREA is a quantity — and that is exactly what makes
// it easy to ship a lie. Every figure here is computed from the frozen CSV and asserted: the tracked
// band's share of the six, the two countries that hold it, and that each column's bands sum to that
// column's own total.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-marimekko-electricity-mix/render-directions.mjs

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
import { DirectedMarimekko } from "./DirectedMarimekko.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const UNIT = "TWh";
const EYEBROW = "Énergie · Europe";
const TRACKED = "Coal";
const refused = [];

/** Stacked bottom to top in family order: fossil first, then nuclear, then the renewables — so the
 *  tracked band sits at the foot of every column where the eye lands first, and the order means
 *  something rather than repeating the CSV's.
 *
 *  THE ORDER IS THE ENCODING. Fossil, then nuclear, then the renewables: an ordinal axis, which is
 *  what lets the plate colour its nine bands with one sequential ramp of the direction's own accent
 *  instead of nine categorical hues or nine greys. The families are kept here because the order is
 *  built from them and because the reading line names them. */
const SOURCES = [
  { column: "Coal", label: "Charbon", family: "fossile" },
  { column: "Oil", label: "Pétrole", family: "fossile" },
  { column: "Gas", label: "Gaz", family: "fossile" },
  { column: "Nuclear", label: "Nucléaire", family: "nucléaire" },
  { column: "Bioenergy", label: "Bioénergie", family: "renouvelable" },
  { column: "Other renewables", label: "Autres renouv.", family: "renouvelable" },
  { column: "Hydropower", label: "Hydraulique", family: "renouvelable" },
  { column: "Solar", label: "Solaire", family: "renouvelable" },
  { column: "Wind", label: "Éolien", family: "renouvelable" },
];
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
const rows = csv
  .slice(1)
  .map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])))
  .filter((r) => Number(r.Year) === YEAR);

const columns = rows
  .map((r) => ({
    key: r.Entity,
    label: french(r.Entity),
    bands: SOURCES.map((s) => ({ key: s.column, label: s.label, value: Number(r[s.column]) })),
    total: SOURCES.reduce((sum, s) => sum + Number(r[s.column]), 0),
  }))
  .sort((a, b) => b.total - a.total);

// THE AREAS ARE A PRODUCT OF TWO SCALES, so the arithmetic under them is checked before drawing.
for (const c of columns) {
  const summed = c.bands.reduce((sum, b) => sum + b.value, 0);
  if (Math.abs(summed - c.total) > 1e-9)
    throw new Error(`${c.key}: bands sum to ${summed} against a total of ${c.total}`);
}

const grand = columns.reduce((sum, c) => sum + c.total, 0);
const trackedTotal = columns.reduce(
  (sum, c) => sum + c.bands.find((b) => b.key === TRACKED).value,
  0,
);
const trackedShare = trackedTotal / grand;
const holders = columns
  .map((c) => ({ key: c.key, value: c.bands.find((b) => b.key === TRACKED).value }))
  .sort((a, b) => b.value - a.value);
const topTwoShare = (holders[0].value + holders[1].value) / trackedTotal;
if (topTwoShare < 0.95)
  throw new Error(
    `the headline says two countries hold nearly all of it; they hold ${(topTwoShare * 100).toFixed(1)} %`,
  );

const facts = beatFacts(
  columns.map((c) => ({ key: c.key, label: c.label, value: c.total })),
  {
    subject: holders[0].key,
    widths: columns.map((c) => ({ key: c.key, value: c.total })),
    namedSeries: SOURCES.map((s) => s.label),
    declaredSequence: "family",
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${columns.length} colonnes · la plus étroite ${(facts.smallestWidthShare * 100).toFixed(1)} % du total · ` +
    `${TRACKED} ${(trackedShare * 100).toFixed(1)} % dont ${(topTwoShare * 100).toFixed(1)} % dans ` +
    `${french(holders[0].key)} + ${french(holders[1].key)} · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

/** `fr-FR` groups thousands with a NARROW no-break space and no face on these ladders covers it —
 *  see METHOD correction 25, where the same trap took three beats in a row. */
const plainSpaces = (text) => text.replace(/[  ]/g, " ");
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const whole = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const format = (v) => whole(v);
const percent = (share) =>
  share >= 0.095
    ? `${Math.round(share * 100)} %`
    : share >= 0.005
      ? `${plainSpaces((share * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }))} %`
      : "";

const title = `Le charbon fait ${(trackedShare * 100).toFixed(0)} % de l’électricité de ces six pays, et il tient dans deux colonnes`;
const limits =
  `Production électrique ${YEAR}, par source. La LARGEUR de chaque colonne est la production du pays ` +
  `en ${UNIT}, sa hauteur son mix : l’aire d’une bande est donc une quantité. ` +
  `${one(trackedTotal)} ${UNIT} de charbon sur ${whole(grand)} au total, dont ` +
  `${one(topTwoShare * 100)} % en ${french(holders[0].key)} et en ${french(holders[1].key)}.`;
const reading =
  `Lecture : chaque colonne fait 100 % de haut ; les parts sous 0,5 % ne sont pas chiffrées mais ` +
  `restent dessinées. Les sources sont nommées une fois, à droite, dans l’ordre où elles s’empilent ` +
  `dans toutes les colonnes.`;
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: UNIT,
  annot:
    `${columns.map((c) => c.label).join(" ")} ${SOURCES.map((s) => s.label).join(" ")} ${reading} ` +
    `Largeur : production totale, en ${UNIT}`,
  value: columns.map((c) => format(c.total)).join(" "),
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

  /** Every band's colour is derived from the direction's own accent, ground and ink — see the
   *  component. All this map carries is where each band sits in the ordered stack. */
  const families = Object.fromEntries(
    SOURCES.map((s, order) => [s.column, { family: s.family, order, total: SOURCES.length }]),
  );

  try {
    await renderStill({
      element: createElement(DirectedMarimekko, {
        columns,
        bandOrder: SOURCES.map((s) => s.column),
        families,
        tracked: TRACKED,
        unit: UNIT,
        widthName: `Largeur : production totale, en ${UNIT}`,
        title,
        limits,
        reading,
        source,
        alt:
          `Marimekko : six pays européens en ${YEAR}, chaque colonne aussi large que sa production ` +
          `(${whole(grand)} ${UNIT} au total) et haute de 100 % de son mix. La bande charbon, en ` +
          `accent, fait ${(trackedShare * 100).toFixed(0)} % de l’ensemble et n’est visible que dans ` +
          `les colonnes ${french(holders[0].key)} et ${french(holders[1].key)}.`,
        eyebrow: EYEBROW,
        format,
        percent,
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
