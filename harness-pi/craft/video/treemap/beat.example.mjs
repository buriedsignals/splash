// beat.mjs for the worked example proof/video-treemap-europe-capacity — « L’eau et l’atome portent encore 77 % du
// bas-carbone européen, mais 10 pays ont basculé », told in time. Every number the video draws is COMPUTED from
// data.json (one row per power station, added up here into one cell per country); which cells tipped, their sum and
// the gather into the largest cell are derived by render-beat.mjs, and check() tests the claim on the same data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [COUNTRY, FUEL, MW] = [col("country"), col("fuel"), col("capacity_mw")];
const NEW_BUILD = ["Wind", "Solar"];
const LEGACY = ["Hydro", "Nuclear"];
const NAMES = {
  France: "France", "United Kingdom": "Royaume-Uni", Spain: "Espagne", Germany: "Allemagne",
  Russia: "Russie", Norway: "Norvège", Sweden: "Suède", Ukraine: "Ukraine", Italy: "Italie",
  Turkey: "Turquie", Switzerland: "Suisse", Austria: "Autriche", Belgium: "Belgique",
  Portugal: "Portugal", Finland: "Finlande", "Czech Republic": "Tchéquie", Romania: "Roumanie",
  Poland: "Pologne", Bulgaria: "Bulgarie", Netherlands: "Pays-Bas", Greece: "Grèce",
  Iceland: "Islande", Serbia: "Serbie", Slovakia: "Slovaquie", Hungary: "Hongrie",
  Croatia: "Croatie", Slovenia: "Slovénie", Ireland: "Irlande", Denmark: "Danemark",
  Georgia: "Géorgie", Armenia: "Arménie", "Bosnia and Herzegovina": "Bosnie-Herzégovine",
  Albania: "Albanie", Macedonia: "Macédoine du Nord", Montenegro: "Monténégro",
  Lithuania: "Lituanie", Latvia: "Lettonie", Estonia: "Estonie", Belarus: "Biélorussie",
  Moldova: "Moldavie", Luxembourg: "Luxembourg", Morocco: "Maroc", Algeria: "Algérie",
  Tunisia: "Tunisie", Iraq: "Irak", "Syrian Arab Republic": "Syrie",
};

// One cell per country: its capacity in MW, and the part of it that is wind and solar.
const byCountry = new Map();
let legacy = 0;
for (const r of data.rows) {
  const mw = Number(r[MW]);
  const cell = byCountry.get(r[COUNTRY]) ?? { name: NAMES[r[COUNTRY]] ?? r[COUNTRY], value: 0, part: 0 };
  cell.value += mw;
  if (NEW_BUILD.includes(r[FUEL])) cell.part += mw;
  if (LEGACY.includes(r[FUEL])) legacy += mw;
  byCountry.set(r[COUNTRY], cell);
}
const cells = [...byCountry.values()];
const total = cells.reduce((s, c) => s + c.value, 0);
const tipped = cells.filter((c) => c.part / c.value > 0.5);

const NB = " ";
const gw = (mw) => (mw / 1000).toFixed(1).replace(".", ",");

export default {
  lang: "fr",
  eyebrow: `Énergie${NB}· Europe`,
  cells,
  partName: "éolien + solaire",
  // A cell's figure: GW from one gigawatt, MW under it.
  format: (mw) => (mw >= 1000 ? `${gw(mw)}${NB}GW` : `${Math.round(mw)}${NB}MW`),
  // The whole climbs in GW: one count per 1000 MW.
  wholeDivisor: 1000,
  wholeLabel: (n) => `${n}${NB}GW`,
  countLabel: (n) => `${n}${NB}pays`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    `L’eau et l’atome portent encore 77${NB}% du bas-carbone européen, mais 10${NB}pays ont basculé`,
    `L’eau et l’atome portent 77${NB}% du bas-carbone européen, mais 10${NB}pays ont basculé`,
  ],
  source: [
    "Source : WRI Global Power Plant Database v1.3.0 · puissance installée, non production",
    "Source : WRI Global Power Plant Database v1.3.0 · puissance installée",
    "Source : WRI Global Power Plant Database",
  ],
  evidenceLevels: 4,
  check() {
    if (Math.round((legacy / total) * 100) !== 77) throw new Error(`the title says water and the atom carry 77 %; they carry ${((legacy / total) * 100).toFixed(1)} %`);
    if (tipped.length !== 10) throw new Error(`the title says 10 countries tipped; ${tipped.length} did`);
  },
};
