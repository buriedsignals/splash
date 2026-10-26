// beat.mjs for the worked example proof/static-pictogram-europe-lowcarbon — "L'Europe électrique est
// aux deux bouts : 6 pays seulement au milieu". One square is one country. render-beat.mjs puts each
// country in its block and counts the blocks, and passes the counts to check().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const CODE = col("code");
const CLEAN = ["hydro", "wind", "solar", "bioenergy", "other_renewables", "nuclear"];
const FOSSIL = ["gas", "coal", "oil"];

const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BGR: "Bulgarie", HRV: "Croatie",
  CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte",
  MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse",
  TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};

// One unit per country: its low-carbon share of its own production, in %. A country with no
// production reported has no share — it is not drawn, and absentNote says so.
const measured = data.rows.map((r) => {
  const sum = (keys) => keys.reduce((s, k) => s + Number(r[col(k)] || 0), 0);
  const total = sum(CLEAN) + sum(FOSSIL);
  return { key: r[CODE], label: FRENCH[r[CODE]] ?? r[CODE], value: total > 0 ? (sum(CLEAN) / total) * 100 : null };
});
const units = measured.filter((m) => m.value !== null);
const absent = measured.filter((m) => m.value === null).map((m) => m.label);

const HIGH = 75;
const LOW = 60;
const count = (f) => units.filter(f).length;

export default {
  eyebrow: "Énergie · Europe",
  units,
  unitThing: "pays",
  // The blocks, top to bottom: a unit goes in the block where min <= value < max.
  blocks: [
    { key: "top", name: `pays au-dessus de ${HIGH} % d’électricité bas-carbone`, min: HIGH, thread: true },
    { key: "middle", name: `entre ${LOW} et ${HIGH} %`, min: LOW, max: HIGH, thread: false },
    { key: "bottom", name: `sous ${LOW} %`, max: LOW, thread: true },
  ],
  // The shade classes inside the squares, and how their edges are printed in the key.
  breaks: [40, 60, 75, 94],
  formatBreak: (b) => `${b} %`,
  format: (v) => String(v),
  unitIs: "un carré = un pays",
  absent,
  absentNote: `${absent.length} pays sans donnée 2024 n’est pas dessiné`,
  title: [
    "L’Europe électrique est aux deux bouts : 6 pays seulement au milieu",
    "L’Europe électrique est aux deux bouts",
    `Aux deux bouts, ${count((u) => u.value >= LOW && u.value < HIGH)} au milieu`,
  ],
  limits: [
    `Un carré, un pays : les ${units.length} pays européens dont la production électrique de 2024 est rapportée, rangés par part d’électricité bas-carbone — renouvelables et nucléaire réunis. ${count((u) => u.value >= HIGH)} dépassent ${HIGH} %, ${count((u) => u.value < LOW)} sont sous ${LOW} %, et ${count((u) => u.value >= LOW && u.value < HIGH)} seulement se tiennent entre les deux.`,
    `Un carré, un pays : les ${units.length} pays européens dont la production 2024 est rapportée. ${count((u) => u.value >= HIGH)} au-dessus de ${HIGH} %, ${count((u) => u.value < LOW)} sous ${LOW} %.`,
    `Un carré, un pays : ${units.length} pays européens, par part d’électricité bas-carbone.`,
  ],
  reading: [
    "Lecture : chaque carré est un pays et se compte. La teinte du carré donne sa classe, dont les bornes sont sous la grille ; le nombre devant chaque bloc est le compte de ce bloc, en pays.",
    "Lecture : un carré, un pays. Le nombre devant chaque bloc est son compte, en pays.",
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: ({ counts, total }) =>
    `Grille d’unités : un carré par pays, pour les ${total} pays européens dont la production électrique de 2024 est rapportée, en trois blocs. ${counts.top} carrés au-dessus de ${HIGH} % d’électricité bas-carbone, ${counts.middle} entre ${LOW} et ${HIGH} %, ${counts.bottom} sous ${LOW} %. La teinte de chaque carré donne sa classe.`,
  evidenceLevels: 5,
  check({ counts, total }) {
    if (counts.middle !== 6) throw new Error(`${counts.middle} countries sit between ${LOW} and ${HIGH} %, not 6`);
    if (!(counts.middle * 4 < total)) throw new Error(`${counts.middle} of ${total} in the middle is not "nearly empty"`);
  },
};
