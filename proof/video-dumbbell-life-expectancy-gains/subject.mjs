// THE SUBJECT OF `more-dumbbell-life-expectancy-gains`, LOADED AND ASSERTED — the static beat's own checks: every one of the
// ten gained, Poland the most, the United States the least.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "more-dumbbell-life-expectancy-gains");
export const FROM = 2000;
export const TO = 2023;
export const MOST = "Poland";
export const LEAST = "United States";
export const FRENCH = {
  France: "France",
  Germany: "Allemagne",
  Italy: "Italie",
  Japan: "Japon",
  Netherlands: "Pays-Bas",
  Poland: "Pologne",
  Spain: "Espagne",
  Switzerland: "Suisse",
  "United Kingdom": "Royaume-Uni",
  "United States": "États-Unis",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/).slice(1).map((l) => l.split(","));
  const at = (entity, year) => {
    const row = csv.find((c) => c[0] === entity && Number(c[2]) === year);
    if (!row) throw new Error(`no ${year} reading for ${entity} in the frozen data`);
    return Number(row[3]);
  };
  const rows = Object.keys(FRENCH).map((key) => {
    const from = at(key, FROM);
    const to = at(key, TO);
    return { key, label: FRENCH[key], from, to, gain: to - from };
  });
  const flat = rows.filter((r) => r.gain <= 0);
  if (flat.length) throw new Error(`the title says every one of the ten gained; ${flat.map((r) => r.key).join(", ")} did not`);
  const byGain = [...rows].sort((a, b) => b.gain - a.gain);
  if (byGain[0].key !== MOST) throw new Error(`the title says ${MOST} gained the most; ${byGain[0].key} did`);
  if (byGain.at(-1).key !== LEAST) throw new Error(`the title says ${LEAST} gained the least; ${byGain.at(-1).key} did`);
  const byLevel = [...rows].sort((a, b) => b.from - a.from);
  if (byLevel.at(-1).key !== MOST) throw new Error(`the video starts ${MOST} last in ${FROM}; ${byLevel.at(-1).key} is`);
  return { rows, byGain: byGain.map((r) => r.key), byLevel: byLevel.map((r) => r.key), most: byGain[0], least: byGain.at(-1) };
}
