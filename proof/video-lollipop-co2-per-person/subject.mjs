// THE SUBJECT OF `static-lollipop-co2-per-person`, LOADED AND ASSERTED — the six largest emitters of 2023 (per person times
// population), their CO₂ per person in 2000 and 2023, and the ratio between the American and the Chinese averages: the
// static beat's own derivation (`render-directions.mjs` there runs it inline and exports nothing), read from its frozen file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-lollipop-co2-per-person");
export const FROM = 2000;
export const TO = 2023;
export const HOW_MANY = 6;
export const SUBJECT = "CHN";
export const OTHER = "USA";
const NAMES = {
  CHN: "Chine", USA: "États-Unis", IND: "Inde", RUS: "Russie", JPN: "Japon", IRN: "Iran",
  IDN: "Indonésie", SAU: "Arabie saoudite", DEU: "Allemagne", KOR: "Corée du Sud", BRA: "Brésil",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (name) => header.indexOf(name);
  const all = csv.slice(1).map((l) => {
    const c = l.split(",");
    return { code: c[at("code")], before: Number(c[at("t_per_person_2000")]), after: Number(c[at("t_per_person_2023")]), people: Number(c[at("population_2023")]) };
  });
  for (const c of all) if (!c.code || !Number.isFinite(c.before) || !Number.isFinite(c.after) || !(c.people > 0)) throw new Error(`a country has no usable reading: ${JSON.stringify(c)}`);
  const chosen = all.map((c) => ({ ...c, total: c.after * c.people })).sort((a, b) => b.total - a.total).slice(0, HOW_MANY);
  for (const c of chosen) if (!NAMES[c.code]) throw new Error(`${c.code} has no French name filed in this beat`);

  // THE CLAIM, ASSERTED — the static beat's own checks.
  const subject = chosen.find((c) => c.code === SUBJECT);
  const other = chosen.find((c) => c.code === OTHER);
  if (!subject || !other) throw new Error(`the title names China and the United States; the six are ${chosen.map((c) => c.code).join(", ")}`);
  if (!(subject.after / subject.before > 2.5)) throw new Error(`the title says China tripled; it multiplied by ${(subject.after / subject.before).toFixed(2)}`);
  const ratio = { before: other.before / subject.before, after: other.after / subject.after };
  if (!(ratio.before > 5 && ratio.after < 2.5 && ratio.after > 1)) throw new Error(`the ratio should fall from above five to under two and a half; it went from ${ratio.before.toFixed(1)} to ${ratio.after.toFixed(1)}`);
  return { pairs: chosen.map((c) => ({ code: c.code, name: NAMES[c.code], before: c.before, after: c.after })), ratio };
}
