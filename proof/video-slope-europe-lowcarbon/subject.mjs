// THE SUBJECT OF `static-slope-europe-lowcarbon`, LOADED AND ASSERTED — the static beat's own checks, against all sixteen.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-slope-europe-lowcarbon");
export const FROM = 2000;
export const TO = 2024;
export const OVERTOOK = "Finland";
export const OVERTAKEN = "France";
const RENEWABLE = ["hydro_generation__twh", "wind_generation__twh", "solar_generation__twh", "bioenergy_stacked_generation__twh", "other_renewables_generation__twh"];
const NUCLEAR = "nuclear_generation__twh";
const FOSSIL = ["gas_generation__twh", "coal_generation__twh", "oil_generation__twh"];
const ALL = [...RENEWABLE, NUCLEAR, ...FOSSIL];
export const FRENCH = {
  Austria: "Autriche", Belgium: "Belgique", Czechia: "Tchéquie", Denmark: "Danemark", Finland: "Finlande", France: "France",
  Germany: "Allemagne", Greece: "Grèce", Ireland: "Irlande", Italy: "Italie", Netherlands: "Pays-Bas", Poland: "Pologne",
  Portugal: "Portugal", Spain: "Espagne", Sweden: "Suède", "United Kingdom": "Royaume-Uni",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const rows = csv.slice(1).map((l) => Object.fromEntries(header.map((h, i) => [h, l.split(",")[i]])));
  const lowCarbonOf = (raw) => {
    const total = ALL.reduce((s, k) => s + Number(raw[k] || 0), 0);
    if (!(total > 0)) throw new Error(`${raw.entity} reports no generation in ${raw.year}`);
    return ([...RENEWABLE, NUCLEAR].reduce((s, k) => s + Number(raw[k] || 0), 0) / total) * 100;
  };
  const lines = [...new Set(rows.map((r) => r.entity))].sort().map((entity) => {
    if (!FRENCH[entity]) throw new Error(`no French name recorded for ${entity}`);
    const a = rows.find((r) => r.entity === entity && Number(r.year) === FROM);
    const b = rows.find((r) => r.entity === entity && Number(r.year) === TO);
    if (!a || !b) throw new Error(`${entity} is missing ${FROM} or ${TO}`);
    const from = lowCarbonOf(a);
    const to = lowCarbonOf(b);
    return { key: entity, label: FRENCH[entity], from, to, delta: to - from };
  });
  const fell = lines.filter((d) => d.delta <= 0);
  if (fell.length) throw new Error(`the title says all ${lines.length} rose; ${fell.map((d) => d.label).join(", ")} did not`);
  const climber = lines.find((d) => d.key === OVERTOOK);
  const held = lines.find((d) => d.key === OVERTAKEN);
  if (!(climber.from < held.from && climber.to > held.to)) throw new Error(`the title says ${climber.label} overtook ${held.label}; it did not`);
  const alsoPassed = lines.filter((d) => d.key !== OVERTAKEN && d.from < held.from && d.to > held.to);
  if (alsoPassed.length !== 1 || alsoPassed[0].key !== OVERTOOK) throw new Error(`the title says ${climber.label} is the only country to pass ${held.label}; ${alsoPassed.map((d) => d.label).join(", ")} did`);
  // Where the two lines cross, as a share of the way from one rail to the other.
  const crossAt = (held.from - climber.from) / (climber.to - climber.from - (held.to - held.from));
  return { lines, climber, held, crossAt, crossValue: climber.from + (climber.to - climber.from) * crossAt };
}
