// beat.mjs for the worked example proof/static-choropleth-europe-lowcarbon — "Seven European
// countries clear 94 % low-carbon electricity: six in the north-west, and Albania". Every number on
// the plate is COMPUTED from data.json; the map, the camera and the colours are the kit's.
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

// The plate's language is French: the names the map prints.
const FRENCH = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie",
  FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", ISL: "Islande",
  IRL: "Irlande", ITA: "Italie", LVA: "Lettonie", LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte",
  MDA: "Moldavie", MNE: "Monténégro", NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège",
  POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie",
  SVN: "Slovénie", ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine",
  GBR: "Royaume-Uni",
};

// THE JOIN: the `code` column holds ISO alpha-3 codes, which match the shapes. The value is the
// low-carbon share of generation; a country whose generation is not reported (total 0) is null.
const rows = table.rows.map((r) => {
  const sum = (cols) => cols.reduce((s, i) => s + num(r[i]), 0);
  const total = sum(RENEWABLE) + num(r[NUCLEAR]) + sum(FOSSIL);
  return {
    iso: r[CODE],
    name: FRENCH[r[CODE]] ?? r[ENTITY],
    value: total > 0 ? ((sum(RENEWABLE) + num(r[NUCLEAR])) / total) * 100 : null,
  };
});

const FLOOR = 94;
const withValue = rows.filter((r) => r.value !== null).sort((a, b) => b.value - a.value);
const above = withValue.filter((r) => r.value > FLOOR);
const albania = rows.find((r) => r.iso === "ALB");
const fr1 = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");
const NEIGHBOUR_CEILING = 60;

export default {
  eyebrow: "Énergie · Europe",
  rows,
  // The classes: the headline's floor is the top break, so "above 94 %" is one class.
  breaks: [40, 55, 70, 85, FLOOR],
  // The countries the title is about: named on the map in the strongest ink.
  named: above.map((r) => r.iso),
  // The one country ringed in the accent, and the callout sentence about it (forms, longest first).
  subject: "ALB",
  callout: [
    `Albanie, ${fr1(albania.value)} %, est le seul du groupe hors du nord-ouest. Ses voisins sont tous sous ${NEIGHBOUR_CEILING} %.`,
    `Albanie, ${fr1(albania.value)} %, est le seul du groupe hors du nord-ouest.`,
    `Albanie, ${fr1(albania.value)} % : le seul hors du nord-ouest.`,
  ],
  seas: {
    northSea: ["Mer du Nord", "Mer du N."],
    mediterranean: ["Mer Méditerranée", "Méditerranée", "Médit."],
    baltic: ["Mer Baltique", "Baltique", "Balt."],
  },
  unit: "part bas-carbone de la production",
  missingLabel: "donnée non rapportée",
  format: (v) => `${Math.round(v)} %`,
  title: [
    "Sept pays européens dépassent 94 % d’électricité bas-carbone — six au nord-ouest, et l’Albanie",
    "Le bas-carbone européen est au nord-ouest — et en Albanie",
    "Le nord-ouest, et l’Albanie",
  ],
  limits: [
    `Part de l’électricité produite à partir de sources bas-carbone — renouvelables et nucléaire réunis — en 2024, dans les ${withValue.length} pays européens dont la production est rapportée.`,
    `Électricité bas-carbone en 2024, ${withValue.length} pays européens.`,
  ],
  reading: [
    "Lecture : la couleur est une classe, pas un nombre ; ses bornes sont imprimées sous la carte. La Russie et la Turquie sont colorées sur leur part nationale.",
    "Lecture : la couleur est une classe.",
  ],
  source: "Source : Ember / Energy Institute (2025), via Our World in Data · carte MapTiler",
  alt: `Carte choroplèthe de l’Europe : part de l’électricité bas-carbone par pays en 2024, dans ${withValue.length} pays. ${above.length} dépassent ${FLOOR} % — ${above.map((r) => `${r.name} ${fr1(r.value)} %`).join(", ")}.`,
  evidenceLevels: 6,
  // The claim checked against the drawn data, with the kit's helpers (CONTRACT.md).
  check({ neighboursOf, value, anchorOf }) {
    if (above.length !== 7) throw new Error(`the title says seven countries clear ${FLOOR} %; ${above.length} do`);
    if (!above.some((r) => r.iso === "ALB")) throw new Error("Albania is no longer above the floor");
    const over = neighboursOf("ALB").filter((iso) => value(iso) >= NEIGHBOUR_CEILING);
    if (over.length) throw new Error(`the callout says every neighbour of Albania is under ${NEIGHBOUR_CEILING} %; ${over.join(", ")} are not`);
    const alb = anchorOf("ALB");
    const elsewhere = above.filter((r) => r.iso !== "ALB" && anchorOf(r.iso).y > alb.y && anchorOf(r.iso).x > alb.x);
    if (elsewhere.length) throw new Error(`the title says the other six are north or west of Albania; ${elsewhere.map((r) => r.name).join(", ")} is neither`);
  },
};
