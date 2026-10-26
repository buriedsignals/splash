// beat.mjs for the worked example proof/scrolly-gantt-top-ten-tenure — "Six countries never left the
// top 10 emitters since 1990", as a scrolly. The membership and its runs are computed from data.json
// here; the events of each sweep, the gaps and the counts come from render-beat.mjs as `r` and are
// only WORDED here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [ENTITY, CODE, YEAR, VALUE] = [col("Entity"), col("Code"), col("Year"), col("Annual CO₂ emissions")];
const FIRST = 1990;
const LAST = 2024;
const SLOTS = 10;

// Countries only (ISO-3 codes; OWID aggregates have none), each year's ten largest.
const readings = data.rows
  .filter((r) => /^[A-Z]{3}$/.test(r[CODE]) && Number.isFinite(Number(r[VALUE])) && r[YEAR] >= FIRST && r[YEAR] <= LAST)
  .map((r) => ({ entity: r[ENTITY], year: Number(r[YEAR]), value: Number(r[VALUE]) }));
const years = [...new Set(readings.map((r) => r.year))].sort((a, b) => a - b);
const held = new Map();
for (const year of years)
  for (const r of readings.filter((x) => x.year === year).sort((a, b) => b.value - a.value).slice(0, SLOTS)) {
    if (!held.has(r.entity)) held.set(r.entity, []);
    held.get(r.entity).push(year);
  }

const FRENCH = {
  China: ["Chine", "la Chine"], "United States": ["États-Unis", "les États-Unis"], India: ["Inde", "l’Inde"], Russia: ["Russie", "la Russie"],
  Japan: ["Japon", "le Japon"], Germany: ["Allemagne", "l’Allemagne"], Canada: ["Canada", "le Canada"], "United Kingdom": ["Royaume-Uni", "le Royaume-Uni"],
  Italy: ["Italie", "l’Italie"], Ukraine: ["Ukraine", "l’Ukraine"], Kuwait: ["Koweït", "le Koweït"], "South Korea": ["Corée du Sud", "la Corée du Sud"],
  France: ["France", "la France"], Iran: ["Iran", "l’Iran"], "Saudi Arabia": ["Arabie saoudite", "l’Arabie saoudite"], Indonesia: ["Indonésie", "l’Indonésie"],
};
const french = (entity) => {
  if (!FRENCH[entity]) throw new Error(`${entity} reached the top ${SLOTS} and this beat has no French name for it`);
  return FRENCH[entity];
};
// "l’Ukraine", from a row's label.
const ARTICLE = Object.fromEntries(Object.values(FRENCH));
const the = (row) => ARTICLE[row.label];

// Each country's years cut into runs of consecutive years; drawn by first year, then by tenure.
const runsOf = (ys) => {
  const out = [];
  for (const y of ys) {
    const open = out.at(-1);
    if (open && open.to === y - 1) open.to = y;
    else out.push({ from: y, to: y });
  }
  return out;
};
const rows = [...held.entries()]
  .map(([entity, ys]) => ({ key: entity, label: french(entity)[0], runs: runsOf(ys), tenure: ys.length }))
  .sort((a, b) => a.runs[0].from - b.runs[0].from || b.tenure - a.tenure);
const whole = rows.filter((r) => r.tenure === years.length);

const shortEnd = (from, to) => (Math.floor(from / 100) === Math.floor(to / 100) ? String(to).slice(-2) : String(to));
const listOf = (xs) => `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const spelled = (n) => SPELLED[n] ?? String(n);
// The event of a sweep for one row, read off r.early / r.late.
const event = (list, key, kind) => {
  const e = list.find((x) => x.key === key && x.kind === kind);
  if (!e) throw new Error(`a card names ${key} ${kind === "entry" ? "entering" : "leaving"} in this sweep, and the runs say it does not`);
  return e;
};
const gapWords = (row) => row.gaps.map((g) => (g.from === g.to ? `en ${g.from}` : `de ${g.from} à ${g.to}`)).join(" et ");

export default {
  lang: "fr",
  eyebrow: "Climat · Monde",
  rows,
  subjects: whole.map((r) => r.key),
  first: FIRST,
  last: LAST,
  midway: 2008,
  spanLabel: (row) => row.runs.map((run) => (run.open ? `${run.from}–` : run.from === run.to ? `${run.from}` : `${run.from}–${shortEnd(run.from, run.to)}`)).join(", "),
  unit: `présence parmi les ${SLOTS} plus gros émetteurs de CO₂`,
  // One sentence (or paragraphs) per card; the picture under each is already choreographed.
  cards: {
    start: (r) => `Chaque ligne est un pays, chaque barre ses années parmi les ${r.slots} plus gros émetteurs de CO₂ du monde. En ${r.first}, voici les ${r.atFirst}.`,
    early: (r) => {
      const ua = event(r.early, "Ukraine", "exit");
      const ir = event(r.early, "Iran", "entry");
      const uk = event(r.early, "United Kingdom", "exit");
      return `Jusqu’en ${r.midway}, le club bouge : ${the(ua)} en sort après ${ua.year}, ${the(ir)} y entre en ${ir.year}, ${the(uk)} en sort après ${uk.year}.`;
    },
    late: (r) => {
      const sa = event(r.late, "Saudi Arabia", "entry");
      const ca = event(r.late, "Canada", "exit");
      const id = event(r.late, "Indonesia", "entry");
      return `Puis ${the(sa)} entre en ${sa.year}, ${the(ca)} sort après ${ca.year} et ${the(id)} entre en ${id.year}.`;
    },
    subjects: (r) => `${cap(spelled(r.subjects.length))} pays sur ${r.count} n’en sont jamais sortis : ${listOf(r.subjects.map((s) => s.label))}.`,
    gaps: (r) =>
      `${cap(spelled(r.interrupted.length))} rangs ont un trou : ${r.interrupted.map((row) => `${the(row)}, absente ${gapWords(row)}`).join(" ; ")}. ` +
      `${cap(the(r.singles[0]))} n’y a passé qu’une année, ${r.singles[0].entry}.`,
  },
  // The header notes: the playhead's year ({y}), then card 4's and card 5's.
  notes: {
    year: (r) => `{y} : ${r.slots} pays`,
    subjects: (r) => `${r.subjects.length} pays sur ${r.count}, chaque année`,
    gaps: (r) => `${r.interrupted.length} rangs interrompus, ${r.singles.length} année isolée`,
  },
  title: [
    "Six pays n’ont jamais quitté le top 10 des émetteurs depuis 1990",
    "Six pays toujours dans le top 10 depuis 1990",
    "Le top 10 des émetteurs, 1990–2024",
  ],
  // The last card: how to read the plate.
  limits: "Lecture : la position d’une barre dit quand, sa longueur combien de temps, et ses deux années sont dans l’étiquette. Une barre qui touche le bord droit est toujours en cours.",
  source: "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement",
  alt: (r) =>
    `Diagramme de Gantt : ${r.count} pays ayant figuré parmi les ${r.slots} plus gros émetteurs de CO₂ entre ${r.first} et ${r.last}, une barre par période de présence. ` +
    `${cap(spelled(r.subjects.length))} y figurent chaque année : ${listOf(r.subjects.map((s) => s.label))}.`,
  evidenceLevels: 3,
  check(r) {
    if (r.whole.length !== 6) throw new Error(`${r.whole.length} countries held a top-${SLOTS} place every year since ${FIRST}, not six`);
    if (r.first !== 1990) throw new Error(`the record opens in ${r.first}, not 1990`);
    if (r.slots !== 10) throw new Error(`the ranking holds ${r.slots} places a year, not 10`);
  },
};
