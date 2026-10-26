// beat.mjs for the worked example proof/video-diverging-stacked-electricity — « En France, le nucléaire pèse plus que le
// fossile et le renouvelable réunis », told in time. Every number the video draws is COMPUTED from data.json: each level
// is a share of its own row; the sides' totals, the order and the comparison are re-run by render-beat.mjs.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);
const YEAR = 2024;

// The levels of each side, ordered OUTWARD from the centre (the last is the deepest shade of its side).
const LEFT = [["Gas", "Gaz"], ["Oil", "Pétrole"], ["Coal", "Charbon"]];
const RIGHT = [["Bioenergy", "Bioénergie"], ["Other renewables", "Autres renouv."], ["Hydropower", "Hydraulique"], ["Solar", "Solaire"], ["Wind", "Éolien"]];
const CENTRE = ["Nuclear", "Nucléaire"];
const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

const rows = data.rows
  .filter((r) => Number(r[at("Year")]) === YEAR)
  .map((r) => {
    const total = [...LEFT, ...RIGHT, CENTRE].reduce((s, [c]) => s + Number(r[at(c)]), 0);
    // Each level is a SHARE of its own row, so every row adds up to 100.
    const level = ([c, label]) => ({ key: c, label, value: (Number(r[at(c)]) / total) * 100 });
    return { key: r[at("Entity")], label: NAMES[r[at("Entity")]] ?? r[at("Entity")], left: LEFT.map(level), centre: level(CENTRE), right: RIGHT.map(level) };
  });
const sum = (levels) => levels.reduce((s, l) => s + l.value, 0);
const subject = rows.reduce((a, b) => (b.centre.value > a.centre.value ? b : a));

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  rows,
  // The row the takeaway is about: the one with the largest centre share.
  subject: subject.key,
  leftName: "Fossile",
  centreName: "Nucléaire",
  rightName: "Renouvelable",
  yearLabel: String(YEAR),
  unit: "%",
  // A share's text: one decimal, a French comma; under 0,05 it is « 0 ».
  format: (v) => (v < 0.05 ? "0" : v.toFixed(1).replace(".", ",")),
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: ["En France, le nucléaire pèse plus que le fossile et le renouvelable réunis", "En France, le nucléaire pèse plus que fossile et renouvelable réunis"],
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  evidenceLevels: 2,
  check() {
    if (rows.length !== 6) throw new Error(`expected the six countries' ${YEAR} mixes, got ${rows.length}`);
    if (subject.key !== "France") throw new Error(`the title names France; the largest nuclear share is ${subject.key}'s`);
    if (!(subject.centre.value > sum(subject.left) + sum(subject.right)))
      throw new Error(`France's nuclear ${subject.centre.value.toFixed(1)} no longer outweighs fossil + renewable ${(sum(subject.left) + sum(subject.right)).toFixed(1)}`);
  },
};
