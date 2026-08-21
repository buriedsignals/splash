import { describe, it, expect } from "bun:test";
import { groundTakeaway, readFrozenRows } from "../scripts/ground-claim.mjs";
import { readFileSync } from "node:fs";
// The one cross-skill import a `test/` directory is allowed: the other half of the seam A13 lived
// in. See the block at the bottom of this file for why it is here and what stayed green without it.
import { profileTable } from "../../intake/scripts/profile.mjs";

// The real trial fixtures (docs: twin/TRIAL-THREE-BEATS.md). Column ranges come from the real
// series; rows carry only the years the checks below actually need.
const NORWAY_PROFILE = {
  columns: [
    { name: "year", type: "number", min: 1993, max: 2024 },
    { name: "co2_mt", type: "number", min: 35.95, max: 37.18 },
  ],
  rows: [
    { year: 1993, co2_mt: 35.95 },
    { year: 2024, co2_mt: 37.18 },
  ],
};

const SWISS_PROFILE = {
  columns: [
    { name: "year", type: "number", min: 1967, max: 2024 },
    { name: "co2_mt", type: "number", min: 32.07, max: 32.53 },
  ],
  rows: [
    { year: 1967, co2_mt: 32.53 },
    { year: 2024, co2_mt: 32.07 },
  ],
};

describe("groundTakeaway — the Norway/Swiss cases from the trial", () => {
  it("should flag the Norway takeaway as contradicted by its own data", () => {
    const { claims } = groundTakeaway(
      "Norway emitted less CO₂ in 2024 than in any year since 1993",
      NORWAY_PROFILE,
    );
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(true);
  });

  it("should not falsely flag the Swiss proof takeaway, which is true", () => {
    const { claims } = groundTakeaway(
      "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967",
      SWISS_PROFILE,
    );
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
    // Not merely silent — actually checked and confirmed.
    expect(claims.some((c) => c.verdict === "supported")).toBe(true);
  });
});

describe("groundTakeaway — numeric tokens against column ranges", () => {
  const PROFILE = {
    columns: [{ name: "value", type: "number", min: 0, max: 100, sum: 100 }],
    rows: [],
  };

  it("should mark a numeric token it cannot place as unverifiable, never contradicted", () => {
    const { claims } = groundTakeaway("the total reached 500 units", PROFILE);
    const claim = claims.find((c) => c.claim === "500");
    expect(claim.verdict).toBe("unverifiable");
  });

  // ROUND FOUR, finding 1. A numeral that happens to sit between a column's min and its max was
  // reported as editorial SUPPORT, which is how `233` and `100` (the "k" of "100k") "confirmed"
  // a takeaway whose headline the same data refutes. Placing a numeral is a real fact and is
  // still reported — under a verdict of its own, which `groundingScalar` cannot close G1 on.
  it("should mark a numeric token inside a column's range CONSISTENT, never supported", () => {
    const { claims } = groundTakeaway("the total reached 42 units", PROFILE);
    const claim = claims.find((c) => c.claim === "42");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain("value");
  });
});

// The Milan Cortina run (twin/FEEDBACK-2026-08-10.md, A13), verbatim. Its three-row CSV was
//   acteur,emissions_tco2e,glace_fondue_mt,manteau_neigeux_km2,basis
//   Jeux (émissions officielles),930000,14,2.3,publié
//   Eni,700000,11,1.7,publié
//   Stellantis + ITA Airways,600000,9,1.5,dérivé par soustraction
// so `glace_fondue_mt` sums to exactly the 34 the journalist's takeaway cites — and the number is
// outside that column's [9, 14] range precisely BECAUSE it is their total.
const OLYMPICS_PROFILE = {
  columns: [
    {
      name: "acteur",
      type: "text",
      missing: 0,
      distinct: 3,
      min: null,
      max: null,
      sum: null,
    },
    {
      name: "emissions_tco2e",
      type: "number",
      min: 600000,
      max: 930000,
      sum: 2230000,
    },
    { name: "glace_fondue_mt", type: "number", min: 9, max: 14, sum: 34 },
    {
      name: "manteau_neigeux_km2",
      type: "number",
      min: 1.5,
      max: 2.3,
      sum: 5.5,
    },
  ],
};

const OLYMPICS_TAKEAWAY =
  "Sur les 34 millions de tonnes de glace que feront fondre les JO de Milan Cortina, moins de la " +
  "moitié est imputable aux Jeux eux-mêmes : le reste vient de leurs trois sponsors.";

describe("groundTakeaway — part-to-whole totals (the takeaway this check wrongly refused)", () => {
  it("should support a total that equals a column's sum, naming the column", () => {
    const { claims } = groundTakeaway(
      "le total atteint 34 millions de tonnes",
      OLYMPICS_PROFILE,
    );
    const claim = claims.find((c) => c.claim === "34");
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("glace_fondue_mt");
  });

  it("should mark a year matching no range and no sum as unverifiable, never contradicted", () => {
    const { claims } = groundTakeaway(
      "les JO de 2026 feront fondre la glace",
      OLYMPICS_PROFILE,
    );
    const claim = claims.find((c) => c.claim === "2026");
    expect(claim.verdict).toBe("unverifiable");
  });

  it("should return no contradicted verdict at all for the run's own verbatim takeaway", () => {
    const { claims } = groundTakeaway(OLYMPICS_TAKEAWAY, OLYMPICS_PROFILE);
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
    expect(claims.find((c) => c.claim === "34").verdict).toBe("supported");
  });

  it("should not stretch the aggregate match to a value well off the sum", () => {
    // 44 is 29% above glace_fondue_mt's total of 34, and in no column's range. Widening
    // AGGREGATE_TOLERANCE far enough to swallow it is what this case exists to redden.
    const { claims } = groundTakeaway(
      "le total atteint 44 millions de tonnes",
      OLYMPICS_PROFILE,
    );
    const claim = claims.find((c) => c.claim === "44");
    expect(claim.verdict).toBe("unverifiable");
  });
});

describe("groundTakeaway — honest refusal (never 'supported' for what it did not verify)", () => {
  it("should mark a comparison unverifiable when a referenced year is missing from the data", () => {
    const profile = {
      columns: [
        { name: "year", type: "number", min: 1993, max: 2024 },
        { name: "co2_mt", type: "number", min: 35.95, max: 37.18 },
      ],
      rows: [{ year: 2024, co2_mt: 37.18 }], // 1993 missing
    };
    const { claims } = groundTakeaway(
      "Emissions were less in 2024 than in 1993",
      profile,
    );
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
    expect(
      claims.some(
        (c) => c.verdict === "unverifiable" && c.detail.includes("1993"),
      ),
    ).toBe(true);
  });

  it("should mark a comparison unverifiable when the profile has no row-level data at all", () => {
    const profile = {
      columns: [
        { name: "year", type: "number", min: 1993, max: 2024 },
        { name: "co2_mt", type: "number", min: 35.95, max: 37.18 },
      ],
      // no `rows` key
    };
    const { claims } = groundTakeaway(
      "Emissions were less in 2024 than in 1993",
      profile,
    );
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
    expect(
      claims.some(
        (c) =>
          c.verdict === "unverifiable" &&
          c.detail.includes("no row-level data"),
      ),
    ).toBe(true);
  });

  it("should mark a 'first time' claim as unverifiable — it is never mechanically checked", () => {
    const { claims } = groundTakeaway(
      "This is the first time emissions have fallen two years running",
      NORWAY_PROFILE,
    );
    const claim = claims.find((c) => /first time/i.test(c.claim));
    expect(claim.verdict).toBe("unverifiable");
  });

  it("should return unverifiable, not supported, when the value column is ambiguous", () => {
    const profile = {
      columns: [
        { name: "year", type: "number", min: 1993, max: 2024 },
        { name: "a", type: "number", min: 0, max: 10 },
        { name: "b", type: "number", min: 0, max: 10 },
      ],
      rows: [
        { year: 1993, a: 1, b: 1 },
        { year: 2024, a: 2, b: 2 },
      ],
    };
    const { claims } = groundTakeaway(
      "Values were less in 2024 than in 1993",
      profile,
    );
    const comparison = claims.find((c) =>
      c.claim.toLowerCase().includes("less"),
    );
    expect(comparison.verdict).toBe("unverifiable");
  });

  it("should return an empty array for a takeaway with nothing checkable", () => {
    expect(
      groundTakeaway(
        "Renewables overtook coal as the main source",
        NORWAY_PROFILE,
      ).claims,
    ).toEqual([]);
  });
});

describe("groundTakeaway — 'highest/lowest ever' superlatives", () => {
  const PROFILE = {
    columns: [
      { name: "year", type: "number", min: 2000, max: 2024 },
      { name: "co2_mt", type: "number", min: 10, max: 50 },
    ],
    rows: [
      { year: 2000, co2_mt: 20 },
      { year: 2010, co2_mt: 50 },
      { year: 2024, co2_mt: 30 },
    ],
  };

  it("should catch a 'highest ever' superlative the data refutes", () => {
    const { claims } = groundTakeaway(
      "Emissions in 2024 were the highest ever recorded",
      PROFILE,
    );
    const superlative = claims.find((c) => c.claim.includes("highest ever"));
    expect(superlative.verdict).toBe("contradicted");
  });

  it("should confirm a 'highest ever' superlative the data actually supports", () => {
    const { claims } = groundTakeaway(
      "Emissions in 2010 were the highest ever recorded",
      PROFILE,
    );
    const superlative = claims.find((c) => c.claim.includes("highest ever"));
    expect(superlative.verdict).toBe("supported");
  });
});

// THE SEAM A13 ACTUALLY LIVED IN, and until this block existed it had no test at all.
//
// Every fixture above hand-builds its column objects, so `profileTable`'s REAL output had never
// been fed to `groundTakeaway` — and `storyboard` imported nothing from `intake`. The
// original defect was systematic ON A REAL PROFILE: `profileTable` emits no `rows`, so
// `checkNumericRanges` was the only check that ever fired, and it was the broken one. The fix added
// `sum` on one side and a `sum` arm on the other and never joined them. Measured: deleting `sum`
// from `profileTable` left this whole file GREEN.
//
// A `test/` directory is the one place a cross-skill import is allowed, and only to assert that two
// halves of one contract still meet — the same exception `splash/test/where.test.ts` takes for
// the two Gate-2 readings. Nothing in runtime code crosses here.
//
// RED, in a copy of the tree under /tmp, with `sum` deleted from `profileTable`:
//
//   310 |     expect(total!.verdict).toBe("supported");
//                                    ^
//   error: expect(received).toBe(expected)
//   Expected: "supported"   Received: "unverifiable"
//
//   (fail) the real profileTable output, fed to the real grounding check > should confirm the run's own total against the column profileTable actually produces
//   (fail) the real profileTable output, fed to the real grounding check > should carry a sum on every numeric column, which is the field the aggregate arm reads
//    2 fail
describe("the real profileTable output, fed to the real grounding check", () => {
  // The Milan Cortina CSV, verbatim, as `intake` would have parsed it.
  const ROWS = [
    ["acteur", "emissions_tco2e", "glace_fondue_mt", "manteau_neigeux_km2", "basis"],
    ["Jeux (émissions officielles)", "930000", "14", "2.3", "publié"],
    ["Eni", "700000", "11", "1.7", "publié"],
    ["Stellantis + ITA Airways", "600000", "9", "1.5", "dérivé par soustraction"],
  ];

  it("should carry a sum on every numeric column, which is the field the aggregate arm reads", () => {
    const profile = profileTable(ROWS);
    const numeric = profile.columns.filter((c) => c.type === "number");
    expect(numeric.length).toBe(3);
    for (const column of numeric) expect(typeof column.sum).toBe("number");
    expect(numeric.find((c) => c.name === "glace_fondue_mt")!.sum).toBe(34);
  });

  it("should confirm the run's own total against the column profileTable actually produces", () => {
    const { claims } = groundTakeaway(OLYMPICS_TAKEAWAY, profileTable(ROWS));
    const total = claims.find((c) => c.claim === "34");
    expect(total!.verdict).toBe("supported");
    expect(total!.detail).toContain("glace_fondue_mt");
  });

  // The takeaway that was REFUSED at [1652-1661] of the run, checked against the real profile
  // rather than a fixture shaped to make it pass.
  it("should refuse nothing in that takeaway, on the profile a real intake would hand it", () => {
    const { claims } = groundTakeaway(OLYMPICS_TAKEAWAY, profileTable(ROWS));
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
  });
});

// Finding 1 (2026-08-20 stress test): a direction word ("risen", "fell", ...) paired with an
// ordered pair of numbers must be checked for agreement with that pair's own order, not just
// whether each number independently sits inside a column's range. Fixture is the frozen
// stress-c-vacant-homes profile, verbatim (stories/stress-c-vacant-homes/source/profile.json).
const VACANT_HOMES_PROFILE = {
  rowCount: 4,
  columns: [
    { name: "year", type: "number", missing: 0, distinct: 4, min: 2019, max: 2022, sum: 8082 },
    { name: "vacant_homes_pct", type: "number", missing: 0, distinct: 4, min: 7.2, max: 8.4, sum: 31.3 },
  ],
};

describe("groundTakeaway — a direction word checked against its own numbers' order", () => {
  it("should refute the stress takeaway: 'risen' but the pair itself falls from 8.4 to 7.2", () => {
    const { claims } = groundTakeaway(
      "The share of vacant homes has risen steadily over the last four years, from 8.4% to 7.2%.",
      VACANT_HOMES_PROFILE,
    );
    // The old bug: both numbers land inside vacant_homes_pct's [7.2, 8.4] range and are marked
    // "supported" twice, with "risen" never inspected at all.
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
    const trend = claims.find((c) => c.verdict === "contradicted");
    expect(trend).toBeTruthy();
    expect(trend.detail).toContain("8.4");
    expect(trend.detail).toContain("7.2");
    expect(trend.detail).toContain("risen");
  });

  it("should confirm the corrected takeaway: 'fell' and the pair does fall from 8.4 to 7.2", () => {
    const { claims } = groundTakeaway(
      "The share of vacant homes fell every year from 2019 to 2022, from 8.4% to 7.2%.",
      VACANT_HOMES_PROFILE,
    );
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
    expect(claims.some((c) => c.verdict === "supported")).toBe(true);
  });

  it("should mark a number pair unverifiable, never supported, when the direction word is too far away to pair with it", () => {
    const profile = {
      columns: [{ name: "value", type: "number", min: 0, max: 10, sum: 8 }],
    };
    // "rose" is ~180 characters away from the "from 5 to 3" pair below — far outside any
    // reasonable pairing window. Without this guard, checkNumericRanges would silently mark
    // both 5 and 3 "supported" because each sits inside [0, 10], never inspecting "rose" at all.
    const { claims } = groundTakeaway(
      "Reported figures rose sharply across the whole region this quarter, according to " +
        "officials who briefed reporters at length about the methodology behind the count. " +
        "Elsewhere, a separate reading went from 5 to 3.",
      profile,
    );
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
    expect(claims.some((c) => c.verdict === "unverifiable")).toBe(true);
  });

  it("should return no claim at all for a direction word with no numbers — ranges alone carry no order", () => {
    // Deliberate: min/max on a column say nothing about which end came first in time, so there
    // is no numeric anchor here for this check to place a verdict on at all. See the doc comment
    // at the top of ground-claim.mjs for the reasoning.
    expect(
      groundTakeaway("Vacancy is climbing, year after year.", VACANT_HOMES_PROFILE).claims,
    ).toEqual([]);
  });
});

// stories/stress-e-electricity-mix/source/profile.json, verbatim — share_pct sums to 95.2, not
// 100, while the article claims the six shares "make up the whole of national supply".
const ELECTRICITY_MIX_PROFILE = {
  rowCount: 6,
  columns: [
    { name: "source", type: "text", missing: 0, distinct: 6, min: null, max: null, sum: null },
    { name: "share_pct", type: "number", missing: 0, distinct: 6, min: -4.1, max: 41.2, sum: 95.2 },
  ],
  duplicates: { count: 0, rows: [] },
};

describe("groundTakeaway — a part-to-whole totality claim checked against the column's own sum", () => {
  it("should contradict a totality claim when the summed share column does not add up to the whole, naming both numbers", () => {
    const { claims } = groundTakeaway(
      "Together these make up the whole of national supply.",
      ELECTRICITY_MIX_PROFILE,
    );
    const totality = claims.find((c) => c.claim.toLowerCase().includes("whole"));
    expect(totality).toBeTruthy();
    expect(totality.verdict).toBe("contradicted");
    expect(totality.detail).toContain("95.2");
    expect(totality.detail).toContain("100");
    expect(totality.detail).toContain("share_pct");
  });

  it("should support a totality claim when the summed share column does add up to the whole", () => {
    const profile = {
      columns: [
        { name: "share_pct", type: "number", missing: 0, distinct: 3, min: 20, max: 50, sum: 100 },
      ],
    };
    const { claims } = groundTakeaway("All of the shares together make up the whole of supply.", profile);
    const totality = claims.find((c) => /whole|all of/i.test(c.claim));
    expect(totality).toBeTruthy();
    expect(totality.verdict).toBe("supported");
  });

  it("should mark a totality claim unverifiable, never supported and never silent, when no share column can be identified", () => {
    const profile = {
      columns: [{ name: "tonnes", type: "number", missing: 0, distinct: 3, min: 9, max: 14, sum: 34 }],
    };
    const { claims } = groundTakeaway("Together these make up the whole of the total.", profile);
    const totality = claims.find((c) => /whole/i.test(c.claim));
    expect(totality).toBeTruthy();
    expect(totality.verdict).toBe("unverifiable");
  });
});

// ---------------------------------------------------------------------------------------------
// ROUND THREE — the contract redesign (see the header of ground-claim.mjs for the full argument).
// ---------------------------------------------------------------------------------------------

// FINDING 4 — the number reader. `readNumericToken` is COPIED, not imported, from
// `intake/scripts/profile.mjs` (registered in `skills/splash/test/guard-copies-parity.test.ts`'s
// `COPIES`). This is the one place a cross-skill import is allowed (see the block earlier in this
// file), and only to prove the two copies still agree.
import { readNumericToken as readNumericTokenFromIntake } from "../../intake/scripts/profile.mjs";
import { readNumericToken as readNumericTokenFromStoryboard } from "../scripts/ground-claim.mjs";

describe("readNumericToken — both copies give the same answer for the same string", () => {
  const CASES = ["42", "1.7", "8.4", "-4.1", "14,205", "14,205.5", "1,7", "1,234", "not-a-number", ""];
  for (const raw of CASES) {
    it(`should agree on "${raw}"`, () => {
      expect(readNumericTokenFromStoryboard(raw)).toEqual(readNumericTokenFromIntake(raw));
    });
  }

  it("should read a plain number outright", () => {
    expect(readNumericTokenFromStoryboard("42")).toEqual({ value: 42 });
  });

  it("should read a thousands-grouped number that settles itself with a decimal tail", () => {
    expect(readNumericTokenFromStoryboard("14,205.5")).toEqual({ value: 14205.5 });
  });

  it("should refuse a thousands-grouped number with no settling evidence, naming the ambiguity", () => {
    const read = readNumericTokenFromStoryboard("14,205");
    expect(read.ambiguous).toBe(true);
    expect(read.reason).toContain("14,205");
  });

  it("should refuse a comma that is neither a thousands grouping nor a settled decimal", () => {
    const read = readNumericTokenFromStoryboard("1,7");
    expect(read.ambiguous).toBe(true);
    expect(read.reason).toContain("1,7");
  });

  it("should return null for a string that is not a numeral at all", () => {
    expect(readNumericTokenFromStoryboard("not-a-number")).toBeNull();
  });
});

describe("groundTakeaway — a numeral is one claim or none, never two fragments (finding 4)", () => {
  it("should read '14,205' as ONE unverifiable claim, never split into '14' and '205'", () => {
    const profile = {
      columns: [{ name: "permits_issued", type: "number", min: 14205, max: 58990, sum: 339775 }],
    };
    const { claims } = groundTakeaway("Permits fell to 14,205 in the partial year.", profile);
    expect(claims.some((c) => c.claim === "14")).toBe(false);
    expect(claims.some((c) => c.claim === "205")).toBe(false);
    const whole = claims.find((c) => c.claim === "14,205");
    expect(whole).toBeTruthy();
    expect(whole.verdict).toBe("unverifiable");
  });

  it("should read the French '1,7' as ONE claim, never split into '1' and '7'", () => {
    const profile = {
      columns: [{ name: "taux", type: "number", min: 1.7, max: 6.4, sum: 93.8 }],
    };
    const { claims } = groundTakeaway("Le taux atteint 1,7 % à Appenzell.", profile);
    expect(claims.some((c) => c.claim === "1")).toBe(false);
    expect(claims.some((c) => c.claim === "7")).toBe(false);
    const whole = claims.find((c) => c.claim === "1,7");
    expect(whole).toBeTruthy();
    expect(whole.verdict).toBe("unverifiable");
  });
});

// FINDINGS 1 & 3 — superlative and comparative shapes computed against the data.
describe("groundTakeaway — superlatives ('the most', 'the highest/lowest', 'leads', 'tops')", () => {
  const PROFILE_WITH_ROWS = {
    columns: [
      { name: "country", type: "text", min: null, max: null, sum: null },
      { name: "value", type: "number", min: 30, max: 90, sum: 220 },
    ],
    rows: [
      { country: "Germany", value: 90 },
      { country: "France", value: 60 },
      { country: "Spain", value: 40 },
      { country: "Italy", value: 30 },
    ],
  };

  it("should support 'has the most' when the named entity resolves to the column's own maximum", () => {
    const { claims } = groundTakeaway("Germany has the most.", PROFILE_WITH_ROWS);
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("90");
  });

  it("should contradict 'has the most' when the named entity does not hold the maximum", () => {
    const { claims } = groundTakeaway("France has the most.", PROFILE_WITH_ROWS);
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("contradicted");
    expect(claim.detail).toContain("60");
    expect(claim.detail).toContain("90");
  });

  it("should return unverifiable, naming the entity it could not resolve, when the profile carries no rows", () => {
    const profile = { columns: PROFILE_WITH_ROWS.columns };
    const { claims } = groundTakeaway("Germany has the most.", profile);
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("Germany");
  });

  it("should confirm 'leads' the same way, against the same maximum", () => {
    const { claims } = groundTakeaway("Germany leads.", PROFILE_WITH_ROWS);
    const claim = claims.find((c) => c.claim === "leads");
    expect(claim.verdict).toBe("supported");
  });

  it("should confirm 'tops' the same way", () => {
    const { claims } = groundTakeaway("Germany tops the table.", PROFILE_WITH_ROWS);
    const claim = claims.find((c) => c.claim === "tops");
    expect(claim.verdict).toBe("supported");
  });

  it("should read a bare 'the lowest' as the column's own minimum", () => {
    const { claims } = groundTakeaway("Italy reports the lowest value.", PROFILE_WITH_ROWS);
    const claim = claims.find((c) => c.claim.includes("the lowest"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("30");
  });

  it("should resolve the nearest clause's own entity, not the sentence's first word, across a semicolon", () => {
    const { claims } = groundTakeaway(
      "Germany reports the highest count; Italy the lowest — the two do not compare.",
      PROFILE_WITH_ROWS,
    );
    const highest = claims.find((c) => c.claim.includes("the highest"));
    const lowest = claims.find((c) => c.claim.includes("the lowest"));
    expect(highest.detail).toContain("Germany");
    expect(lowest.detail).toContain("Italy");
    // Germany (90) is the maximum, Italy (30) is the minimum, and entity resolution correctly
    // picked each entity out of its own clause rather than reusing the sentence's first word.
    expect(highest.verdict).toBe("supported");
    expect(lowest.verdict).toBe("supported");
  });
});

describe("groundTakeaway — 'more than any other' / 'more than all the others combined'", () => {
  // The exact stress-m-forest-loss numbers (finding 1): Brazil's 1,120,000 ha against the other
  // six summed (588,000+412,000+301,000+198,000+44,000+39,000 = 1,582,000) — Brazil's own figure
  // is LESS than the rest combined, so the claim is false, decidable from the column's own max
  // and sum ALONE, with no row-level data needed to place a lower bound on every candidate entity.
  const FOREST_PROFILE = {
    columns: [
      { name: "country", type: "text", min: null, max: null, sum: null },
      { name: "loss_ha", type: "number", min: 39000, max: 1120000, sum: 2702000 },
      { name: "year", type: "number", min: 2025, max: 2025, sum: 14175 },
    ],
  };

  it("should contradict a false 'more than the others combined' claim from the column's own max and sum alone, no rows needed", () => {
    const { claims } = groundTakeaway(
      "Brazil lost more forest than the other six countries combined",
      FOREST_PROFILE,
    );
    const claim = claims.find((c) => c.claim.toLowerCase().includes("combined"));
    expect(claim).toBeTruthy();
    expect(claim.verdict).toBe("contradicted");
    expect(claim.detail).toContain("1120000");
    expect(claim.detail).toContain("1582000");
  });

  it("should support a true 'more than any other' claim once the entity resolves to the column's maximum", () => {
    const profile = {
      columns: [
        { name: "country", type: "text", min: null, max: null, sum: null },
        { name: "loss_ha", type: "number", min: 39000, max: 1120000, sum: 2702000 },
      ],
      rows: [
        { country: "Brazil", loss_ha: 1120000 },
        { country: "Congo DR", loss_ha: 588000 },
      ],
    };
    const { claims } = groundTakeaway("Brazil lost more forest than any other country", profile);
    const claim = claims.find((c) => c.claim.toLowerCase().includes("any other"));
    expect(claim.verdict).toBe("supported");
  });

  it("should stay unverifiable, naming the entity, when the arithmetic cannot refute it but rows cannot resolve who the leader is", () => {
    const profile = {
      columns: [
        { name: "country", type: "text", min: null, max: null, sum: null },
        { name: "loss_ha", type: "number", min: 39000, max: 1120000, sum: 1400000 },
      ],
    };
    const { claims } = groundTakeaway(
      "Brazil lost more forest than the other countries combined",
      profile,
    );
    const claim = claims.find((c) => c.claim.toLowerCase().includes("combined"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("Brazil");
  });
});

// FINDING 3's second sentence, verbatim from the frozen article
// (stories/stress-m-forest-loss/source/article.md).
describe("groundTakeaway — 'leads' with no row data (finding 3)", () => {
  it("should return unverifiable, naming the entity, never [] and never silent", () => {
    const profile = {
      columns: [
        { name: "country", type: "text", min: null, max: null, sum: null },
        { name: "loss_ha", type: "number", min: 39000, max: 1120000, sum: 2702000 },
        { name: "year", type: "number", min: 2025, max: 2025, sum: 14175 },
      ],
    };
    const { claims } = groundTakeaway("Brazil leads the annual figures again.", profile);
    expect(claims.length).toBeGreaterThan(0);
    const claim = claims.find((c) => c.claim === "leads");
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("Brazil");
  });
});

// FINDING 2 — partial periods, narrowly: a coverage-marking column downgrades a bare year match
// from "supported" to "unverifiable", the real stress-j-partial-year-permits shape.
describe("groundTakeaway — partial periods (months_covered / complete) narrow the year check", () => {
  const PERMITS_PROFILE = {
    columns: [
      { name: "year", type: "number", min: 2020, max: 2026, sum: 14161 },
      { name: "permits_issued", type: "number", min: 14205, max: 58990, sum: 339775 },
      { name: "months_covered", type: "number", min: 3, max: 12, sum: 75 },
    ],
  };

  it("should mark a bare year unverifiable, not supported, when months_covered exists — the misleading-headline finding", () => {
    const { claims } = groundTakeaway(
      "Building permits collapse in 2026 — the sharpest drop in the series.",
      PERMITS_PROFILE,
    );
    const yearClaim = claims.find((c) => c.claim === "2026");
    expect(yearClaim).toBeTruthy();
    expect(yearClaim.verdict).toBe("unverifiable");
    expect(yearClaim.detail).toContain("months_covered");
  });

  it("should still PLACE a year in a profile with no coverage column, without calling it support", () => {
    const profile = { columns: [{ name: "year", type: "number", min: 2020, max: 2026, sum: 14161 }] };
    const { claims } = groundTakeaway("Permits rose to a record in 2026.", profile);
    const yearClaim = claims.find((c) => c.claim === "2026");
    expect(yearClaim.verdict).toBe("consistent");
  });

  it("should refuse a superlative over the data when a completeness flag column exists (stress-o shape)", () => {
    const profile = {
      columns: [
        { name: "period", type: "text", min: null, max: null, sum: null },
        { name: "visits", type: "number", min: 118000, max: 501000, sum: 1975000 },
        { name: "complete", type: "text", min: null, max: null, sum: null },
      ],
      rows: [
        { period: "2025", visits: 501000, complete: "yes" },
        { period: "2026 (Jan-Mar)", visits: 118000, complete: "no" },
      ],
    };
    const { claims } = groundTakeaway("The 2026 period has the most visits.", profile);
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("complete");
  });
});

// COVERAGE — so silence stops looking like confirmation.
describe("groundTakeaway — coverage reports what was actually read, beside the claims", () => {
  it("should mark a sentence 'evaluated' once it produces a claim, even an unverifiable one", () => {
    const profile = { columns: [{ name: "value", type: "number", min: 0, max: 10, sum: 20 }] };
    const { coverage } = groundTakeaway("Germany has the most.", profile);
    expect(coverage.sentences).toBe(1);
    expect(coverage.evaluated).toBe(1);
    expect(coverage.unevaluated).toEqual([]);
  });

  it("should mark a sentence 'unevaluated' when nothing in it produced any claim at all", () => {
    const { coverage } = groundTakeaway("Renewables overtook coal as the main source", NORWAY_PROFILE);
    expect(coverage.sentences).toBe(1);
    expect(coverage.evaluated).toBe(0);
    expect(coverage.unevaluated).toEqual(["Renewables overtook coal as the main source"]);
  });

  it("should tell apart a takeaway that was checked-and-passed from one that is entirely unverifiable", () => {
    const profileNoRows = {
      columns: [
        { name: "country", type: "text", min: null, max: null, sum: null },
        { name: "value", type: "number", min: 10, max: 90, sum: 220 },
      ],
    };
    const allUnverifiable = groundTakeaway("Germany has the most.", profileNoRows);
    // Every claim unverifiable, but the sentence WAS read — visibly different from silence.
    expect(allUnverifiable.coverage.evaluated).toBe(1);
    expect(allUnverifiable.claims.every((c) => c.verdict === "unverifiable")).toBe(true);

    const NORWAY_LIKE = {
      columns: [
        { name: "year", type: "number", min: 1993, max: 2024 },
        { name: "co2_mt", type: "number", min: 35.95, max: 37.18 },
      ],
      rows: [
        { year: 1993, co2_mt: 35.95 },
        { year: 2024, co2_mt: 37.18 },
      ],
    };
    const checkedAndPassed = groundTakeaway(
      "Norway emitted more CO₂ in 2024 than in any year since 1993",
      NORWAY_LIKE,
    );
    expect(checkedAndPassed.coverage.evaluated).toBe(1);
    expect(checkedAndPassed.claims.some((c) => c.verdict === "supported")).toBe(true);
  });
});

// =============================================================================================
// ROUND FOUR (2026-08-21) — what a verdict is allowed to MEAN.
//
// Five findings, one cause: every one of them failed SILENTLY and was verified green while
// failing. So every block below runs against REAL FROZEN STORY MATERIAL — a story's own
// `source/profile.json` and `source/data.csv`, and sentences taken verbatim from its article, its
// STORYBOARD.md or the BRIEF.md of a beat that shipped. A fixture built to fail proves only that
// the fixture fails; these prove the check decides something about the corpus it is run on.
//
// The story files are read, never written. If a story moves, these reddens — which is the point:
// the acceptance evidence for this round IS the corpus.
// =============================================================================================

const storyFile = (relative) =>
  readFileSync(new URL(`../../../stories/${relative}`, import.meta.url), "utf8");
const storyProfile = (story) => JSON.parse(storyFile(`${story}/source/profile.json`));
const storyCsv = (story) => storyFile(`${story}/source/data.csv`);
const grounded = (story, sentence) =>
  groundTakeaway(sentence, storyProfile(story), { csv: storyCsv(story) });

describe("readFrozenRows — where rows come from now (finding 2)", () => {
  it("should read the frozen table into rows, reading each cell by the shared number reader", () => {
    const rows = readFrozenRows(storyCsv("stress-l-mixed-unit-clinics"));
    expect(rows.length).toBe(8);
    expect(rows[1]).toEqual({ code: "DEU", country: "Germany", value: 1880, unit: "clinics" });
  });

  it("should leave a cell that is not a numeral as its own text, never coerced to NaN", () => {
    const rows = readFrozenRows(storyCsv("stress-r-greek-schools"));
    expect(rows[0]["σχολεία_2026"]).toBe("term378");
    expect(rows[0]["σχολεία_2020"]).toBe(412);
  });

  it("should return no rows at all for a table with only a header, rather than a row of nulls", () => {
    expect(readFrozenRows("a,b\n")).toEqual([]);
  });
});

describe("a superlative that DECIDES, on real story material (finding 2)", () => {
  // stories/stress-l-mixed-unit-clinics/source/article.md, last line. Its own shipped BRIEF.md
  // records the old behaviour verbatim: "it returned `[]` — no claim shape at all".
  it("should SUPPORT the frozen article's own superlative once the frozen CSV supplies the rows", () => {
    const { claims } = grounded("stress-l-mixed-unit-clinics", "Germany has the most.");
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("Germany");
    expect(claim.detail).toContain("1880");
  });

  // stories/stress-l-mixed-unit-clinics/beats/mixed-unit-clinics/BRIEF.md:47-48 — the shipped
  // beat's own headline. Read against `value` as the profiler typed it, the second clause is
  // refuted, which is exactly why that beat had to say the two numbers do not compare.
  it("should CONTRADICT the shipped beat's own second clause, on the same frozen table", () => {
    const { claims } = grounded(
      "stress-l-mixed-unit-clinics",
      "Germany reports the highest clinic COUNT; Sweden the highest RATE — the two numbers do not compare.",
    );
    const highest = claims.filter((c) => c.claim.includes("the highest"));
    expect(highest.length).toBe(2);
    expect(highest[0].verdict).toBe("supported");
    expect(highest[0].detail).toContain("Germany");
    expect(highest[1].verdict).toBe("contradicted");
    expect(highest[1].detail).toContain("Sweden");
    expect(highest[1].detail).toContain("21.9");
  });

  // stories/stress-m-forest-loss/source/article.md:3, and the beat's own BRIEF.md:60-62 records
  // `groundTakeaway` returning `[]` for it.
  it("should SUPPORT a second story's frozen 'leads', naming the column it decided against", () => {
    const { claims } = grounded("stress-m-forest-loss", "Brazil leads the annual figures again.");
    const claim = claims.find((c) => c.claim === "leads");
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("loss_ha");
    expect(claim.detail).toContain("1120000");
  });

  it("should refuse a superlative whose entity matches SEVERAL rows rather than pick one", () => {
    // heat-pump's table is long-format: five rows per country, one per year.
    const { claims } = grounded(
      "heat-pump-adoption-across-europe",
      "The Netherlands made the largest gain, climbing 18 percentage points.",
    );
    const claim = claims.find((c) => c.claim.includes("the largest"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("5 rows");
  });

  it("should fall back past a clause-leading capital that is not an entity at all", () => {
    const { claims } = grounded(
      "stress-m-forest-loss",
      "In the ministry's own table, Brazil leads.",
    );
    const claim = claims.find((c) => c.claim === "leads");
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("Brazil");
  });

  it("should read a possessive as its own entity", () => {
    const { claims } = grounded("stress-m-forest-loss", "Brazil's own figure leads the table.");
    const claim = claims.find((c) => c.claim === "leads");
    expect(claim.verdict).toBe("supported");
  });
});

describe("a numeral inside a range is PLACED, not confirmed (finding 1)", () => {
  // The exact reproduction in the round-four raw findings: "3 of 3 claim(s) confirmed" on
  // per-100k rates matched against a raw-count column by coincidence — 100 included.
  it("should call stress-q's per-100k rates consistent, and confirm none of them", () => {
    const { claims } = grounded(
      "stress-q-safety-incidents",
      "Sul records 233 incidents per 100k residents, against Centro's 205.",
    );
    for (const numeral of ["233", "100", "205"]) {
      const claim = claims.find((c) => c.claim === numeral);
      expect(claim.verdict).toBe("consistent");
    }
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
  });

  // stress-s's `year` column is min 2026, max 2026 — a range test that cannot fail.
  it("should name the tautology when a column's own min and max are the same value", () => {
    const { claims } = grounded(
      "stress-s-unspent-fund",
      "Of the €4.1 billion allocated to the regional resilience fund, €0 had been disbursed by the end of June 2026.",
    );
    const year = claims.find((c) => c.claim === "2026");
    expect(year.verdict).toBe("consistent");
    expect(year.detail).toContain("CANNOT FAIL");
    // The two numbers the sentence actually asserts remain unplaced, and nothing else is
    // confirmed — so this takeaway has NOTHING for a scalar to close G1 on.
    expect(claims.find((c) => c.claim === "4.1").verdict).toBe("unverifiable");
    expect(claims.find((c) => c.claim === "0").verdict).toBe("unverifiable");
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
  });

  // A part-to-whole total is the one numeric reading here that CAN fail, so it stays "supported"
  // — but only where it is a real total. Two degeneracies are refused: a year column (whose six
  // 2025 rows "sum" to 12150) and a column whose sum is its own min or max, which is what a
  // one-row table always produces.
  it("should not read the year column as a part-to-whole total", () => {
    const { claims } = grounded("stress-s-unspent-fund", "The fund's own total is 2026.");
    const claim = claims.find((c) => c.claim === "2026");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).not.toContain("sum");
  });

  it("should not read a year column's own sum as a part-to-whole total", () => {
    // stress-p's `year` column is six rows of 2025, so it "sums" to 12150 — a number that is a
    // total of nothing.
    const { claims } = grounded("stress-p-transport-ridership", "The networks carried 12150 in all.");
    const claim = claims.find((c) => c.claim === "12150");
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).not.toContain("equals the sum");
  });

  it("should not read a one-row column's own value as its own total", () => {
    // stress-s's `fund` column is min 1, max 1, sum 1 — every one of those is the same number.
    const { claims } = grounded("stress-s-unspent-fund", "The fund disbursed 1 euro.");
    const claim = claims.find((c) => c.claim === "1");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).not.toContain("sum");
  });
});

describe("the superlative vocabulary stops being four phrases (finding 3)", () => {
  // The frozen headline this whole round was built around
  // (stories/stress-q-safety-incidents/source/article.md:1). Before this it was INVISIBLE:
  // coverage {sentences: 1, evaluated: 0}.
  it("should SEE the frozen false headline and refuse it by naming the polarity it lacks", () => {
    const { claims, coverage } = grounded(
      "stress-q-safety-incidents",
      "Centro has the worst safety record in the city.",
    );
    const claim = claims.find((c) => c.claim.includes("worst"));
    expect(claim).toBeTruthy();
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("POLARITY");
    expect(coverage.evaluated).toBe(1);
    expect(coverage.unevaluated).toEqual([]);
  });

  for (const phrase of [
    "the best",
    "the largest",
    "the biggest",
    "the fewest",
    "the greatest",
    "the smallest",
    "worst-hit",
  ]) {
    it(`should not be blind to "${phrase}"`, () => {
      const { claims, coverage } = grounded(
        "stress-m-forest-loss",
        `Brazil is ${phrase} of the seven.`,
      );
      expect(claims.some((c) => c.claim.toLowerCase().includes(phrase.replace(/^the /, "")))).toBe(true);
      expect(coverage.unevaluated).toEqual([]);
    });
  }

  // stories/stress-p-transport-ridership/STORYBOARD.md, slot 3's own `proves`. Read as a bare
  // superlative it would be CONTRADICTED (12 km is not the 9 km minimum) — and that verdict
  // would be false, because the sentence never claimed the extreme.
  it("should refuse a rank that is not the extreme rather than read it as one", () => {
    const { claims } = grounded(
      "stress-p-transport-ridership",
      "Aveiro's network is 12 km — the second shortest of the six.",
    );
    const claim = claims.find((c) => c.claim.includes("shortest"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("second");
  });

  // stories/stress-n-chomage-cantons/source/article.md:3 — the same shape, in French.
  it("should see a French 'en tête' the way it sees 'leads'", () => {
    const { claims } = grounded(
      "stress-n-chomage-cantons",
      "Neuchâtel et Genève sont en tête, Appenzell Rhodes-Intérieures ferme la marche.",
    );
    const claim = claims.find((c) => /t[êe]te/.test(c.claim));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("Neuchâtel");
  });
});

describe("a claim names its own measure (the two-measure dead zone)", () => {
  // 9 of the 21 frozen stories carry more than one measure; before this, every shape-8 and
  // shape-9 claim in all nine returned "cannot identify a single numeric value column".
  it("should choose the column the sentence itself names", () => {
    const { claims } = grounded(
      "stress-q-safety-incidents",
      "Centro records more incidents than any other district.",
    );
    const claim = claims.find((c) => c.claim.includes("than any other"));
    // The column IS chosen and the entity IS resolved against it — that is what this block is
    // about, and the detail below is the proof. The verdict is `unverifiable` rather than
    // `supported` only because round four's finding 5 landed afterwards: `residents` sits beside
    // `incidents`, so the raw-count reading is not confirmed on its own. See the finding-5 block
    // at the end of this file.
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("incidents");
    expect(claim.detail).toContain("is the column's maximum (412)");
  });

  it("should decide a 'more than the others combined' claim on the column the sentence names", () => {
    const { claims } = grounded(
      "stress-p-transport-ridership",
      "Lisboa carries more trips than all the other cities combined.",
    );
    const claim = claims.find((c) => c.claim.toLowerCase().includes("combined"));
    // Same as above: the column is chosen and the arithmetic decided, and finding 5's denominator
    // question is what holds the confirmation back — `population` sits beside `trips_millions`.
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("trips_millions");
    expect(claim.detail).toContain("exceeds the sum of the rest");
  });

  it("should refuse, naming every candidate, when the sentence names none of the measures", () => {
    const { claims } = grounded("stress-r-greek-schools", "Attica has the most schools of any region.");
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("σχολεία_2020");
    expect(claim.detail).toContain("μαθητές_2026");
  });

  it("should refuse, naming both, when the sentence names more than one measure", () => {
    const { claims } = grounded(
      "stress-q-safety-incidents",
      "Centro's incidents are the highest of the five districts, though residents differ.",
    );
    const claim = claims.find((c) => c.claim.includes("the highest"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("incidents");
    expect(claim.detail).toContain("residents");
  });
});

describe("a column the profiler refused stops disarming the check silently (finding 6)", () => {
  // stress-r's σχολεία_2026 is typed `text` for one corrupt cell in thirteen ("term378").
  it("should name the refused column and its reason on a claim whose numbers it would have decided", () => {
    const { claims } = grounded(
      "stress-r-greek-schools",
      "Every Greek region lost schools between 2020 and 2026, but Attica's decline was far smaller than the rest.",
    );
    const year = claims.find((c) => c.claim === "2026");
    expect(year.verdict).toBe("unverifiable");
    expect(year.detail).toContain("σχολεία_2026");
    expect(year.detail).toContain("only some values carry a unit");
  });

  it("should say the same on the superlative it could not place a column for", () => {
    const { claims } = grounded("stress-r-greek-schools", "Attica has the most schools of any region.");
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.detail).toContain("σχολεία_2026");
  });

  it("should stay quiet about refused columns in a profile that has none", () => {
    const { claims } = grounded("stress-m-forest-loss", "The figure reached 999999999 hectares.");
    const claim = claims.find((c) => c.claim === "999999999");
    expect(claim.detail).not.toContain("profiler refused");
  });
});

describe("coverage counts what the data DECIDED, not only what was touched (finding 4)", () => {
  it("should separate a sentence the data decided from one it merely had a shape for", () => {
    const { coverage } = grounded(
      "stress-q-safety-incidents",
      "Centro has the worst safety record in the city. Centro recorded 412 incidents last year, more than any other district.",
    );
    expect(coverage.sentences).toBe(2);
    expect(coverage.evaluated).toBe(2);
    // Both sentences were LOOKED AT and neither is settled. It was `decided: 1` until round four's
    // finding 5: the second sentence used to be `supported` on the raw count while `residents` sat
    // in the next column, which is exactly the confirmation that headline should never have got.
    expect(coverage.decided).toBe(0);
  });

  // The distinction finding 4 exists to draw, kept proven on a story where nothing withholds the
  // verdict: `stress-l-mixed-unit-clinics` carries no denominator column at all, so its own
  // superlative still DECIDES and the second sentence still does not.
  it("should still count a decided sentence where the data really does settle one", () => {
    const { coverage } = grounded(
      "stress-l-mixed-unit-clinics",
      "Germany has the most. Nobody knows why.",
    );
    expect(coverage.sentences).toBe(2);
    expect(coverage.evaluated).toBe(1);
    expect(coverage.decided).toBe(1);
  });
});

// =============================================================================================
// FINDING 5 (stress round four): A COUNT CAN HAVE A DENOMINATOR, AND NOBODY EVER ASKED.
//
// `stress-q-safety-incidents` came back `supported` on "more than any other district" — a true
// statement about raw counts standing in for a headline ("Centro has the worst safety record")
// that is FALSE per resident, with `residents` one column away. `stress-p-transport-ridership`
// inverts at the top: Porto carries 416 trips per resident against Lisboa's 393.
//
// This check does not divide and does not decide. It refuses to CONFIRM a raw-count superlative
// or comparison while a denominator candidate sits in the same table, and it names BOTH rankings
// so the journalist chooses with the numbers in front of them.
// =============================================================================================

describe("a raw-count superlative is not confirmed while a denominator sits beside it (finding 5)", () => {
  const CENTRO = "Centro recorded 412 incidents last year, more than any other district.";

  it("should refuse to confirm the frozen article's own raw-count superlative", () => {
    const { claims } = grounded("stress-q-safety-incidents", CENTRO);
    const claim = claims.find((c) => c.claim.includes("more than any other"));
    // It WAS "supported" — a true sentence about raw counts, confirming a false headline.
    expect(claim.verdict).toBe("unverifiable");
  });

  it("should name BOTH rankings, with the numbers, so the journalist can choose", () => {
    const { claims } = grounded("stress-q-safety-incidents", CENTRO);
    const detail = claims.find((c) => c.claim.includes("more than any other")).detail;
    expect(detail).toContain('"residents"');
    expect(detail).toContain('"incidents"');
    // The raw leader and the per-resident leader, both named, both with their own figure.
    expect(detail).toContain("Centro");
    expect(detail).toContain("412");
    expect(detail).toContain("Sul");
    expect(detail).toContain("205");
  });

  it("should stop the sentence counting as DECIDED, so a caller cannot close a gate on it", () => {
    const { coverage } = grounded("stress-q-safety-incidents", CENTRO);
    expect(coverage.evaluated).toBe(1);
    expect(coverage.decided).toBe(0);
  });

  it("should name the inversion at the top of stress-p, where the ranking actually reverses", () => {
    const { claims } = grounded(
      "stress-p-transport-ridership",
      "Lisbon carries by far the most trips — 214 million against Porto's 96 million.",
    );
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain('"population"');
    // Lisboa leads on trips; Porto leads per resident. Both named, so the reversal is visible.
    expect(claim.detail).toContain("Lisboa");
    expect(claim.detail).toContain("Porto");
  });

  it("should never divide the journalist's data into a verdict of its own", () => {
    const { claims } = grounded("stress-q-safety-incidents", CENTRO);
    const claim = claims.find((c) => c.claim.includes("more than any other"));
    // Reporting, never repair: no verdict is ever RE-DECIDED on the rate. The rate appears only
    // as a number in the detail the journalist reads.
    expect(claim.verdict).not.toBe("supported");
    expect(claim.verdict).not.toBe("contradicted");
  });

  it("should not fire on stress-a, whose measure must NOT be divided by the column beside it", () => {
    // `households` sits beside `price_eur`, and a household energy bill is ALREADY a
    // per-household figure. The article makes no superlative claim at all, so nothing here
    // is refused, nothing is flagged, and nothing invents a question the sentence never asked.
    const { claims } = grounded("stress-a-energy-bills", "Denmark stands out.");
    expect(claims).toEqual([]);
  });

  it("should leave a table with no denominator column exactly as it was", () => {
    // stress-l-mixed-unit-clinics: `code`, `country`, `value`, `unit` — no population anywhere.
    const { claims } = grounded("stress-l-mixed-unit-clinics", "Germany has the most.");
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).not.toContain("per ");
  });
});

// ROUND FOUR, found by the controller while verifying Task B: the chooser took the sole surviving
// measure without asking whether the claim was about a column the profiler had REFUSED. On
// `stress-a-energy-bills` that answered "Denmark has the highest price." with `contradicted`,
// refuting a claim about PRICE with a count of HOUSEHOLDS -- and `contradicted` is the one verdict
// that never closes G1, so a correct takeaway was blocked by a verdict about the wrong measure.
// Walked here on the frozen story that can reach the branch: `stress-r-greek-schools`, whose
// `σχολεία_2026` is refused for one corrupt cell in thirteen while `σχολεία_2020` survives.
const STORIES = `${import.meta.dir}/../../../stories`;
describe("a claim about a column the profiler refused is not decided against a different one", () => {
  it("names the refused column and its reason instead of ruling on the survivor", () => {
    const profile = JSON.parse(
      readFileSync(`${STORIES}/stress-r-greek-schools/source/profile.json`, "utf8"),
    );
    const csv = readFileSync(`${STORIES}/stress-r-greek-schools/source/data.csv`, "utf8");
    const { claims } = groundTakeaway("Attica has the most σχολεία of any region.", profile, { csv });

    expect(claims).toHaveLength(1);
    expect(claims[0].verdict).toBe("unverifiable");
    expect(claims[0].detail).toContain('"σχολεία_2026"');
    expect(claims[0].detail).toContain("REFUSED to type");
    expect(claims[0].detail).toContain("term378");
    // The survivor is named as what it declined to answer with, never as the answer.
    expect(claims[0].detail).toContain('"σχολεία_2020"');
    expect(claims[0].verdict).not.toBe("contradicted");
  });

  it("still decides a claim that names only a surviving measure", () => {
    const profile = JSON.parse(
      readFileSync(`${STORIES}/stress-l-mixed-unit-clinics/source/profile.json`, "utf8"),
    );
    const csv = readFileSync(`${STORIES}/stress-l-mixed-unit-clinics/source/data.csv`, "utf8");
    const { claims } = groundTakeaway("Germany has the most.", profile, { csv });
    expect(claims[0].verdict).toBe("supported");
  });
});

// =============================================================================================
// ROUND FIVE (2026-08-21) — THE CHECK STOPS ANSWERING WITH THE WRONG EVIDENCE.
//
// The fourth consecutive round to open in this file, and this time every defect is in code round
// four wrote. Same discipline as the round-four block above: every case below runs against REAL
// FROZEN STORY MATERIAL, because a fixture built to fail proves only that the fixture fails.
// =============================================================================================

describe("an aggregate 'equals' is never wider than the number it compares (round five, U1)", () => {
  // The round's headline, verbatim from the raw findings: `0.61` is stress-u's 2025 AREA, and it
  // was declared equal to the sum of `volume_km3` (0.482) — 27% away — under `supported`, the
  // strongest verdict this checker gives and the one `groundingScalar` closes G1 on. The cause
  // was the absolute floor of 0.5, which scales catastrophically downward: for a sum of 0.482 the
  // window was ±0.5, so any value from −0.018 to 0.982 "equalled" it.
  it("should refuse to call stress-u's 2025 area the total of a column 27% away", () => {
    const { claims } = grounded(
      "stress-u-rhone-glacier",
      "The Rhone glacier has fallen to 0.61 square kilometres in 2025.",
    );
    const claim = claims.find((c) => c.claim === "0.61");
    expect(claim).toBeTruthy();
    expect(claim.verdict).not.toBe("supported");
    expect(claim.detail).not.toContain("equals the sum");
  });

  // The floor's own reason survives: a numeral WRITTEN as a round integer really is allowed half a
  // unit of rounding slack. What it may not do is carry that half-unit down onto a column two
  // orders of magnitude smaller than it.
  it("should still confirm a total a journalist rounded, on the same frozen story", () => {
    const { claims } = grounded(
      "stress-u-rhone-glacier",
      "The eight readings add to 10.5 square kilometres of ice in all.",
    );
    const claim = claims.find((c) => c.claim === "10.5");
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("area_km2");
  });

  // And a small column is still checkable — at the precision the numeral itself was written to.
  it("should confirm a small column's own total when the numeral is written to its precision", () => {
    const { claims } = grounded(
      "stress-u-rhone-glacier",
      "The eight volume readings add to 0.48 cubic kilometres in all.",
    );
    const claim = claims.find((c) => c.claim === "0.48");
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("volume_km3");
  });

  // The second bound, stated in the brief as "the floor cannot exceed the value it is comparing".
  // A bare "0" is written to the unit, so the rounding window alone would still hand it the full
  // half-unit — enough to swallow stress-u's `volume_km3` total of 0.482 whole.
  it("should never let the rounding window exceed the numbers it is comparing", () => {
    const { claims } = grounded(
      "stress-u-rhone-glacier",
      "The glacier lost 0 cubic kilometres in all over the period.",
    );
    const claim = claims.find((c) => c.claim === "0");
    expect(claim.verdict).not.toBe("supported");
    expect(claim.detail).not.toContain("equals the sum");
  });
});
