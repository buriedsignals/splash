// THE SUBJECT OF `static-parallel-coordinates-electricity-mix`, LOADED AND ASSERTED — sixteen mixes on seven axes, 2024:
// the static beat's own derivation and checks (its runner runs them inline and exports nothing), read from its frozen
// file. Plus what the video derives: each country's rest (the sources on no axis), and the shared ceiling.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-parallel-coordinates-electricity-mix");
export const YEAR = "2024";
/** The static's order: nuclear beside wind, because the crossing between them is the claim; fossil last. */
export const AXES = [
  { key: "nuclear_generation__twh", name: "Nucléaire" },
  { key: "wind_generation__twh", name: "Éolien" },
  { key: "solar_generation__twh", name: "Solaire" },
  { key: "hydro_generation__twh", name: "Hydraulique" },
  { key: "bioenergy_stacked_generation__twh", name: "Bioénergie" },
  { key: "gas_generation__twh", name: "Gaz" },
  { key: "coal_generation__twh", name: "Charbon" },
];
const ALL_SOURCES = [...AXES.map((a) => a.key), "oil_generation__twh", "other_renewables_generation__twh"];
export const NUCLEAR_FLOOR = 25;
export const WIND_FLOOR = 20;
/** The country whose bar stands up first: one of the two the title is about. */
export const SHOWN = "FIN";
const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède", ITA: "Italie", FIN: "Finlande",
  AUT: "Autriche", NLD: "Pays-Bas", BEL: "Belgique", POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark",
  GRC: "Grèce", IRL: "Irlande",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (n) => header.indexOf(n);
  for (const k of ALL_SOURCES) if (at(k) < 0) throw new Error(`the frozen file has no column ${k}`);
  const lines = csv
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => c[at("year")] === YEAR)
    .map((c) => {
      const code = c[at("code")];
      if (!NAMES[code]) throw new Error(`${code} has no French name filed`);
      const total = ALL_SOURCES.reduce((s, k) => s + Number(c[at(k)]), 0);
      if (!(total > 0)) throw new Error(`${code} reports no generation at all in ${YEAR}`);
      const values = AXES.map((a) => (Number(c[at(a.key)]) / total) * 100);
      return { code, name: NAMES[code], values, rest: 100 - values.reduce((s, v) => s + v, 0) };
    });
  if (lines.length !== 16) throw new Error(`the title says sixteen countries; the file has ${lines.length} in ${YEAR}`);

  // THE STATIC'S CLAIMS, ASSERTED.
  const nuclearHeavy = lines.filter((l) => l.values[0] >= NUCLEAR_FLOOR);
  const windHeavy = lines.filter((l) => l.values[1] >= WIND_FLOOR);
  const both = nuclearHeavy.filter((l) => l.values[1] >= WIND_FLOOR);
  if (!(both.length >= 1 && both.length <= 3)) throw new Error(`the title names a handful of countries that clear both floors; ${both.length} do`);
  if (!(nuclearHeavy.length >= 3 && windHeavy.length >= 5)) throw new Error(`each floor has a real group behind it; ${nuclearHeavy.length} clear nuclear and ${windHeavy.length} wind`);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const xs = lines.map((l) => l.values[0]);
  const ys = lines.map((l) => l.values[1]);
  const mx = mean(xs);
  const my = mean(ys);
  const r = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
  if (!(r < -0.2)) throw new Error(`the two lean against each other; their correlation is ${r.toFixed(2)}`);

  // WHAT THE VIDEO ADDS.
  const shown = lines.find((l) => l.code === SHOWN);
  if (!both.includes(shown)) throw new Error(`the bar stood up first is one of the pair; ${SHOWN} is not`);
  for (const l of lines) if (!(l.rest >= -1e-9)) throw new Error(`${l.code}'s seven axes sum past its whole`);
  const ceiling = Math.ceil(Math.max(...lines.flatMap((l) => l.values)) / 10) * 10;
  return { lines, nuclearHeavy, windHeavy, both, r, shown, ceiling };
}
