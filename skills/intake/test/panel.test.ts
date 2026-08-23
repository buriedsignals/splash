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
import { findYearColumn, profileTable } from "../scripts/profile.mjs";
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

  it("should not count a blank as one of the entities a period carries", () => {
    // The shared derivation will take a key column that has blanks in it where nothing blank-free
    // keys the table — `name` here — and a blank names nobody. Counting it would make a period
    // carry more entities than the table has.
    const { panel } = profileTable([
      ["name", "year", "v"],
      ["A", "2020", "1"],
      ["B", "2020", "2"],
      ["", "2020", "3"],
      ["A", "2021", "4"],
      ["B", "2021", "5"],
      ["", "2021", "6"],
    ]);
    expect(panel.entity).toBe("name");
    expect(panel.entities).toBe(2);
    expect(panel.coverage.fullest.entities).toBe(2);
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

describe("what stops the arithmetic reporting a coincidence", () => {
  it("should refuse a set that adds up in every period of a table nothing set apart", () => {
    // `heat-pump-adoption-across-europe`: ten countries, five years, and Poland plus the United
    // Kingdom add up to the Netherlands EXACTLY in all five — 5+3, 7+4, 10+5, 13+7, 17+9. Three
    // independent percentages, and before the structure had to propose first this was reported as
    // an aggregate. Five periods over nine other rows is not enough repetition to rule out a
    // coincidence; the wildfire file's fifteen over eleven is.
    const { panel } = read("heat-pump-adoption-across-europe");
    expect(panel.entities).toBe(10);
    expect(panel.periods).toBe(5);
    expect(panel.aggregates.byArithmetic).toEqual([]);
    expect(panel.aggregates.arithmetic.ran).toBe(false);
    expect(panel.aggregates.arithmetic.reason).toContain(
      "structural test set no row",
    );
  });

  it("should not search a table that carries one period, where nothing can repeat", () => {
    // `stress-b-piped-water`: nine countries, one row each, all 2022. With nine numbers and a
    // single period some subset adds up to almost any of them — it returned three countries as
    // aggregates of each other before this floor existed.
    const { panel } = read("stress-b-piped-water");
    expect(panel.periods).toBe(1);
    expect(panel.aggregates.byArithmetic).toEqual([]);
    expect(panel.aggregates.arithmetic.ran).toBe(false);
    expect(panel.aggregates.arithmetic.reason).toContain(
      "AGGREGATE_MIN_PERIODS",
    );
  });

  it("should not decide a one-period table even when the structure DID set a row apart", () => {
    // The floor has to hold where the rest of the mechanism is willing to answer: `T` has no code
    // where the others do, so the structure proposes it, and A + B is exactly T. Once.
    const { panel } = profileTable([
      ["region", "code", "year", "v"],
      ["A", "AAA", "2020", "1"],
      ["B", "BBB", "2020", "2"],
      ["T", "", "2020", "3"],
    ]);
    expect(panel.periods).toBe(1);
    expect(panel.aggregates.byStructure.map((a: any) => a.entity)).toEqual([
      "T",
    ]);
    expect(panel.aggregates.byArithmetic).toEqual([]);
    expect(panel.aggregates.arithmetic.reason).toContain(
      "AGGREGATE_MIN_PERIODS",
    );
  });

  it("should not call a proposed row an aggregate of the single row that repeats it", () => {
    // `T` is proposed (no code where A has one) and equals A in every period. Two identical series
    // is worth knowing and is not a sum: an aggregate is made of rows, plural.
    const { panel } = profileTable([
      ["region", "code", "year", "v"],
      ["A", "AAA", "2020", "1"],
      ["A", "AAA", "2021", "5"],
      ["T", "", "2020", "1"],
      ["T", "", "2021", "5"],
    ]);
    expect(panel.aggregates.byStructure.map((a: any) => a.entity)).toEqual([
      "T",
    ]);
    expect(panel.aggregates.byArithmetic).toEqual([]);
  });

  it("should not read a CATEGORY column as the column of codes", () => {
    // `department` holds one value per employee, five values over 240 of them, and its majority
    // shape covers about 60% — so on a salary table it proposed 96 employees as aggregate
    // candidates. A code NAMES EACH SUBJECT ONCE; a department does not. The defence is kept here
    // on a table built to have exactly that shape, because the frozen story it was found on is no
    // longer read as a panel at all — see the test below for why, which is a second defect the
    // same file was hiding.
    const { panel } = profileTable([
      ["employee_id", "department", "year", "annual_salary_eur"],
      ["E1", "Sales", "2024", "40000"],
      ["E2", "Sales", "2024", "41000"],
      ["E3", "Support", "2024", "39000"],
      ["E1", "Sales", "2025", "42000"],
      ["E2", "Sales", "2025", "43000"],
      ["E3", "Support", "2025", "40000"],
    ]);
    expect(panel.entity).toBe("employee_id");
    expect(panel.aggregates.byStructure).toEqual([]);
    expect(panel.aggregates.structure.answered).toBe(false);
  });

  it("should not read a TENURE named in years as the table's own period", () => {
    // `stress-aa-salary-spread` carries `years_service [0, 34]`, and the period rule tested the
    // column's NAME and never its values. Two things followed from that, both wrong and both
    // invisible for six rounds: a salary table of 240 employees was described as a PANEL — 240
    // readings over 35 "periods" of tenure — and the table's second measure disappeared, struck out
    // as "the table's own axis", so every requirement about several measures was answered about one.
    const { panel, columns } = read("stress-aa-salary-spread");
    expect(panel).toBe(null);
    expect(columns.filter((c: any) => c.type === "number").map((c: any) => c.name)).toEqual([
      "annual_salary_eur",
      "years_service",
    ]);
  });
});

describe("what a profiler cannot decide, said where the journalist reads it", () => {
  it("should say when the period column is one its own typing will not call a sequence", () => {
    // The shared derivation finds the period column by NAME; this profiler's `isSequenceColumn`
    // finds it by the column's own VALUES. `stress-t-europe-recycling` carries `survey_date` as
    // "2025-03-01", "01/03/2025" and "March 2025" — named a period by the first and refused by the
    // second. A profile that names a period its own typing will not stand behind has handed the
    // next phase a guess.
    const { panel, columns } = profileTable([
      ["country", "report_date", "value"],
      ["France", "2024-01-01", "1"],
      ["Spain", "2024-01-01", "2"],
      ["France", "01/02/2024", "3"],
      ["Spain", "01/02/2024", "4"],
    ]);
    expect(panel.period).toBe("report_date");
    expect(columns.find((c) => c.name === "report_date").gaps).toBe(null);
    expect(panel.periodNotASequence.column).toBe("report_date");
    expect(panel.periodNotASequence.says).toContain("sequence");
  });

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

// =============================================================================================
// ROUND NINE — THE PERIOD COLUMN IS WHAT A COLUMN DOES, NOT WHAT IT IS CALLED.
//
// WHO's Global Health Observatory publishes 2 919 country-year rows of rabies deaths — 195
// entities x 15 periods, the shape this whole block exists for — and the profile came back
// `panel: null`. `TimeDim` holds 2010-2024 and is named for nothing; the one column NAMED for a
// period is `Date`, WHO's own record-modification timestamp, a text column with five distinct
// values. `findYearColumn`'s own doc comment states the rule it broke: "the name proposes and the
// values decide". Its order — `named.find(holdsPeriods) ?? named[0] ?? columns.find(holdsPeriods)`
// — let the NAME decide whenever no name-matched column held periods, short-circuiting the
// values-based fallback that would have found `TimeDim`.
// =============================================================================================
describe("the period column a table's values make, not the one its names promise", () => {
  const WHO = "r9-map-web-reported-rabies-deaths";

  it("should profile WHO's 195x15 register as the panel it is", () => {
    const profile = read(WHO);
    expect(profile.panel).not.toBeNull();
    expect(profile.panel.period).toBe("TimeDim");
    expect(profile.panel.entity).toBe("SpatialDim");
    expect(profile.panel.periods).toBe(15);
    expect(profile.panel.entities).toBe(195);
  });

  it("should not let a record TIMESTAMP named 'Date' be the period of a country-year table", () => {
    const profile = read(WHO);
    expect(profile.panel.period).not.toBe("Date");
  });

  it("should still fall back to a column NAMED for a period when no column holds one", () => {
    // `stress-t-europe-recycling`'s `survey_date` is text — "2025-03-01", "01/03/2025",
    // "March 2025" — and no column of that table holds period-shaped values. The name is the only
    // evidence there is, so it still decides. (That table is one row per country and no panel at
    // all, which is why this asks the decision itself rather than the profile's `panel` field.)
    const columns = read("stress-t-europe-recycling").columns;
    expect(findYearColumn(columns)!.name).toBe("survey_date");
  });

  it("should prefer a column that HOLDS periods over one merely named for them", () => {
    // The WHO shape, small enough to check by hand: a text column named `Date` carrying a
    // timestamp, and an unnamed integer column carrying the years.
    const columns = [
      { name: "Date", type: "text", min: null, max: null },
      { name: "TimeDim", type: "number", min: 2010, max: 2024 },
    ];
    expect(findYearColumn(columns)!.name).toBe("TimeDim");
  });
});
