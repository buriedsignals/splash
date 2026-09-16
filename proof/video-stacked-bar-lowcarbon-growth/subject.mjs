// THE SUBJECT OF `static-stacked-bar-lowcarbon-growth`, LOADED AND ASSERTED — low-carbon electricity in 2000 and 2024,
// stacked [level, growth], the twelve that added most of sixteen: the static beat's own derivation (its runner runs it
// inline and exports nothing), read from its frozen file. Plus what the video derives: the 2000 order, the order of gain,
// and how many copies of the adder's level lay end to end along the incumbent's.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-stacked-bar-lowcarbon-growth");
export const FROM = 2000;
export const TO = 2024;
export const DRAWN = 12;
export const ADDER = "Spain";
export const INCUMBENT = "France";
const CLEAN = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh", "nuclear_generation__twh"];
const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France", Germany: "Allemagne",
  Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne", Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède",
  "United Kingdom": "Royaume-Uni",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const raw = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
  const twh = (r) => CLEAN.reduce((s, k) => s + Number(r[k] || 0), 0);
  const all = [...new Set(raw.map((r) => r.entity))]
    .map((entity) => {
      const a = raw.find((r) => r.entity === entity && Number(r.year) === FROM);
      const b = raw.find((r) => r.entity === entity && Number(r.year) === TO);
      if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
      if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
      const level = twh(a);
      const total = twh(b);
      return { key: entity, name: FRENCH[entity], level, growth: total - level, total };
    })
    .sort((x, y) => y.growth - x.growth);

  // THE STATIC'S CLAIM, ASSERTED AS IT IS THERE.
  const shrank = all.filter((d) => d.growth <= 0);
  if (shrank.length) throw new Error(`${shrank.length} shrank, which a [level, growth] stack cannot draw — a negative segment is a waterfall or a diverging bar`);
  const adder = all.find((d) => d.key === ADDER);
  const incumbent = all.find((d) => d.key === INCUMBENT);
  if (all[0] !== adder) throw new Error(`the title says ${adder.name} added the most; ${all[0].name} did`);
  if (!(adder.growth > incumbent.growth)) throw new Error(`the title says ${adder.name} added more than ${incumbent.name}`);
  const headStart = incumbent.level / adder.level;
  if (!(headStart >= 4)) throw new Error(`${incumbent.name} started ${headStart.toFixed(2)}x higher, not several times`);
  if (all.reduce((a, b) => (b.total > a.total ? b : a)) !== incumbent) throw new Error(`${incumbent.name} is no longer the largest producer`);
  const rows = all.slice(0, DRAWN);
  for (const d of [adder, incumbent]) if (!rows.includes(d)) throw new Error(`${d.name} is not among the ${DRAWN} largest adders`);

  // THE VIDEO'S DERIVED VALUES. The copies: as many of the adder's level as lay along the incumbent's, their end within
  // 1 % of it — otherwise « ×N » would be a rounding, not a picture.
  const copies = Math.round(headStart);
  if (Math.abs(copies * adder.level - incumbent.level) / incumbent.level > 0.01)
    throw new Error(`${copies} copies of ${adder.name}'s level end ${(copies * adder.level).toFixed(1)} TWh, not within 1 % of ${incumbent.name}'s ${incumbent.level.toFixed(1)}`);
  const before = [...rows].sort((a, b) => b.level - a.level).map((d) => d.key);
  const byGain = rows.map((d) => d.key);
  return { rows, adder, incumbent, copies, before, byGain, omitted: all.slice(DRAWN) };
}
