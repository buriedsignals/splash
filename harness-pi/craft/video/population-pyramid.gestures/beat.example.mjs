// beat.mjs for the worked example proof/static-swiss-age-pyramid, as a PAIRED gesture video — "Les femmes passent
// devant les hommes à partir de 60-64 ans". Three gestures, in story order: reveal, subject, conclusion. Every number
// is COMPUTED from data.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const col = (name) => data.columns.findIndex((c) => c.name === name);
const [BAND, MEN, WOMEN] = [col("age_band"), col("male"), col("female")];

// One row per age band, YOUNGEST FIRST (the foot of the pyramid): the left half, then the right half.
const rows = data.rows.map((r) => ({ name: String(r[BAND]), values: [Number(r[MEN]), Number(r[WOMEN])] }));
// The crossing: the first band where women outnumber men, and every band from it up.
const from = rows.findIndex((r) => r.values[1] > r.values[0]);
const older = rows.slice(from);
const olderTotal = older.reduce((s, r) => s + r.values[0] + r.values[1], 0);
const fr = (v) => v.toLocaleString("fr-FR").replace(/\s/g, " ");

export default {
  eyebrow: "Démographie · Suisse",
  // series[0] grows left of the spine, series[1] right.
  series: ["Hommes", "Femmes"],
  rows,
  unit: "personnes, 2023",
  gestures: [
    { do: "highlight", mark: "Femmes" },
    { do: "bracket", marks: older.map((r) => r.name), note: `Là où les femmes dominent : ${fr(olderTotal)}` },
    { do: "name", mark: rows[from].name },
  ],
  title: "Les femmes passent devant les hommes à partir de 60-64 ans",
  source: ["Source : ONU, World Population Prospects (2024), via Our World in Data", "ONU WPP 2024, via OWID"],
  check() {
    if (rows[from]?.name !== "60-64") throw new Error(`the halves cross at ${rows[from]?.name}, not 60-64`);
    const lapse = older.find((r) => !(r.values[1] > r.values[0]));
    if (lapse) throw new Error(`women are not ahead at ${lapse.name}`);
  },
};
