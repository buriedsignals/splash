// THE SUBJECT OF `static-area-swiss-co2`, LOADED AND ASSERTED — the static beat's own checks.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-area-swiss-co2");

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const yearAt = header.indexOf("Year");
  const readings = csv
    .slice(1)
    .map((l) => l.split(","))
    .map((c) => ({ year: Number(c[yearAt]), mt: Number(c[header.length - 1]) / 1e6 }))
    .sort((a, b) => a.year - b.year);
  for (const r of readings) if (!Number.isFinite(r.year) || !Number.isFinite(r.mt)) throw new Error(`a reading has no usable year or value: ${JSON.stringify(r)}`);
  for (let i = 1; i < readings.length; i++)
    if (readings[i].year !== readings[i - 1].year + 1) throw new Error(`the series jumps from ${readings[i - 1].year} to ${readings[i].year}; an area drawn over a gap measures years the source never reported`);
  const total = readings.reduce((s, r) => s + r.mt, 0);
  let running = 0;
  const cumulative = readings.map((r) => (running += r.mt));
  const midpoint = readings[cumulative.findIndex((c) => c >= total / 2)].year;
  const after = readings.filter((r) => r.year > midpoint);
  const before = readings.filter((r) => r.year <= midpoint);
  const shareAfter = (after.reduce((s, r) => s + r.mt, 0) / total) * 100;
  if (!(shareAfter > 45 && shareAfter < 50)) throw new Error(`the title says the years after ${midpoint} carry about half; they carry ${shareAfter.toFixed(1)} %`);
  if (!(after.length * 3 < before.length)) throw new Error(`the recent half should be far shorter; it is ${after.length} years against ${before.length}`);
  return { readings, cumulative, total, midpoint, after: after.length, before: before.length, shareAfter, shareBefore: 100 - shareAfter };
}
