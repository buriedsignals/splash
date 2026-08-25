/**
 * THE NAME-BASED LEXICONS STOP BEING ENGLISH — round five, findings X1 and C3.
 *
 * Every lexicon in this toolchain that decides something by matching WORDS was written against the
 * language its first story happened to be in. The tree has since frozen a Greek story and an Arabic
 * one, and three of this skill's own decisions could not read either:
 *
 *   · `groundTakeaway`'s superlative/comparison vocabulary — `stress-x-tunisian-water`'s takeaway
 *     asserts `أكثر من غيرها` ("more than any other"), and THE ONE THING that beat asserts produced
 *     no claim at all. Not a wrong answer: no answer, and nothing said so.
 *   · `isShareColumn` — a Greek or Arabic percentage column with no `%` unit is invisible, and it is
 *     the sole gate on the totality shape.
 *   · the denominator note beside a count — `stress-x` carries `السكان` (population) one column from
 *     a consumption column and no denominator was reported.
 *
 * THE POLICY THESE TESTS DRIVE, one policy for all six lexicons in this toolchain: a name-based
 * lexicon DECLARES the languages it reads, carries entries for every language this tree has frozen
 * a story in, and when the text it is handed is written in a script none of those languages uses it
 * does not return a silent negative — it NAMES the script it could not read. A silent miss is the
 * defect; a stated one is not.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { groundTakeaway, LEXICON_LANGUAGES, scriptsNotRead } from "../scripts/ground-claim.mjs";

const STORIES = `${import.meta.dir}/../../../stories`;

/** `stress-x-tunisian-water`, exactly as frozen: its own profile, its own CSV, its own takeaway. */
function stressX() {
  const profile = JSON.parse(readFileSync(`${STORIES}/stress-x-tunisian-water/source/profile.json`, "utf8"));
  const csv = readFileSync(`${STORIES}/stress-x-tunisian-water/source/data.csv`, "utf8");
  const storyboard = readFileSync(`${STORIES}/stress-x-tunisian-water/STORYBOARD.md`, "utf8");
  const takeaway = /takeaway: "([^"]+)"/.exec(storyboard)![1];
  return { profile, csv, takeaway };
}

describe("the claim vocabulary reads the languages this tree has frozen a story in", () => {
  // THE ACCEPTANCE CASE. `stress-x`'s beat asserts one thing — Tunis governorate consumes more water
  // than any other — and the check never saw the claim.
  it("sees the superlative in stress-x-tunisian-water's own Arabic takeaway", () => {
    const { profile, csv, takeaway } = stressX();
    const { claims } = groundTakeaway(takeaway, profile, { csv });
    const superlative = claims.find((c) => c.claim.includes("أكثر"));
    expect(superlative).toBeDefined();
  });

  // …and says WHY it cannot settle it, rather than reporting nothing. The consumption column is the
  // one the profiler refused to type (one cell written in Arabic-Indic digits), so the honest answer
  // names that column instead of deciding the claim against the population column beside it.
  it("answers that superlative by naming the column the profiler refused", () => {
    const { profile, csv, takeaway } = stressX();
    const { claims } = groundTakeaway(takeaway, profile, { csv });
    const superlative = claims.find((c) => c.claim.includes("أكثر"))!;
    expect(superlative.verdict).toBe("unverifiable");
    expect(superlative.detail).toContain("استهلاك_المياه_م3");
  });

  it("reads a French superlative — the second language this tree ships in", () => {
    const profile = {
      columns: [
        { name: "canton", type: "text" },
        { name: "chomage_pct", type: "number", min: 2.1, max: 5.4, sum: 21.3 },
      ],
      rows: [
        { canton: "Neuchatel", chomage_pct: 5.4 },
        { canton: "Zurich", chomage_pct: 2.1 },
      ],
    };
    const { claims } = groundTakeaway("Neuchatel a le taux de chomage le plus eleve des cantons.", profile);
    expect(claims.some((c) => c.verdict === "supported")).toBe(true);
  });

  it("reads a Greek superlative", () => {
    const profile = {
      columns: [
        { name: "perifereia", type: "text" },
        { name: "sxoleia", type: "number", min: 100, max: 400, sum: 500 },
      ],
      rows: [
        { perifereia: "Attiki", sxoleia: 400 },
        { perifereia: "Kriti", sxoleia: 100 },
      ],
    };
    const { claims } = groundTakeaway("Η Attiki έχει τα περισσότερα σχολεία.", profile);
    expect(claims.length).toBeGreaterThan(0);
  });

  // THE OTHER HALF OF THE POLICY. A lexicon that has been taught four languages still meets a fifth.
  // What it may not do is answer "nothing here is a claim" in silence.
  it("names a script it has no vocabulary for, instead of reporting a clean nothing", () => {
    const { coverage } = groundTakeaway("Москва потребляет больше всех.", { columns: [] });
    expect(coverage.unreadable).toContain("Cyrillic");
  });

  it("names no script when the takeaway is written in one it reads", () => {
    const { coverage } = groundTakeaway("Tunis consumes the most.", { columns: [] });
    expect(coverage.unreadable).toEqual([]);
  });

  // NOTHING IN THE TREE REACHES THIS BRANCH TODAY. `stress-x` is the only Arabic story frozen here
  // and the column its takeaway is about is the one the profiler refused to type, so the claim is
  // answered before an entity is ever needed. What would reach it: an Arabic (or Hebrew, or CJK)
  // story whose measure column types cleanly. The profile below is that story, written out.
  it("resolves the entity of an Arabic superlative from the frozen table, having no case to read", () => {
    const profile = {
      columns: [
        { name: "المحافظة", type: "text" },
        { name: "السكان", type: "number", min: 374000, max: 1056000, sum: 4984000 },
      ],
      rows: [
        { "المحافظة": "تونس", "السكان": 1056000 },
        { "المحافظة": "صفاقس", "السكان": 955000 },
      ],
    };
    const { claims } = groundTakeaway("محافظة تونس هي الأكبر من حيث السكان.", profile);
    const superlative = claims.find((c) => c.claim.includes("الأكبر"))!;
    expect(superlative.verdict).toBe("supported");
    expect(superlative.detail).toContain("تونس");
  });

  it("declares its languages, so the limit is readable without running it", () => {
    expect(LEXICON_LANGUAGES).toEqual(["English", "French", "Greek", "Arabic"]);
    expect(scriptsNotRead("مرحبا")).toEqual([]);
    expect(scriptsNotRead("שלום")).toEqual(["Hebrew"]);
  });
});

describe("isShareColumn reads a share column named in any of the four", () => {
  const totality = (columnName: string) =>
    groundTakeaway("Together these make up the whole of national supply.", {
      columns: [
        { name: "region", type: "text" },
        { name: columnName, type: "number", min: 10, max: 60, sum: 100 },
      ],
    }).claims[0];

  it("reads an English share column, as it always has", () => {
    expect(totality("supply_pct").verdict).toBe("supported");
  });

  it("reads a Greek share column with no % unit", () => {
    expect(totality("ποσοστό").verdict).toBe("supported");
  });

  it("reads an Arabic share column with no % unit", () => {
    expect(totality("النسبة").verdict).toBe("supported");
  });

  it("reads a French share column with no % unit", () => {
    expect(totality("pourcentage").verdict).toBe("supported");
  });

  // The stated miss: no share column found is now reported WITH the languages the lexicon reads and
  // the columns it read, so a journalist can see whether the answer is "no such column" or "a column
  // this decision could not name".
  it("says which languages it read the column names in when it finds none", () => {
    const claim = totality("consumption");
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("English, French, Greek and Arabic");
  });
});
