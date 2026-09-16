// THE SUBJECT OF `static-swiss-age-pyramid`, LOADED AND ASSERTED — Switzerland's residents in 2023 by sex and five-year
// band, foot first, and the band where the two halves change places, found by the same `beatFacts` the directed still
// runs (`render-directions.mjs` there runs it inline and exports nothing).
//
// Runs in Bun only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts } from "#shared/chart-beat/treatments.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const STATIC_DIR = join(HERE, "..", "static-swiss-age-pyramid");
export const YEAR = 2023;
export const BANDS = 21;
/** The 21 bands' total, checked in the static beat against OWID's own population file (8 870 564, four off from rounding). */
export const TOTAL = 8870560;
export const CROSSING = "60-64";

export function loadSubject({ dir = STATIC_DIR } = {}) {
  const lines = readFileSync(join(dir, "data.csv"), "utf8").trim().split(/\r?\n/);
  const bands = lines.slice(1).map((l) => {
    const [band, male, female, year] = l.split(",");
    const row = { band, male: Number(male), female: Number(female) };
    if (Number(year) !== YEAR || !Number.isInteger(row.male) || !Number.isInteger(row.female)) throw new Error(`band ${band} is not a ${YEAR} reading of both sexes`);
    return row;
  });
  if (bands.length !== BANDS) throw new Error(`${BANDS} bands; the file gives ${bands.length}`);
  const total = bands.reduce((t, b) => t + b.male + b.female, 0);
  if (total !== TOTAL) throw new Error(`the bands sum to ${total}, not ${TOTAL}`);
  const facts = beatFacts(
    bands.map((b) => ({ key: b.band, label: b.band, value: b.male + b.female })),
    { subject: "Suisse", namedSeries: ["Hommes", "Femmes"], mirrored: bands.map((b) => ({ key: b.band, left: b.male, right: b.female })) },
  );
  if (facts.mirrorCrossingKey !== CROSSING) throw new Error(`the title says the halves cross at ${CROSSING}; the data says ${facts.mirrorCrossingKey}`);
  const at = bands.findIndex((b) => b.band === CROSSING);
  // The title's sentence holds only if the halves never cross back: men ahead in every band below, women in every band from.
  bands.forEach((b, i) => {
    if (i < at ? !(b.male > b.female) : !(b.female > b.male)) throw new Error(`${b.band} breaks the crossing: ${b.male} men, ${b.female} women`);
  });
  return { bands, crossing: at };
}
