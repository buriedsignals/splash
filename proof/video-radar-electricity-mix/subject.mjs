// THE SUBJECT OF `static-radar-electricity-mix`, LOADED AND ASSERTED — France and Germany's 2024 generation by source,
// the nine shares per country of its own total, in the static's spoke order (renewables, nuclear, fossil); the static
// beat's own checks (its runner runs them inline and exports nothing): the two totals within 25 %, Germany without
// nuclear, nuclear more than half of France's mix, Germany ahead on wind and solar. Plus what the video derives: the
// ratio Germany's bar stretches by, and the wheel's ceiling.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-radar-electricity-mix");
export const YEAR = 2024;
/** The static's spoke order, clockwise from twelve o'clock. */
export const SPOKES = [
  { column: "Wind", label: "Éolien" },
  { column: "Solar", label: "Solaire" },
  { column: "Hydropower", label: "Hydraulique" },
  { column: "Bioenergy", label: "Bioénergie" },
  { column: "Other renewables", label: "Autres renouv." },
  { column: "Nuclear", label: "Nucléaire" },
  { column: "Gas", label: "Gaz" },
  { column: "Coal", label: "Charbon" },
  { column: "Oil", label: "Pétrole" },
];
/** The subject first: the accent's country. */
export const ITEMS = [
  { entity: "France", name: "France" },
  { entity: "Germany", name: "Allemagne" },
];
/** The spoke the conclusion rings. */
export const NAMED = "Nuclear";

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const rows = csv.slice(1).map((l) => {
    const cells = l.split(",");
    return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
  });
  const countries = ITEMS.map(({ entity, name }) => {
    const row = rows.find((r) => r.Entity === entity && Number(r.Year) === YEAR);
    if (!row) throw new Error(`no ${YEAR} row for ${entity} in the frozen data`);
    const twh = SPOKES.map((s) => Number(row[s.column]));
    if (!twh.every((v) => Number.isFinite(v) && v >= 0)) throw new Error(`${entity} has a source with no usable reading`);
    const total = twh.reduce((a, b) => a + b, 0);
    return { entity, name, total, twh, shares: twh.map((v) => (v / total) * 100) };
  });
  const [fr, de] = countries;
  const share = (c, ...columns) => columns.reduce((sum, col) => sum + c.shares[SPOKES.findIndex((s) => s.column === col)], 0);

  const ratio = Math.max(fr.total, de.total) / Math.min(fr.total, de.total);
  if (ratio > 1.25) throw new Error(`the headline says the two make nearly the same electricity; they are ${ratio.toFixed(2)}x apart`);
  if (!(fr.total > de.total)) throw new Error("France's bar is the one Germany's stretches to; France must be the larger total");
  if (share(de, "Nuclear") !== 0) throw new Error(`the headline says Germany has no nuclear; it has ${share(de, "Nuclear")} %`);
  if (share(fr, "Nuclear") < 50) throw new Error(`the headline rests on nuclear being most of France's mix; it is ${share(fr, "Nuclear").toFixed(1)} %`);
  if (!(share(de, "Wind", "Solar") > share(fr, "Wind", "Solar"))) throw new Error("the standfirst says Germany draws more of its power from wind and solar than France does");

  const largest = Math.max(...countries.flatMap((c) => c.shares));
  const ceiling = Math.ceil(largest / 10) * 10;
  return {
    spokes: SPOKES,
    countries,
    ratio,
    ceiling,
    rings: [ceiling / 4, ceiling / 2, (ceiling * 3) / 4, ceiling],
    named: SPOKES.findIndex((s) => s.column === NAMED),
    windSolar: countries.map((c) => share(c, "Wind", "Solar")),
  };
}
