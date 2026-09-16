// THE SUBJECT OF `co2-suisse`, LOADED AND ASSERTED — the static beat's own series and reference.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BEAT, readingsFromCsv } from "../co2-suisse/render-web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "co2-suisse");

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const data = readingsFromCsv(readFileSync(join(dir, "data.csv"), "utf8"), { entity: BEAT.entity, firstYear: BEAT.firstYear });
  const peak = data.reduce((a, b) => (b.mt > a.mt ? b : a));
  const end = data.at(-1);
  if (peak.year !== 1973) throw new Error(`the video marks the 1973 peak; the series peaks in ${peak.year}`);
  if (!(end.year === 2024 && end.mt < BEAT.reference)) throw new Error(`the title says 2024 is under the 1967 level; ${end.year} is at ${end.mt}`);
  const before = data.filter((d) => d.year < peak.year && d.mt <= end.mt).at(-1);
  if (!before || before.year !== 1966) throw new Error(`the last year before the peak at or under today's reading should be 1966; it is ${before?.year}`);
  return { data, peak, end, reference: BEAT.reference };
}
