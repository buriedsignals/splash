// beat.mjs for the worked example proof/static-bullet-low-carbon-share — "Poland: +N points of
// low-carbon electricity since 2015, and still the only one of the six under half". Every number on
// the plate is COMPUTED from data.json; the share is computed from the source columns.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const table = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => table.columns.findIndex((c) => c.name === name);
const [ENTITY, YEAR] = [col("Entity"), col("Year")];
const SOURCES = table.columns.slice(3).map((c) => c.name);
// Low-carbon: nuclear and every renewable — the split the source's own columns make.
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const BEFORE = 2015;
const AFTER = 2024;

const shareFor = (entity, year) => {
  const row = table.rows.find((r) => r[ENTITY] === entity && Number(r[YEAR]) === year);
  if (!row) throw new Error(`no ${year} row for ${entity}`);
  const total = SOURCES.reduce((s, c) => s + Number(row[col(c)]), 0);
  const low = LOW_CARBON.reduce((s, c) => s + Number(row[col(c)]), 0);
  return (low / total) * 100;
};

const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const entities = [...new Set(table.rows.map((r) => r[ENTITY]))];
// The rows: one per entity, the earlier state as the marker, the later as the measure, sorted by change.
const rows = entities
  .map((name) => ({ name, label: FRENCH[name] ?? name, marker: shareFor(name, BEFORE), measure: shareFor(name, AFTER) }))
  .sort((a, b) => b.measure - b.marker - (a.measure - a.marker));

const moved = rows[0];
const underHalf = rows.filter((r) => r.measure < 50);
const SATURATED = 95;
const alreadyHigh = rows.filter((r) => r.marker >= SATURATED);

const SPELLED = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six"];
const plain = (t) => t.replace(/[   ]/g, " ");
const one = (v) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));

export default {
  eyebrow: "Énergie · Europe",
  rows,
  subject: moved.name,
  ceiling: 100,
  markerName: String(BEFORE),
  measureName: String(AFTER),
  unit: "%",
  format: (v) => plain(v.toLocaleString("fr-FR", { maximumFractionDigits: 0 })),
  // The value printed at the end of each row: its change.
  verdict: (row) => `+${one(row.measure - row.marker)} pts`,
  title: [
    `${moved.label} : +${one(moved.measure - moved.marker)} points de bas-carbone depuis ${BEFORE}, et toujours la seule des six sous la moitié`,
    `${moved.label} : +${one(moved.measure - moved.marker)} points depuis ${BEFORE}, et toujours sous la moitié`,
    `${moved.label} : +${one(moved.measure - moved.marker)} points de bas-carbone`,
  ],
  limits: [
    `Part du bas-carbone — nucléaire et renouvelables — dans la production électrique de chaque pays, en ${BEFORE} et en ${AFTER}. ` +
      `${moved.label} passe de ${one(moved.marker)} % à ${one(moved.measure)} % ; les ${SPELLED[alreadyHigh.length] ?? alreadyHigh.length} pays déjà ` +
      `au-dessus de ${SATURATED} % en ${BEFORE} gagnent moins d’un point chacun.`,
    `Part du bas-carbone — nucléaire et renouvelables — dans la production électrique, en ${BEFORE} et en ${AFTER}. ` +
      `${moved.label} passe de ${one(moved.marker)} % à ${one(moved.measure)} %.`,
    `Le bas-carbone — nucléaire et renouvelables — dans l’électricité, en ${BEFORE} et en ${AFTER}.`,
  ],
  reading: [
    `Lecture : la barre épaisse et pâle est ${BEFORE}, la fine et saturée ${AFTER} — deux états d’une même mesure, donc une seule teinte à deux intensités. ` +
      `La piste va jusqu’à 100 %, si bien que ce qui reste à parcourir se lit aussi. Aucun objectif n’est dessiné ici : ${BEFORE} est une date, pas une cible.`,
    `Lecture : la barre épaisse et pâle est ${BEFORE}, la fine et saturée ${AFTER}. La piste va jusqu’à 100 %, si bien que ce qui reste à parcourir se lit aussi.`,
    `Lecture : la barre épaisse et pâle est ${BEFORE}, la fine et saturée ${AFTER}.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt:
    `Graphique à puces : la part du bas-carbone dans l’électricité de six pays européens, ${BEFORE} contre ${AFTER}, sur une piste allant jusqu’à 100 %. ` +
    `${moved.label} progresse de ${one(moved.marker)} % à ${one(moved.measure)} %, soit +${one(moved.measure - moved.marker)} points, et reste la seule des six sous la moitié.`,
  evidenceLevels: 3,
  check() {
    if (underHalf.length !== 1 || underHalf[0].name !== moved.name)
      throw new Error(`the country that moved furthest (${moved.name}) is not the only one under half (${underHalf.map((r) => r.name).join(", ") || "none"})`);
    const gained = alreadyHigh.filter((r) => r.measure - r.marker >= 1);
    if (gained.length) throw new Error(`countries already above ${SATURATED} % gained a point or more: ${gained.map((r) => r.name).join(", ")}`);
  },
};
