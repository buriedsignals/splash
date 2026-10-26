// beat.mjs for the worked example proof/video-hex-grid-europe-protection — « Par habitant, ce n'est pas l'Allemagne :
// la Tchéquie accueille 36,1 Ukrainiens pour 1 000 habitants », told in time. data.json holds one month of people under
// temporary protection by host country, with each country's population. Every number the video draws is COMPUTED from
// data.json; the grid, both rankings and the classes are the kit's.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => {
  const i = table.columns.findIndex((c) => c.name === name);
  if (i < 0) throw new Error(`data.json has no column ${name}`);
  return i;
};
const [CODE, MONTH, PEOPLE, POPULATION] = [col("code"), col("month"), col("people"), col("population")];
const month = table.rows[0][MONTH];

// The video is in French; only the largest host and the leader are named.
const NAMES = { DEU: "Allemagne", CZE: "Tchéquie" };
// THE JOIN: the count, and the rate per 1 000 inhabitants computed from the population.
const rows = table.rows.map((r) => ({ iso: r[CODE], name: NAMES[r[CODE]] ?? r[CODE], count: Number(r[PEOPLE]), rate: (Number(r[PEOPLE]) / Number(r[POPULATION])) * 1000 }));

const NB = " ";
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const two = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rank = (n) => (n === 1 ? "1re" : `${n}e`);

export default {
  lang: "fr",
  eyebrow: "Migrations · Europe",
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    `Par habitant, ce n’est pas l’Allemagne : la Tchéquie accueille 36,1 Ukrainiens pour 1${NB}000 habitants`,
    `Par habitant, la Tchéquie accueille 36,1 Ukrainiens pour 1${NB}000 habitants`,
  ],
  rows,
  // The origin country: a grid cell drawn hollow, in no class.
  origin: "UKR",
  originLabel: "origine",
  countBreaks: [30000, 60000, 150000, 500000],
  rateBreaks: [5, 12, 18, 25],
  countUnit: "Ukrainiens accueillis",
  rateUnit: `pour 1${NB}000 habitants`,
  countBorne: (b) => `${Math.round(b / 1000)}${NB}k`,
  rateBorne: (b) => one(b),
  largestByCount: (name, n) => `${name} : ${two(n / 1e6)}${NB}M, ${rank(1)}`,
  largestByRate: (name, rate, r) => `${name} : ${one(rate)} pour 1${NB}000, ${rank(r)}`,
  leaderLine: (name, rate) => `${name} : ${one(rate)} pour 1${NB}000, ${rank(1)}`,
  source: [
    `Sources : Eurostat (migr_asytpsm), ${month} · population 2023, via Our World in Data · © MapTiler © OpenStreetMap`,
    `Eurostat, ${month} · population via OWID · © MapTiler © OpenStreetMap`,
    "Eurostat · OWID · © MapTiler © OpenStreetMap",
  ],
  // The claim checked against the drawn data: Czechia first per inhabitant at 36,1, not Germany, which falls far.
  check(map) {
    if (map.leader.iso !== "CZE") throw new Error(`the title says Czechia leads per inhabitant; ${map.leader.name} does`);
    if (Math.round(map.leader.rate * 10) / 10 !== 36.1) throw new Error(`the title says 36,1 per 1 000; Czechia is at ${map.leader.rate.toFixed(1)}`);
    if (map.largest.iso !== "DEU") throw new Error(`the title says « not Germany »: the largest host is ${map.largest.name}`);
    if (!(map.largestRateRank > 5)) throw new Error(`Germany should fall a long way per inhabitant; it is ${map.largestRateRank}th`);
  },
};
