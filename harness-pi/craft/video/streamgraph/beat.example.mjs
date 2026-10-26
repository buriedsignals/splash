// beat.mjs for the worked example proof/video-streamgraph-swiss-electricity — « En 2016, le solaire est devenu la
// troisième source d’électricité suisse », told in time. Every number the video draws is COMPUTED from data.json; solar's
// rank each year, the year it reaches third, the giants set aside and the source it overtakes are derived by
// render-beat.mjs, and check() tests the claim on the same data.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const keys = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];
// 2025 is in the file and is partial: drawn on a stream it reads as a collapse, so the readings stop at 2024.
const readings = data.rows
  .filter((r) => Number(r[col("Year")]) >= 2000 && Number(r[col("Year")]) <= 2024)
  .map((r) => ({ year: Number(r[col("Year")]), ...Object.fromEntries(keys.map((k) => [k, Number(r[col(k)])])) }));

// Solar's rank each year among the sources.
const rankOf = (r) => keys.map((k) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((o) => o.k === "Solar") + 1;
const third = readings.find((r) => rankOf(r) <= 3);

const NB = " ";

export default {
  lang: "fr",
  eyebrow: "Énergie · Suisse",
  keys,
  labels: { "Other renewables": "Autres renouvelables", Bioenergy: "Bioénergie", Solar: "Solaire", Wind: "Éolien", Hydropower: "Hydraulique", Nuclear: "Nucléaire", Gas: "Gaz", Oil: "Pétrole", Coal: "Charbon" },
  tracked: "Solar",
  rank: 3,
  readings,
  rankLabel: (n) => `Solaire · ${n}e`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["En 2016, le solaire est devenu la troisième source d’électricité suisse", "Le solaire, troisième source d’électricité suisse"],
  source: [`Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data${NB}· 2025 exclue, année incomplète`, `Source : Ember, via Our World in Data${NB}· 2025 exclue`],
  evidenceLevels: 3,
  check() {
    if (!third || third.year !== 2016) throw new Error(`the title says solar became third in 2016; it did in ${third?.year ?? "no year"}`);
    const lost = readings.filter((r) => r.year >= third.year && rankOf(r) > 3);
    if (lost.length) throw new Error(`the title says solar has been third since 2016; in ${lost[0].year} it ranks ${rankOf(lost[0])}`);
  },
};
