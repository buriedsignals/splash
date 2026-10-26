// beat.mjs for the worked example proof/video-parallel-coordinates-electricity-mix — « 2 pays sur 16 ont plus de 25 % de
// nucléaire et plus de 20 % d’éolien », told in time. Every number the video draws is COMPUTED from data.json; the
// groups each floor leaves and the correlation between the two claim axes are computed by render-beat.mjs and handed to
// check().
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [CODE, YEAR] = [col("code"), col("year")];

// THE AXIS ORDER IS THE ARGUMENT: the two claim axes first (the video opens the gap between them), then low-carbon,
// fossil last.
const axes = [
  { key: "nuclear_generation__twh", name: "Nucléaire" },
  { key: "wind_generation__twh", name: "Éolien" },
  { key: "solar_generation__twh", name: "Solaire" },
  { key: "hydro_generation__twh", name: "Hydraulique" },
  { key: "bioenergy_stacked_generation__twh", name: "Bioénergie" },
  { key: "gas_generation__twh", name: "Gaz" },
  { key: "coal_generation__twh", name: "Charbon" },
];
// A share is of the country's WHOLE production, so the sources not drawn count in the total.
const allSources = [...axes.map((a) => a.key), "oil_generation__twh", "other_renewables_generation__twh"];
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède", ITA: "Italie", FIN: "Finlande",
  AUT: "Autriche", NLD: "Pays-Bas", BEL: "Belgique", POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark",
  GRC: "Grèce", IRL: "Irlande",
};

// One line per country, 2024: each value is the source's share of the country's own production, in %.
const lines = data.rows
  .filter((r) => Number(r[YEAR]) === 2024)
  .map((r) => {
    const total = allSources.reduce((s, k) => s + Number(r[col(k)]), 0);
    return { key: r[CODE], name: NAMES[r[CODE]] ?? r[CODE], values: Object.fromEntries(axes.map((a) => [a.key, (Number(r[col(a.key)]) / total) * 100])) };
  });

const NUCLEAR_FLOOR = 25;
const WIND_FLOOR = 20;
const both = lines.filter((l) => l.values.nuclear_generation__twh >= NUCLEAR_FLOOR && l.values.wind_generation__twh >= WIND_FLOOR);

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  axes,
  lines,
  claimAxes: ["nuclear_generation__twh", "wind_generation__twh"],
  floors: [NUCLEAR_FLOOR, WIND_FLOOR],
  // The lines the floors leave: drawn in the accent at the end. The first one's whole stands up first.
  thread: both.map((l) => l.key),
  shown: "FIN",
  // Short forms, tried only where a full name finds no seat on any rail.
  short: { GBR: "R.-U.", NLD: "P.-Bas", DEU: "All.", DNK: "Dan.", AUT: "Aut.", BEL: "Belg.", PRT: "Port.", CZE: "Tch." },
  percent: (v) => `${v} %`,
  count: (n) => `${n} pays`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "2 pays sur 16 ont plus de 25 % de nucléaire et plus de 20 % d’éolien",
    "2 pays sur 16 passent 25 % de nucléaire et 20 % d’éolien",
  ],
  source: [
    "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
    "Source : Ember, Energy Institute – Statistical Review of World Energy, via Our World in Data",
    "Source : Ember, Energy Institute, via Our World in Data",
  ],
  evidenceLevels: 4,
  check({ lines: drawn, r, both: cleared }) {
    if (drawn.length !== 16) throw new Error(`the title says sixteen countries; the data has ${drawn.length}`);
    if (cleared.length !== 2) throw new Error(`the title says 2 countries clear both floors; ${cleared.length} do (${cleared.join(", ")})`);
    if (!(r < -0.2)) throw new Error(`the two shares should lean against each other; their correlation is ${r.toFixed(2)}`);
  },
};
