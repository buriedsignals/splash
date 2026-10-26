// beat.mjs for the worked example proof/video-bump-emitter-rank — « L’Inde est passée du 8e au 3e rang mondial des
// émetteurs de CO₂ », told in time. Every rank the video draws is COMPUTED from data.json; the ranking per year and
// every country the subject passed are found by render-beat.mjs and checked here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [col("entity"), col("code"), col("year"), col("co2_tonnes")];

// Names are printed as given: the countries that reach the top ten, in French.
const FRENCH = {
  "United States": "États-Unis", Russia: "Russie", China: "Chine", Japan: "Japon", Germany: "Allemagne", Ukraine: "Ukraine",
  "United Kingdom": "Royaume-Uni", India: "Inde", Canada: "Canada", Italy: "Italie", Kuwait: "Koweït", "South Korea": "Corée du Sud",
  France: "France", Iran: "Iran", "Saudi Arabia": "Arabie saoudite", Indonesia: "Indonésie",
};
// Countries only (aggregates carry no ISO-3 code), 1990 to 2024.
const values = table.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE]) && Number(r[YEAR]) >= 1990 && Number(r[YEAR]) <= 2024)
  .map((r) => ({ entity: FRENCH[r[ENTITY]] ?? r[ENTITY], year: Number(r[YEAR]), value: Number(r[VALUE]) }));

// The claim: India's rank among the ten largest emitters in 1990 and in 2024.
const rankIn = (year) =>
  values
    .filter((v) => v.year === year)
    .sort((a, b) => b.value - a.value)
    .findIndex((v) => v.entity === "Inde") + 1;

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  values,
  slots: 10,
  subject: "Inde",
  // The label riding the subject's tip: `rank` is its rank that year.
  tip: (rank) => `Inde · ${rank}e`,
  // The names at both ends: rank, then name.
  end: (rank, entity) => `${rank} ${entity}`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["L’Inde est passée du 8e au 3e rang mondial des émetteurs de CO₂", "L’Inde, du 8e au 3e rang des émetteurs"],
  source: [
    "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie",
    "Source : Global Carbon Budget (2025), via Our World in Data",
  ],
  evidenceLevels: 3,
  check() {
    const [from, to] = [rankIn(1990), rankIn(2024)];
    if (from !== 8 || to !== 3) throw new Error(`India went from ${from} to ${to}, not from 8th to 3rd`);
  },
};
