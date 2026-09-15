// THE SUBJECT OF `static-germany-electricity-bridge`, LOADED AND ASSERTED — Germany's generation in 2015 and 2024 grouped
// into renewables, nuclear and fossil exactly as the static beat groups them, the bridge replayed to the tenth, and the
// title's signs re-run.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-germany-electricity-bridge");
export const FROM = 2015;
export const TO = 2024;
/** The static beat's groups, in the order the bridge walks them. */
export const GROUPS = [
  { key: "renewables", name: "Renouvelables", columns: ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"] },
  { key: "nuclear", name: "Nucléaire", columns: ["Nuclear"] },
  { key: "fossil", name: "Fossile", columns: ["Gas", "Oil", "Coal"] },
];
/** The members stacked in a total, bottom to top: the one the bridge walks first sits on top. */
export const STACK = ["fossil", "nuclear", "renewables"];

export const tenth = (v) => Math.round(v * 10) / 10;

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((row) => Object.fromEntries(row.split(",").map((cell, i) => [cols[i], cell])));
}

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const rows = parseCsv(readFileSync(join(dir, "data.csv"), "utf8"));
  const at = (year) => {
    const row = rows.find((r) => Number(r.Year) === year);
    if (!row) throw new Error(`data.csv has no row for ${year}`);
    return row;
  };
  const sum = (row, cols) =>
    cols.reduce((t, c) => {
      const v = Number(row[c]);
      if (!Number.isFinite(v)) throw new Error(`${c} in ${row.Year} is not a number: ${JSON.stringify(row[c])}`);
      return t + v;
    }, 0);
  const members = GROUPS.map((g) => {
    const from = sum(at(FROM), g.columns);
    const to = sum(at(TO), g.columns);
    return { key: g.key, name: g.name, from, to, change: to - from };
  });
  const opening = members.reduce((t, m) => t + m.from, 0);
  const closing = members.reduce((t, m) => t + m.to, 0);
  // The bridge as the chart prints it: every step to the tenth, walked from the opening to the tenth.
  const walked = tenth(members.reduce((t, m) => t + tenth(m.change), tenth(opening)));
  if (walked !== tenth(closing)) throw new Error(`the bridge does not balance to the tenth: ${walked} walked against ${tenth(closing)}`);
  const [renewables, nuclear, fossil] = members;
  if (!(renewables.change > 0)) throw new Error(`the bridge says renewables ROSE, got ${renewables.change}`);
  if (!(nuclear.change < 0) || !(fossil.change < 0)) throw new Error(`the bridge says nuclear and fossil FELL, got ${nuclear.change} and ${fossil.change}`);
  const net = closing - opening;
  if (Math.round(-net) !== 143) throw new Error(`the title says 143 TWh fewer, the data says ${-net}`);
  return { members, opening, closing, net };
}
