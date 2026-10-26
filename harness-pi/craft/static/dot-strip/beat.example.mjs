// beat.mjs for the worked example proof/static-dot-strip-lowcarbon-spread — "the European floor rose
// 30 points, the ceiling 2". Every number on the plate is COMPUTED from data.json; the title's first
// form is the journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const FROM = 2000;
const TO = 2024;
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];

// The measure the takeaway speaks of: each country's low-carbon SHARE of its own electricity, in %.
const shareOf = (row) => {
  const lc = LOW_CARBON.reduce((s, c) => s + row[at(c)], 0);
  const fossil = FOSSIL.reduce((s, c) => s + row[at(c)], 0);
  return (lc / (lc + fossil)) * 100;
};
const byCode = {};
for (const r of data.rows) (byCode[r[at("code")]] ??= { name: r[at("entity")] })[r[at("year")]] = shareOf(r);
// One mark per unit, read at both states; `code` is printed on the chip (1 to 4 characters).
const marks = Object.entries(byCode).map(([code, v]) => ({ code, name: v.name, before: v[FROM], after: v[TO] }));

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const h = Math.floor(s.length / 2);
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const before = marks.map((m) => m.before);
const after = marks.map((m) => m.after);
const floorBefore = Math.min(...before), floorAfter = Math.min(...after);
const ceilBefore = Math.max(...before), ceilAfter = Math.max(...after);
const spreadBefore = ceilBefore - floorBefore, spreadAfter = ceilAfter - floorAfter;
const subject = marks.reduce((a, b) => (b.before < a.before ? b : a)); // the floor in 2000

const one = (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/[   ]/g, " ");

export default {
  eyebrow: "Énergie · Europe",
  marks,
  subject: subject.code,
  from: String(FROM),
  to: String(TO),
  unit: "part de bas-carbone dans l’électricité du pays, en %",
  scaleNote: "Les deux bandes portent la même échelle, 0 à 100 %.",
  title: [
    "Le plancher européen est monté de 30 points, le plafond de 2",
    `Le plancher est monté de ${Math.round(floorAfter - floorBefore)} points, le plafond de ${Math.round(ceilAfter - ceilBefore)}`,
    `Le bas-carbone des ${marks.length} pays, ${FROM} et ${TO}`,
  ],
  limits: [
    `Chaque pays est une épingle sur l’axe : la part de bas-carbone dans sa propre électricité, en ${FROM} sur la bande du haut et en ${TO} sur celle du bas, à la même échelle. Le pays le plus fossile passe de ${one(floorBefore)} à ${one(floorAfter)} %, pendant que le plus propre va de ${one(ceilBefore)} à ${one(ceilAfter)} %. L’écart entre les deux se referme de ${one(spreadBefore - spreadAfter)} points.`,
    `Chaque pays est une épingle sur l’axe : la part de bas-carbone dans sa propre électricité, en ${FROM} en haut et en ${TO} en bas. L’écart entre le plus propre et le plus fossile se referme de ${one(spreadBefore - spreadAfter)} points.`,
    `La part de bas-carbone de chaque pays, en ${FROM} et en ${TO}.`,
  ],
  reading: [
    `Lecture : ce n’est pas un pays qu’il faut suivre mais la forme du champ — où il commence, où il finit, où il s’entasse. La médiane passe de ${one(median(before))} à ${one(median(after))} %.`,
    `Lecture : suivre la forme du champ, pas un pays.`,
  ],
  source: "Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Deux bandes horizontales à la même échelle. Sur celle du haut, ${marks.length} pays européens sont épinglés selon la part de bas-carbone de leur électricité en ${FROM} ; sur celle du bas, en ${TO}. Le plancher passe de ${one(floorBefore)} à ${one(floorAfter)} % et le plafond de ${one(ceilBefore)} à ${one(ceilAfter)} %.`,
  evidenceLevels: 4,
  check() {
    if (Math.round(floorAfter - floorBefore) !== 30) throw new Error(`the floor rose ${one(floorAfter - floorBefore)} points, not 30`);
    if (Math.round(ceilAfter - ceilBefore) !== 2) throw new Error(`the ceiling rose ${one(ceilAfter - ceilBefore)} points, not 2`);
  },
};
