// beat.mjs for the worked example proof/video-heatmap-europe-electricity — « Sept pays européens dépassent 94 %
// d’électricité bas-carbone, par trois chemins », told in time. Every number the video draws is COMPUTED from data.json;
// the measure, the rank, the count past the floor and the routes' check are run by render-beat.mjs from `rows`.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

// The columns, in the order drawn, each with its family (a family's columns side by side).
const heads = [
  { key: "hydro_generation__twh", label: "Hydraulique", short: "Hydro", family: "renouvelables" },
  { key: "wind_generation__twh", label: "Éolien", short: "Éolien", family: "renouvelables" },
  { key: "solar_generation__twh", label: "Solaire", short: "Solaire", family: "renouvelables" },
  { key: "bioenergy_stacked_generation__twh", label: "Bioénergie", short: "Bio", family: "renouvelables" },
  { key: "other_renewables_generation__twh", label: "Autres", short: "Autres", family: "renouvelables" },
  { key: "nuclear_generation__twh", label: "Nucléaire", short: "Nucl.", family: "nucléaire" },
  { key: "gas_generation__twh", label: "Gaz", short: "Gaz", family: "fossiles" },
  { key: "coal_generation__twh", label: "Charbon", short: "Charbon", family: "fossiles" },
  { key: "oil_generation__twh", label: "Pétrole", short: "Pétrole", family: "fossiles" },
];
const NAMES = {
  Albania: "Albanie", Austria: "Autriche", Belarus: "Biélorussie", Belgium: "Belgique",
  "Bosnia and Herzegovina": "Bosnie-Herzégovine", Bulgaria: "Bulgarie", Croatia: "Croatie", Cyprus: "Chypre",
  Czechia: "Tchéquie", Denmark: "Danemark", Estonia: "Estonie", Finland: "Finlande", France: "France",
  Germany: "Allemagne", Greece: "Grèce", Hungary: "Hongrie", Iceland: "Islande", Ireland: "Irlande",
  Italy: "Italie", Latvia: "Lettonie", Lithuania: "Lituanie", Luxembourg: "Luxembourg", Malta: "Malte",
  Moldova: "Moldavie", Montenegro: "Monténégro", Netherlands: "Pays-Bas", "North Macedonia": "Macédoine du Nord",
  Norway: "Norvège", Poland: "Pologne", Portugal: "Portugal", Romania: "Roumanie", Russia: "Russie",
  Serbia: "Serbie", Slovakia: "Slovaquie", Slovenia: "Slovénie", Spain: "Espagne", Sweden: "Suède",
  Switzerland: "Suisse", Turkey: "Turquie", Ukraine: "Ukraine", "United Kingdom": "Royaume-Uni",
};
const RENEWABLE = heads.filter((h) => h.family === "renouvelables").map((h) => h.key);

// Each country: every cell is a SHARE of its own generation. A country reporting no generation is dropped.
const everyCountry = data.rows
  .map((r) => {
    const twh = heads.map((h) => Number(r[at(h.key)] ?? 0));
    const total = twh.reduce((a, b) => a + b, 0);
    return { r, twh, total };
  })
  .filter((m) => m.total > 0)
  .map(({ r, twh, total }) => {
    const cells = twh.map((v) => (v / total) * 100);
    const shareOf = (key) => cells[heads.findIndex((h) => h.key === key)];
    const renewables = RENEWABLE.reduce((s, k) => s + shareOf(k), 0);
    const nuclear = shareOf("nuclear_generation__twh");
    const entity = r[at("entity")];
    return { key: entity, label: NAMES[entity] ?? entity, total, cells, renewables, nuclear, value: renewables + nuclear };
  })
  .sort((a, b) => b.value - a.value);

// The selection, a stated rule: every country above the floor, plus the largest producers to twelve rows.
const FLOOR = 94;
const above = everyCountry.filter((r) => r.value > FLOOR);
const biggest = everyCountry.filter((r) => !above.includes(r)).sort((a, b) => b.total - a.total).slice(0, 12 - above.length);
const rows = [...above, ...biggest].sort((a, b) => b.value - a.value);

const renewableOnly = above.filter((r) => r.nuclear === 0);
const nuclearLed = above.filter((r) => r.nuclear >= 50);
const both = above.filter((r) => r.nuclear > 0 && r.nuclear < 50 && r.renewables >= 50);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // The columns, in the order drawn; a family's columns side by side, its name over them.
  heads: heads.map((h) => ({ key: h.key, label: h.label, family: h.family })),
  // The families whose cells add up to the measure the floor is about (drawn in the accent while the bars grow).
  measured: ["renouvelables", "nucléaire"],
  // Every cell is a share of the row's own whole, in the heads' order.
  rows: rows.map((r) => ({ key: r.key, label: r.label, cells: r.cells })),
  floor: FLOOR,
  // The rows past the floor, split into the routes the video names, ordered by the ringed column.
  routes: [
    { name: "renouvelables", keys: renewableOnly.map((r) => r.key) },
    { name: "les deux", keys: both.map((r) => r.key) },
    { name: "nucléaire", keys: nuclearLed.map((r) => r.key) },
  ],
  // The column the routes differ by: ringed over the rows past the floor.
  ring: "nuclear_generation__twh",
  // The head of the measure column at the right.
  valueHead: "bas-carbone",
  // The count while the bars grow: n rows past the floor.
  count: (n) => `${n} pays`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Sept pays européens dépassent 94 % d’électricité bas-carbone, par trois chemins", "Trois chemins vers une électricité bas-carbone"],
  source: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
    "Source : Ember, Energy Institute, via Our World in Data",
    "Source : Ember, via Our World in Data",
    "Ember, via OWID",
  ],
  evidenceLevels: 2,
  check() {
    // Checked over every country in the file, not only the drawn rows: the claim is about Europe.
    if (above.length !== 7) throw new Error(`${above.length} countries clear ${FLOOR} % low-carbon, not seven`);
    if (renewableOnly.length + nuclearLed.length + both.length !== above.length || !renewableOnly.length || !nuclearLed.length || !both.length)
      throw new Error(`the countries above ${FLOOR} % no longer split into three non-empty routes`);
  },
};
