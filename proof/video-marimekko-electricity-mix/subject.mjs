// THE SUBJECT OF `static-marimekko-electricity-mix`, LOADED AND ASSERTED — six 2024 electricity mixes, the nine sources
// stacked in the static beat's order (fossil, nuclear, renewables), each column's bands summing to its own total, the columns
// ordered by generation, and the headline re-run: coal's share of the six, and the two countries that hold nearly all of it.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-marimekko-electricity-mix");
export const YEAR = 2024;
export const TRACKED = "Coal";
/** Bottom to top — the static beat's order, and the order its ramp runs along. */
export const SOURCES = [
  { column: "Coal", label: "Charbon" },
  { column: "Oil", label: "Pétrole" },
  { column: "Gas", label: "Gaz" },
  { column: "Nuclear", label: "Nucléaire" },
  { column: "Bioenergy", label: "Bioénergie" },
  { column: "Other renewables", label: "Autres renouv." },
  { column: "Hydropower", label: "Hydraulique" },
  { column: "Solar", label: "Solaire" },
  { column: "Wind", label: "Éolien" },
];
export const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return { cols, rows: rows.map((row) => Object.fromEntries(row.split(",").map((cell, i) => [cols[i], cell]))) };
}

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const { cols, rows: raw } = parseCsv(readFileSync(join(dir, "data.csv"), "utf8"));
  const missing = cols.slice(3).filter((c) => !SOURCES.some((s) => s.column === c));
  if (missing.length) throw new Error(`unordered source(s): ${missing.join(", ")}`);

  const columns = raw
    .filter((r) => Number(r.Year) === YEAR)
    .map((r) => {
      if (!FRENCH[r.Entity]) throw new Error(`no French name recorded for ${r.Entity}`);
      const values = SOURCES.map((s) => {
        const v = Number(r[s.column]);
        if (!Number.isFinite(v)) throw new Error(`${r.Entity} ${s.column} is not a number: ${JSON.stringify(r[s.column])}`);
        return v;
      });
      const total = values.reduce((a, b) => a + b, 0);
      const bands = SOURCES.map((s, i) => ({ key: s.column, label: s.label, value: values[i], share: values[i] / total }));
      return { key: r.Entity, name: FRENCH[r.Entity], total, bands };
    })
    .sort((a, b) => b.total - a.total);

  if (columns.length !== 6) throw new Error(`expected the six countries' ${YEAR} mixes, got ${columns.length}`);
  for (const c of columns) {
    const summed = c.bands.reduce((s, b) => s + b.value, 0);
    if (Math.abs(summed - c.total) > 1e-9) throw new Error(`${c.key}: bands sum to ${summed} against a total of ${c.total}`);
    const shares = c.bands.reduce((s, b) => s + b.share, 0);
    if (Math.abs(shares - 1) > 1e-9) throw new Error(`${c.key}: shares sum to ${shares}`);
  }

  const grand = columns.reduce((s, c) => s + c.total, 0);
  const coalOf = (c) => c.bands.find((b) => b.key === TRACKED).value;
  const coalTotal = columns.reduce((s, c) => s + coalOf(c), 0);
  const holders = [...columns].sort((a, b) => coalOf(b) - coalOf(a)).slice(0, 2);
  const topTwoShare = (coalOf(holders[0]) + coalOf(holders[1])) / coalTotal;
  if (topTwoShare < 0.95)
    throw new Error(`the title says two columns hold the coal; they hold ${(topTwoShare * 100).toFixed(1)} %`);
  if (holders.map((h) => h.key).sort().join() !== "Germany,Poland")
    throw new Error(`the strip names Germany and Poland; the two largest coal columns are ${holders.map((h) => h.key).join(", ")}`);
  const coalShare = coalTotal / grand;
  if (Math.round(coalShare * 100) !== 12) throw new Error(`the title says 12 %; coal is ${(coalShare * 100).toFixed(1)} %`);

  return {
    columns,
    grand,
    coal: { total: coalTotal, share: coalShare, holders: holders.map((h) => h.key), topTwoShare },
  };
}
