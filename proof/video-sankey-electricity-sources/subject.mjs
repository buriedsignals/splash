// THE SUBJECT OF `static-sankey-electricity-sources`, LOADED AND ASSERTED — nine sources into six countries, 2024: the
// static beat's own derivation (its runner runs it inline and exports nothing), read from its frozen file. Plus what the
// video derives: where France's nuclear band sits inside France's node, the part the nuclear bar is laid against.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-sankey-electricity-sources");
const YEAR = 2024;
/** The static's rail order: renewables, then nuclear, then fossil. */
const SOURCES = [
  { key: "Wind", label: "Éolien" },
  { key: "Solar", label: "Solaire" },
  { key: "Hydropower", label: "Hydraulique" },
  { key: "Bioenergy", label: "Bioénergie" },
  { key: "Other renewables", label: "Autres renouv." },
  { key: "Nuclear", label: "Nucléaire" },
  { key: "Gas", label: "Gaz" },
  { key: "Coal", label: "Charbon" },
  { key: "Oil", label: "Pétrole" },
];
const FRENCH = { France: "France", Germany: "Allemagne", Norway: "Norvège", Poland: "Pologne", Sweden: "Suède", Switzerland: "Suisse" };

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const rows = csv
    .slice(1)
    .map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])))
    .filter((r) => Number(r.Year) === YEAR);
  for (const r of rows) if (!FRENCH[r.Entity]) throw new Error(`no French name recorded for ${r.Entity}`);

  const flows = SOURCES.flatMap((s) =>
    rows.map((r) => {
      const value = Number(r[s.key]);
      if (!Number.isFinite(value) || value < 0) throw new Error(`${r.Entity} × ${s.key} is not a usable value: ${r[s.key]}`);
      return { from: s.key, to: r.Entity, value };
    }),
  );
  const sumOf = (list) => list.reduce((s, f) => s + f.value, 0);
  const sources = SOURCES.map((s) => ({ ...s, total: sumOf(flows.filter((f) => f.from === s.key)) }));
  const countries = rows
    .map((r) => ({ key: r.Entity, label: FRENCH[r.Entity], total: sumOf(flows.filter((f) => f.to === r.Entity)) }))
    .sort((a, b) => b.total - a.total);
  const grand = sumOf(flows);

  // THE STATIC'S CLAIMS, ASSERTED AS THEY ARE THERE.
  const bySource = sources.reduce((s, n) => s + n.total, 0);
  const byCountry = countries.reduce((s, n) => s + n.total, 0);
  if (Math.abs(bySource - byCountry) > 1e-6 || Math.abs(bySource - grand) > 1e-6)
    throw new Error(`conservation fails: ${bySource.toFixed(3)} out of the sources, ${byCountry.toFixed(3)} into the countries`);
  if (flows.length !== SOURCES.length * countries.length) throw new Error(`expected ${SOURCES.length * countries.length} flows, built ${flows.length}`);
  const biggest = sources.slice().sort((a, b) => b.total - a.total)[0];
  if (biggest.key !== "Nuclear") throw new Error(`the headline says nuclear is the largest source; it is ${biggest.label}`);
  const holderFlow = flows.filter((f) => f.from === biggest.key).sort((a, b) => b.value - a.value)[0];
  const share = holderFlow.value / biggest.total;
  if (!(share >= 0.8)) throw new Error(`the headline says one country holds four fifths of nuclear; ${holderFlow.to} holds ${(share * 100).toFixed(1)} %`);
  const holder = countries.find((c) => c.key === holderFlow.to);

  // THE VIDEO'S DERIVED VALUE: on the country's rail its ribbons stack in the sources' order, so its nuclear band starts
  // after the sources above nuclear — the band the nuclear bar is laid against.
  const before = SOURCES.slice(0, SOURCES.findIndex((s) => s.key === biggest.key)).map((s) => s.key);
  const bandStart = sumOf(flows.filter((f) => f.to === holder.key && before.includes(f.from)));
  if (!(bandStart + holderFlow.value <= holder.total + 1e-9)) throw new Error("the nuclear band does not fit inside its country's node");
  // The copy lands in the country's order, so the country must be the first nuclear ribbon on the source's own rail.
  if (countries[0].key !== holder.key) throw new Error(`${holder.label} is not the first country on the rail, so its ribbon is not the top of the nuclear bar`);
  return { sources, countries, flows, grand, biggest, holder, holderFlow, share, bandStart, rest: biggest.total - holderFlow.value };
}
