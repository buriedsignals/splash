// beat.mjs for the worked example proof/video-dot-strip-lowcarbon-spread — « Le plancher européen est monté de 30 points,
// le plafond de 2 », told in time. Every number the video draws is COMPUTED from data.json; the floor, the ceiling, the two
// rises and the closure are worked out by render-beat.mjs from `marks`, and only WORDED here.
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
  const lc = LOW_CARBON.reduce((s, c) => s + Number(row[at(c)]), 0);
  const fossil = FOSSIL.reduce((s, c) => s + Number(row[at(c)]), 0);
  return (lc / (lc + fossil)) * 100;
};
const byCode = {};
for (const r of data.rows) (byCode[r[at("code")]] ??= {})[Number(r[at("year")])] = shareOf(r);
// One mark per country, read at both states; `code` is printed on its chip.
const marks = Object.entries(byCode).map(([code, v]) => ({ code, before: v[FROM], after: v[TO] }));
const floor = marks.reduce((a, b) => (b.before < a.before ? b : a));
const ceiling = marks.reduce((a, b) => (b.before > a.before ? b : a));

export default {
  lang: "fr",
  eyebrow: "Énergie · Europe",
  marks,
  // The floor of the field: its chip carries the accent, its rise is written, the slid span overhangs its new pin.
  subject: floor.code,
  from: String(FROM),
  to: String(TO),
  // Said in the credit only when the frame draws fewer marks than the field: which ones, in forms, longest first.
  scope: (count, total) => [`${count} des ${total} pays : le plancher, le plafond et ${count - 2} entre eux`, `${count} des ${total} pays`],
  // The title card in forms, longest first: the first is the journalist's takeaway, copied as written.
  title: [
    "Le plancher européen est monté de 30 points, le plafond de 2",
    `Le plancher est monté de ${Math.round(floor.after - floor.before)} points, le plafond de ${Math.round(ceiling.after - ceiling.before)}`,
  ],
  source: ["Source : Ember, Energy Institute – Statistical Review of World Energy (2025), via Our World in Data", "Source : Ember, Energy Institute, via Our World in Data"],
  evidenceLevels: 2,
  check() {
    if (Math.round(floor.after - floor.before) !== 30) throw new Error(`the floor rose ${(floor.after - floor.before).toFixed(1)} points, not 30`);
    if (Math.round(ceiling.after - ceiling.before) !== 2) throw new Error(`the ceiling rose ${(ceiling.after - ceiling.before).toFixed(1)} points, not 2`);
  },
};
