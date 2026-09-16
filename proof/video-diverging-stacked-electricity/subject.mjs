// THE SUBJECT OF `static-diverging-stacked-electricity`, LOADED AND ASSERTED — six 2024 electricity mixes as shares, every
// source classified exactly as the static beat classifies it, each row summing to 100 %, the rows ordered by fossil share,
// and the headline's comparison re-run: in the country with the most nuclear, nuclear outweighs both sides together.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-diverging-stacked-electricity");
export const YEAR = 2024;
/** Ordered OUTWARD from the centre, as the static beat orders them: the last is the deepest step of its side. */
export const FOSSIL = [
  { column: "Gas", label: "Gaz" },
  { column: "Oil", label: "Pétrole" },
  { column: "Coal", label: "Charbon" },
];
export const RENEWABLE = [
  { column: "Bioenergy", label: "Bioénergie" },
  { column: "Other renewables", label: "Autres renouv." },
  { column: "Hydropower", label: "Hydraulique" },
  { column: "Solar", label: "Solaire" },
  { column: "Wind", label: "Éolien" },
];
export const CENTRE = { column: "Nuclear", label: "Nucléaire" };
export const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return { cols, rows: rows.map((row) => Object.fromEntries(row.split(",").map((cell, i) => [cols[i], cell]))) };
}

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const { cols, rows: raw } = parseCsv(readFileSync(join(dir, "data.csv"), "utf8"));
  const sources = cols.slice(3);
  const classified = [...FOSSIL, ...RENEWABLE, CENTRE].map((s) => s.column);
  const missing = sources.filter((c) => !classified.includes(c));
  if (missing.length) throw new Error(`unclassified source(s): ${missing.join(", ")}`);

  const rows = raw
    .filter((r) => Number(r.Year) === YEAR)
    .map((r) => {
      if (!FRENCH[r.Entity]) throw new Error(`no French name recorded for ${r.Entity}`);
      const values = Object.fromEntries(sources.map((c) => {
        const v = Number(r[c]);
        if (!Number.isFinite(v)) throw new Error(`${r.Entity} ${c} is not a number: ${JSON.stringify(r[c])}`);
        return [c, v];
      }));
      const total = sources.reduce((s, c) => s + values[c], 0);
      const level = (s) => ({ key: s.column, label: s.label, share: (values[s.column] / total) * 100 });
      const left = FOSSIL.map(level);
      const right = RENEWABLE.map(level);
      const centre = level(CENTRE).share;
      const fossil = left.reduce((s, l) => s + l.share, 0);
      const renewable = right.reduce((s, l) => s + l.share, 0);
      return { key: r.Entity, name: FRENCH[r.Entity], left, right, centre, fossil, renewable };
    })
    .sort((a, b) => b.fossil - a.fossil);

  if (rows.length !== 6) throw new Error(`expected the six countries' ${YEAR} mixes, got ${rows.length}`);
  for (const row of rows) {
    const sum = row.fossil + row.renewable + row.centre;
    if (Math.abs(sum - 100) > 1e-9) throw new Error(`${row.key}: the three groups sum to ${sum.toFixed(6)} %, not 100`);
  }
  const subject = rows.reduce((a, b) => (b.centre > a.centre ? b : a));
  if (!(subject.centre > subject.fossil + subject.renewable))
    throw new Error(`the title says nuclear outweighs both sides together in ${subject.key}; ${subject.centre.toFixed(1)} against ${(subject.fossil + subject.renewable).toFixed(1)}`);
  if (subject.key !== "France") throw new Error(`the title names France; the largest nuclear share is ${subject.key}'s`);
  return { rows, subject: subject.key };
}
