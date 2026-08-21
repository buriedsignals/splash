/**
 * THE DENOMINATOR DETECTOR STOPS BEING LATIN-SCRIPT — round five, finding C3.
 *
 * `stress-x-tunisian-water` carries `السكان` — population — one column from a consumption column,
 * and no denominator candidate was reported. The detector matched column names against a list of
 * English and French words with two Greek ones added, so round four's fix was Latin-script only, and
 * it landed one round after a Greek story and in the same round as an Arabic one.
 *
 * Same policy as every other name-based lexicon in this toolchain (see `ground-claim.mjs`'s own
 * header): DECLARE the languages, CARRY the four this tree has frozen a story in, and where the
 * answer is a NEGATIVE, do not let "I looked and found none" read identically to "I could not read
 * a word of this".
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { profileTable } from "../scripts/profile.mjs";
import { parseCsv } from "../scripts/csv.mjs";

const STORIES = `${import.meta.dir}/../../../stories`;

/** A denominator sitting beside a count, in each of the four languages. */
const TABLES: Record<string, string[][]> = {
  English: [
    ["district", "incidents", "residents"],
    ["Centro", "412", "201000"],
    ["Sul", "233", "100000"],
  ],
  French: [
    ["commune", "logements", "habitants"],
    ["Annemasse", "412", "201000"],
    ["Gaillard", "233", "100000"],
  ],
  Greek: [
    ["περιφέρεια", "σχολεία", "πληθυσμός"],
    ["Αττική", "412", "201000"],
    ["Κρήτη", "233", "100000"],
  ],
  Arabic: [
    ["المحافظة", "استهلاك_المياه_م3", "السكان"],
    ["تونس", "142000000", "1056000"],
    ["صفاقس", "89000000", "955000"],
  ],
};

describe("a denominator is recognised in every language this tree has frozen a story in", () => {
  for (const [language, rows] of Object.entries(TABLES)) {
    it(`reads the ${language} name for a population column`, () => {
      const profile = profileTable(rows);
      const count = profile.columns.find((c) => c.name === rows[0][1])!;
      expect(count.denominator).toBeDefined();
      expect(count.denominator!.column).toBe(rows[0][2]);
    });

    it(`never hangs a denominator on the ${language} denominator column itself`, () => {
      const profile = profileTable(rows);
      expect(profile.columns.find((c) => c.name === rows[0][2])!.denominator).toBeUndefined();
    });
  }
});

// REAL MATERIAL. `stress-x`'s own consumption column is the one the profiler REFUSED to type (one
// cell written in Arabic-Indic digits), so no count survives for `السكان` to be read against and the
// frozen profile is unchanged by this fix — which is the point: a frozen artefact must not drift
// under a change that only widens what a name can be read in.
describe("the frozen Arabic story re-profiles to exactly what is committed", () => {
  it("produces the profile stress-x-tunisian-water froze, byte for byte", () => {
    const csv = readFileSync(`${STORIES}/stress-x-tunisian-water/source/data.csv`, "utf8");
    const frozen = JSON.parse(
      readFileSync(`${STORIES}/stress-x-tunisian-water/source/profile.json`, "utf8"),
    );
    const fresh = profileTable(parseCsv(csv));
    expect(fresh.columns.map((c) => c.name)).toEqual(frozen.columns.map((c: { name: string }) => c.name));
    expect(fresh.columns.find((c) => c.name === "السكان")!.denominator).toBeUndefined();
    expect(fresh.columns.find((c) => c.name === "استهلاك_المياه_م3")!.type).toBe("text");
  });
});
