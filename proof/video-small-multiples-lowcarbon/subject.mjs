// THE SUBJECT OF `static-small-multiples-lowcarbon`, LOADED AND ASSERTED — the low-carbon share of electricity in 2000 and
// 2024 for sixteen European countries: the static beat's own derivation and checks (its runner runs them inline and
// exports nothing), read from its frozen file. Plus what the video derives: the grid's first order (alphabetical, the order
// that hides the pattern), the order of the 2000 start, and the pair it rings.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-small-multiples-lowcarbon");
export const FROM = 2000;
export const TO = 2024;
export const BIGGEST = "Denmark";
export const SMALLEST = "Sweden";
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France", Germany: "Allemagne",
  Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède",
  "United Kingdom": "Royaume-Uni",
};

/** The Pearson correlation between two equal-length series. */
export function correlationOf(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const sx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const sy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return cov / (sx * sy);
}

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const raw = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
  const shareOf = (r) => {
    const clean = CLEAN.reduce((s, k) => s + Number(r[k] || 0), 0);
    const total = clean + FOSSIL.reduce((s, k) => s + Number(r[k] || 0), 0);
    if (!(total > 0)) throw new Error(`${r.entity} reports no generation in ${r.year}`);
    return (clean / total) * 100;
  };
  const panels = [...new Set(raw.map((r) => r.entity))].map((entity) => {
    const a = raw.find((r) => r.entity === entity && Number(r.year) === FROM);
    const b = raw.find((r) => r.entity === entity && Number(r.year) === TO);
    if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
    if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
    const from = shareOf(a);
    const to = shareOf(b);
    return { key: entity, name: FRENCH[entity], from, to, delta: to - from };
  });

  // THE STATIC'S CLAIM, ASSERTED AS IT IS THERE.
  const fell = panels.filter((p) => p.delta <= 0);
  if (fell.length) throw new Error(`the title says all ${panels.length} rose; ${fell.map((p) => p.name).join(", ")} did not`);
  const r = correlationOf(panels.map((p) => p.from), panels.map((p) => p.delta));
  if (!(r < -0.5)) throw new Error(`the title says the lowest starters rose most; the correlation between ${FROM} level and gain is ${r.toFixed(2)}`);
  const byDelta = [...panels].sort((a, b) => b.delta - a.delta);
  if (byDelta[0].key !== BIGGEST) throw new Error(`${byDelta[0].name} gained the most, not ${BIGGEST}`);
  if (byDelta.at(-1).key !== SMALLEST) throw new Error(`${byDelta.at(-1).name} gained the least, not ${SMALLEST}`);
  const byStart = [...panels].sort((a, b) => a.from - b.from);
  if (byStart.at(-1).key !== SMALLEST) throw new Error(`${SMALLEST} is no longer the highest start; ${byStart.at(-1).name} is`);
  const largest = Math.max(...panels.flatMap((p) => [p.from, p.to]));
  const ceiling = Math.ceil(largest / 25) * 25;
  if (ceiling !== 100) throw new Error(`the shared scale is 0–${ceiling} %, not 0–100 %`);

  // THE VIDEO'S ORDERS: the grid opens alphabetical, which hides the pattern, and ends in the order of the start.
  const rows = [...panels].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return {
    rows,
    ceiling,
    correlation: r,
    before: rows.map((p) => p.key),
    byStart: byStart.map((p) => p.key),
    rings: [BIGGEST, SMALLEST],
  };
}
