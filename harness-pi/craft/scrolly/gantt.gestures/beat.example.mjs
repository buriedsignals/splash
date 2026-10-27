// beat.mjs for the worked example proof/static-gantt-top-ten-tenure — "Six pays n’ont jamais quitté le top 10 des
// émetteurs depuis 1990" — written for the gesture kit: the staging is the `gestures` list. The runs are COMPUTED
// from the yearly ranking in data.json; every number in a note is computed from them.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [at("Entity"), at("Code"), at("Year"), at("Annual CO₂ emissions")];

const FIRST = 1990;
const LAST = 2024;
const NAMES = {
  China: "Chine", "United States": "États-Unis", India: "Inde", Russia: "Russie", Japan: "Japon",
  Germany: "Allemagne", Canada: "Canada", "United Kingdom": "Royaume-Uni", Italy: "Italie",
  Ukraine: "Ukraine", Kuwait: "Koweït", "South Korea": "Corée du Sud", France: "France", Iran: "Iran",
  "Saudi Arabia": "Arabie saoudite", Indonesia: "Indonésie",
};

// Countries only (a three-letter code), inside the window; who held a place in the top ten, year by year.
const readings = data.rows.filter((r) => /^[A-Z]{3}$/.test(r[CODE] ?? "") && Number.isFinite(r[VALUE]) && r[YEAR] >= FIRST && r[YEAR] <= LAST);
const held = new Map();
for (let year = FIRST; year <= LAST; year++)
  for (const r of readings.filter((r) => r[YEAR] === year).sort((a, b) => b[VALUE] - a[VALUE]).slice(0, 10)) {
    if (!held.has(r[ENTITY])) held.set(r[ENTITY], []);
    held.get(r[ENTITY]).push(year);
  }
// A row's runs: the maximal stretches of consecutive years.
const rows = [...held.entries()]
  .map(([entity, years]) => {
    const runs = [];
    let from = years[0], prev = years[0];
    for (const y of years.slice(1)) {
      if (y !== prev + 1) { runs.push({ from, to: prev }); from = y; }
      prev = y;
    }
    runs.push({ from, to: prev, open: prev === LAST });
    return { name: NAMES[entity] ?? entity, runs, years: years.length, firstYear: years[0] };
  })
  .sort((a, b) => a.firstYear - b.firstYear || b.years - a.years);

const throughout = rows.filter((r) => r.years === LAST - FIRST + 1);
const span = LAST - FIRST + 1;
const shortest = [...rows].sort((a, b) => a.years - b.years)[0];

export default {
  eyebrow: "Climat · Monde",
  rows,
  first: FIRST,
  last: LAST,
  // Each gesture carries its card: the sentence the reader reads while it plays, stating the figure its picture shows.
  gestures: [
    { do: "highlight", marks: throughout.map((r) => r.name), card: `${throughout.length} pays sont restés dans le top 10 les ${span} années, de ${FIRST} à ${LAST}.` },
    { do: "compare", marks: [throughout[0].name, shortest.name], note: `${span} ans contre ${shortest.years}`, card: `Le Koweït n’y a passé que ${shortest.years} an, contre ${span} pour les États-Unis.` },
    { do: "filter", marks: throughout.map((r) => r.name), card: `Les ${rows.length - throughout.length} autres pays sont entrés, sortis, ou les deux ; les ${throughout.length} restent, ${span} ans sur ${span}.` },
  ],
  format: (v) => `${v} ans`,
  title: "Six pays n’ont jamais quitté le top 10 des émetteurs depuis 1990",
  limits: [
    `Présence dans les 10 plus gros émetteurs annuels de CO2 du monde, année par année, de ${FIRST} à ${LAST}. ${rows.length} pays y ont figuré au moins une fois.`,
    `Présence dans les 10 plus gros émetteurs annuels de CO2, ${FIRST}–${LAST}.`,
  ],
  source: "Source : Global Carbon Budget (2025), via Our World in Data",
  alt: `Diagramme de Gantt : la présence de ${rows.length} pays dans les 10 plus gros émetteurs mondiaux de CO2 entre ${FIRST} et ${LAST}. ${throughout.length} barres traversent tout le graphique : ${throughout.map((r) => r.name).join(", ")}.`,
  check() {
    if (throughout.length !== 6) throw new Error(`${throughout.length} countries held a place every year from ${FIRST} to ${LAST}, not six`);
  },
};
