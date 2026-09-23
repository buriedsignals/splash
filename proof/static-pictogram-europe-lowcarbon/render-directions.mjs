// twin/proof/static-pictogram-europe-lowcarbon/render-directions.mjs
//
// Forty European countries, one square each, drawn once per filed direction through the design base.
// The first `pictogram` beat in this tree.
//
// THE UNIT IS A REAL THING: one square is one country. That is the test
// `a-quantity-is-made-countable-by-drawing-its-units` sets — a square standing for `10.4 TWh` would
// be a length in disguise, and the fractional last square would be the tell.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-pictogram-europe-lowcarbon/render-directions.mjs

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
import { DirectedUnitGrid } from "./DirectedUnitGrid.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const refused = [];

const CLEAN = [
  "hydro_generation__twh",
  "wind_generation__twh",
  "solar_generation__twh",
  "bioenergy_stacked_generation__twh",
  "other_renewables_generation__twh",
  "nuclear_generation__twh",
];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];

const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique",
  BIH: "Bosnie-Herzégovine", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre",
  CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande", IRL: "Irlande",
  ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte",
  MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord",
  NOR: "Norvège", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède",
  CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};
const french = (iso) => {
  if (!FRENCH[iso]) throw new Error(`no French name recorded for ${iso}`);
  return FRENCH[iso];
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

const measured = rowsRaw.map((raw) => {
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const clean = CLEAN.reduce((s, k) => s + Number(raw[k] || 0), 0);
  const total = clean + FOSSIL.reduce((s, k) => s + Number(raw[k] || 0), 0);
  return { iso: raw.code, label: french(raw.code), total, share: total > 0 ? (clean / total) * 100 : null };
});
const unreported = measured.filter((m) => m.share === null);
const countries = measured.filter((m) => m.share !== null).sort((a, b) => b.share - a.share);
console.log(
  `${measured.length} entités gelées · ${countries.length} rapportent ${YEAR} · ` +
    `sans donnée : ${unreported.map((m) => m.label).join(", ") || "aucune"}\n`,
);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
const HIGH = 75;
const LOW = 60;
const top = countries.filter((c) => c.share >= HIGH);
const middle = countries.filter((c) => c.share >= LOW && c.share < HIGH);
const bottom = countries.filter((c) => c.share < LOW);
if (top.length + middle.length + bottom.length !== countries.length)
  throw new Error("the three blocks do not account for every country");
/** The finding is that the middle is nearly empty — Europe is at one end or the other. It is stated
 *  as a share of the whole and asserted, because "polarised" is exactly the kind of word a picture
 *  invites and a count settles. */
if (!(middle.length * 4 < countries.length))
  throw new Error(
    `the headline says the middle is nearly empty; ${middle.length} of ${countries.length} are in ` +
      `it, which is not "nearly empty"`,
  );
if (!(top.length + bottom.length === countries.length - middle.length))
  throw new Error("the ends and the middle do not add up");

const BREAKS = [40, 60, 75, 94];
const classOf = (v) => BREAKS.filter((b) => v >= b).length;

console.table(
  countries.map((c) => ({ pays: c.label, "bas-carbone %": c.share.toFixed(1), TWh: c.total.toFixed(0) })),
);
console.log(
  `${top.length} au-dessus de ${HIGH} % · ${middle.length} entre ${LOW} et ${HIGH} · ` +
    `${bottom.length} sous ${LOW} %\n`,
);

const facts = beatFacts(
  countries.map((c) => ({ key: c.iso, label: c.label, value: c.share })),
  {
    subject: countries[0].iso,
    units: { count: countries.length, thing: "pays" },
    cells: countries.map((c) => ({ key: c.iso, value: c.share })),
    scaleClasses: BREAKS.length + 1,
    declaredSequence: "low-carbon share",
  },
);
const offered = applicableTreatments(facts);
console.log(`treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`);

const format = (v) => String(v);
const blockOf = (name, set, thread) => ({
  name,
  count: set.length,
  thread,
  units: set.map((c) => ({ key: c.iso, label: c.label, value: c.share, classIndex: classOf(c.share) })),
});
const blocks = [
  blockOf(`pays au-dessus de ${HIGH} % d’électricité bas-carbone`, top, true),
  blockOf(`entre ${LOW} et ${HIGH} %`, middle, false),
  blockOf(`sous ${LOW} %`, bottom, true),
];

const title = [
  `L’Europe électrique est aux deux bouts : ${middle.length} pays seulement au milieu`,
  `L’Europe électrique est aux deux bouts`,
  `Aux deux bouts, ${middle.length} au milieu`,
];
const limits = [
  `Un carré, un pays : les ${countries.length} pays européens dont la production électrique de ` +
    `${YEAR} est rapportée, rangés par part d’électricité bas-carbone — renouvelables et nucléaire ` +
    `réunis. ${top.length} dépassent ${HIGH} %, ${bottom.length} sont sous ${LOW} %, et ` +
    `${middle.length} seulement se tiennent entre les deux.`,
  `Un carré, un pays : les ${countries.length} pays européens dont la production ${YEAR} est ` +
    `rapportée. ${top.length} au-dessus de ${HIGH} %, ${bottom.length} sous ${LOW} %.`,
  `Un carré, un pays : ${countries.length} pays européens, par part d’électricité bas-carbone.`,
];
const reading = [
  `Lecture : chaque carré est un pays et se compte. La teinte du carré donne sa classe, dont les ` +
    `bornes sont sous la grille ; le nombre devant chaque bloc est le compte de ce bloc, en pays.`,
  `Lecture : un carré, un pays. Le nombre devant chaque bloc est son compte, en pays.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${BREAKS.map((b) => `${b} %`).join(" ")} un carré = un pays sans donnée`,
  annot: `${reading.join(" ")} ${blocks.map((b) => b.name).join(" ")}`,
  value: blocks.map((b) => String(b.count)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE);
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
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
          ? `   refused: ${d.refused.map((x) => `${x.family} [${x.missing.join(",")}]`).join(", ")}`
          : ""),
    );
  try {
    await renderStill({
      element: createElement(DirectedUnitGrid, {
        blocks,
        breaks: BREAKS.map((b) => `${b} %`),
        unitIs: "un carré = un pays",
        middleNote: `${unreported.length} pays sans donnée ${YEAR} n’est pas dessiné`,
        title,
        limits,
        reading,
        source,
        alt:
          `Grille d’unités : un carré par pays, pour les ${countries.length} pays européens dont la ` +
          `production électrique de ${YEAR} est rapportée, en trois blocs. ${top.length} carrés ` +
          `au-dessus de ${HIGH} % d’électricité bas-carbone, ${middle.length} entre ${LOW} et ` +
          `${HIGH} %, ${bottom.length} sous ${LOW} %. La teinte de chaque carré donne sa classe.`,
        eyebrow: EYEBROW,
        format,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
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
  console.log(`refused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
