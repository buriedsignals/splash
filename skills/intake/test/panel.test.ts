/**
 * THE SHAPE OF ESSENTIALLY ALL OPEN DATA, WHICH THIS PROFILER COULD NOT DESCRIBE.
 *
 * Three real stories were run end to end on Our World in Data panels — 3 900, 7 585 and 21 565 rows
 * of `entity, code, year, value` — and the frozen `profile.json` described every one of them as a
 * flat table of four columns. What it could not say:
 *
 *  - that the file is one row per entity per period, so `rowCount` is not a count of subjects;
 *  - that nine of the 260 "entities" in the wildfire file are AGGREGATES of the other rows (`World`,
 *    six continents, `European Union (27)`, `Europe (excl. Russia)`), so "where is the count
 *    heaviest" answered *the World*, then *Africa*, then a country;
 *  - that `year.gaps: []` over `[1900, 2025]` is a full RANGE and not full COVERAGE — the Ember file
 *    carries 245 entities in 2022 and 114 in 2025;
 *  - and it reported `year.sum = 7 874 100`, the total of a period column, as the largest-looking
 *    number in the profile.
 *
 * Every expectation below is measured off one of those three frozen files or off a fixture small
 * enough to check by hand.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { profileTable } from "../scripts/profile.mjs";
import { parseCsv } from "../scripts/csv.mjs";

const STORIES = `${import.meta.dir}/../../../stories`;

const read = (slug: string) =>
  profileTable(
    parseCsv(readFileSync(`${STORIES}/${slug}/source/data.csv`, "utf8")),
  );

/** Three entities, three years, one aggregate that is exactly the sum of the other two. */
const SMALL_PANEL = [
  ["region", "code", "year", "fires"],
  ["North", "NOR", "2020", "10"],
  ["North", "NOR", "2021", "12"],
  ["North", "NOR", "2022", "14"],
  ["South", "SOU", "2020", "20"],
  ["South", "SOU", "2021", "21"],
  ["South", "SOU", "2022", "22"],
  ["Whole country", "", "2020", "30"],
  ["Whole country", "", "2021", "33"],
  ["Whole country", "", "2022", "36"],
];

describe("the panel shape, decided from the data", () => {
  it("should name the entity column, the period column and how many of each", () => {
    const { panel } = profileTable(SMALL_PANEL);
    expect(panel.entity).toBe("region");
    expect(panel.period).toBe("year");
    expect(panel.entities).toBe(3);
    expect(panel.periods).toBe(3);
    expect(panel.rowsPerPeriod).toEqual({ min: 3, max: 3 });
    expect(panel.balanced).toBe(true);
  });

  it("should describe the wildfire file as 260 entities over 15 periods, not 3900 subjects", () => {
    // The frozen file: `rowCount` is 3900 and there are 260 entities. A producer reading `rowCount`
    // as a count of subjects draws 3900 marks.
    const { rowCount, panel } = read("real-gwis-wildfire-counts");
    expect(rowCount).toBe(3900);
    expect(panel.entity).toBe("entity");
    expect(panel.period).toBe("year");
    expect(panel.entities).toBe(260);
    expect(panel.periods).toBe(15);
    expect(panel.balanced).toBe(true);
  });

  it("should describe an UNBALANCED panel as unbalanced", () => {
    // Ember: 246 entities, 126 years, 7585 rows — 246 x 126 is 30 996, so most cells are absent.
    const { panel } = read("real-ember-renewables-share");
    expect(panel.entities).toBe(246);
    expect(panel.periods).toBe(126);
    expect(panel.balanced).toBe(false);
  });

  it("should not pick a key column that has a blank in it", () => {
    // `code` also keys the wildfire table — (code, year) is unique across all 3900 rows, because
    // the one entity with no code has exactly one row per year. A column with a blank identifies
    // nothing, so it must not be offered as the entity column.
    const { panel } = read("real-gwis-wildfire-counts");
    expect(panel.entity).not.toBe("code");
  });

  it("should skip a blank-carrying key column even when it comes FIRST", () => {
    // The same wildfire shape with the columns the other way round: (code, year) is unique here
    // too, and `code` is now what a first-match reader would land on. A column with a blank in it
    // identifies nothing, so the entity column has to be the one behind it.
    const { panel } = profileTable([
      ["code", "region", "year", "fires"],
      ["NOR", "North", "2020", "10"],
      ["NOR", "North", "2021", "12"],
      ["SOU", "South", "2020", "20"],
      ["SOU", "South", "2021", "21"],
      ["", "Whole country", "2020", "30"],
      ["", "Whole country", "2021", "33"],
    ]);
    expect(panel.entity).toBe("region");
  });

  it("should answer null for a table that is not one row per entity per period", () => {
    expect(
      profileTable([
        ["acteur", "glace_fondue_mt"],
        ["Jeux", "14"],
        ["Eni", "11"],
      ]).panel,
    ).toBe(null);
  });

  it("should answer null when the same entity appears twice in the same period", () => {
    expect(
      profileTable([
        ["region", "year", "fires"],
        ["North", "2020", "10"],
        ["North", "2020", "12"],
        ["South", "2020", "20"],
        ["South", "2021", "22"],
      ]).panel,
    ).toBe(null);
  });
});

describe("a period column is not a measure", () => {
  it("should withhold the total of a column it already recognised as a sequence", () => {
    const year = read("real-gwis-wildfire-counts").columns.find(
      (c) => c.name === "year",
    );
    expect(year.gaps).toEqual([]);
    expect(year.sum).toBe(null);
    expect(year.sumWithheld).toContain("sequence");
  });

  it("should keep the total of an ordinary measure column", () => {
    const events = read("real-gwis-wildfire-counts").columns.find(
      (c) => c.name === "events",
    );
    expect(events.sum).toBe(42410733);
  });
});

describe("per-period coverage, so a collapse is visible", () => {
  it("should count the entities each period carries", () => {
    const { panel } = read("real-ember-renewables-share");
    const byPeriod = new Map(
      panel.coverage.byPeriod.map((p: any) => [p.period, p.entities]),
    );
    expect(byPeriod.get(2022)).toBe(245);
    expect(byPeriod.get(2024)).toBe(228);
    expect(byPeriod.get(2025)).toBe(114);
    expect(panel.coverage.fullest.entities).toBe(245);
    expect(panel.coverage.thinnest).toEqual({ period: 1900, entities: 1 });
  });

  it("should say on the period column itself that a full range is not full coverage", () => {
    // `gaps: []` is where a reader looks, and on the Ember file it is TRUE and misleading: every
    // year from 1900 to 2025 is present and 2025 carries 114 of the 245 entities 2022 carried.
    const year = read("real-ember-renewables-share").columns.find(
      (c) => c.name === "year",
    );
    expect(year.gaps).toEqual([]);
    expect(year.gapsAreNotCoverage.fullest.entities).toBe(245);
    expect(year.gapsAreNotCoverage.thinnest.entities).toBe(1);
    expect(year.gapsAreNotCoverage.says).toContain("coverage");
  });

  it("should say nothing about coverage when every period really does carry every entity", () => {
    // The wildfire file is balanced: 260 entities in all 15 years. There is no collapse to name.
    const year = read("real-gwis-wildfire-counts").columns.find(
      (c) => c.name === "year",
    );
    expect(year.gapsAreNotCoverage).toBeUndefined();
  });
});

describe("which entities are aggregates of the other rows", () => {
  it("should decide a total by arithmetic and name the rows it sums", () => {
    const { panel } = profileTable(SMALL_PANEL);
    const whole = panel.aggregates.byArithmetic.find(
      (a: any) => a.entity === "Whole country",
    );
    expect(whole).toBeDefined();
    expect(whole.members.sort()).toEqual(["North", "South"]);
    expect(whole.periods).toBe(3);
    expect(whole.column).toBe("fires");
  });

  it("should not call an ordinary row an aggregate", () => {
    const { panel } = profileTable(SMALL_PANEL);
    const named = panel.aggregates.byArithmetic.map((a: any) => a.entity);
    expect(named).not.toContain("North");
    expect(named).not.toContain("South");
  });

  it("should refuse a set that adds up in one period and not the next", () => {
    // The whole strength of the test is that the SAME set has to hold in EVERY period: with 260
    // numbers, some subset adds up to almost anything once. A + B is exactly T in 2020, six
    // against five in 2021, and their totals over the three periods are both 12 — so neither the
    // running total nor the first period can tell this apart from a real aggregate, and only the
    // period-by-period comparison refuses it.
    const { panel } = profileTable([
      ["region", "code", "year", "v"],
      ["A", "AAA", "2020", "2"],
      ["A", "AAA", "2021", "4"],
      ["A", "AAA", "2022", "2"],
      ["B", "BBB", "2020", "1"],
      ["B", "BBB", "2021", "2"],
      ["B", "BBB", "2022", "1"],
      ["T", "", "2020", "3"],
      ["T", "", "2021", "5"],
      ["T", "", "2022", "4"],
    ]);
    expect(panel.aggregates.byArithmetic).toEqual([]);
  });

  it("should not call one series an aggregate of another that merely repeats it", () => {
    // Two identical series is worth knowing and is not a sum: an aggregate is made of rows, plural.
    const { panel } = profileTable([
      ["region", "code", "year", "v"],
      ["A", "AAA", "2020", "1"],
      ["A", "AAA", "2021", "5"],
      ["B", "BBB", "2020", "1"],
      ["B", "BBB", "2021", "5"],
    ]);
    expect(panel.aggregates.byArithmetic).toEqual([]);
  });

  it("should decide the World and the six continents of the wildfire file by ARITHMETIC", () => {
    // Measured by hand on the frozen file: the six continents sum EXACTLY to `World` in all
    // fifteen years, and so do the 251 rows that are not aggregates. Two disjoint sets of this
    // table's own rows summing to the same total in every period is what makes them aggregates.
    const { panel } = read("real-gwis-wildfire-counts");
    const named = panel.aggregates.byArithmetic
      .map((a: any) => a.entity)
      .sort();
    expect(named).toEqual(
      [
        "Africa",
        "Asia",
        "Europe",
        "North America",
        "Oceania",
        "South America",
        "World",
      ].sort(),
    );
    const world = panel.aggregates.byArithmetic.find(
      (a: any) => a.entity === "World",
    );
    expect(world.members.sort()).toEqual(
      [
        "Africa",
        "Asia",
        "Europe",
        "North America",
        "Oceania",
        "South America",
      ].sort(),
    );
    expect(world.periods).toBe(15);
  });

  it("should still propose the two aggregates arithmetic could not reach, by the table's own structure", () => {
    // `European Union (27)` is the sum of 27 countries none of which is a candidate, and
    // `Europe (excl. Russia)` is Europe minus one country. Neither has an arithmetic witness in
    // this table; both are structurally unlike every other row, and that is weaker evidence,
    // reported as such.
    const { panel } = read("real-gwis-wildfire-counts");
    const proposed = panel.aggregates.byStructure.map((a: any) => a.entity);
    expect(proposed).toContain("European Union (27)");
    expect(proposed).toContain("Europe (excl. Russia)");
    expect(
      panel.aggregates.byStructure.find(
        (a: any) => a.entity === "Europe (excl. Russia)",
      ).proposedBy,
    ).toBe("code-missing");
    expect(
      panel.aggregates.byStructure.find(
        (a: any) => a.entity === "European Union (27)",
      ).proposedBy,
    ).toBe("code-shape");
  });

  it("should say that a structural proposal is not a decision, and name what else it swept in", () => {
    // The same test flags Kosovo, Northern Cyprus and Akrotiri and Dhekelia — real territories
    // whose OWID code is simply not shaped like the other 248. A reader who cannot tell a proposal
    // from a decision has been handed a guess.
    const { panel } = read("real-gwis-wildfire-counts");
    const proposed = panel.aggregates.byStructure.map((a: any) => a.entity);
    expect(proposed).toContain("Kosovo");
    expect(panel.aggregates.says).toContain("proposal");
  });

  it("should reach the aggregates of a SHARE panel by structure, and say arithmetic decided nothing", () => {
    // Ember publishes a percentage. A share does not sum, so no arithmetic witness exists and none
    // is invented; the 32 aggregates are still named, by the code column's own shape.
    const { panel } = read("real-ember-renewables-share");
    expect(panel.aggregates.byArithmetic).toEqual([]);
    const proposed = panel.aggregates.byStructure.map((a: any) => a.entity);
    expect(proposed).toContain("World");
    expect(proposed).toContain("High-income countries");
    expect(proposed).toContain("ASEAN (Ember)");
    expect(proposed).toContain("G7 (Ember)");
  });
});

describe("what a profiler cannot decide, said where the journalist reads it", () => {
  it("should carry a stated incompleteness out of the article's own prose onto the profile", () => {
    // The wildfire dataset states its own incompleteness in a description line intake freezes as
    // PROSE, never as a column: "Number of wildfires. The 2026 data is incomplete and was last
    // updated 21 August 2026." Eight months of 2026 otherwise read as a full year.
    const csv = readFileSync(
      `${STORIES}/real-gwis-wildfire-counts/source/data.csv`,
      "utf8",
    );
    const prose = readFileSync(
      `${STORIES}/real-gwis-wildfire-counts/source/article.md`,
      "utf8",
    );
    const profile = profileTable(parseCsv(csv), { prose });
    expect(profile.statedIncompleteness.claims.length).toBe(1);
    const [claim] = profile.statedIncompleteness.claims;
    expect(claim.period).toBe(2026);
    expect(claim.sentence).toContain("2026 data is incomplete");
    expect(claim.column).toBe("year");
  });

  it("should claim nothing when no prose was handed to it, and say that is why", () => {
    const profile = profileTable(
      parseCsv(
        readFileSync(
          `${STORIES}/real-gwis-wildfire-counts/source/data.csv`,
          "utf8",
        ),
      ),
    );
    expect(profile.statedIncompleteness.claims).toEqual([]);
    expect(profile.statedIncompleteness.readProse).toBe(false);
  });

  it("should state the reach of the words it looked for, so a silence is not a clean bill", () => {
    const profile = profileTable(SMALL_PANEL, {
      prose: "Nothing to declare here.",
    });
    expect(profile.statedIncompleteness.claims).toEqual([]);
    expect(profile.statedIncompleteness.readProse).toBe(true);
    expect(profile.statedIncompleteness.reads).toBe("English and French");
    expect(profile.statedIncompleteness.words).toContain("incomplete");
    expect(profile.statedIncompleteness.words).toContain("provisoire");
  });

  it("should not read an incompleteness sentence that names no period this table holds", () => {
    const profile = profileTable(SMALL_PANEL, {
      prose: "The 1998 series is incomplete.",
    });
    expect(profile.statedIncompleteness.claims).toEqual([]);
  });

  it("should say that a panel's denominator is a different file, so its own silence carries nothing", () => {
    // `findDenominatorColumn` looks in the same table. For every country panel published one
    // indicator per file — OWID, Eurostat, the World Bank — the denominator is a different file,
    // so the absence of a denominator column here is not evidence that a per-head reading is
    // unavailable. Today that silence is indistinguishable from "asked and answered".
    const events = read("real-gwis-wildfire-counts").columns.find(
      (c) => c.name === "events",
    );
    expect(events.denominator).toBeUndefined();
    expect(events.denominatorNotInThisTable.says).toContain("different file");
    expect(events.denominatorNotInThisTable.reads).toContain("English");
  });

  it("should not say it about a column that HAS a denominator beside it", () => {
    const table = profileTable([
      ["district", "year", "incidents", "residents"],
      ["Centro", "2024", "412", "201000"],
      ["Centro", "2025", "400", "201000"],
      ["Sul", "2024", "300", "128000"],
      ["Sul", "2025", "310", "128000"],
    ]);
    const incidents = table.columns.find((c) => c.name === "incidents");
    expect(incidents.denominator).toEqual({ column: "residents" });
    expect(incidents.denominatorNotInThisTable).toBeUndefined();
  });
});
