// beat.mjs for the worked example proof/static-wind-vs-solar — "In 5 of these 6 countries wind leads
// solar — Switzerland is the exception". Every number on the plate is COMPUTED from data.json; the
// title is the journalist's takeaway, copied as written.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (name) => data.columns.findIndex((c) => c.name === name);

const NAMES = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };
const SOURCES = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear", "Gas", "Oil", "Coal"];

// The measure the takeaway speaks of: each source's SHARE of the country's own generation in 2024.
const groups = data.rows
  .filter((r) => NAMES[r[at("Entity")]] && r[at("Year")] === 2024)
  .map((r) => {
    const total = SOURCES.reduce((s, c) => s + r[at(c)], 0);
    return { name: NAMES[r[at("Entity")]], first: (r[at("Wind")] / total) * 100, second: (r[at("Solar")] / total) * 100 };
  });

const reversals = groups.filter((g) => g.second > g.first);
const lead = groups.length - reversals.length;

export default {
  eyebrow: "Énergie · Europe",
  groups,
  // The first series is drawn in the accent, the second in a muted ink.
  firstName: "Éolien",
  secondName: "Solaire",
  subject: "Suisse",
  // The annotation over the subject's pair.
  callout: "Solaire devant éolien",
  format: (v) => v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
  title: "Dans 5 de ces 6 pays l’éolien devance le solaire — la Suisse est l’exception",
  limits: "Part de la production électrique nationale en 2024. Les pays sont classés par l’écart entre les deux, pas par ordre alphabétique.",
  source: "Source : Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data",
  alt: `Barres groupées : part de l’éolien et du solaire dans la production électrique de ${groups.length} pays européens en 2024. L’éolien devance le solaire dans ${lead} pays ; en ${reversals.map((g) => g.name).join(", ")}, le solaire devance l’éolien.`,
  evidenceLevels: 3,
  check() {
    if (lead !== 5 || groups.length !== 6) throw new Error(`wind leads solar in ${lead} of ${groups.length} countries, not 5 of 6`);
    if (reversals.length !== 1 || reversals[0].name !== "Suisse") throw new Error(`the exception is ${reversals.map((g) => g.name).join(", ") || "none"}, not Switzerland alone`);
  },
};
