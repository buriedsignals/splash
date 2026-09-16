// THE SUBJECT OF `static-connected-scatter-lowcarbon`, LOADED AND ASSERTED — sixteen countries at 2000 and 2024, each one's
// weight in the group's low-carbon electricity and the low-carbon share of its own, the static beat's own derivation
// (`render-directions.mjs` there runs it inline and exports nothing), read from its frozen file.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-connected-scatter-lowcarbon");
export const SUBJECT = "FRA";
export const FROM = "2000";
export const TO = "2024";
const LOW_CARBON = ["other_renewables_generation__twh", "bioenergy_stacked_generation__twh", "solar_generation__twh", "wind_generation__twh", "hydro_generation__twh", "nuclear_generation__twh"];
const FOSSIL = ["gas_generation__twh", "oil_generation__twh", "coal_generation__twh"];
export const NAMES = {
  FRA: "France", DEU: "Allemagne", ESP: "Espagne", GBR: "Royaume-Uni", SWE: "Suède", ITA: "Italie", FIN: "Finlande", AUT: "Autriche",
  NLD: "Pays-Bas", BEL: "Belgique", POL: "Pologne", CZE: "Tchéquie", PRT: "Portugal", DNK: "Danemark", GRC: "Grèce", IRL: "Irlande",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (name) => header.indexOf(name);
  const byCode = {};
  for (const l of csv.slice(1)) {
    const c = l.split(",");
    const lc = LOW_CARBON.reduce((s, k) => s + Number(c[at(k)]), 0);
    const total = lc + FOSSIL.reduce((s, k) => s + Number(c[at(k)]), 0);
    if (!c[at("code")] || !Number.isFinite(lc) || !(total > 0)) throw new Error(`a reading has no usable generation: ${l}`);
    (byCode[c[at("code")]] ??= {})[c[at("year")]] = { lc, total };
  }
  const codes = Object.keys(byCode);
  for (const c of codes) {
    if (!byCode[c][FROM] || !byCode[c][TO]) throw new Error(`${c} is not read at both ${FROM} and ${TO}`);
    if (!NAMES[c]) throw new Error(`${c} has no French name filed in this beat`);
  }
  const group = (year) => codes.reduce((s, c) => s + byCode[c][year].lc, 0);
  const totals = { [FROM]: group(FROM), [TO]: group(TO) };
  const entities = codes.map((code) => {
    const state = (year) => ({ weight: (byCode[code][year].lc / totals[year]) * 100, ownMix: (byCode[code][year].lc / byCode[code][year].total) * 100 });
    const from = state(FROM);
    const to = state(TO);
    return { code, name: NAMES[code], from, to, lighter: to.weight < from.weight, grew: byCode[code][TO].lc > byCode[code][FROM].lc };
  });

  // THE CLAIM, ASSERTED — the static beat's own checks, and the scrolly's.
  const cleaner = entities.filter((e) => e.to.ownMix > e.from.ownMix);
  if (cleaner.length !== entities.length) throw new Error(`the title says every country cleaned up at home; ${entities.length - cleaner.length} did not`);
  const lighter = entities.filter((e) => e.lighter).sort((a, b) => a.to.weight - a.from.weight - (b.to.weight - b.from.weight));
  if (!(lighter.length >= 4 && lighter.length < entities.length / 2)) throw new Error(`the title says a minority weighs less in the group; ${lighter.length} of ${entities.length} do`);
  const subject = entities.find((e) => e.code === SUBJECT);
  if (!subject) throw new Error(`the subject ${SUBJECT} is not in the data`);
  const moves = { weight: subject.to.weight - subject.from.weight, ownMix: subject.to.ownMix - subject.from.ownMix };
  if (!(moves.weight < -5 && moves.ownMix > 0 && subject.grew)) throw new Error(`the video shows ${SUBJECT} cleaner at home, producing more and lighter in the group; it moved ${moves.ownMix.toFixed(1)} and ${moves.weight.toFixed(1)}`);
  if (lighter[0].code !== SUBJECT) throw new Error(`the five are picked out largest loss first, France first; ${lighter[0].code} lost more`);
  /** The order the discs travel in: the largest clean-up first. */
  const arrivals = [...entities].sort((a, b) => b.to.ownMix - b.from.ownMix - (a.to.ownMix - a.from.ownMix)).map((e) => e.code);
  return { entities, lighter: lighter.map((e) => e.code), subject, moves, arrivals };
}
