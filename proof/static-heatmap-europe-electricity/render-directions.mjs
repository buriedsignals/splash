// twin/proof/static-heatmap-europe-electricity/render-directions.mjs
//
// Europe's 2024 electricity mix — 18 countries × 9 sources, 162 cells — drawn once per filed
// direction, through the design base. The first `heatmap` beat in this tree.
//
// Every figure is computed from the frozen CSV and printed before a mark is drawn, and each of the
// five sentences the plate makes is ASSERTED. The claim is that five countries clear 94 % low-carbon
// by THREE different routes, and a data refresh that broke any part of it throws rather than
// shipping a false headline over true numbers.
//
// `renders/`, PLURAL. A render written to `render/` receives no approval and is invisible to the
// export guard.
//
// Usage:  bun proof/static-heatmap-europe-electricity/render-directions.mjs

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
import { DirectedHeatmap } from "./DirectedHeatmap.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const refused = [];

/** THE COLUMN ORDER IS AN EDITORIAL DECISION and it is stated on the plate: the five renewables,
 *  then nuclear, then the three fossil sources. Neither the order of the columns nor the order of
 *  the rows is in the data. */
const SOURCES = [
  { key: "hydro_generation__twh", label: "Hydraulique", family: "renouvelables" },
  { key: "wind_generation__twh", label: "Éolien", family: "renouvelables" },
  { key: "solar_generation__twh", label: "Solaire", family: "renouvelables" },
  { key: "bioenergy_stacked_generation__twh", label: "Bioénergie", family: "renouvelables" },
  { key: "other_renewables_generation__twh", label: "Autres", family: "renouvelables" },
  { key: "nuclear_generation__twh", label: "Nucléaire", family: "nucléaire" },
  { key: "gas_generation__twh", label: "Gaz", family: "fossiles" },
  { key: "coal_generation__twh", label: "Charbon", family: "fossiles" },
  { key: "oil_generation__twh", label: "Pétrole", family: "fossiles" },
];

/** The data is OWID's, so its entities are English; the plate is French. Copy, not data — every
 *  number stays computed — and an entity with no French name throws rather than falling back. All
 *  41 frozen entities carry one, so a data refresh that changes the selection still draws. */
const FRENCH = {
  Albania: "Albanie",
  Austria: "Autriche",
  Belarus: "Biélorussie",
  Belgium: "Belgique",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  Bulgaria: "Bulgarie",
  Croatia: "Croatie",
  Cyprus: "Chypre",
  Czechia: "Tchéquie",
  Denmark: "Danemark",
  Estonia: "Estonie",
  Finland: "Finlande",
  France: "France",
  Germany: "Allemagne",
  Greece: "Grèce",
  Hungary: "Hongrie",
  Iceland: "Islande",
  Ireland: "Irlande",
  Italy: "Italie",
  Latvia: "Lettonie",
  Lithuania: "Lituanie",
  Luxembourg: "Luxembourg",
  Malta: "Malte",
  Moldova: "Moldavie",
  Montenegro: "Monténégro",
  Netherlands: "Pays-Bas",
  "North Macedonia": "Macédoine du Nord",
  Norway: "Norvège",
  Poland: "Pologne",
  Portugal: "Portugal",
  Romania: "Roumanie",
  Russia: "Russie",
  Serbia: "Serbie",
  Slovakia: "Slovaquie",
  Slovenia: "Slovénie",
  Spain: "Espagne",
  Sweden: "Suède",
  Switzerland: "Suisse",
  Turkey: "Turquie",
  Ukraine: "Ukraine",
  "United Kingdom": "Royaume-Uni",
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};

const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const rowsRaw = csv.slice(1).map((l) => {
  const cells = l.split(",");
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

const RENEWABLE = SOURCES.filter((s) => s.family === "renouvelables").map((s) => s.key);
const NUCLEAR = "nuclear_generation__twh";

/** AN ENTITY THE FILE DOES NOT REPORT IS NOT A ZERO. Ukraine's 2024 row carries a single `0` for
 *  bioenergy and nothing else — the war, not a country that generated no electricity — and a share
 *  of a zero total is `NaN`, or, worse, a row of honest-looking zeroes. Such an entity is dropped
 *  before any figure is computed, counted, and the count is PRINTED: "41 European entities" and
 *  "40 with reported generation" are different sentences, and the plate makes the second one. */
const measured = rowsRaw.map((raw) => {
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const twh = SOURCES.map((s) => Number(raw[s.key] || 0));
  return { raw, twh, total: twh.reduce((a, b) => a + b, 0) };
});
const unreported = measured.filter((m) => !(m.total > 0));
if (unreported.length)
  console.log(
    `no ${YEAR} generation reported for ${unreported.length} of ${measured.length} European ` +
      `entities: ${unreported.map((m) => m.raw.entity).join(", ")} — dropped before any figure is ` +
      `computed\n`,
  );

const everyCountry = measured
  .filter((m) => m.total > 0)
  .map(({ raw, twh, total }) => {
    const shares = twh.map((v) => (v / total) * 100);
    const shareOf = (key) => shares[SOURCES.findIndex((s) => s.key === key)];
    const renewables = RENEWABLE.reduce((sum, k) => sum + shareOf(k), 0);
    const nuclear = shareOf(NUCLEAR);
    return {
      key: raw.entity,
      label: french(raw.entity),
      total,
      shares,
      shareOf,
      renewables,
      nuclear,
      lowCarbon: renewables + nuclear,
    };
  })
  .sort((a, b) => b.lowCarbon - a.lowCarbon);

// ── THE SELECTION, WHICH IS A STATED RULE AND NOT A HAND-PICK ───────────────
//
// A landscape plate holds about a dozen rows before the row labels stop being labels — the component
// measures that and refuses rather than shrinking them. So the plate cannot draw all 41 European
// countries, and WHICH twelve it draws is an editorial act that has to be defensible and printed.
//
// The rule: every country above the floor, plus the continent's largest producers to fill the plate.
// It is the rule the headline needs — nobody above the floor can be missing, or the count is a lie —
// and it brings the weight in, so a reader is not shown twelve small countries and told about
// Europe.
//
// This mattered. The first draft drew eighteen hand-picked EU countries and asserted "five clear
// 94 %". Five of THOSE eighteen did. Across all 41, SEVEN do: Iceland and Albania are both at 100 %,
// and neither was in the hand-picked list. The headline would have been false about Europe while
// every number under it was true. The floor check now runs over the whole frozen file, not over the
// drawn rows.
const FLOOR = 94;
const ROWS_DRAWN = 12;
const above = everyCountry.filter((r) => r.lowCarbon > FLOOR);
const biggest = everyCountry
  .filter((r) => !above.includes(r))
  .sort((a, b) => b.total - a.total)
  .slice(0, ROWS_DRAWN - above.length);
const rows = [...above, ...biggest].sort((a, b) => b.lowCarbon - a.lowCarbon);
if (rows.length !== ROWS_DRAWN)
  throw new Error(`the plate draws ${ROWS_DRAWN} rows; the rule selected ${rows.length}`);

// ── THE CLAIM, ASSERTED ─────────────────────────────────────────────────────
//
// Asserted against `everyCountry`, the whole frozen file — the headline is a claim about Europe, so
// a check against the drawn rows would only ever confirm the selection back to itself.
const ABOVE = 7;
if (above.length !== ABOVE)
  throw new Error(
    `the headline says ${ABOVE} European countries clear ${FLOOR} % low-carbon; ${above.length} do ` +
      `(${above.map((r) => `${r.label} ${r.lowCarbon.toFixed(1)}`).join(", ")})`,
  );
if (rows.slice(0, ABOVE).some((r) => r.lowCarbon <= FLOOR))
  throw new Error("the countries above the floor are not the first rows of the plate");

/** THE THREE ROUTES, each a partition of the seven, each checked. A country that changed route
 *  would land in no group and the count below would not add up. */
const RENEWABLE_ONLY = above.filter((r) => r.nuclear === 0);
const NUCLEAR_LED = above.filter((r) => r.nuclear >= 50);
const BOTH_ROUTES = above.filter((r) => r.nuclear > 0 && r.nuclear < 50 && r.renewables >= 50);
if (RENEWABLE_ONLY.length + NUCLEAR_LED.length + BOTH_ROUTES.length !== above.length)
  throw new Error(
    `the plate says three routes and every country above the floor takes one; ` +
      `${above.length} countries fall into ${RENEWABLE_ONLY.length} + ${NUCLEAR_LED.length} + ${BOTH_ROUTES.length}`,
  );
for (const [name, group] of [
  ["renouvelables seules", RENEWABLE_ONLY],
  ["nucléaire majoritaire", NUCLEAR_LED],
  ["les deux", BOTH_ROUTES],
])
  if (!group.length) throw new Error(`the plate names three routes; "${name}" is empty`);

/** THE CELL THE STANDFIRST POINTS AT. Iceland's `other renewables` is geothermal, and it is the
 *  largest single share of that source anywhere in the frozen file — the one cell on the plate whose
 *  column is otherwise near-empty. */
const OTHER = "other_renewables_generation__twh";
const geothermal = everyCountry.reduce((a, b) => (b.shareOf(OTHER) > a.shareOf(OTHER) ? b : a));
if (geothermal.key !== "Iceland" || geothermal.shareOf(OTHER) < 25)
  throw new Error(
    `the standfirst says Iceland carries the largest "other renewables" share; the largest is ` +
      `${geothermal.label} at ${geothermal.shareOf(OTHER).toFixed(1)} %`,
  );

/** THE BOTTOM ROW: the continent's largest producer, and the lowest low-carbon share on the plate. */
const last = rows[rows.length - 1];
const largest = everyCountry.reduce((a, b) => (b.total > a.total ? b : a));
if (last.key !== largest.key)
  throw new Error(
    `the plate says its last row is Europe's largest producer; the last row is ${last.label} ` +
      `(${last.total.toFixed(0)} TWh) and the largest is ${largest.label} (${largest.total.toFixed(0)} TWh)`,
  );

console.table(
  rows.map((r) => ({
    pays: r.label,
    "renouv. %": r.renewables.toFixed(1),
    "nucléaire %": r.nuclear.toFixed(1),
    "bas-carbone %": r.lowCarbon.toFixed(1),
    "TWh": r.total.toFixed(0),
  })),
);

/** SIX CLASSES WITH EDGES. Most cells are small shares, so the breaks are spaced to separate them
 *  rather than to look regular — a scale with classes a reader can name, per
 *  `the-scale-is-stepped-not-continuous`. */
const BREAKS = [2, 5, 10, 20, 40];

const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.lowCarbon })),
  {
    subject: rows[0].key,
    cells: rows.flatMap((r) => r.shares.map((value, i) => ({ key: `${r.key}-${i}`, value }))),
    impossibleCells: 0,
    scaleClasses: BREAKS.length + 1,
    groups: SOURCES.map((s) => s.family),
    declaredSequence: "low-carbon share",
  },
);
const offered = applicableTreatments(facts);
console.log(
  `${rows.length} pays × ${SOURCES.length} sources = ${facts.cellCount} cellules · ` +
    `${facts.scaleClasses} classes · treatments applicable: ${offered.map((t) => t.id).join(", ")}\n`,
);

/** French locale formatting emits U+202F and U+00A0, which no face on the family ladders covers —
 *  the glyph guard then refuses every family. Normalise to a plain space. */
const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) =>
  plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const format = (v) => `${one(v)} %`;

const FAMILIES = [];
for (const [i, s] of SOURCES.entries()) {
  const last = FAMILIES[FAMILIES.length - 1];
  if (last && last.name === s.family) last.to = i;
  else FAMILIES.push({ name: s.family, from: i, to: i });
}

/** The copy names its groups from the DATA's own partition, so a country that changed route changes
 *  the sentence rather than falsifying it. `names` is a French list with the right conjunction. */
const names = (group) => {
  const list = group.map((r) => r.label);
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} et ${list[list.length - 1]}`;
};

/** THREE FORMS OF THE HEADLINE, LONGEST FIRST. The component's ladder spends them LAST — after the
 *  reading line and after the standfirst — because a headline is the last thing a desk cuts. It has
 *  to spend them at all: `nocturne` sets the display register in Futura at 32px, where the long form
 *  runs to three lines, and on a 540px plate three lines of headline are four rows of the grid. */
const title = [
  `Sept pays européens tirent plus de ${FLOOR} % de leur électricité de sources bas-carbone — ` +
    `par trois chemins différents`,
  `Sept pays européens dépassent ${FLOOR} % d’électricité bas-carbone, par trois chemins`,
  `Trois chemins vers une électricité bas-carbone`,
];
const limits = [
  `Part de chaque source dans la production électrique du pays, en ${YEAR}. Les sept pays au-dessus ` +
    `de ${FLOOR} %, plus les ${ROWS_DRAWN - above.length} plus gros producteurs du continent. ` +
    `${names(RENEWABLE_ONLY)} y arrivent sans nucléaire ; ${names(NUCLEAR_LED)} par le nucléaire, ` +
    `qui fait ${one(NUCLEAR_LED[0].nuclear)} % de son mix ; ${names(BOTH_ROUTES)} par les deux. ` +
    `${last.label}, premier producteur d’Europe avec ${Math.round(last.total)} TWh, est à ` +
    `${one(last.lowCarbon)} %.`,
  `Part de chaque source dans la production électrique du pays, en ${YEAR} : les sept pays au-dessus ` +
    `de ${FLOOR} %, plus les plus gros producteurs du continent. ${names(RENEWABLE_ONLY)} sans ` +
    `nucléaire, ${names(NUCLEAR_LED)} par le nucléaire, ${names(BOTH_ROUTES)} par les deux.`,
  `Part de chaque source dans la production électrique du pays, en ${YEAR}. Les sept pays au-dessus ` +
    `de ${FLOOR} % bas-carbone, plus les plus gros producteurs du continent.`,
];
const reading = [
  `Lecture : chaque ligne est un pays et fait 100 % ; les colonnes sont rangées par famille. ` +
    `La couleur est une classe, pas un nombre — les bornes sont imprimées sous la grille, en %. ` +
    `À droite, la part bas-carbone, renouvelables et nucléaire réunis, qui ordonne les lignes.`,
  `Lecture : chaque ligne fait 100 %. La couleur est une classe ; ses bornes sont sous la grille. ` +
    `À droite, la part bas-carbone, qui ordonne les lignes.`,
  `Lecture : chaque ligne fait 100 %. Les bornes de la couleur sont sous la grille.`,
];
const source =
  "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const REGION = {
  from: 0,
  to: above.length - 1,
  label: `plus de ${FLOOR} % bas-carbone`,
};

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${limits.join(" ")} ${source}`,
  axis: `${rows.map((r) => r.label).join(" ")} ${SOURCES.map((s) => s.label).join(" ")} ${BREAKS.map(format).join(" ")} part de la production du pays bas-carbone`,
  annot: `${reading.join(" ")} ${FAMILIES.map((f) => f.name).join(" ")} ${REGION.label}`,
  value: rows.map((r) => format(r.lowCarbon)).join(" "),
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
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
          ? `   refused: ${d.refused.map((r) => `${r.family} [${r.missing.join(",")}]`).join(", ")}`
          : ""),
    );

  try {
    await renderStill({
      element: createElement(DirectedHeatmap, {
        rows: rows.map((r) => ({
          key: r.key,
          label: r.label,
          lowCarbon: r.lowCarbon,
          shares: r.shares,
        })),
        sources: SOURCES,
        families: FAMILIES,
        breaks: BREAKS,
        region: REGION,
        shareHead: "bas-carbone",
        unit: "part de la production du pays",
        title,
        limits,
        reading,
        source,
        alt:
          `Matrice de ${rows.length} pays européens et ${SOURCES.length} sources d’électricité en ${YEAR}. ` +
          `Chaque cellule est la part de la source dans la production du pays. Les ${above.length} ` +
          `premières lignes dépassent ${FLOOR} % bas-carbone : ${names(RENEWABLE_ONLY)} sans nucléaire, ` +
          `${names(NUCLEAR_LED)} par le nucléaire à ${one(NUCLEAR_LED[0].nuclear)} %, ` +
          `${names(BOTH_ROUTES)} par les deux. La colonne « Autres » est vide partout sauf pour ` +
          `l’Islande, à ${one(geothermal.shareOf(OTHER))} % de géothermie. La dernière ligne est ` +
          `${last.label}, premier producteur du continent, à ${one(last.lowCarbon)} % bas-carbone.`,
        eyebrow: EYEBROW,
        format,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
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
