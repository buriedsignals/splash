// THE SUBJECT OF `static-streamgraph-swiss-electricity`, LOADED AND ASSERTED — the static beat's own checks.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-streamgraph-swiss-electricity");
export const FIRST = 2000;
/** 2025 is in the frozen file and is partial: drawn on a stream it reads as a collapse. */
export const LAST = 2024;
export const TRACKED = "Solar";
export const RANK = 3;
export const LABELS = { Hydropower: "Hydraulique", Nuclear: "Nucléaire", Solar: "Solaire" };

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const keys = header.slice(3);
  const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
  const entities = new Set(rows.map((r) => r.Entity));
  if (entities.size !== 1 || !entities.has("Switzerland")) throw new Error(`expected only Switzerland in the frozen data, got: ${[...entities].join(", ")}`);
  const readings = rows
    .filter((r) => Number(r.Year) >= FIRST && Number(r.Year) <= LAST)
    .map((r) => ({ year: Number(r.Year), ...Object.fromEntries(keys.map((k) => [k, Number(r[k])])) }))
    .sort((a, b) => a.year - b.year);
  if (readings.length !== LAST - FIRST + 1) throw new Error(`expected every year from ${FIRST} to ${LAST}, got ${readings.length}`);
  const rankIn = (reading) => keys.map((k) => ({ k, v: reading[k] })).sort((a, b) => b.v - a.v).findIndex((r) => r.k === TRACKED) + 1;
  const ranks = readings.map((r) => ({ year: r.year, rank: rankIn(r) }));
  const reachedAt = ranks.find((r) => r.rank <= RANK);
  if (!reachedAt) throw new Error(`${TRACKED} never reaches rank ${RANK}`);
  if (!ranks.filter((r) => r.year >= reachedAt.year).every((r) => r.rank <= RANK)) throw new Error(`the title says solar has held rank ${RANK} since ${reachedAt.year}; it has not`);
  return { readings, keys, ranks, reachedAt: reachedAt.year };
}
