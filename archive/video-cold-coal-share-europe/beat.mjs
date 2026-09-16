// THE SUBJECT, READ FROM THE FROZEN DATA OF `proof/static-heatmap-coal-share-europe` — the twelve EU-27-plus-UK
// countries where coal supplied the largest share of electricity in 2010, one reading per country per year,
// 2010–2024 (Ember, via Our World in Data). Every number the video states is derived and asserted here.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const SOURCE_DIR = join(import.meta.dir, "..", "static-heatmap-coal-share-europe");
export const FIRST = 2010;
export const LAST = 2024;
export const YEARS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
/** The classes: under 10 %, 10–25, 25–50, 50–75, 75 % and more. The claim's borne is half. */
export const BREAKS = Object.freeze([10, 25, 50, 75]);
export const HALF = 50;
/** The subject, and the two study countries it borders. Slovakia and Lithuania border it too and are outside the twelve. */
export const SUBJECT = "POL";
export const NEIGHBOURS = Object.freeze(["DEU", "CZE"]);

export const FRENCH = Object.freeze({
  BGR: "Bulgarie", CZE: "Tchéquie", DEU: "Allemagne", DNK: "Danemark", FIN: "Finlande", GBR: "Royaume-Uni",
  GRC: "Grèce", HUN: "Hongrie", NLD: "Pays-Bas", POL: "Pologne", ROU: "Roumanie", SVN: "Slovénie",
});

export const classOf = (v) => BREAKS.filter((b) => v >= b).length;

export function loadSubject() {
  const rows = readFileSync(join(SOURCE_DIR, "data.csv"), "utf8").trim().split("\n").slice(1).map((line) => {
    const [entity, iso, year, coal] = line.split(",");
    return { entity, iso, year: Number(year), coal: Number(coal) };
  });
  const byIso = new Map();
  for (const r of rows) {
    if (!FRENCH[r.iso]) throw new Error(`the frozen data carries ${r.entity} (${r.iso}), which is not one of the twelve`);
    if (!Number.isFinite(r.coal)) throw new Error(`${r.iso} ${r.year}: no reading`);
    if (!byIso.has(r.iso)) byIso.set(r.iso, new Map());
    byIso.get(r.iso).set(r.year, r.coal);
  }
  if (byIso.size !== 12) throw new Error(`the twelve are ${byIso.size}`);
  for (const [iso, series] of byIso)
    for (const y of YEARS) if (!series.has(y)) throw new Error(`${iso} has no reading for ${y}: a choropleth would draw the hole as bare land`);
  const share = (iso, year) => byIso.get(iso).get(year);
  const aboveHalf = (year) => [...byIso.keys()].filter((iso) => share(iso, year) >= HALF);
  return { studySet: [...byIso.keys()], share, aboveHalf, countByYear: YEARS.map((y) => aboveHalf(y).length) };
}

/** The claim, measured: every one of the twelve fell; three were above half in 2010, only Poland in 2024; of its two
 *  study neighbours, Czechia crossed under half and Germany was never above it. */
export function assertClaim(subject) {
  const { studySet, share, aboveHalf } = subject;
  const rose = studySet.filter((iso) => !(share(iso, LAST) < share(iso, FIRST)));
  if (rose.length) throw new Error(`the title says coal fell in all twelve; it did not in ${rose.join(", ")}`);
  const first = aboveHalf(FIRST).sort();
  if (first.join() !== "CZE,GRC,POL") throw new Error(`2010 above half should be Czechia, Greece, Poland; the data gives ${first.join(", ")}`);
  const last = aboveHalf(LAST);
  if (last.join() !== SUBJECT) throw new Error(`the title says only Poland is above half in 2024; the data gives ${last.join(", ") || "none"}`);
  if (!(share("CZE", FIRST) >= HALF && share("CZE", LAST) < HALF)) throw new Error("Czechia should cross under half");
  if (!(share("DEU", FIRST) < HALF)) throw new Error("Germany should start under half");
  return { first, last };
}
