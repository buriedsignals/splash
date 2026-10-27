// beat.mjs for the worked example proof/static-pictogram-europe-lowcarbon — "L’Europe électrique est aux deux bouts :
// 6 pays seulement au milieu" — written for the Units gesture kit. One square is one country; the blocks are the
// beat's partition (a country goes to the first block whose min <= value < max); render-beat.mjs counts them. The
// staging is the `gestures` list.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BGR: "Bulgarie", HRV: "Croatie",
  CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte",
  MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse",
  TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};

// One unit per country: its low-carbon share of its own production, in %. A country with no production reported has
// no share: it is not drawn, and the standfirst says so.
const measured = data.rows.map((r) => {
  const sum = (keys) => keys.reduce((s, k) => s + Number(r[col(k)] || 0), 0);
  const total = sum(CLEAN) + sum(FOSSIL);
  return { name: FRENCH[r[col("code")]] ?? r[col("entity")], value: total > 0 ? (sum(CLEAN) / total) * 100 : null };
});
const units = measured.filter((m) => m.value !== null);
const absent = measured.length - units.length;
const HIGH = 75;
const LOW = 60;
const middle = units.filter((u) => u.value >= LOW && u.value < HIGH).length;

export default {
  eyebrow: "Énergie · Europe",
  units,
  // The blocks, top to bottom: the two ends and the middle between them.
  blocks: [
    { key: "top", name: `au-dessus de ${HIGH} %`, min: HIGH },
    { key: "middle", name: `entre ${LOW} et ${HIGH} %`, min: LOW, max: HIGH },
    { key: "bottom", name: `sous ${LOW} %`, max: LOW },
  ],
  unit: "part d’électricité bas-carbone (renouvelables et nucléaire), 2024",
  unitIs: "un carré = un pays",
  // The staging: the middle block in the accent and named, then laid against the whole.
  gestures: [
    { do: "highlight", mark: "middle" },
    { do: "name", mark: "middle", note: `${middle} pays seulement` },
    { do: "bracket", mark: "middle", of: "whole", note: `${middle} sur ${units.length}` },
  ],
  title: "L’Europe électrique est aux deux bouts : 6 pays seulement au milieu",
  limits: [
    `Un carré, un pays : les ${units.length} pays européens dont la production électrique de 2024 est rapportée, rangés par part d’électricité bas-carbone — renouvelables et nucléaire réunis. ${absent} pays sans production rapportée n’est pas compté.`,
    `Un carré, un pays : les ${units.length} pays européens dont la production 2024 est rapportée.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: ({ counts, total }) => `Grille d’unités : un carré par pays, ${total} pays européens en trois blocs : ${counts.top} au-dessus de ${HIGH} % d’électricité bas-carbone, ${counts.middle} entre ${LOW} et ${HIGH} %, ${counts.bottom} sous ${LOW} %.`,
  check({ counts, total }) {
    if (counts.middle !== 6) throw new Error(`${counts.middle} countries sit between ${LOW} and ${HIGH} %, not 6`);
    if (!(counts.middle * 4 < total)) throw new Error(`${counts.middle} of ${total} in the middle is not "nearly empty"`);
  },
};
