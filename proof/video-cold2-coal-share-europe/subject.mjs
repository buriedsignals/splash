// THE SUBJECT OF `static-heatmap-coal-share-europe`, READ FROM ITS FROZEN DATA — and ASSERTED: every number the title
// and the gestures state is derived from the rows here, never typed.
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const STATIC_DIR = join(import.meta.dir, "../static-heatmap-coal-share-europe");
export const DATA_FILE = join(STATIC_DIR, "data.csv");

export const FIRST_YEAR = 2010;
export const LAST_YEAR = 2024;
/** The half the title names. */
export const HALF = 50;
/** The class bornes, in % of electricity. */
export const BREAKS = Object.freeze([10, 25, 50, 75]);
/** The close-up: the subject and the two neighbours the camera frames with it. */
export const SUBJECT = "POL";
export const NEIGHBOURS = Object.freeze(["CZE", "DEU"]);
/** ISO A3 → MapTiler Countries' `iso_a2`. */
export const ISO2 = Object.freeze({ BGR: "BG", CZE: "CZ", DNK: "DK", FIN: "FI", DEU: "DE", GRC: "GR", HUN: "HU", NLD: "NL", POL: "PL", ROU: "RO", SVN: "SI", GBR: "GB" });
/** The French names the overlay sets. */
export const NAME_FR = Object.freeze({ POL: "Pologne", CZE: "Tchéquie", DEU: "Allemagne" });

/** The frozen rows as read: a CSV's rows as objects of strings (no quoted commas). */
export function readRows(path = DATA_FILE) {
  const [header, ...lines] = readFileSync(path, "utf8").trim().split(/\r?\n/);
  const names = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, i) => [names[i], value])));
}

export const classOf = (share) => BREAKS.filter((b) => share >= b).length;

export function loadSubject() {
  const rows = readRows();
  const years = Array.from({ length: LAST_YEAR - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  const byCode = new Map();
  for (const r of rows) {
    const share = Number(r.Coal);
    if (!Number.isFinite(share)) throw new Error(`${r.Code} ${r.Year}: no reading`);
    if (!byCode.has(r.Code)) byCode.set(r.Code, { code: r.Code, name: r.Entity, shares: new Map() });
    byCode.get(r.Code).shares.set(Number(r.Year), share);
  }
  const countries = [...byCode.values()].map((c) => {
    const series = years.map((y) => {
      if (!c.shares.has(y)) throw new Error(`${c.code}: no reading for ${y}`);
      return c.shares.get(y);
    });
    if (!ISO2[c.code]) throw new Error(`${c.code}: no iso_a2 declared`);
    return { code: c.code, iso2: ISO2[c.code], name: c.name, series, classes: series.map(classOf) };
  });
  const aboveHalf = years.map((_, i) => countries.filter((c) => c.series[i] >= HALF).length);
  return { years, countries, aboveHalf };
}

/** The claim, measured: throws when the rows stop supporting a sentence the video says or shows. */
export function assertClaim(subject) {
  const { years, countries, aboveHalf } = subject;
  const last = years.length - 1;
  if (countries.length !== 12) throw new Error(`the video shows twelve countries; the rows carry ${countries.length}`);
  const rose = countries.filter((c) => !(c.series[last] < c.series[0]));
  if (rose.length) throw new Error(`the title says coal fell in all twelve; it did not in ${rose.map((c) => c.code).join(", ")}`);
  const stillAbove = countries.filter((c) => c.series[last] >= HALF).map((c) => c.code);
  if (stillAbove.join() !== SUBJECT) throw new Error(`the title says only Poland is still above half in ${LAST_YEAR}; the rows say ${stillAbove.join(", ") || "none"}`);
  if (aboveHalf[0] !== 3 || aboveHalf[last] !== 1) throw new Error(`the count steps 3 to 1; the rows count ${aboveHalf[0]} to ${aboveHalf[last]}`);
  const byCode = Object.fromEntries(countries.map((c) => [c.code, c]));
  const cze = byCode.CZE.series;
  if (!(cze[0] >= HALF && cze[last] < HALF)) throw new Error("the close-up shows Czechia crossing the half; the rows do not");
  if (!byCode.DEU.series.every((s) => s < HALF)) throw new Error("the close-up shows Germany under the half throughout; the rows do not");
  return { stillAbove, from: aboveHalf[0], to: aboveHalf[last] };
}
