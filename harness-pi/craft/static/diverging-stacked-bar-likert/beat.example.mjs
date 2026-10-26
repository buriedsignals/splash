// beat.mjs for the worked example proof/static-diverging-stacked-electricity — "In France nuclear
// outweighs fossil and renewables put together". Every number on the plate is COMPUTED from
// data.json; the title's first form is the journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

// The levels of each side, ordered OUTWARD from the centre (the deepest shade is the extreme).
const LEFT = [["Gas", "Gaz"], ["Oil", "Pétrole"], ["Coal", "Charbon"]];
const RIGHT = [["Bioenergy", "Bioénergie"], ["Other renewables", "Autres renouv."], ["Hydropower", "Hydraulique"], ["Solar", "Solaire"], ["Wind", "Éolien"]];
const CENTRE = ["Nuclear", "Nucléaire"];
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

const rows = data.rows
  .filter((r) => r[at("Year")] === 2024)
  .map((r) => {
    const all = [...LEFT, ...RIGHT, CENTRE];
    const total = all.reduce((s, [c]) => s + r[at(c)], 0);
    // Each level is a SHARE of its own row, so every row adds up to 100.
    const level = ([c, label]) => ({ key: c, label, value: (r[at(c)] / total) * 100 });
    return { key: r[at("Entity")], label: NAMES[r[at("Entity")]] ?? r[at("Entity")], left: LEFT.map(level), centre: level(CENTRE), right: RIGHT.map(level) };
  })
  .map((r) => ({ ...r, leftTotal: r.left.reduce((s, l) => s + l.value, 0), rightTotal: r.right.reduce((s, l) => s + l.value, 0) }))
  .sort((a, b) => b.leftTotal - a.leftTotal);

const subject = rows.reduce((a, b) => (b.centre.value > a.centre.value ? b : a));
const mostLeft = rows[0];
const mostRight = rows.reduce((a, b) => (b.rightTotal > a.rightTotal ? b : a));
const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[  ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  rows,
  subject: subject.key,
  leftName: "Fossile",
  rightName: "Renouvelable",
  centreName: "Nucléaire",
  unit: "%",
  format: (v) => (v < 0.05 ? "0" : one(v)),
  title: [
    "Le nucléaire tient le centre : en France il pèse plus que le fossile et le renouvelable réunis",
    `En ${subject.label}, le nucléaire pèse plus que les deux autres réunis`,
    "Le nucléaire tient le centre",
  ],
  limits: [
    `Mix électrique 2024, en parts de la production de chaque pays. À gauche le fossile, à droite le renouvelable, au centre le nucléaire — ni l’un ni l’autre. ${subject.label} : ${one(subject.centre.value)} % de nucléaire contre ${one(subject.leftTotal)} % de fossile et ${one(subject.rightTotal)} % de renouvelable. ${mostLeft.label} penche le plus à gauche (${one(mostLeft.leftTotal)} %), ${mostRight.label} le plus à droite (${one(mostRight.rightTotal)} %).`,
    "Mix électrique 2024, en parts de la production de chaque pays. À gauche le fossile, à droite le renouvelable, au centre le nucléaire.",
  ],
  reading: [
    "Lecture : chaque rang fait 100 %. Le nucléaire est posé à cheval sur l’axe, moitié de chaque côté, donc il ne fait pencher ni l’un ni l’autre — le penchant se lit au côté le plus long. Dans chaque camp, la teinte fonce vers l’extérieur.",
    "Lecture : chaque rang fait 100 % ; le penchant se lit au côté le plus long.",
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Barres empilées divergentes : le mix électrique de ${rows.length} pays européens en 2024, fossile à gauche, renouvelable à droite, nucléaire à cheval sur l’axe. ${subject.label} porte ${one(subject.centre.value)} % de nucléaire, plus que ses ${one(subject.leftTotal)} % de fossile et ses ${one(subject.rightTotal)} % de renouvelable réunis.`,
  evidenceLevels: 3,
  check() {
    if (subject.key !== "France") throw new Error(`the row with the largest centre share is ${subject.key}, not France`);
    if (!(subject.centre.value > subject.leftTotal + subject.rightTotal))
      throw new Error(`France's nuclear ${one(subject.centre.value)} % no longer outweighs fossil + renewable ${one(subject.leftTotal + subject.rightTotal)} %`);
  },
};
