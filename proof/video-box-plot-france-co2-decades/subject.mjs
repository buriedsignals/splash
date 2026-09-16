// THE SUBJECT OF `more-boxplot-france-co2-decades`, LOADED AND ASSERTED — France's annual per-capita CO2 readings from
// 1950, bucketed by decade and summarised by that beat's own `summarizeDecade` (one Tukey rule, not two copies of it),
// the peak decade and the fall after it re-run on the computed medians.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeDecade } from "../more-boxplot-france-co2-decades/DecadeBoxplot.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "more-boxplot-france-co2-decades");
export const FROM = 1950;
export const READINGS = 75;
export const PEAK = "1970s";
/** The one reading past a whisker: 1980, in the 1980s. */
export const OUTLIER_YEAR = 1980;

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const [header, ...lines] = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const cols = header.split(",");
  const entityAt = cols.indexOf("Entity");
  const yearAt = cols.indexOf("Year");
  const valueAt = cols.findIndex((c) => c.startsWith("CO"));
  const rows = lines.map((l) => l.split(","));
  const entities = new Set(rows.map((r) => r[entityAt]));
  if (entities.size !== 1 || !entities.has("France")) throw new Error(`expected only France in the frozen data, got ${[...entities].join(", ")}`);
  const readings = rows.map((r) => ({ year: Number(r[yearAt]), value: Number(r[valueAt]) })).filter((r) => r.year >= FROM && Number.isFinite(r.value));
  if (readings.length !== READINGS) throw new Error(`${READINGS} readings from ${FROM}; the file gives ${readings.length}`);
  readings.forEach((r, i) => {
    if (r.year !== FROM + i) throw new Error(`the readings skip a year at ${r.year}`);
  });

  const byDecade = new Map();
  for (const r of readings) {
    const start = Math.floor(r.year / 10) * 10;
    if (!byDecade.has(start)) byDecade.set(start, []);
    byDecade.get(start).push(r);
  }
  const decades = [...byDecade.entries()].map(([start, rs]) => ({ start, readings: rs, ...summarizeDecade(`${start}s`, rs.map((r) => r.value)) }));

  const peak = decades.reduce((a, b) => (b.median > a.median ? b : a));
  if (peak.label !== PEAK) throw new Error(`the title says the median peaks in the ${PEAK}; the data says ${peak.label}`);
  const at = decades.indexOf(peak);
  decades.forEach((d, i) => {
    if (i === 0) return;
    const before = decades[i - 1];
    if (i <= at ? !(d.median > before.median) : !(d.median < before.median)) throw new Error(`${d.label} (${d.median}) breaks the rise to ${PEAK} and the fall after it`);
  });
  const partial = decades.filter((d) => d.n !== 10);
  if (partial.length !== 1 || partial[0] !== decades.at(-1) || partial[0].n !== 5) throw new Error("only the last decade may be partial, with five readings");
  const outliers = decades.flatMap((d) => d.outliers.map((value) => ({ decade: d.label, value, year: d.readings.find((r) => r.value === value).year })));
  if (outliers.length !== 1 || outliers[0].year !== OUTLIER_YEAR) throw new Error(`one outlier, ${OUTLIER_YEAR}; the summaries give ${JSON.stringify(outliers)}`);

  return { readings, decades, peak: at, lastYear: readings.at(-1).year };
}
