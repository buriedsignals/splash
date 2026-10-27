// beat.mjs for the worked example proof/static-choropleth-europe-lowcarbon, as a video GESTURE beat — "Sept pays européens
// dépassent 94 % d’électricité bas-carbone — six au nord-ouest, et l’Albanie". The map, the classes and the layout are
// the kit's; the staging is the `gestures` list. Every number is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [ENTITY, CODE] = [col("entity"), col("code")];
const RENEWABLE = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh"].map(col);
const NUCLEAR = col("nuclear_generation__twh");
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"].map(col);
const num = (v) => Number(v || 0);

const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine", BGR: "Bulgarie",
  HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie", FIN: "Finlande", FRA: "France",
  DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas",
  MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie",
  SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie",
  UKR: "Ukraine", GBR: "Royaume-Uni",
};

// THE JOIN: `key` is the ISO alpha-3 code; `value` the low-carbon share (null where generation is not reported).
const rows = table.rows.map((r) => {
  const sum = (cols) => cols.reduce((s, i) => s + num(r[i]), 0);
  const total = sum(RENEWABLE) + num(r[NUCLEAR]) + sum(FOSSIL);
  return { key: r[CODE], name: FRENCH[r[CODE]] ?? r[ENTITY], value: total > 0 ? ((sum(RENEWABLE) + num(r[NUCLEAR])) / total) * 100 : null };
});

const FLOOR = 94;
const withValue = rows.filter((r) => r.value !== null).sort((a, b) => b.value - a.value);
const above = withValue.filter((r) => r.value >= FLOOR);
const albania = rows.find((r) => r.key === "ALB");
const fr1 = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  rows,
  // The classes: the headline's floor is the top break, so "above 94 %" is one class.
  breaks: [40, 55, 70, 85, FLOOR],
  // THE STAGING, in story order. The core checks every mark and every number in every note.
  // A video takes exactly three gestures: reveal, subject, conclusion (the third shows the whole map).
  gestures: [
    { do: "reveal" },
    { do: "filter", marks: above.map((r) => r.key), note: `${above.length} pays à ${FLOOR} % ou plus` },
    { do: "name", mark: "ALB", note: `Albanie, ${fr1(albania.value)} % : la seule hors du nord-ouest` },
  ],
  unit: "part bas-carbone de la production",
  missingLabel: "non rapporté",
  format: (v) => `${Math.round(v)} %`,
  title: [
    "Sept pays européens dépassent 94 % d’électricité bas-carbone — six au nord-ouest, et l’Albanie",
    "Le bas-carbone européen est au nord-ouest — et en Albanie",
  ],
  limits: [
    `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire réunis — en 2024, dans les ${withValue.length} pays européens dont la production est rapportée.`,
    `Électricité bas-carbone en 2024, ${withValue.length} pays européens.`,
  ],
  reading: ["Lecture : la couleur est une classe, pas un nombre ; ses bornes sont imprimées sous la carte.", "Lecture : la couleur est une classe."],
  source: "Source : Ember / Energy Institute (2025), via Our World in Data",
  alt: `Carte choroplèthe de l’Europe : part de l’électricité bas-carbone par pays en 2024, ${withValue.length} pays. ${above.length} atteignent ${FLOOR} % ou plus — ${above.map((r) => `${r.name} ${fr1(r.value)} %`).join(", ")}.`,
  check() {
    if (above.length !== 7) throw new Error(`the title says seven countries clear ${FLOOR} %; ${above.length} do`);
    if (!above.some((r) => r.key === "ALB")) throw new Error("Albania is no longer above the floor");
  },
};
