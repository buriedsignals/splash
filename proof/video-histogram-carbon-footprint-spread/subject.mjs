// THE SUBJECT OF `static-carbon-footprint-spread`, LOADED AND ASSERTED — the 213 countries with a 3-letter code and a value in
// 2023, binned exactly as the static beat bins them (ten 4-tonne bins from 0, the last one open), every country in one
// bin, 127 under the declared 4-tonne threshold and the share rounding to the title's 6 in 10.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-carbon-footprint-spread");
export const BIN_WIDTH = 4;
export const BIN_COUNT = 10;
/** The static beat's editorial cut, declared there. */
export const THRESHOLD = 4;

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const rows = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/).slice(1);
  const countries = rows
    .map((line) => {
      const cells = line.split(",");
      return { name: cells[0], code: cells[1], value: Number(cells[3]) };
    })
    .filter((r) => /^[A-Z]{3}$/.test(r.code) && Number.isFinite(r.value))
    .sort((a, b) => a.value - b.value);
  if (countries.length !== 213) throw new Error(`the static beat counts 213 countries, data.csv gives ${countries.length}`);
  if (countries.some((c) => c.value < 0)) throw new Error("a country emits under zero: the bins start at 0");

  const bins = Array.from({ length: BIN_COUNT }, (_, i) => {
    const lo = i * BIN_WIDTH;
    const open = i === BIN_COUNT - 1;
    return { lo, hi: lo + BIN_WIDTH, open, count: 0 };
  });
  const placed = countries.map((c) => {
    const bin = Math.min(BIN_COUNT - 1, Math.floor(c.value / BIN_WIDTH));
    const j = bins[bin].count;
    bins[bin].count += 1;
    return { ...c, bin, j };
  });
  const total = bins.reduce((t, b) => t + b.count, 0);
  if (total !== countries.length) throw new Error(`the bins hold ${total} countries, not ${countries.length}`);

  const under = countries.filter((c) => c.value < THRESHOLD).length;
  if (THRESHOLD !== bins[1].lo) throw new Error(`the threshold ${THRESHOLD} is not the edge between the first two bins`);
  if (under !== bins[0].count) throw new Error(`${under} countries under ${THRESHOLD} t, the first bin holds ${bins[0].count}`);
  if (under !== 127) throw new Error(`the static beat says 127 under ${THRESHOLD} t, the data says ${under}`);
  const share = Math.round((under / total) * 10);
  if (share !== 6) throw new Error(`the title says 6 in 10, the data says ${share}`);
  if (!bins.slice(1).every((b) => b.count <= bins[1].count)) throw new Error("a tail bin is taller than the 4–8 bin it is stacked onto");
  return { countries: placed, bins, total, under, share };
}
