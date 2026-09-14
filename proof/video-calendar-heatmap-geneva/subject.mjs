// THE SUBJECT OF `static-calendar-heatmap-geneva`, LOADED AND ASSERTED — Geneva's 2024 day by day, the six quantile bins,
// the warm days and the longest run at or above the threshold: the static beat's own derivation (`render-directions.mjs`
// there runs it inline and exports nothing), read from its frozen file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-calendar-heatmap-geneva");
export const YEAR = 2024;
export const THRESHOLD = 20;
export const STREAK = 31;
export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

export const daysInMonth = (month) => new Date(Date.UTC(YEAR, month + 1, 0)).getUTCDate();

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const days = readFileSync(join(dir, "data.csv"), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(","))
    .map(([date, mean], index) => {
      const [y, m, d] = date.split("-").map(Number);
      if (y !== YEAR) throw new Error(`the frozen file carries ${y}, not ${YEAR}`);
      const value = Number(mean);
      if (!Number.isFinite(value)) throw new Error(`${date} has no reading`);
      return { index, date, month: m - 1, day: d, value };
    });
  const expected = MONTHS.reduce((sum, _, m) => sum + daysInMonth(m), 0);
  if (days.length !== expected) throw new Error(`expected ${expected} days in ${YEAR}, got ${days.length}`);
  days.forEach((d, i) => {
    if (i > 0 && !(d.month > days[i - 1].month || d.day === days[i - 1].day + 1)) throw new Error(`${d.date} does not follow ${days[i - 1].date}`);
  });

  let best = { length: 0, from: null, to: null };
  let run = [];
  for (const day of [...days, { value: -Infinity }]) {
    if (day.value >= THRESHOLD) run.push(day);
    else {
      if (run.length > best.length) best = { length: run.length, from: run[0], to: run.at(-1) };
      run = [];
    }
  }
  if (best.length !== STREAK) throw new Error(`the title says ${STREAK} days in a row at or above ${THRESHOLD} °C; the longest run is ${best.length}`);
  const warm = days.filter((d) => d.value >= THRESHOLD);
  if (!(warm.length > best.length)) throw new Error(`the run is part of the warm days; ${warm.length} warm days against a run of ${best.length}`);

  const sorted = days.map((d) => d.value).sort((a, b) => a - b);
  const quantile = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  const breaks = [0.166, 0.333, 0.5, 0.666, 0.833].map((p) => Math.round(quantile(p)));
  if (new Set(breaks).size !== breaks.length) throw new Error(`two bins share a break after rounding: ${breaks.join(", ")}`);

  return { days, breaks, warm: warm.length, streak: best };
}
