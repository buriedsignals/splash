// beat.mjs for the worked example proof/static-heatmap-europe-electricity — "Seven European countries draw more than
// 94 % of their electricity from low-carbon sources — by three different routes" — written for the WEB gesture kit: the
// staging is the `gestures` list. Every number on the plate is COMPUTED from data.json; the title's first form is the
// journalist's takeaway, copied as written.
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
  Albania: "Albanie", Austria: "Autriche", Belgium: "Belgique", Bulgaria: "Bulgarie", Croatia: "Croatie",
  Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France", Germany: "Allemagne",
  Iceland: "Islande", Italy: "Italie", Netherlands: "Pays-Bas", Norway: "Norvège", Poland: "Pologne",
  Portugal: "Portugal", Russia: "Russie", Slovakia: "Slovaquie", Spain: "Espagne", Sweden: "Suède",
  Switzerland: "Suisse", Turkey: "Turquie", Ukraine: "Ukraine", "United Kingdom": "Royaume-Uni",
};
const LOW_CARBON = new Set(["renouvelables", "nucléaire"]);

// Each country: every cell is a SHARE of its own generation. A country reporting no generation is dropped.
const everyCountry = data.rows
  .map((r) => {
    const twh = heads.map((h) => Number(r[at(h.key)] ?? 0));
    return { entity: r[at("entity")], twh, total: twh.reduce((a, b) => a + b, 0) };
  })
  .filter((m) => m.total > 0)
  .map(({ entity, twh, total }) => {
    const cells = twh.map((v) => (v / total) * 100);
    const value = cells.reduce((s, v, j) => s + (LOW_CARBON.has(heads[j].family) ? v : 0), 0);
    return { key: entity, label: NAMES[entity] ?? entity, total, cells, value };
  })
  .sort((a, b) => b.value - a.value);

// The selection, a stated rule: every country above the floor, plus the largest producers to twelve rows.
const FLOOR = 94;
const above = everyCountry.filter((r) => r.value > FLOOR);
const biggest = everyCountry.filter((r) => !above.includes(r)).sort((a, b) => b.total - a.total).slice(0, 12 - above.length);
const rows = [...above, ...biggest].sort((a, b) => b.value - a.value);

const cellOf = (row, label) => row.cells[heads.findIndex((h) => h.label === label)];
const nuclearLed = above.reduce((a, b) => (cellOf(b, "Nucléaire") > cellOf(a, "Nucléaire") ? b : a));
const hydroLed = above.reduce((a, b) => (cellOf(b, "Hydraulique") > cellOf(a, "Hydraulique") ? b : a));
const last = rows[rows.length - 1];

const plain = (s) => s.replace(/[  ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  // The words of the option that shows the page as it lands (every control starts on it).
  restLabel: "La grille seule",
  heads,
  familyShort: { renouvelables: "Renouv.", "nucléaire": "Nucl.", fossiles: "Foss." },
  // `key` is the row's name in data.json, `label` the name printed (and the name a gesture uses).
  rows: rows.map((r) => ({ key: r.key, label: r.label, value: r.value, cells: r.cells })),
  // The class edges of the colour ramp, in the cells' unit (%).
  breaks: [2, 5, 10, 20, 40],
  valueHead: "bas-carbone",
  unit: "part de la production du pays",
  format: (v) => `${one(v)} %`,
  // The staging, in story order: the block of rows past the floor, its two extremes set against each other, the
  // others stepped back.
  gestures: [
    { do: "trace", value: FLOOR, note: `${above.length} pays au-dessus de ${FLOOR} % bas-carbone` },
    { do: "compare", marks: [`${nuclearLed.label} · Nucléaire`, `${hydroLed.label} · Hydraulique`], note: `${nuclearLed.label} : ${one(cellOf(nuclearLed, "Nucléaire"))} % de nucléaire ; ${hydroLed.label} : ${one(cellOf(hydroLed, "Hydraulique"))} % d’hydraulique` },
    { do: "filter", marks: above.map((r) => r.label) },
  ],
  title: [
    "Sept pays européens tirent plus de 94 % de leur électricité de sources bas-carbone — par trois chemins différents",
    `Sept pays européens dépassent ${FLOOR} % d’électricité bas-carbone, par trois chemins`,
  ],
  limits: [
    `Part de chaque source dans la production électrique du pays, en 2024. Les ${above.length} pays au-dessus de ${FLOOR} %, plus les ${rows.length - above.length} plus gros producteurs du continent. ${last.label}, premier producteur d’Europe avec ${Math.round(last.total)} TWh, est à ${one(last.value)} %.`,
    `Part de chaque source dans la production électrique du pays, en 2024.`,
  ],
  reading: [
    "Lecture : chaque ligne est un pays et fait 100 %. La couleur est une classe, pas un nombre — ses bornes sont au-dessus de la grille ; chaque case donne sa valeur exacte au survol.",
    "Lecture : chaque ligne fait 100 %.",
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Matrice de ${rows.length} pays européens et ${heads.length} sources d’électricité en 2024. Les ${above.length} premières lignes dépassent ${FLOOR} % bas-carbone ; ${nuclearLed.label} par le nucléaire, ${hydroLed.label} par l’hydraulique.`,
  evidenceLevels: 6,
  check() {
    // Checked over every country in the file, not only the drawn rows: the claim is about Europe.
    if (above.length !== 7) throw new Error(`${above.length} countries clear ${FLOOR} % low-carbon, not seven`);
  },
};
