// beat.mjs for the worked example proof/static-streamgraph-swiss-electricity — "En 2016, le solaire
// est devenu la troisième source d'électricité suisse". Every number on the plate is COMPUTED from
// data.json; the rank, the year it is reached and its holding are recomputed by render-beat.mjs.
import { readTable, series } from "./series.mjs";

const table = readTable(import.meta.dirname);
const FIRST = 2000;
// 2025 is in the file and is PARTIAL (65 TWh against 78): drawn, it reads as a collapse.
const LAST = 2024;

// One layer per source column, read by name; every column after Entity, Code and Year is a source.
const keys = table.columns.map((c) => c.name).filter((n) => !["Entity", "Code", "Year"].includes(n));
const byKey = Object.fromEntries(
  keys.map((k) => [k, new Map(series(table, { x: "Year", y: k, where: { Entity: "Switzerland" }, from: FIRST, to: LAST }).map((p) => [p.year, p.value]))]),
);
const years = [...byKey[keys[0]].keys()];
const readings = years.map((year) => ({ year, ...Object.fromEntries(keys.map((k) => [k, byKey[k].get(year)])) }));

const labels = {
  Hydropower: "Hydraulique", Nuclear: "Nucléaire", Solar: "Solaire", Oil: "Pétrole", Gas: "Gaz",
  Bioenergy: "Bioénergie", "Other renewables": "Autres renouv.", Wind: "Éolien", Coal: "Charbon",
};
const TRACKED = "Solar";
const RANK = 3;

const rankIn = (r) => keys.map((k) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((e) => e.k === TRACKED) + 1;
const reachedIn = readings.find((r) => rankIn(r) <= RANK).year;
const first = readings[0];
const last = readings[readings.length - 1];
const total = (r) => keys.reduce((s, k) => s + r[k], 0);

const plain = (t) => t.replace(/[  ]/g, " ");
const fr = (v, d) => plain(v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }));
const format = (v) => (v < 1 ? fr(v, 2) : fr(v, 1));

export default {
  eyebrow: "Énergie · Suisse",
  keys,
  labels,
  tracked: TRACKED,
  // The rank the claim is about, and the year it is first reached (render-beat recomputes both).
  rank: RANK,
  reachedIn,
  readings,
  excluded: [{ year: LAST + 1, why: "année incomplète" }],
  unit: "TWh",
  format,
  totalWord: "Total",
  colon: " : ",
  // Forms longest first: landscape takes the first, square and portrait the last.
  title: [
    `En 2016, le solaire est devenu la troisième source d’électricité suisse`,
    `En 2016, le solaire passe troisième`,
  ],
  limits: [
    `Production électrique suisse par source, ${first.year}–${last.year}, en TWh. Le solaire passe de ` +
      `${format(first.Solar)} à ${format(last.Solar)} TWh et double le pétrole en ${reachedIn} ; ` +
      `l’hydraulique monte de ${format(first.Hydropower)} à ${format(last.Hydropower)}, le nucléaire ` +
      `descend de ${format(first.Nuclear)} à ${format(last.Nuclear)}.`,
    `Production électrique suisse par source, ${first.year}–${last.year}, en TWh. Le solaire passe de ` +
      `${format(first.Solar)} à ${format(last.Solar)}.`,
  ],
  reading: [
    `Lecture : l’épaisseur d’une bande est sa production, sa position ne veut rien dire — les couches ` +
      `sont empilées des plus grandes au centre vers les plus fines à l’extérieur. Il n’y a donc pas ` +
      `d’axe vertical : les quantités sont écrites.`,
    `Lecture : l’épaisseur d’une bande est sa production, sa position ne veut rien dire. Pas d’axe ` +
      `vertical : les quantités sont écrites.`,
  ],
  source:
    `Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data · ` +
    `${LAST + 1} exclue, année incomplète`,
  alt:
    `Streamgraph : la production électrique suisse par source de ${first.year} à ${last.year}, ` +
    `${keys.length} bandes empilées sans axe vertical. La bande solaire, en accent, passe de ` +
    `${format(first.Solar)} à ${format(last.Solar)} TWh et devient la troisième source en ${reachedIn} ; ` +
    `l’hydraulique et le nucléaire restent les deux plus épaisses. Total ${first.year} : ` +
    `${format(total(first))} TWh, ${last.year} : ${format(total(last))} TWh.`,
  evidenceLevels: 3,
  check() {
    if (reachedIn !== 2016) throw new Error(`solar first ranks third in ${reachedIn}, not 2016`);
  },
};
