// THE SUBJECT OF `static-bullet-low-carbon-share`, LOADED AND ASSERTED — the low-carbon share of six countries' electricity
// in 2015 and 2024, their order in 2015 and by gain, and the insertion that takes one to the other: the static beat's own
// derivation (its runner runs it inline and exports nothing), read from its frozen file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-bullet-low-carbon-share");
export const BEFORE = 2015;
export const AFTER = 2024;
export const HALF = 50;
const LOW_CARBON = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower", "Nuclear"];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const sources = header.slice(3);
  const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
  const shareFor = (entity, year) => {
    const row = rows.find((r) => r.Entity === entity && Number(r.Year) === year);
    if (!row) throw new Error(`no ${year} row for ${entity} in the frozen data`);
    const total = sources.reduce((sum, c) => sum + Number(row[c]), 0);
    return (LOW_CARBON.reduce((sum, c) => sum + Number(row[c]), 0) / total) * 100;
  };
  const countries = [...new Set(rows.map((r) => r.Entity))].map((entity) => {
    if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
    return { key: entity, name: FRENCH[entity], before: shareFor(entity, BEFORE), after: shareFor(entity, AFTER) };
  });
  const byGain = [...countries].sort((a, b) => b.after - b.before - (a.after - a.before));
  const moved = byGain[0];
  const underHalf = countries.filter((c) => c.after < HALF);
  if (underHalf.length !== 1 || underHalf[0] !== moved) throw new Error(`the title says the country that moved furthest is the only one still under half; ${underHalf.length} are under half and the furthest is ${moved.key}`);

  // THE INSERTION: from the 2015 order to the order of gain, one row at a time — each step takes the row that belongs in
  // the next slot out of the order and puts it there; a step that moves nothing is not a step.
  const start = [...countries].sort((a, b) => b.before - a.before).map((c) => c.key);
  const steps = [start];
  byGain.forEach((c, slot) => {
    const current = steps.at(-1);
    if (current[slot] === c.key) return;
    const next = current.filter((k) => k !== c.key);
    next.splice(slot, 0, c.key);
    steps.push(next);
  });
  if (steps.at(-1).join() !== byGain.map((c) => c.key).join()) throw new Error("the insertion does not end on the order of gain");
  return { countries, moved, steps };
}
