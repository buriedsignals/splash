// twin/proof/static-sankey-electricity-sources/render-directions.mjs
//
// Nine electricity sources into six countries, 2024, drawn once per filed direction through the
// design base. The twelfth beat in this tree, and the third of the nine forms the harvest reached
// with no directed component.
//
// CONSERVATION IS ASSERTED, not assumed: every node's total is checked against the sum of its own
// ribbons on both rails before a mark is drawn. That is this form's promise, and a beat that draws
// 54 flows can break it in a way no reader could see.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-sankey-electricity-sources/render-directions.mjs

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
import { DirectedSankey } from "./DirectedSankey.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const UNIT = "TWh";
const EYEBROW = "Énergie · Europe";
const refused = [];

/** The nine sources, in the order they are stacked on the left rail: renewables, then nuclear, then
 *  fossil. Same family order as this corpus's radar beat, and for the same reason — an order that
 *  means something beats the order a CSV happens to carry. */
const SOURCES = [
  { column: "Wind", label: "Éolien" },
  { column: "Solar", label: "Solaire" },
  { column: "Hydropower", label: "Hydraulique" },
  { column: "Bioenergy", label: "Bioénergie" },
  { column: "Other renewables", label: "Autres renouv." },
  { column: "Nuclear", label: "Nucléaire" },
  { column: "Gas", label: "Gaz" },
  { column: "Coal", label: "Charbon" },
  { column: "Oil", label: "Pétrole" },
];
/** The data is OWID's, so its entities are English and the plate is French. Copy, not data — and an
 *  entity with no French name throws rather than falling back to English. */
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

const countries = rows.map((r) => r.Entity);
const flows = SOURCES.flatMap((s) =>
  rows.map((r) => ({ from: s.column, to: r.Entity, value: Number(r[s.column]) })),
);
const totalOfSource = (key) =>
  flows.filter((f) => f.from === key).reduce((sum, f) => sum + f.value, 0);
const totalOfCountry = (key) =>
  flows.filter((f) => f.to === key).reduce((sum, f) => sum + f.value, 0);
const grand = flows.reduce((sum, f) => sum + f.value, 0);

// CONSERVATION, CHECKED ON BOTH RAILS. The form's promise is that what enters a node leaves it; a
// sankey that quietly drops a term still looks balanced, which is why this is asserted rather than
// eyeballed.
const bySource = SOURCES.reduce((sum, s) => sum + totalOfSource(s.column), 0);
const byCountry = countries.reduce((sum, c) => sum + totalOfCountry(c), 0);
if (Math.abs(bySource - byCountry) > 1e-6 || Math.abs(bySource - grand) > 1e-6)
  throw new Error(
    `conservation fails: ${bySource.toFixed(3)} out of the sources, ${byCountry.toFixed(3)} into the countries`,
  );
if (flows.length !== SOURCES.length * countries.length)
  throw new Error(`expected ${SOURCES.length * countries.length} flows, built ${flows.length}`);

const ranked = SOURCES.map((s) => ({ ...s, total: totalOfSource(s.column) })).sort(
  (a, b) => b.total - a.total,
);
const biggest = ranked[0];
const holder = rows
  .map((r) => ({ entity: r.Entity, value: Number(r[biggest.column]) }))
  .sort((a, b) => b.value - a.value)[0];
const holderShare = holder.value / biggest.total;
if (biggest.column !== "Nuclear")
  throw new Error(`the headline says nuclear is the largest source; it is ${biggest.label}`);
if (holderShare < 0.8)
  throw new Error(
    `the headline says one country holds more than four fifths of it; ${holder.entity} holds ${(holderShare * 100).toFixed(1)} %`,
  );

const facts = beatFacts(
  SOURCES.map((s) => ({ key: s.column, label: s.label, value: totalOfSource(s.column) })),
  {
    subject: biggest.column,
    flows: flows.map((f) => ({ from: f.from, to: f.to, value: f.value })),
    namedSeries: countries.map(french),
    declaredSequence: "family",
  },
);
const offered = applicableTreatments(facts);
const hairlines = flows.filter((f) => f.value / grand < 0.0001);
console.log(
  `${flows.length} flux · total ${grand.toFixed(1)} ${UNIT} · plus petit flux ${(facts.smallestFlowShare * 100).toFixed(4)} % ` +
    `(${hairlines.length} sous 0,01 %) · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

/** `fr-FR` groups thousands with a NARROW no-break space (U+202F), and the glyph guard walks the
 *  family ladder for every character a register has to set: `1 638` refused Avenir Next, Helvetica
 *  Neue, Optima and Helvetica in one line, before a mark was drawn. Inside a single text run a
 *  plain space is not collapsed, so the separator survives and every face can set it. */
const plainSpaces = (text) => text.replace(/[\u202f\u00a0]/g, " ");
const one = (v) =>
  plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const whole = (v) => plainSpaces(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }));
const format = (v) => one(v);

const title = `Le nucléaire de ces six pays est français à ${(holderShare * 100).toFixed(0)} %`;
const limits =
  `Production électrique de six pays européens en ${YEAR}, par source, en ${UNIT}. ` +
  `Le nucléaire est la première des neuf sources (${one(biggest.total)}) et ` +
  `${one(holder.value)} en sont produits en ${french(holder.entity)}. ` +
  `Au total ${whole(grand)} ${UNIT} pour les six pays.`;
const reading =
  `Lecture : chaque ruban est une source dans un pays ; les ${flows.length} rubans d’un rail se ` +
  `rejoignent exactement au total du nœud, qui est imprimé. Les rubans sont translucides, donc un ` +
  `croisement s’assombrit au lieu de cacher ce qu’il traverse.`;
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

const sources = SOURCES.map((s) => ({
  key: s.column,
  label: s.label,
  total: totalOfSource(s.column),
}));
const targets = rows
  .map((r) => ({ key: r.Entity, label: french(r.Entity), total: totalOfCountry(r.Entity) }))
  .sort((a, b) => b.total - a.total);

const textPerRegister = {
  display: title,
  eyebrow: EYEBROW,
  body: `${limits} ${source}`,
  axis: UNIT,
  annot: `${[...sources, ...targets].map((n) => `${n.label} ${format(n.total)}`).join(" ")} ${reading}`,
  value: sources.map((n) => format(n.total)).join(" "),
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
      element: createElement(DirectedSankey, {
        sources,
        targets,
        flows: flows.map((f) => ({ ...f, to: f.to })),
        tracked: { from: biggest.column, to: holder.entity },
        unit: UNIT,
        title,
        limits,
        reading,
        source,
        alt:
          `Diagramme de flux : les neuf sources d’électricité de six pays européens en ${YEAR}, ` +
          `${whole(grand)} ${UNIT} au total. Le ruban le plus large va du nucléaire ` +
          `(${one(biggest.total)}) vers ${french(holder.entity)} (${one(holder.value)}), soit ` +
          `${(holderShare * 100).toFixed(0)} % du nucléaire des six pays.`,
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
