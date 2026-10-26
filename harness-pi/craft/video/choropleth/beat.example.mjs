// beat.mjs for the worked example proof/video-choropleth-europe-lowcarbon — « Le bas-carbone européen est au
// nord-ouest — et en Albanie », told in time. Every number the video draws is COMPUTED from data.json; the classes,
// the floor's steps, the neighbours and the camera are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, YEAR_COL] = [col("code"), col("year")];
const LOW = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"].map(col);
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"].map(col);
const YEAR = 2024;

// The video is in French: the names the map and the close-up print.
const NAMES = {
  ALB: "Albanie", AUT: "Autriche", BLR: "Biélorussie", BEL: "Belgique", BIH: "Bosnie-Herzégovine",
  BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark",
  EST: "Estonie", FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce",
  HUN: "Hongrie", ISL: "Islande", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", MDA: "Moldavie", MNE: "Monténégro",
  NLD: "Pays-Bas", MKD: "Macédoine du Nord", NOR: "Norvège", POL: "Pologne", PRT: "Portugal",
  ROU: "Roumanie", RUS: "Russie", SRB: "Serbie", SVK: "Slovaquie", SVN: "Slovénie",
  ESP: "Espagne", SWE: "Suède", CHE: "Suisse", TUR: "Turquie", UKR: "Ukraine", GBR: "Royaume-Uni",
};

// THE JOIN: `code` holds ISO alpha-3. The value is the low-carbon share of generation, in %; a country whose
// generation is not reported (total 0) is null — drawn in the « sans donnée » fill, in no class.
const rows = table.rows
  .filter((r) => Number(r[YEAR_COL]) === YEAR)
  .map((r) => {
    const low = LOW.reduce((s, i) => s + Number(r[i] || 0), 0);
    const total = low + FOSSIL.reduce((s, i) => s + Number(r[i] || 0), 0);
    return { iso: r[CODE], name: NAMES[r[CODE]], value: total > 0 ? (low / total) * 100 : null };
  });

const BREAKS = [40, 55, 70, 85, 94];
const FLOOR = BREAKS[BREAKS.length - 1];
const SUBJECT = "ALB";

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Le bas-carbone européen est au nord-ouest — et en Albanie", "Le bas-carbone européen, et son exception"],
  rows,
  breaks: BREAKS,
  subject: SUBJECT,
  unit: "%",
  scaleMax: 100,
  count: (n) => `${n} pays`,
  missingLabel: "sans donnée",
  noData: (name) => `${name}, hors données`,
  waters: { northSea: "Mer du Nord", mediterranean: "Méditerranée", baltic: "Baltique" },
  source: [
    "Source : Ember, via Our World in Data · © MapTiler © OpenStreetMap",
    "Ember, via OWID · © MapTiler © OpenStreetMap",
    "Ember · © MapTiler © OpenStreetMap",
  ],
  // The claim checked against the drawn data: seven at or above the floor, the six others north or west of Albania
  // (on the map's seats: not both south and east of it), Albania at 100 %, every measured neighbour under 60 %.
  check(map) {
    if (map.above.length !== 7) throw new Error(`the claim is seven countries above ${FLOOR} %; ${map.above.length} are`);
    if (Math.round(map.subject.value) !== 100) throw new Error(`Albania is at ${map.subject.value.toFixed(1)} %, not 100 %`);
    const [x0, y0] = map.seat(SUBJECT);
    const notNorthWest = map.above.filter((r) => r.iso !== SUBJECT).filter((r) => map.seat(r.iso)[1] < y0 && map.seat(r.iso)[0] > x0);
    if (notNorthWest.length) throw new Error(`the title says the others are north or west of Albania; ${notNorthWest.map((r) => r.name).join(", ")} is neither`);
    const high = map.neighbours.filter((r) => r.value >= 60);
    if (high.length) throw new Error(`Albania's neighbours should all be under 60 %; ${high.map((r) => r.name).join(", ")} is not`);
  },
};
