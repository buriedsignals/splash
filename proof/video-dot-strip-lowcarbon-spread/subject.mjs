// THE SUBJECT OF `static-dot-strip-lowcarbon-spread`, LOADED AND ASSERTED — the static beat's own checks: the floor rose more
// than 20 points and the ceiling less than 5, the spread closed by more than a fifth, Poland was the floor in 2000. And the
// video's own: every country rose, and the three figures it writes add up as written.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-dot-strip-lowcarbon-spread");
export const FROM = 2000;
export const TO = 2024;
export const FLOOR = "POL";
export const CEILING = "SWE";

const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];

/** One decimal, as the picture writes it. */
export const tenths = (v) => Math.round(v * 10) / 10;

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const [head, ...lines] = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = head.split(",");
  const at = (name) => header.indexOf(name);
  const byCode = {};
  for (const l of lines) {
    const c = l.split(",");
    const lc = LOW_CARBON.reduce((s, k) => s + Number(c[at(k)]), 0);
    const fossil = FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
    if (!(lc + fossil > 0)) throw new Error(`a country has no generation at all: ${l}`);
    (byCode[c[at("code")]] ??= {})[Number(c[at("year")])] = (lc / (lc + fossil)) * 100;
  }
  const marks = Object.entries(byCode).map(([code, v]) => {
    if (v[FROM] === undefined || v[TO] === undefined) throw new Error(`${code} is not read at both ${FROM} and ${TO}`);
    return { code, before: v[FROM], after: v[TO] };
  });
  const lowest = (key) => marks.reduce((a, b) => (b[key] < a[key] ? b : a));
  const highest = (key) => marks.reduce((a, b) => (b[key] > a[key] ? b : a));
  if (lowest("before").code !== FLOOR) throw new Error(`the subject is the floor in ${FROM}; that is ${lowest("before").code}`);
  if (lowest("after").code !== FLOOR) throw new Error(`the video pins the floor to ${FLOOR} in ${TO}; the floor is ${lowest("after").code}`);
  if (highest("before").code !== CEILING || highest("after").code !== CEILING) throw new Error(`the video pins the ceiling to ${CEILING} in both years`);
  const floor = marks.find((m) => m.code === FLOOR);
  const ceiling = marks.find((m) => m.code === CEILING);
  const floorRise = floor.after - floor.before;
  const ceilRise = ceiling.after - ceiling.before;
  if (!(floorRise > 20 && ceilRise < 5)) throw new Error(`the headline says the floor rose far and the ceiling barely; ${floorRise.toFixed(1)} and ${ceilRise.toFixed(1)}`);
  const spreadBefore = ceiling.before - floor.before;
  const spreadAfter = ceiling.after - floor.after;
  if (!(spreadAfter < spreadBefore * 0.8)) throw new Error(`the spread did not close by more than a fifth: ${spreadBefore.toFixed(1)} -> ${spreadAfter.toFixed(1)}`);
  const fell = marks.filter((m) => !(m.after > m.before));
  if (fell.length) throw new Error(`the reveal says every country rose; ${fell.map((m) => m.code).join(", ")} did not`);
  const closed = spreadBefore - spreadAfter;
  if (Math.abs(tenths(floorRise) - tenths(ceilRise) - tenths(closed)) > 1e-9)
    throw new Error(`the three figures do not add up as written: ${tenths(floorRise)} − ${tenths(ceilRise)} ≠ ${tenths(closed)}`);
  const byBefore = [...marks].sort((a, b) => a.before - b.before).map((m) => m.code);
  return { marks, floor, ceiling, floorRise, ceilRise, spreadBefore, spreadAfter, closed, byBefore };
}
