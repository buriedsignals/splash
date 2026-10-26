// beat.mjs for the worked example proof/static-gantt-top-ten-tenure — "Six countries have never left
// the top 10 emitters since 1990". The spans are COMPUTED from the yearly ranking in data.json; the
// title is the journalist's takeaway, copied as written.
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
// A row's runs: the maximal stretches of consecutive years. A run reaching LAST is still open.
const rows = [...held.entries()]
  .map(([entity, years]) => {
    const runs = [];
    let from = years[0], prev = years[0];
    for (const y of years.slice(1)) {
      if (y !== prev + 1) { runs.push({ from, to: prev, open: false }); from = y; }
      prev = y;
    }
    runs.push({ from, to: prev, open: prev === LAST });
    return { key: entity, label: NAMES[entity] ?? entity, runs, count: years.length, firstYear: years[0] };
  })
  .sort((a, b) => a.firstYear - b.firstYear || b.count - a.count);

const throughout = rows.filter((r) => r.count === LAST - FIRST + 1);
const interrupted = rows.filter((r) => r.runs.length > 1);
// Abbreviate the closing year, never the opening one; a running span ends with a dash.
const shortEnd = (from, to) => (Math.floor(from / 100) === Math.floor(to / 100) ? String(to).slice(-2) : String(to));
const spanLabel = (row) =>
  row.runs.map((run) => (run.open ? `${run.from}–` : run.from === run.to ? `${run.from}` : `${run.from}–${shortEnd(run.from, run.to)}`)).join(", ");

export default {
  eyebrow: "Climat · Monde",
  rows,
  // The rows the takeaway is about: drawn in the accent.
  subjects: throughout.map((r) => r.key),
  first: FIRST,
  last: LAST,
  spanLabel,
  title: "Six pays n’ont jamais quitté le top 10 des émetteurs depuis 1990",
  limits: [
    `Présence dans les ${SLOTS} plus gros émetteurs annuels de CO2 du monde, année par année, de ${FIRST} à ${LAST}. ${rows.length} pays y ont figuré au moins une fois ; ${throughout.length} chaque année, ${rows.length - throughout.length} sont entrés, sortis, ou les deux.`,
    `Présence dans les ${SLOTS} plus gros émetteurs annuels de CO2, ${FIRST}–${LAST} : ${rows.length} pays au moins une fois, ${throughout.length} chaque année.`,
  ],
  reading: [
    `Lecture : chaque barre est une présence continue — sa position dit quand, sa longueur combien de temps, et les deux années sont écrites dans l’étiquette. Une barre qui touche le bord droit est toujours en cours ; ${interrupted.length} rangs sont interrompus, et le trou est réel.`,
    `Lecture : les deux années sont dans l’étiquette ; une barre au bord droit est toujours en cours.`,
  ],
  source: "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement",
  alt: `Diagramme de Gantt : la présence de ${rows.length} pays dans les ${SLOTS} plus gros émetteurs mondiaux de CO2 entre ${FIRST} et ${LAST}. ${throughout.length} barres traversent tout le graphique — ${throughout.map((r) => r.label).join(", ")} — les autres commencent ou s’arrêtent en chemin, et ${interrupted.length} sont coupées en deux.`,
  evidenceLevels: 3,
  check() {
    if (throughout.length !== 6) throw new Error(`${throughout.length} countries held a place every year from ${FIRST} to ${LAST}, not six`);
  },
};
