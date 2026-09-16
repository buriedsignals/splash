// Membership of the world's ten largest CO₂ emitters, 1990–2024, rendered once per FILED DIRECTION into a
// self-contained scrolly page. The `gantt` type in the scrolly format.
//
// THE SUBJECT OF `static-gantt-top-ten-tenure`, CHOREOGRAPHED. The membership, the runs, the claim and its
// assertion are the static beat's own; the scroll tells them with its own gestures
// (`scrolly/references/directed-type-choreography.md`):
//
//   1. 1990: the ten of that year;
//   2. the playhead sweeps to 2008, spans growing behind it;
//   3. on to 2024;
//   4. the six that never left, the others stepping back;
//   5. the rows with a hole, and the single year;
//   6. both dates in every label, the pull back.
//
// Usage:  bun proof/scrolly-gantt-top-ten-tenure/render-directions-scrolly.mjs

import { readdirSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { composeDirections, report } from "#shared/design-base/compose.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { DirectedGanttScrolly } from "./DirectedGanttScrolly.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRECTIONS = join(HERE, "..", "..", "docs", "design-base", "directions");
const OUT = join(HERE, "renders");
const FIRST = 1990;
const LAST = 2024;
const SLOTS = 10;
/** The year the second card's sweep stops on: everything before it is told on card 2, everything after on card 3. */
const MIDWAY = 2008;
const EYEBROW = "Climat · Monde";
const NB = "\u00A0";
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

// ── the membership: the static beat's computation ──────────────────────────────────────────────
const readings = (await readFile(join(HERE, "data.csv"), "utf8"))
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.split(","))
  .map((c) => ({ entity: c[0], code: c[1], year: Number(c[2]), value: Number(c[3]) }))
  .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value) && r.year >= FIRST && r.year <= LAST);
const years = [...new Set(readings.map((r) => r.year))].sort((a, b) => a - b);
if (years.length !== LAST - FIRST + 1) throw new Error(`expected every year from ${FIRST} to ${LAST}, got ${years.length}`);
const held = new Map();
for (const year of years)
  for (const r of readings.filter((x) => x.year === year).sort((a, b) => b.value - a.value).slice(0, SLOTS)) {
    if (!held.has(r.entity)) held.set(r.entity, []);
    held.get(r.entity).push(year);
  }
const shortEnd = (from, to) => (Math.floor(from / 100) === Math.floor(to / 100) ? String(to).slice(-2) : String(to));
const rows = [...held.entries()]
  .map(([entity, ys]) => {
    const runs = [];
    let from = ys[0];
    let prev = ys[0];
    for (const y of ys.slice(1)) {
      if (y !== prev + 1) {
        runs.push({ from, to: prev, open: false });
        from = y;
      }
      prev = y;
    }
    runs.push({ from, to: prev, open: prev === LAST });
    const gaps = runs.slice(1).map((run, i) => ({ from: runs[i].to + 1, to: run.from - 1 }));
    const dates = runs.map((run) => (run.open ? `${run.from}–` : run.from === run.to ? `${run.from}` : `${run.from}–${shortEnd(run.from, run.to)}`)).join(", ");
    return { key: entity, label: french(entity)[0], dates, runs, gaps, years: ys.length, throughout: ys.length === years.length, firstYear: ys[0] };
  })
  .sort((a, b) => a.firstYear - b.firstYear || b.years - a.years);

const byEntity = Object.fromEntries(rows.map((r) => [r.key, r]));
const throughout = rows.filter((r) => r.throughout);
const interrupted = rows.filter((r) => r.gaps.length > 0);
const singles = rows.filter((r) => r.runs.length === 1 && r.runs[0].from === r.runs[0].to);
if (throughout.length < 2) throw new Error(`the headline says several countries never left; ${throughout.length} did not`);

// ── the events the sweep cards name, each checked against the runs ──────────────────────────────
const one = (entity) => {
  const row = byEntity[entity];
  if (!row) throw new Error(`a card names ${entity}, which never reached the top ${SLOTS}`);
  return row;
};
const closedBy = (entity, lo, hi) => {
  const row = one(entity);
  const last = row.runs[row.runs.length - 1];
  if (last.open || last.to < lo || last.to > hi) throw new Error(`a card says ${entity} left between ${lo} and ${hi}; its runs are ${row.dates}`);
  return last.to;
};
const enteredBy = (entity, lo, hi) => {
  const row = one(entity);
  if (row.runs[0].from < lo || row.runs[0].from > hi || !row.runs[row.runs.length - 1].open) throw new Error(`a card says ${entity} entered between ${lo} and ${hi} and stayed; its runs are ${row.dates}`);
  return row.runs[0].from;
};
const ukraineOut = closedBy("Ukraine", FIRST, MIDWAY);
const ukIn = one("United Kingdom").runs[0].from;
const ukOut = closedBy("United Kingdom", FIRST, MIDWAY);
const iranIn = enteredBy("Iran", FIRST + 1, MIDWAY);
const saudiIn = enteredBy("Saudi Arabia", MIDWAY + 1, LAST);
const canadaOut = closedBy("Canada", MIDWAY + 1, LAST - 1);
const indonesiaIn = enteredBy("Indonesia", MIDWAY + 1, LAST);
if (singles.length !== 1) throw new Error(`the fifth card names one country present a single year; there are ${singles.length}`);
if (interrupted.length !== 2) throw new Error(`the fifth card names two interrupted rows; there are ${interrupted.length}`);
if (ukIn !== FIRST) throw new Error("a card says the United Kingdom was in from the start");

const gapWords = (row) => row.gaps.map((g) => (g.from === g.to ? `en ${g.from}` : `de ${g.from} à ${g.to}`)).join(" et ");
const listOf = (xs) => `${xs.slice(0, -1).join(", ")} et ${xs[xs.length - 1]}`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];
const spelled = (n) => SPELLED[n] ?? String(n);
console.log(`${rows.length} pays · ${throughout.length} présents chaque année · interrompus : ${interrupted.map((r) => r.key).join(", ")} · une seule année : ${singles[0].key}\n`);

// ── the words ──────────────────────────────────────────────────────────────────────────────────
const title = [
  `${cap(spelled(throughout.length))} pays n’ont jamais quitté le top ${SLOTS} des émetteurs depuis ${FIRST}`,
  `${cap(spelled(throughout.length))} pays toujours dans le top ${SLOTS} depuis ${FIRST}`,
  `Le top ${SLOTS} des émetteurs, ${FIRST}–${LAST}`,
];
const prose = [
  [`Chaque ligne est un pays, chaque barre ses années parmi les ${SLOTS} plus gros émetteurs de CO₂ du monde. En ${FIRST}, voici les ${SLOTS}.`],
  [`Jusqu’en ${MIDWAY}, le club bouge : ${french("Ukraine")[1]} en sort après ${ukraineOut}, ${french("Iran")[1]} y entre en ${iranIn}, ${french("United Kingdom")[1]} en sort après ${ukOut}.`],
  [`Puis ${french("Saudi Arabia")[1]} entre en ${saudiIn}, ${french("Canada")[1]} sort après ${canadaOut} et ${french("Indonesia")[1]} entre en ${indonesiaIn}.`],
  [`${cap(spelled(throughout.length))} pays sur ${rows.length} n’en sont jamais sortis : ${listOf(throughout.map((r) => r.label))}.`],
  [`${cap(spelled(interrupted.length))} rangs ont un trou : ${interrupted.map((r) => `${french(r.key)[1]}, absente ${gapWords(r)}`).join(" ; ")}. ${cap(french(singles[0].key)[1])} n’y a passé qu’une année, ${singles[0].runs[0].from}.`],
  [`Lecture : la position d’une barre dit quand, sa longueur combien de temps, et ses deux années sont dans l’étiquette. Une barre qui touche le bord droit est toujours en cours.`],
];
const source = "Source : Global Carbon Budget (2025), via Our World in Data · combustibles fossiles et industrie uniquement";
const words = {
  unit: `présence parmi les ${SLOTS} plus gros émetteurs de CO₂`,
  yearNote: `{y}${NB}: ${SLOTS} pays`,
  sixNote: `${throughout.length} pays sur ${rows.length}, chaque année`,
  gapNote: `${interrupted.length} rangs interrompus, ${singles.length} année isolée`,
};
const ticks = [];
for (let y = FIRST; y <= LAST; y += 5) ticks.push(y);
if (!ticks.includes(LAST)) ticks.push(LAST);
const alt =
  `Diagramme de Gantt : ${rows.length} pays ayant figuré parmi les ${SLOTS} plus gros émetteurs de CO₂ entre ${FIRST} et ${LAST}, une barre par période de présence. ` +
  `${cap(spelled(throughout.length))} y figurent chaque année : ${listOf(throughout.map((r) => r.label))}.`;

/** One state per card; see `gantt-drive.mjs` for what each field paints. */
const STATES = [
  { head: FIRST + 1, six: 0, gaps: 0, dates: 0 },
  { head: MIDWAY + 1, six: 0, gaps: 0, dates: 0 },
  { head: LAST + 1, six: 0, gaps: 0, dates: 0 },
  { head: LAST + 1, six: 1, gaps: 0, dates: 0 },
  { head: LAST + 1, six: 0, gaps: 1, dates: 0 },
  { head: LAST + 1, six: 0, gaps: 0, dates: 1 },
];

const textPerRegister = {
  display: title.join(" "),
  eyebrow: EYEBROW,
  body: `${prose.flat().join(" ")} ${source}`,
  axis: `${words.unit} ${rows.map((r) => `${r.label} ${r.dates}`).join(" ")} ${ticks.join(" ")}`,
  annot: "",
  value: `${words.yearNote} ${words.sixNote} ${words.gapNote} 0123456789`,
};

const filed = readdirSync(DIRECTIONS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => readDirection(join(DIRECTIONS, f)));
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
const BEAT_FACTS = { evidenceLevels: 3 };
console.log(report(composeDirections({ newsroom, filed, beat: BEAT_FACTS, textPerRegister }), { beat: BEAT_FACTS }));
console.log("");

const driver = await readFile(join(HERE, "gantt-drive.mjs"), "utf8");
const refused = [];
for (const file of readdirSync(DIRECTIONS).filter((f) => f.endsWith(".md"))) {
  const id = file.replace(/\.md$/, "");
  const direction = resolveDirectionFamilies(readDirection(join(DIRECTIONS, file)), textPerRegister);
  const { ink, muted } = deriveFurniture(direction.ground);
  const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
  try {
    const { outPath } = await renderScrolly({
      steps: prose.map((p, i) => ({ id: [`top-${FIRST}`, `jusqu-${MIDWAY}`, `jusqu-${LAST}`, "six", "trous", "lecture"][i], prose: p })),
      reveal: {
        element: createElement(DirectedGanttScrolly, { rows, first: FIRST, last: LAST, ticks, words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
        states: STATES,
        driver,
        apply: "applyGanttState",
      },
      title,
      eyebrow: EYEBROW,
      source,
      ground: direction.ground,
      type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
      lang: "fr",
      outDir: OUT,
      name: `${id}.html`,
    });
    console.log(`${id} -> ${outPath.replace(`${HERE}/`, "")}`);
  } catch (error) {
    await rm(join(OUT, `${id}.html`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`${id} REFUSED — ${error.message}`);
  }
}
if (refused.length) {
  console.log(`\nrefused by ${refused.length}: ${refused.map((x) => x.id).join(", ")}`);
  process.exitCode = 1;
}
