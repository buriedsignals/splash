// beat.mjs for the worked example proof/static-heatmap-europe-electricity — "Seven European countries
// draw more than 94 % of their electricity from low-carbon sources — by three different routes".
// Every number on the plate is COMPUTED from data.json; the title's first form is the journalist's
// takeaway, copied as written.
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
const last = rows[rows.length - 1];

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const list = (group) => {
  const l = group.map((r) => r.label);
  return l.length === 1 ? l[0] : `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}`;
};

export default {
  eyebrow: "Énergie · Europe",
  heads,
  familyShort: { renouvelables: "Renouv.", "nucléaire": "Nucl.", fossiles: "Foss." },
  rows: rows.map((r) => ({ key: r.key, label: r.label, value: r.value, cells: r.cells })),
  // The class edges of the colour ramp, in the cells' unit (%).
  breaks: [2, 5, 10, 20, 40],
  // The top block of rows the takeaway is about, bracketed and named.
  region: { from: 0, to: above.length - 1, label: `plus de ${FLOOR} % bas-carbone` },
  valueHead: "bas-carbone",
  unit: "part de la production du pays",
  format: (v) => `${one(v)} %`,
  title: [
    "Sept pays européens tirent plus de 94 % de leur électricité de sources bas-carbone — par trois chemins différents",
    `Sept pays européens dépassent ${FLOOR} % d’électricité bas-carbone, par trois chemins`,
    "Trois chemins vers une électricité bas-carbone",
  ],
  limits: [
    `Part de chaque source dans la production électrique du pays, en 2024. Les ${above.length} pays au-dessus de ${FLOOR} %, plus les ${rows.length - above.length} plus gros producteurs du continent. ${list(renewableOnly)} y arrivent sans nucléaire ; ${list(nuclearLed)} par le nucléaire ; ${list(both)} par les deux. ${last.label}, premier producteur d’Europe avec ${Math.round(last.total)} TWh, est à ${one(last.value)} %.`,
    `Part de chaque source dans la production électrique du pays, en 2024 : les ${above.length} pays au-dessus de ${FLOOR} % bas-carbone, plus les plus gros producteurs du continent.`,
  ],
  reading: [
    "Lecture : chaque ligne est un pays et fait 100 % ; les colonnes sont rangées par famille. La couleur est une classe, pas un nombre — les bornes sont imprimées sous la grille, en %. À droite, la part bas-carbone, qui ordonne les lignes.",
    "Lecture : chaque ligne fait 100 %. Les bornes de la couleur sont sous la grille.",
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Matrice de ${rows.length} pays européens et ${heads.length} sources d’électricité en 2024. Chaque cellule est la part de la source dans la production du pays. Les ${above.length} premières lignes dépassent ${FLOOR} % bas-carbone : ${list(renewableOnly)} sans nucléaire, ${list(nuclearLed)} par le nucléaire, ${list(both)} par les deux. La dernière ligne est ${last.label}, à ${one(last.value)} % bas-carbone.`,
  evidenceLevels: 6,
  check() {
    // Checked over every country in the file, not only the drawn rows: the claim is about Europe.
    if (above.length !== 7) throw new Error(`${above.length} countries clear ${FLOOR} % low-carbon, not seven`);
    if (renewableOnly.length + nuclearLed.length + both.length !== above.length || !renewableOnly.length || !nuclearLed.length || !both.length)
      throw new Error(`the countries above ${FLOOR} % no longer split into three non-empty routes`);
  },
};
