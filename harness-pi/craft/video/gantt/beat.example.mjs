// beat.mjs for the worked example proof/video-gantt-top-ten-tenure — « Six pays n’ont jamais quitté le top 10 des émetteurs
// depuis 1990 », told in time. The spans are COMPUTED from the yearly ranking in data.json; the order, the rows held every
// year and the count of who never left are worked out by render-beat.mjs from `rows`, and only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [at("Entity"), at("Code"), at("Year"), at("Annual CO₂ emissions")];

const FIRST = 1990;
const LAST = 2024;
const SLOTS = 10;
const NAMES = {
  China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon",
  Germany: "Allemagne", Canada: "Canada", "United Kingdom": "Royaume-Uni", Italy: "Italie",
  Ukraine: "Ukraine", Kuwait: "Koweït", "South Korea": "Corée du Sud", France: "France", Iran: "Iran",
  "Saudi Arabia": "Arabie saoudite", Indonesia: "Indonésie",
};

// Countries only (a three-letter code), inside the window.
const readings = data.rows.filter((r) => /^[A-Z]{3}$/.test(r[CODE] ?? "") && Number.isFinite(r[VALUE]) && r[YEAR] >= FIRST && r[YEAR] <= LAST);
// Who held a place in the top ten, year by year.
const held = new Map();
for (let year = FIRST; year <= LAST; year++)
  for (const r of readings.filter((r) => r[YEAR] === year).sort((a, b) => b[VALUE] - a[VALUE]).slice(0, SLOTS)) {
    if (!held.has(r[ENTITY])) held.set(r[ENTITY], []);
    held.get(r[ENTITY]).push(year);
  }
// A row's runs: the maximal stretches of consecutive years.
const rows = [...held.entries()].map(([entity, years]) => {
  const runs = [];
  let from = years[0], prev = years[0];
  for (const y of years.slice(1)) {
    if (y !== prev + 1) { runs.push({ from, to: prev }); from = y; }
    prev = y;
  }
  runs.push({ from, to: prev });
  return { key: entity, label: NAMES[entity] ?? entity, runs, count: years.length };
});
const throughout = rows.filter((r) => r.count === LAST - FIRST + 1);

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  // The rows the takeaway is about: the ones held every year, picked out in the accent.
  subjects: throughout.map((r) => r.key),
  first: FIRST,
  last: LAST,
  // The count over the rows while the cursor sweeps: n of the first year's rows have never left.
  count: (n) => `${n} pays jamais sortis`,
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["Six pays n’ont jamais quitté le top 10 des émetteurs depuis 1990", "Six pays jamais sortis du top 10 des émetteurs"],
  source: ["Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie", "Source : Global Carbon Budget (2025), via Our World in Data"],
  evidenceLevels: 2,
  check() {
    if (throughout.length !== 6) throw new Error(`${throughout.length} countries held a place every year from ${FIRST} to ${LAST}, not six`);
  },
};
