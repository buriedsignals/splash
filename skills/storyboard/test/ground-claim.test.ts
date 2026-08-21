import { describe, it, expect } from "bun:test";
import { groundTakeaway } from "../scripts/ground-claim.mjs";
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

  it("should mark a numeric token inside a column's range as supported", () => {
    const { claims } = groundTakeaway("the total reached 42 units", PROFILE);
    const claim = claims.find((c) => c.claim === "42");
    expect(claim.verdict).toBe("supported");
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
    const claim = claims.find((c) => c.claim.includes("has the most"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("90");
  });

  it("should contradict 'has the most' when the named entity does not hold the maximum", () => {
    const { claims } = groundTakeaway("France has the most.", PROFILE_WITH_ROWS);
    const claim = claims.find((c) => c.claim.includes("has the most"));
    expect(claim.verdict).toBe("contradicted");
    expect(claim.detail).toContain("60");
    expect(claim.detail).toContain("90");
  });

  it("should return unverifiable, naming the entity it could not resolve, when the profile carries no rows", () => {
    const profile = { columns: PROFILE_WITH_ROWS.columns };
    const { claims } = groundTakeaway("Germany has the most.", profile);
    const claim = claims.find((c) => c.claim.includes("has the most"));
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

  it("should still support a year in a profile with no coverage column", () => {
    const profile = { columns: [{ name: "year", type: "number", min: 2020, max: 2026, sum: 14161 }] };
    const { claims } = groundTakeaway("Permits rose to a record in 2026.", profile);
    const yearClaim = claims.find((c) => c.claim === "2026");
    expect(yearClaim.verdict).toBe("supported");
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
    const claim = claims.find((c) => c.claim.includes("has the most"));
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
