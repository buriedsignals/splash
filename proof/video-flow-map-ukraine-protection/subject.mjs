// THE SUBJECT OF `static-flow-map-ukraine-protection`, LOADED AND ASSERTED — the static beat's own three checks.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-flow-map-ukraine-protection");
export const ORIGIN = "UKR";
export const SUBJECT = "DEU";
/** The static beat's rule for the camera and the names: the ten largest hosts. */
export const FOCUS_HOSTS = 10;
export const NAMES = {
  DEU: "Allemagne", POL: "Pologne", CZE: "Tchéquie", ESP: "Espagne", ROU: "Roumanie", SVK: "Slovaquie", NLD: "Pays-Bas",
  IRL: "Irlande", BEL: "Belgique", AUT: "Autriche", NOR: "Norvège", BGR: "Bulgarie", CHE: "Suisse", FIN: "Finlande",
  PRT: "Portugal", FRA: "France", DNK: "Danemark", LTU: "Lituanie", HUN: "Hongrie", SWE: "Suède", GRC: "Grèce",
  ITA: "Italie", LVA: "Lettonie", EST: "Estonie", HRV: "Croatie", CYP: "Chypre", SVN: "Slovénie", ISL: "Islande",
  LUX: "Luxembourg", MLT: "Malte", LIE: "Liechtenstein",
};

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const csv = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const header = csv[0].split(",");
  const at = (n) => header.indexOf(n);
  const flows = csv.slice(1).map((l) => {
    const c = l.split(",");
    return { code: c[at("code")], month: c[at("month")], people: Number(c[at("people")]) };
  });
  for (const f of flows) {
    if (!NAMES[f.code]) throw new Error(`${f.code} has no French name filed in this beat`);
    if (!(Number.isFinite(f.people) && f.people > 0)) throw new Error(`a flow has no usable count: ${JSON.stringify(f)}`);
  }
  const month = flows[0].month;
  if (flows.some((f) => f.month !== month)) throw new Error("the video draws one month and the file holds more than one");
  const total = flows.reduce((s, f) => s + f.people, 0);
  const ranked = [...flows].sort((a, b) => b.people - a.people);
  const topTwoShare = ((ranked[0].people + ranked[1].people) / total) * 100;
  if (ranked[0].code !== SUBJECT) throw new Error(`the subject is the largest host; that is ${ranked[0].code}, not ${SUBJECT}`);
  if (!(topTwoShare > 45 && topTwoShare < 55)) throw new Error(`the video says the two largest hosts take about half; they take ${topTwoShare.toFixed(1)} %`);
  if (!(total > 4e6)) throw new Error(`the title says over four million; the file totals ${total}`);
  const geo = JSON.parse(readFileSync(join(dir, "shapes.geojson"), "utf8"));
  return { ranked, total, topTwo: ranked.slice(0, 2).map((f) => f.code), topTwoShare, month, geo };
}
