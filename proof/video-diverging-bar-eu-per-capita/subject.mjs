// THE SUBJECT OF `static-diverging-bar-eu-per-capita`, LOADED AND ASSERTED — the change in CO₂ per person between 1990 and
// 2024 in the 27 member states, read with the static beat's own `changesBetween`, and its "the only" claim re-run.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { changesBetween } from "../static-diverging-bar-eu-per-capita/render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-diverging-bar-eu-per-capita");
export const FROM = 1990;
export const TO = 2024;
export const MEMBERS = 27;
export const FRENCH = {
  Croatia: "Croatie", Cyprus: "Chypre", Portugal: "Portugal", Spain: "Espagne", Slovenia: "Slovénie", Austria: "Autriche", Italy: "Italie",
  Poland: "Pologne", Greece: "Grèce", Hungary: "Hongrie", France: "France", Ireland: "Irlande", Sweden: "Suède", Malta: "Malte",
  Latvia: "Lettonie", Bulgaria: "Bulgarie", Romania: "Roumanie", Netherlands: "Pays-Bas", Belgium: "Belgique", Lithuania: "Lituanie",
  Denmark: "Danemark", Finland: "Finlande", Slovakia: "Slovaquie", Germany: "Allemagne", Czechia: "Tchéquie", Estonia: "Estonie",
  Luxembourg: "Luxembourg",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const changes = changesBetween(readFileSync(join(dir, "data.csv"), "utf8"), FROM, TO);
  if (changes.length !== MEMBERS) throw new Error(`expected the ${MEMBERS} member states with a reading in both ${FROM} and ${TO}, got ${changes.length}`);
  for (const c of changes) if (!FRENCH[c.country]) throw new Error(`${c.country} has no French name filed in this beat`);
  const rose = changes.filter((r) => r.change > 0);
  const fell = changes.filter((r) => r.change < 0);
  if (rose.length !== 1 || fell.length !== MEMBERS - 1) throw new Error(`the title says exactly one rose and ${MEMBERS - 1} fell; the data says ${rose.length} and ${fell.length}`);
  return { rows: changes.map((c) => ({ key: c.country, name: FRENCH[c.country], from: c.from, to: c.to, change: c.change })), subject: rose[0].country, falls: fell.length };
}
