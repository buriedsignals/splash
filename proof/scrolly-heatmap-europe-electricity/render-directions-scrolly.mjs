// Europe's 2024 electricity mix, twelve countries × nine sources, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `heatmap` type in the scrolly format.
//
// THE SUBJECT OF `static-heatmap-europe-electricity`, CHOREOGRAPHED. The shares, the selection rule, the seven above
// the floor, the three routes and every assertion are the static beat's own; the scroll tells them with its own
// gestures (`scrolly/references/directed-type-choreography.md`):
//
//   1. the grid, rows in alphabetical order, empty;
//   2. the cells filled family by family;
//   3. the rows re-sorted on their low-carbon share, the seven bracketed;
//   4. the seven regrouped into their three routes;
//   5. the "other renewables" column alone: Iceland's geothermal;
//   6. the static plate's sorted matrix.
//
// Usage:  bun proof/scrolly-heatmap-europe-electricity/render-directions-scrolly.mjs

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
import { DirectedHeatmapScrolly } from "./DirectedHeatmapScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const YEAR = 2024;
const EYEBROW = "Énergie · Europe";
const NB = " ";
const FAMILIES = ["renouvelables", "nucléaire", "fossiles"];
const SOURCES = [
  { key: "hydro_generation__twh", label: "Hydraulique", short: "Hy", family: 0 },
  { key: "wind_generation__twh", label: "Éolien", short: "Éo", family: 0 },
  { key: "solar_generation__twh", label: "Solaire", short: "So", family: 0 },
  { key: "bioenergy_stacked_generation__twh", label: "Bioénergie", short: "Bi", family: 0 },
  { key: "other_renewables_generation__twh", label: "Autres", short: "Au", family: 0 },
  { key: "nuclear_generation__twh", label: "Nucléaire", short: "Nu", family: 1 },
  { key: "gas_generation__twh", label: "Gaz", short: "Ga", family: 2 },
  { key: "coal_generation__twh", label: "Charbon", short: "Ch", family: 2 },
  { key: "oil_generation__twh", label: "Pétrole", short: "Pé", family: 2 },
];
const FRENCH = {
  Albania: "Albanie", Austria: "Autriche", Belarus: "Biélorussie", Belgium: "Belgique", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  Bulgaria: "Bulgarie", Croatia: "Croatie", Cyprus: "Chypre", Czechia: "Tchéquie", Denmark: "Danemark", Estonia: "Estonie",
  Finland: "Finlande", France: "France", Germany: "Allemagne", Greece: "Grèce", Hungary: "Hongrie", Iceland: "Islande",
  Ireland: "Irlande", Italy: "Italie", Latvia: "Lettonie", Lithuania: "Lituanie", Luxembourg: "Luxembourg", Malta: "Malte",
  Moldova: "Moldavie", Montenegro: "Monténégro", Netherlands: "Pays-Bas", "North Macedonia": "Macédoine du Nord", Norway: "Norvège",
  Poland: "Pologne", Portugal: "Portugal", Romania: "Roumanie", Russia: "Russie", Serbia: "Serbie", Slovakia: "Slovaquie",
  Slovenia: "Slovénie", Spain: "Espagne", Sweden: "Suède", Switzerland: "Suisse", Turkey: "Turquie", Ukraine: "Ukraine",
  "United Kingdom": "Royaume-Uni",
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
  return FRENCH[entity];
};

// ── the shares, the selection and the static beat's own assertions ─────────────────────────────
const csv = (await readFile(join(HERE, "data.csv"), "utf8")).trim().split(/\r?\n/);
const header = csv[0].split(",");
const measured = csv.slice(1).map((l) => {
  const raw = Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]]));
  if (Number(raw.year) !== YEAR) throw new Error(`${raw.entity} is not ${YEAR}`);
  const twh = SOURCES.map((s) => Number(raw[s.key] || 0));
  return { raw, twh, total: twh.reduce((a, b) => a + b, 0) };
});
const everyCountry = measured
  .filter((m) => m.total > 0)
  .map(({ raw, twh, total }) => {
    const shares = twh.map((v) => (v / total) * 100);
    const renewables = SOURCES.reduce((s, src, i) => s + (src.family === 0 ? shares[i] : 0), 0);
    const nuclear = shares[5];
    return { key: raw.entity, label: french(raw.entity), total, shares, renewables, nuclear, lowCarbon: renewables + nuclear };
  })
  .sort((a, b) => b.lowCarbon - a.lowCarbon);
const FLOOR = 94;
const ROWS_DRAWN = 12;
const ABOVE = 7;
const above = everyCountry.filter((r) => r.lowCarbon > FLOOR);
if (above.length !== ABOVE) throw new Error(`the headline says ${ABOVE} European countries clear ${FLOOR} % low-carbon; ${above.length} do`);
const biggest = everyCountry.filter((r) => !above.includes(r)).sort((a, b) => b.total - a.total).slice(0, ROWS_DRAWN - above.length);
const rows = [...above, ...biggest].sort((a, b) => b.lowCarbon - a.lowCarbon);
const RENEWABLE_ONLY = above.filter((r) => r.nuclear === 0);
const NUCLEAR_LED = above.filter((r) => r.nuclear >= 50);
const BOTH_ROUTES = above.filter((r) => r.nuclear > 0 && r.nuclear < 50 && r.renewables >= 50);
if (RENEWABLE_ONLY.length + NUCLEAR_LED.length + BOTH_ROUTES.length !== above.length) throw new Error("every country above the floor takes exactly one of the three routes; the partition does not add up");
for (const group of [RENEWABLE_ONLY, NUCLEAR_LED, BOTH_ROUTES]) if (!group.length) throw new Error("a route is empty");
const OTHER = 4;
const geothermal = everyCountry.reduce((a, b) => (b.shares[OTHER] > a.shares[OTHER] ? b : a));
if (geothermal.key !== "Iceland" || geothermal.shares[OTHER] < 25) throw new Error(`the fifth card says Iceland carries the largest "other renewables" share; the largest is ${geothermal.label}`);
const secondOther = rows.filter((r) => r.key !== geothermal.key).reduce((a, b) => (b.shares[OTHER] > a.shares[OTHER] ? b : a));
if (!(secondOther.shares[OTHER] < 5)) throw new Error(`the fifth card says Iceland's is the only dark cell of its column; ${secondOther.label} has ${secondOther.shares[OTHER].toFixed(1)} %`);
const BREAKS = [2, 5, 10, 20, 40];

const one = (v) => plainSpaces(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const pct = (v) => `${one(v)}${NB}%`;
const names = (group) => (group.length === 1 ? group[0].label : `${group.slice(0, -1).map((r) => r.label).join(", ")} et ${group[group.length - 1].label}`);
const byLow = (a, b) => b.lowCarbon - a.lowCarbon;
console.log(`${rows.length} pays · au-dessus : ${above.map((r) => r.key).join(", ")} · géothermie ${geothermal.shares[OTHER].toFixed(1)} %\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `Sept pays européens tirent plus de ${FLOOR}${NB}% de leur électricité de sources bas-carbone — par trois chemins différents`,
  `Sept pays européens dépassent ${FLOOR}${NB}% d’électricité bas-carbone, par trois chemins`,
  `Trois chemins vers une électricité bas-carbone`,
];
const prose = [
  [`Douze pays européens : les sept qui tirent plus de ${FLOOR}${NB}% de leur électricité de sources bas-carbone, et les cinq plus gros producteurs du continent. Une ligne par pays, une colonne par source.`],
  [`Chaque case est la part d’une source dans la production du pays en ${YEAR}, en six classes : les renouvelables, puis le nucléaire, puis les fossiles.`],
  [`Rangeons les pays par part bas-carbone, renouvelables et nucléaire réunis. Sept dépassent ${FLOOR}${NB}%.`],
  [`Ils y arrivent par trois chemins : ${names(RENEWABLE_ONLY)} sans nucléaire ; ${names(NUCLEAR_LED)} par le nucléaire, ${pct(NUCLEAR_LED[0].nuclear)} de son mix ; ${names(BOTH_ROUTES)} par les deux.`],
  [`Une seule colonne presque vide, les « autres » renouvelables, a une case sombre : la géothermie de l’Islande, ${pct(geothermal.shares[OTHER])} de son électricité.`],
  [`Lecture : chaque ligne fait 100${NB}%. La couleur est une classe, pas un nombre ; ses bornes sont sous la grille. À droite, la part bas-carbone qui ordonne les lignes.`],
];
const source = "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data";
const words = {
  unit: `part de chaque source dans la production électrique, ${YEAR}`,
  region: `plus de ${FLOOR}${NB}% bas-carbone`,
  sortNote: `${ABOVE} pays au-dessus de ${FLOOR}${NB}%`,
  routeNote: `trois chemins`,
  focusNote: `Islande${NB}: géothermie ${pct(geothermal.shares[OTHER])}`,
};
const routes = ["sans nucléaire", "par le nucléaire", "par les deux"];
const orders = {
  alpha: [...rows].sort((a, b) => a.label.localeCompare(b.label, "fr")).map((r) => r.key),
  sorted: rows.map((r) => r.key),
  grouped: [RENEWABLE_ONLY, NUCLEAR_LED, BOTH_ROUTES].map((g) => [...g].sort(byLow).map((r) => r.key)),
};
const alt =
  `Grille de ${rows.length} pays européens par 9 sources d’électricité en ${YEAR}, la couleur indiquant la part de chaque source. ` +
  `Sept pays dépassent ${FLOOR} % bas-carbone : ${names(RENEWABLE_ONLY)} sans nucléaire, ${names(NUCLEAR_LED)} par le nucléaire, ${names(BOTH_ROUTES)} par les deux.`;

/** One state per card; see `heatmap-drive.mjs` for what each field paints. The last card is the static plate —
 *  the sorted matrix with its bracket — so it differs from the third only by the card's note stepping out. */
const STATES = [
  { fill: 0, sort: 0, group: 0, focus: 0, notes: 0 },
  { fill: FAMILIES.length, sort: 0, group: 0, focus: 0, notes: 0 },
  { fill: FAMILIES.length, sort: 1, group: 0, focus: 0, notes: 1 },
  { fill: FAMILIES.length, sort: 1, group: 1, focus: 0, notes: 1 },
  { fill: FAMILIES.length, sort: 1, group: 1, focus: 1, notes: 1 },
  { fill: FAMILIES.length, sort: 1, group: 0, focus: 0, notes: 0 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${rows.map((r) => r.label).join(" ")} ${SOURCES.map((s) => `${s.label} ${s.short}`).join(" ")} ${BREAKS.map((b) => pct(b)).join(" ")} part de la production du pays bas-carbone`,
  annot: `${FAMILIES.join(" ")} renouv. nucl. foss. ${words.region} ${routes.join(" ")}`,
  value: `${rows.map((r) => pct(r.lowCarbon)).join(" ")} ${words.sortNote} ${words.routeNote} ${words.focusNote}`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: BREAKS.length + 1 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "heatmap-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: ["grille", "remplissage", "tri", "trois-chemins", "geothermie", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedHeatmapScrolly, {
          rows: rows.map((r) => ({ key: r.key, label: r.label, shares: r.shares, lowCarbon: r.lowCarbon, share: pct(r.lowCarbon) })),
          sources: SOURCES.map(({ label, short, family }) => ({ label, short, family })),
          families: FAMILIES,
          familyShort: ["renouv.", "nucl.", "foss."],
          breaks: BREAKS.map((b) => ({ value: b, label: pct(b) })),
          orders,
          routes,
          focusColumn: OTHER,
          focusRow: geothermal.key,
          words,
          alt,
          regs,
          stroke: direction.stroke ?? {},
          ground: direction.ground,
          accent: direction.accent,
          ink,
          muted,
        }),
        states: STATES,
        driver,
        apply: "applyHeatmapState",
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
