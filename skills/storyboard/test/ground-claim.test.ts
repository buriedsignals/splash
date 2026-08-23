import { describe, it, expect } from "bun:test";
import {
  groundTakeaway,
  readFrozenRows,
  measureColumns,
  findYearColumn,
} from "../scripts/ground-claim.mjs";
import { readFileSync } from "node:fs";
// The one cross-skill import a `test/` directory is allowed: the other half of the seam A13 lived
// in. See the block at the bottom of this file for why it is here and what stayed green without it.
import { profileTable } from "../../intake/scripts/profile.mjs";
import { parseCsv } from "../../intake/scripts/csv.mjs";

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
    // The claim is quoted back as the sentence writes it — the numeral AND its scale word — so
    // a journalist can see which phrase was checked. See the multiplier block at the foot of this
    // file for why "34 millions" is one claim.
    const claim = claims.find((c) => c.claim.startsWith("34"));
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
    expect(claims.find((c) => c.claim.startsWith("34")).verdict).toBe(
      "supported",
    );
  });

  it("should not stretch the aggregate match to a value well off the sum", () => {
    // 44 is 29% above glace_fondue_mt's total of 34, and in no column's range. Widening
    // AGGREGATE_TOLERANCE far enough to swallow it is what this case exists to redden.
    const { claims } = groundTakeaway(
      "le total atteint 44 millions de tonnes",
      OLYMPICS_PROFILE,
    );
    const claim = claims.find((c) => c.claim.startsWith("44"));
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
    [
      "acteur",
      "emissions_tco2e",
      "glace_fondue_mt",
      "manteau_neigeux_km2",
      "basis",
    ],
    ["Jeux (émissions officielles)", "930000", "14", "2.3", "publié"],
    ["Eni", "700000", "11", "1.7", "publié"],
    [
      "Stellantis + ITA Airways",
      "600000",
      "9",
      "1.5",
      "dérivé par soustraction",
    ],
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
    const total = claims.find((c) => c.claim.startsWith("34"));
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
    {
      name: "year",
      type: "number",
      missing: 0,
      distinct: 4,
      min: 2019,
      max: 2022,
      sum: 8082,
    },
    {
      name: "vacant_homes_pct",
      type: "number",
      missing: 0,
      distinct: 4,
      min: 7.2,
      max: 8.4,
      sum: 31.3,
    },
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
      groundTakeaway(
        "Vacancy is climbing, year after year.",
        VACANT_HOMES_PROFILE,
      ).claims,
    ).toEqual([]);
  });
});

// stories/stress-e-electricity-mix/source/profile.json, verbatim — share_pct sums to 95.2, not
// 100, while the article claims the six shares "make up the whole of national supply".
const ELECTRICITY_MIX_PROFILE = {
  rowCount: 6,
  columns: [
    {
      name: "source",
      type: "text",
      missing: 0,
      distinct: 6,
      min: null,
      max: null,
      sum: null,
    },
    {
      name: "share_pct",
      type: "number",
      missing: 0,
      distinct: 6,
      min: -4.1,
      max: 41.2,
      sum: 95.2,
    },
  ],
  duplicates: { count: 0, rows: [] },
};

describe("groundTakeaway — a part-to-whole totality claim checked against the column's own sum", () => {
  it("should contradict a totality claim when the summed share column does not add up to the whole, naming both numbers", () => {
    const { claims } = groundTakeaway(
      "Together these make up the whole of national supply.",
      ELECTRICITY_MIX_PROFILE,
    );
    const totality = claims.find((c) =>
      c.claim.toLowerCase().includes("whole"),
    );
    expect(totality).toBeTruthy();
    expect(totality.verdict).toBe("contradicted");
    expect(totality.detail).toContain("95.2");
    expect(totality.detail).toContain("100");
    expect(totality.detail).toContain("share_pct");
  });

  it("should support a totality claim when the summed share column does add up to the whole", () => {
    const profile = {
      columns: [
        {
          name: "share_pct",
          type: "number",
          missing: 0,
          distinct: 3,
          min: 20,
          max: 50,
          sum: 100,
        },
      ],
    };
    const { claims } = groundTakeaway(
      "All of the shares together make up the whole of supply.",
      profile,
    );
    const totality = claims.find((c) => /whole|all of/i.test(c.claim));
    expect(totality).toBeTruthy();
    expect(totality.verdict).toBe("supported");
  });

  it("should mark a totality claim unverifiable, never supported and never silent, when no share column can be identified", () => {
    const profile = {
      columns: [
        {
          name: "tonnes",
          type: "number",
          missing: 0,
          distinct: 3,
          min: 9,
          max: 14,
          sum: 34,
        },
      ],
    };
    const { claims } = groundTakeaway(
      "Together these make up the whole of the total.",
      profile,
    );
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
  const CASES = [
    "42",
    "1.7",
    "8.4",
    "-4.1",
    "14,205",
    "14,205.5",
    "1,7",
    "1,234",
    "not-a-number",
    "",
  ];
  for (const raw of CASES) {
    it(`should agree on "${raw}"`, () => {
      expect(readNumericTokenFromStoryboard(raw)).toEqual(
        readNumericTokenFromIntake(raw),
      );
    });
  }

  it("should read a plain number outright", () => {
    expect(readNumericTokenFromStoryboard("42")).toEqual({ value: 42 });
  });

  it("should read a thousands-grouped number that settles itself with a decimal tail", () => {
    expect(readNumericTokenFromStoryboard("14,205.5")).toEqual({
      value: 14205.5,
    });
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
  // ROUND SIX amends the VERDICT here and not the guarantee. The guarantee — one claim or none,
  // never two fragments — is what this case exists for and is asserted unchanged. The verdict moved
  // from `unverifiable` to `consistent` because the frozen table now settles the comma: 14205 is
  // `permits_issued`'s own minimum and 14.205 is a number this table holds nowhere, so exactly one
  // of the two readings survives (see `settleGroupedNumeral`). It is still not `supported`.
  it("should read '14,205' as ONE claim, never split into '14' and '205'", () => {
    const profile = {
      columns: [
        {
          name: "permits_issued",
          type: "number",
          min: 14205,
          max: 58990,
          sum: 339775,
        },
      ],
    };
    const { claims } = groundTakeaway(
      "Permits fell to 14,205 in the partial year.",
      profile,
    );
    expect(claims.some((c) => c.claim === "14")).toBe(false);
    expect(claims.some((c) => c.claim === "205")).toBe(false);
    const whole = claims.find((c) => c.claim === "14,205");
    expect(whole).toBeTruthy();
    expect(whole.verdict).toBe("consistent");
    expect(whole.detail).toContain("14205");
  });

  it("should read the French '1,7' as ONE claim, never split into '1' and '7'", () => {
    const profile = {
      columns: [
        { name: "taux", type: "number", min: 1.7, max: 6.4, sum: 93.8 },
      ],
    };
    const { claims } = groundTakeaway(
      "Le taux atteint 1,7 % à Appenzell.",
      profile,
    );
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
    const { claims } = groundTakeaway(
      "Germany has the most.",
      PROFILE_WITH_ROWS,
    );
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("90");
  });

  it("should contradict 'has the most' when the named entity does not hold the maximum", () => {
    const { claims } = groundTakeaway(
      "France has the most.",
      PROFILE_WITH_ROWS,
    );
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
    const { claims } = groundTakeaway(
      "Germany tops the table.",
      PROFILE_WITH_ROWS,
    );
    const claim = claims.find((c) => c.claim === "tops");
    expect(claim.verdict).toBe("supported");
  });

  it("should read a bare 'the lowest' as the column's own minimum", () => {
    const { claims } = groundTakeaway(
      "Italy reports the lowest value.",
      PROFILE_WITH_ROWS,
    );
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
      {
        name: "loss_ha",
        type: "number",
        min: 39000,
        max: 1120000,
        sum: 2702000,
      },
      { name: "year", type: "number", min: 2025, max: 2025, sum: 14175 },
    ],
  };

  it("should contradict a false 'more than the others combined' claim from the column's own max and sum alone, no rows needed", () => {
    const { claims } = groundTakeaway(
      "Brazil lost more forest than the other six countries combined",
      FOREST_PROFILE,
    );
    const claim = claims.find((c) =>
      c.claim.toLowerCase().includes("combined"),
    );
    expect(claim).toBeTruthy();
    expect(claim.verdict).toBe("contradicted");
    expect(claim.detail).toContain("1120000");
    expect(claim.detail).toContain("1582000");
  });

  it("should support a true 'more than any other' claim once the entity resolves to the column's maximum", () => {
    const profile = {
      columns: [
        { name: "country", type: "text", min: null, max: null, sum: null },
        {
          name: "loss_ha",
          type: "number",
          min: 39000,
          max: 1120000,
          sum: 2702000,
        },
      ],
      rows: [
        { country: "Brazil", loss_ha: 1120000 },
        { country: "Congo DR", loss_ha: 588000 },
      ],
    };
    const { claims } = groundTakeaway(
      "Brazil lost more forest than any other country",
      profile,
    );
    const claim = claims.find((c) =>
      c.claim.toLowerCase().includes("any other"),
    );
    expect(claim.verdict).toBe("supported");
  });

  it("should stay unverifiable, naming the entity, when the arithmetic cannot refute it but rows cannot resolve who the leader is", () => {
    const profile = {
      columns: [
        { name: "country", type: "text", min: null, max: null, sum: null },
        {
          name: "loss_ha",
          type: "number",
          min: 39000,
          max: 1120000,
          sum: 1400000,
        },
      ],
    };
    const { claims } = groundTakeaway(
      "Brazil lost more forest than the other countries combined",
      profile,
    );
    const claim = claims.find((c) =>
      c.claim.toLowerCase().includes("combined"),
    );
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
        {
          name: "loss_ha",
          type: "number",
          min: 39000,
          max: 1120000,
          sum: 2702000,
        },
        { name: "year", type: "number", min: 2025, max: 2025, sum: 14175 },
      ],
    };
    const { claims } = groundTakeaway(
      "Brazil leads the annual figures again.",
      profile,
    );
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
      {
        name: "permits_issued",
        type: "number",
        min: 14205,
        max: 58990,
        sum: 339775,
      },
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
    const profile = {
      columns: [
        { name: "year", type: "number", min: 2020, max: 2026, sum: 14161 },
      ],
    };
    const { claims } = groundTakeaway(
      "Permits rose to a record in 2026.",
      profile,
    );
    const yearClaim = claims.find((c) => c.claim === "2026");
    expect(yearClaim.verdict).toBe("consistent");
  });

  it("should refuse a superlative over the data when a completeness flag column exists (stress-o shape)", () => {
    const profile = {
      columns: [
        { name: "period", type: "text", min: null, max: null, sum: null },
        {
          name: "visits",
          type: "number",
          min: 118000,
          max: 501000,
          sum: 1975000,
        },
        { name: "complete", type: "text", min: null, max: null, sum: null },
      ],
      rows: [
        { period: "2025", visits: 501000, complete: "yes" },
        { period: "2026 (Jan-Mar)", visits: 118000, complete: "no" },
      ],
    };
    const { claims } = groundTakeaway(
      "The 2026 period has the most visits.",
      profile,
    );
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("complete");
  });
});

// COVERAGE — so silence stops looking like confirmation.
describe("groundTakeaway — coverage reports what was actually read, beside the claims", () => {
  it("should mark a sentence 'evaluated' once it produces a claim, even an unverifiable one", () => {
    const profile = {
      columns: [{ name: "value", type: "number", min: 0, max: 10, sum: 20 }],
    };
    const { coverage } = groundTakeaway("Germany has the most.", profile);
    expect(coverage.sentences).toBe(1);
    expect(coverage.evaluated).toBe(1);
    expect(coverage.unevaluated).toEqual([]);
  });

  it("should mark a sentence 'unevaluated' when nothing in it produced any claim at all", () => {
    const { coverage } = groundTakeaway(
      "Renewables overtook coal as the main source",
      NORWAY_PROFILE,
    );
    expect(coverage.sentences).toBe(1);
    expect(coverage.evaluated).toBe(0);
    expect(coverage.unevaluated).toEqual([
      "Renewables overtook coal as the main source",
    ]);
  });

  it("should tell apart a takeaway that was checked-and-passed from one that is entirely unverifiable", () => {
    const profileNoRows = {
      columns: [
        { name: "country", type: "text", min: null, max: null, sum: null },
        { name: "value", type: "number", min: 10, max: 90, sum: 220 },
      ],
    };
    const allUnverifiable = groundTakeaway(
      "Germany has the most.",
      profileNoRows,
    );
    // Every claim unverifiable, but the sentence WAS read — visibly different from silence.
    expect(allUnverifiable.coverage.evaluated).toBe(1);
    expect(
      allUnverifiable.claims.every((c) => c.verdict === "unverifiable"),
    ).toBe(true);

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
    expect(checkedAndPassed.claims.some((c) => c.verdict === "supported")).toBe(
      true,
    );
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
  readFileSync(
    new URL(`../../../stories/${relative}`, import.meta.url),
    "utf8",
  );
const storyProfile = (story) =>
  JSON.parse(storyFile(`${story}/source/profile.json`));
const storyCsv = (story) => storyFile(`${story}/source/data.csv`);
const grounded = (story, sentence) =>
  groundTakeaway(sentence, storyProfile(story), { csv: storyCsv(story) });

describe("readFrozenRows — where rows come from now (finding 2)", () => {
  it("should read the frozen table into rows, reading each cell by the shared number reader", () => {
    const rows = readFrozenRows(storyCsv("stress-l-mixed-unit-clinics"));
    expect(rows.length).toBe(8);
    expect(rows[1]).toEqual({
      code: "DEU",
      country: "Germany",
      value: 1880,
      unit: "clinics",
    });
  });

  it("should leave a cell that is not a numeral as its own text, never coerced to NaN", () => {
    const rows = readFrozenRows(storyCsv("stress-r-greek-schools"));
    expect(rows[0]["σχολεία_2026"]).toBe("term378");
    expect(rows[0]["σχολεία_2020"]).toBe(412);
  });

  it("should return no rows at all for a table with only a header, rather than a row of nulls", () => {
    expect(readFrozenRows("a,b\n")).toEqual([]);
  });

  // FOUND 2026-08-23, by running the reader rather than reading it. This reader split the text into
  // LINES first and parsed quotes inside each line, so a quoted field carrying its own newline —
  // legal RFC 4180, and what a journalist's note column looks like the moment somebody wrapped a
  // sentence — was torn in two: the tail became a whole extra ROW whose first column read as an
  // entity name and whose every other column was empty. Everything downstream (the superlative
  // check, `panelShapeOf`, every value lookup) then answered over a row that does not exist.
  //
  // `csvSplitByHand` — the guard this skill carries for exactly this file — cannot see it: there is
  // no `.split(",")` anywhere in the reader. That is the measurement that says a guard is not a
  // substitute for one reader: `intake` froze this table with a real RFC 4180 parser and this skill
  // read it back with a second, line-oriented one, and the two disagreed about how many rows the
  // table has.
  it("should keep a quoted field's own newline inside its cell, not start a new row on it", () => {
    const csv = [
      "entity,value,note",
      '"Bonaire, Sint Eustatius and Saba",42,plain',
      '"Netherlands, the","1,234.5","a note\nspanning two lines"',
      "Chad,7,ok",
    ].join("\n");
    const rows = readFrozenRows(csv);
    expect(rows.map((row) => row.entity)).toEqual([
      "Bonaire, Sint Eustatius and Saba",
      "Netherlands, the",
      "Chad",
    ]);
    expect(rows[1].note).toBe("a note\nspanning two lines");
  });

  // The same table read by `intake`'s own parser, so the claim is that the two skills agree rather
  // than that this one is self-consistent. A13's whole seam is two skills reading one frozen table.
  it("should read the same rows intake's own reader does", () => {
    const csv = 'a,b\n"one, two","carrying\na newline"\nplain,text\n';
    const [header, ...rows] = parseCsv(csv);
    expect(header).toEqual(["a", "b"]);
    expect(readFrozenRows(csv)).toEqual(
      rows.map((cells) => ({ a: cells[0], b: cells[1] })),
    );
  });
});

describe("a superlative that DECIDES, on real story material (finding 2)", () => {
  // stories/stress-l-mixed-unit-clinics/source/article.md, last line. Its own shipped BRIEF.md
  // records the old behaviour verbatim: "it returned `[]` — no claim shape at all".
  it("should SUPPORT the frozen article's own superlative once the frozen CSV supplies the rows", () => {
    const { claims } = grounded(
      "stress-l-mixed-unit-clinics",
      "Germany has the most.",
    );
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
    const { claims } = grounded(
      "stress-m-forest-loss",
      "Brazil leads the annual figures again.",
    );
    const claim = claims.find((c) => c.claim === "leads");
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("loss_ha");
    expect(claim.detail).toContain("1120000");
  });

  it("should refuse a superlative whose entity matches SEVERAL rows rather than pick one", () => {
    // heat-pump's table is long-format: five rows per country, one per year.
    //
    // The refusal itself is the point of this test and it has not moved. What moved is the REASON
    // it gives. It used to say "The Netherlands matches 5 rows", which is true and tells a
    // journalist nothing they can act on; since the panel work of 2026-08-22 it names the shape it
    // found and the one thing that would settle it — which period the superlative is about. A
    // refusal that does not name what would lift it is the defect round four found in this very
    // function, one level up.
    const { claims } = grounded(
      "heat-pump-adoption-across-europe",
      "The Netherlands made the largest gain, climbing 18 percentage points.",
    );
    const claim = claims.find((c) => c.claim.includes("the largest"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain('one per "country"');
    expect(claim.detail).toContain("Name the period");
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
    const { claims } = grounded(
      "stress-m-forest-loss",
      "Brazil's own figure leads the table.",
    );
    const claim = claims.find((c) => c.claim === "leads");
    expect(claim.verdict).toBe("supported");
  });
});

describe("a numeral inside a range is PLACED, not confirmed (finding 1)", () => {
  // The exact reproduction in the round-four raw findings: "3 of 3 claim(s) confirmed" on
  // per-100k rates matched against a raw-count column by coincidence — 100 included.
  // ROUND FIVE amended the verdict here, and the amendment is the same finding one step
  // further: these three numerals are per-100,000 RATES, and the sentence names BOTH of the
  // measures they could be about ("incidents", "residents"). Round four stopped calling them
  // `supported`; round five stops calling them `placed` in a column nothing chose. They are
  // reported unplaced, naming both candidates and the range they would have fallen into — and
  // the original point of this case is unchanged and still asserted: nothing here is confirmed.
  it("should not confirm — or silently place — stress-q's per-100k rates", () => {
    const { claims } = grounded(
      "stress-q-safety-incidents",
      "Sul records 233 incidents per 100k residents, against Centro's 205.",
    );
    for (const numeral of ["233", "100", "205"]) {
      const claim = claims.find((c) => c.claim === numeral);
      expect(claim.verdict).toBe("unverifiable");
      expect(claim.detail).toContain('"incidents"');
      expect(claim.detail).toContain('"residents"');
    }
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
    expect(claims.some((c) => c.verdict === "consistent")).toBe(false);
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
    expect(claims.find((c) => c.claim.startsWith("4.1")).verdict).toBe(
      "unverifiable",
    );
    expect(claims.find((c) => c.claim === "0").verdict).toBe("unverifiable");
    expect(claims.some((c) => c.verdict === "supported")).toBe(false);
  });

  // A part-to-whole total is the one numeric reading here that CAN fail, so it stays "supported"
  // — but only where it is a real total. Two degeneracies are refused: a year column (whose six
  // 2025 rows "sum" to 12150) and a column whose sum is its own min or max, which is what a
  // one-row table always produces.
  it("should not read the year column as a part-to-whole total", () => {
    const { claims } = grounded(
      "stress-s-unspent-fund",
      "The fund's own total is 2026.",
    );
    const claim = claims.find((c) => c.claim === "2026");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).not.toContain("sum");
  });

  it("should not read a year column's own sum as a part-to-whole total", () => {
    // stress-p's `year` column is six rows of 2025, so it "sums" to 12150 — a number that is a
    // total of nothing.
    const { claims } = grounded(
      "stress-p-transport-ridership",
      "The networks carried 12150 in all.",
    );
    const claim = claims.find((c) => c.claim === "12150");
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).not.toContain("equals the sum");
  });

  it("should not read a one-row column's own value as its own total", () => {
    // stress-s's `fund` column is min 1, max 1, sum 1 — every one of those is the same number.
    const { claims } = grounded(
      "stress-s-unspent-fund",
      "The fund disbursed 1 euro.",
    );
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
      expect(
        claims.some((c) =>
          c.claim.toLowerCase().includes(phrase.replace(/^the /, "")),
        ),
      ).toBe(true);
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
    const claim = claims.find((c) =>
      c.claim.toLowerCase().includes("combined"),
    );
    // Same as above: the column is chosen and the arithmetic decided, and finding 5's denominator
    // question is what holds the confirmation back — `population` sits beside `trips_millions`.
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("trips_millions");
    expect(claim.detail).toContain("exceeds the sum of the rest");
  });

  it("should refuse, naming every candidate, when the sentence names none of the measures", () => {
    const { claims } = grounded(
      "stress-r-greek-schools",
      "Attica has the most schools of any region.",
    );
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
    const { claims } = grounded(
      "stress-r-greek-schools",
      "Attica has the most schools of any region.",
    );
    const claim = claims.find((c) => c.claim.includes("the most"));
    expect(claim.detail).toContain("σχολεία_2026");
  });

  it("should stay quiet about refused columns in a profile that has none", () => {
    const { claims } = grounded(
      "stress-m-forest-loss",
      "The figure reached 999999999 hectares.",
    );
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
  const CENTRO =
    "Centro recorded 412 incidents last year, more than any other district.";

  it("should refuse to confirm the frozen article's own raw-count superlative", () => {
    const { claims } = grounded("stress-q-safety-incidents", CENTRO);
    const claim = claims.find((c) => c.claim.includes("more than any other"));
    // It WAS "supported" — a true sentence about raw counts, confirming a false headline.
    expect(claim.verdict).toBe("unverifiable");
  });

  it("should name BOTH rankings, with the numbers, so the journalist can choose", () => {
    const { claims } = grounded("stress-q-safety-incidents", CENTRO);
    const detail = claims.find((c) =>
      c.claim.includes("more than any other"),
    ).detail;
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
    const { claims } = grounded(
      "stress-l-mixed-unit-clinics",
      "Germany has the most.",
    );
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
      readFileSync(
        `${STORIES}/stress-r-greek-schools/source/profile.json`,
        "utf8",
      ),
    );
    const csv = readFileSync(
      `${STORIES}/stress-r-greek-schools/source/data.csv`,
      "utf8",
    );
    const { claims } = groundTakeaway(
      "Attica has the most σχολεία of any region.",
      profile,
      { csv },
    );

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
      readFileSync(
        `${STORIES}/stress-l-mixed-unit-clinics/source/profile.json`,
        "utf8",
      ),
    );
    const csv = readFileSync(
      `${STORIES}/stress-l-mixed-unit-clinics/source/data.csv`,
      "utf8",
    );
    const { claims } = groundTakeaway("Germany has the most.", profile, {
      csv,
    });
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

describe("a column is named by a WORD, not by a fragment of another (round five, T12/Y1)", () => {
  // Round four taught the chooser to refuse a claim about a column the PROFILER refused, so it
  // could not be decided against a surviving one. It matched the column's name tokens as bare
  // SUBSTRINGS, so `survey_date`'s token "survey" is found inside the word "surveyed" — a word
  // this sentence uses incidentally, about when the figures were collected, not about what they
  // measure. The claim the sentence actually makes was then never attempted.
  const SURVEYED_TRUE =
    "Germany has the highest recycling rate of any country surveyed in March 2025.";
  const SURVEYED_FALSE =
    "Macedonia has the highest recycling rate of any country surveyed in March 2025.";

  it("should decide the claim the sentence makes, not refuse it over a word it used in passing", () => {
    const { claims } = grounded("stress-t-europe-recycling", SURVEYED_TRUE);
    const claim = claims.find((c) => c.claim.includes("the highest"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("recycling_rate");
    expect(claim.detail).not.toContain("survey_date");
  });

  // The shape this whole checker exists to prevent: a takeaway the frozen data REFUTES coming
  // back `unverifiable`, which closes G1 without a murmur.
  it("should REFUTE the same sentence with the wrong country, where it used to say unverifiable", () => {
    const { claims } = grounded("stress-t-europe-recycling", SURVEYED_FALSE);
    const claim = claims.find((c) => c.claim.includes("the highest"));
    expect(claim.verdict).toBe("contradicted");
    expect(claim.detail).toContain("18.4");
  });

  // And the round-four fix itself is not undone: a sentence that really does name the refused
  // column is still refused, by name, with the profiler's own reason.
  it("should still refuse a claim whose sentence really does name the refused column", () => {
    const { claims } = grounded(
      "stress-t-europe-recycling",
      "Germany has the highest recycling rate, though the survey date differs across the table.",
    );
    const claim = claims.find((c) => c.claim.includes("the highest"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("survey_date");
    expect(claim.detail).toContain("REFUSED to type");
  });
});

describe("a numeral is placed against the column its own SENTENCE names (round five, T13)", () => {
  // `stress-y-rural-broadband`'s own frozen takeaway. `2025` is the month the survey was taken;
  // `households` runs [240, 47933]; the numeral fell inside it and came back `consistent` —
  // "placed", in a column of household counts, on the strength of nothing.
  const BROADBAND =
    "Broadband coverage does not follow a municipality's size: across the 186 municipalities " +
    "surveyed in June 2025, the smallest towns are no worse served than the largest, and " +
    "coverage runs the full width of the range at every scale.";

  it("should stop placing a survey year inside a count of households", () => {
    const { claims } = grounded("stress-y-rural-broadband", BROADBAND);
    const claim = claims.find((c) => c.claim === "2025");
    expect(claim).toBeTruthy();
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("calendar year");
    // It still SAYS where the numeral would have landed — refusing is not going quiet.
    expect(claim.detail).toContain("households");
  });

  // T13: two clauses of one takeaway decided against different evidence. The superlative was
  // refused for want of a column the sentence names, while the numeral in the same sentence was
  // quietly placed in `collected_kt` — a different column, chosen by nothing but arithmetic.
  it("should not decide two claims of one sentence against two different columns", () => {
    const { claims } = grounded(
      "stress-t-europe-recycling",
      "Germany recycles the highest share of its waste of any country surveyed in March 2025.",
    );
    const numeral = claims.find((c) => c.claim === "2025");
    expect(numeral.verdict).toBe("unverifiable");
    expect(numeral.detail).not.toContain("within the range of column");
    expect(claims.every((c) => c.verdict === "unverifiable")).toBe(true);
  });

  // And the placement itself survives where the sentence really does name its own measure: the
  // frozen `stress-u` takeaway names the AREA, and both of its figures are area figures.
  it("should still place a numeral in the measure the sentence itself names", () => {
    const { claims } = grounded(
      "stress-u-rhone-glacier",
      "The Rhone glacier's area in 2025 is the lowest since 1990 — 0.61 square kilometres against 1.82, a loss of two thirds.",
    );
    for (const numeral of ["0.61", "1.82"]) {
      const claim = claims.find((c) => c.claim === numeral);
      expect(claim.verdict).toBe("consistent");
      expect(claim.detail).toContain("area_km2");
    }
  });

  // A bare year in a table that HAS a period column is still placed against that period column,
  // never against a measure that happens to span it.
  it("should place a bare year against the profile's own period column", () => {
    const { claims } = grounded(
      "stress-u-rhone-glacier",
      "The glacier was surveyed again in 2015 for the eighth time.",
    );
    const claim = claims.find((c) => c.claim === "2015");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain("year");
  });
});

describe("a stated multiplier is read, and a digit glued to a word is not a number (round five, X7)", () => {
  // Journalists write "1.12 million hectares"; frozen tables store 1120000. Before this, the one
  // numeric reading this check can make was unavailable for the commonest way a number appears in
  // a takeaway, and every such story landed on `unverifiable` for a reason that had nothing to do
  // with the data.
  it("should place a figure written with its multiplier against a column in base units", () => {
    const { claims } = grounded(
      "stress-m-forest-loss",
      "Brazil lost 1.12 million hectares of forest last year.",
    );
    const claim = claims.find((c) => c.claim.includes("1.12"));
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain("million");
    expect(claim.detail).toContain("loss_ha");
  });

  it("should confirm a rounded total written with its multiplier, at the precision it was written to", () => {
    const { claims } = grounded(
      "stress-m-forest-loss",
      "The seven countries lost 2.7 million hectares between them.",
    );
    const claim = claims.find((c) => c.claim.includes("2.7"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("2702000");
  });

  // The multiplier is an ALTERNATIVE reading, never a replacement: the column's own unit may
  // already carry the scale. The Milan Cortina run's own takeaway says "34 millions de tonnes"
  // against `glace_fondue_mt`, which sums to exactly 34.
  it("should not lose a total whose column already carries the scale in its unit", () => {
    const { claims } = groundTakeaway(
      "le total atteint 34 millions de tonnes",
      OLYMPICS_PROFILE,
    );
    const claim = claims.find((c) => c.claim.includes("34"));
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("glace_fondue_mt");
  });

  // stories/stress-y-rural-broadband/STORYBOARD.md, `limits:`, verbatim. The identifier's own
  // digits were read as a negative number and reported as a claim of its own.
  it("should not read the digits of an identifier as a number the sentence states", () => {
    const { claims } = grounded(
      "stress-y-rural-broadband",
      "Commune-063 returned 104.2 per cent, which no percentage can be.",
    );
    expect(claims.some((c) => c.claim.includes("063"))).toBe(false);
    expect(claims.some((c) => c.claim === "104.2")).toBe(true);
  });
});

// ROUND FIVE, found by the controller integrating Task B: an entity whose own name carries digits
// could not be resolved to its row. `stress-y-rural-broadband` keys its rows `Commune-001` …
// `Commune-186`, and a takeaway naming one came back
//   could not resolve "Commune-" to a row in the frozen data
// because both capitalised-phrase patterns admitted letters, apostrophes, dots and hyphens and NOT
// digits, so the name was cut at the first digit. Pre-existing since round four -- this is simply
// the first story in the tree whose row keys are alphanumeric, and identifiers of that shape
// (case IDs, product codes, commune numbers) are ordinary in a journalist's table.
describe("an entity whose name carries digits resolves to its own row", () => {
  const STORY = `${import.meta.dir}/../../../stories/stress-y-rural-broadband/source`;

  it("reads the whole identifier, not the part before the first digit", () => {
    const profile = JSON.parse(readFileSync(`${STORY}/profile.json`, "utf8"));
    const csv = readFileSync(`${STORY}/data.csv`, "utf8");
    const { claims } = groundTakeaway(
      "Commune-186 reported the lowest coverage of any municipality.",
      profile,
      { csv },
    );
    expect(claims.length).toBeGreaterThan(0);
    // Whatever the verdict, the entity it names must be the whole identifier.
    expect(claims.some((c) => (c.detail ?? "").includes('"Commune-"'))).toBe(
      false,
    );
  });

  it("still refuses to swallow a following numeral into a name", () => {
    // "Germany 67.8" must not resolve an entity called "Germany 67.8" -- continuation requires a
    // capitalised word, so a bare numeral after a name is never joined to it.
    const profile = JSON.parse(
      readFileSync(
        `${import.meta.dir}/../../../stories/stress-l-mixed-unit-clinics/source/profile.json`,
        "utf8",
      ),
    );
    const csv = readFileSync(
      `${import.meta.dir}/../../../stories/stress-l-mixed-unit-clinics/source/data.csv`,
      "utf8",
    );
    const { claims } = groundTakeaway("Germany has the most.", profile, {
      csv,
    });
    expect(claims[0].verdict).toBe("supported");
  });
});

// =============================================================================================
// ROUND SIX (2026-08-22) — the fifth consecutive round to open in this checker, and the first in
// which every finding is a WRONG-EVIDENCE answer rather than a missing one. Each block below
// names the frozen story the controller measured it on; none of them is a fixture built to fail.
// =============================================================================================

describe("ROUND SIX — a totality claim is not confirmed by parts that cancel (finding Z2)", () => {
  // stories/stress-z-budget-parts: `part_pct` reaches 100 only because a -9.7 provision
  // write-back cancels a +9.7 overshoot. The positive parts sum to 109.7.
  it("should REFUSE to confirm the frozen story's totality sentence on a column that cancels", () => {
    const { claims } = grounded(
      "stress-z-budget-parts",
      "Les parts font ensemble 100 % du budget.",
    );
    const totality = claims.find((c) => c.claim.includes("100"));
    expect(totality).toBeTruthy();
    expect(totality.verdict).not.toBe("supported");
    expect(totality.verdict).toBe("unverifiable");
    expect(totality.detail).toContain("109.7");
    expect(totality.detail).toContain("-9.7");
  });

  it("should still CONFIRM a totality whose share column is made of non-negative parts", () => {
    const profile = {
      columns: [
        {
          name: "share_pct",
          type: "number",
          missing: 0,
          distinct: 3,
          min: 20,
          max: 50,
          sum: 100,
        },
      ],
    };
    const { claims } = groundTakeaway(
      "All of the shares together make up the whole of supply.",
      profile,
    );
    expect(claims.find((c) => /whole|all of/i.test(c.claim)).verdict).toBe(
      "supported",
    );
  });
});

describe("ROUND SIX — the relation a numeral sits under, not only the numeral (finding Z2)", () => {
  // The headline. "the sum of the parts is GREATER than 100" came back `supported` because the
  // numeral 100 matched the column's own sum.
  it("should refuse to confirm a sentence that DENIES the total it names", () => {
    const { claims } = grounded(
      "stress-z-budget-parts",
      "La somme des parts est supérieure à 100.",
    );
    const claim = claims.find((c) => c.claim.includes("100"));
    expect(claim).toBeTruthy();
    expect(claim.verdict).not.toBe("supported");
    // The column has two totals and the sentence does not say which it means.
    expect(claim.detail).toContain("109.7");
    expect(claim.detail).toContain("greater than 100");
  });

  // stories/milan-cortina-la-glace-des-sponsors: `glace_fondue_mt` sums to exactly 34, on three
  // non-negative rows (14 + 11 + 9). One total, so the relation decides outright.
  it("should CONTRADICT a 'more than' claim whose column totals exactly the numeral", () => {
    const { claims } = grounded(
      "milan-cortina-la-glace-des-sponsors",
      "Soit plus de 34 millions de tonnes de glace au total.",
    );
    const claim = claims.find((c) => c.claim.includes("34"));
    expect(claim.verdict).toBe("contradicted");
    expect(claim.detail).toContain("glace_fondue_mt");
  });

  it("should still SUPPORT the frozen article's own equality, which states no relation", () => {
    const { claims } = grounded(
      "milan-cortina-la-glace-des-sponsors",
      "Soit 34 millions de tonnes de glace au total.",
    );
    expect(claims.find((c) => c.claim.includes("34")).verdict).toBe(
      "supported",
    );
  });

  it("should SUPPORT an 'at least' claim the same total satisfies", () => {
    const { claims } = grounded(
      "milan-cortina-la-glace-des-sponsors",
      "Soit au moins 34 millions de tonnes de glace au total.",
    );
    expect(claims.find((c) => c.claim.includes("34")).verdict).toBe(
      "supported",
    );
  });
});

// The brief for this round reads: "A numeral equal to a column's min or max, or present verbatim
// in a row, is only `consistent` — never `supported`. `rowCount` and `column.missing` are never a
// numeral's home." The first sentence is taken as the RULE to hold — round four reasoned it twice
// and four tests above encode it — so the verdict does not move here; what moves is the EVIDENCE,
// which used to hide an exact hit inside "within the range of …". The second sentence is the gap:
// `rowCount` and `missing` had no way of being a numeral's home at all.
describe("ROUND SIX — a range hit says what it actually matched (beat AA)", () => {
  // stories/stress-aa-salary-spread: annual_salary_eur [14664, 238530], 240 rows, 6 blank cells.
  it("should name the column's own MAXIMUM without raising the verdict", () => {
    const { claims } = grounded(
      "stress-aa-salary-spread",
      "The highest salary is 238530 euros.",
    );
    const claim = claims.find((c) => c.claim === "238530");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain("maximum");
    expect(claim.detail).toContain("annual_salary_eur");
  });

  it("should name the column's own MINIMUM without raising the verdict", () => {
    const { claims } = grounded(
      "stress-aa-salary-spread",
      "The lowest salary is 14664 euros.",
    );
    const claim = claims.find((c) => c.claim === "14664");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain("minimum");
  });

  it("should give a numeral the frozen table's own ROW COUNT and BLANK COUNT as a home", () => {
    const { claims } = grounded(
      "stress-aa-salary-spread",
      "Payroll data for 240 employees, of whom 6 returned no salary.",
    );
    const rows = claims.find((c) => c.claim === "240");
    expect(rows.verdict).toBe("supported");
    expect(rows.detail).toContain("240");
    expect(rows.detail).toMatch(/row/i);
    const blanks = claims.find((c) => c.claim === "6");
    expect(blanks.verdict).toBe("supported");
    expect(blanks.detail).toContain("annual_salary_eur");
  });

  it("should say when the frozen table holds the numeral verbatim, and still not confirm the sentence", () => {
    const { claims } = grounded(
      "stress-ac-alcanede-kilns",
      "In 2010 there were 9 kilns still firing.",
    );
    const claim = claims.find((c) => c.claim === "9");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain("kilns_active");
    expect(claim.detail).toContain("verbatim");
  });

  it("should leave a numeral merely INSIDE the range `consistent`, as round four decided", () => {
    const { claims } = grounded(
      "stress-aa-salary-spread",
      "A typical salary here is 40000 euros.",
    );
    expect(claims.find((c) => c.claim === "40000").verdict).toBe("consistent");
  });

  it("should never let an exact match reach `supported`, whatever the sentence around it", () => {
    for (const sentence of [
      "Fewer than 42 kilns were active.",
      "42 kilns were active.",
    ]) {
      const { claims } = grounded("stress-ac-alcanede-kilns", sentence);
      expect(claims.find((c) => c.claim === "42").verdict).toBe("consistent");
    }
  });
});

describe("ROUND SIX — a coordinate column is not a measure (beat AC)", () => {
  it("should not offer site_lat and site_lon as measures a superlative could be about", () => {
    const columns = storyProfile("stress-ac-alcanede-kilns").columns;
    const names = measureColumns(columns, findYearColumn(columns)).map(
      (c) => c.name,
    );
    expect(names).not.toContain("site_lat");
    expect(names).not.toContain("site_lon");
    expect(names).toContain("kilns_active");
  });

  it("should keep a column named `long` that measures something else", () => {
    const columns = [
      { name: "year", type: "number", min: 2000, max: 2020 },
      { name: "tunnel_long_m", type: "number", min: 900, max: 5400 },
    ];
    expect(
      measureColumns(columns, findYearColumn(columns)).map((c) => c.name),
    ).toContain("tunnel_long_m");
  });

  it("should stop naming coordinate columns in a geographic superlative's refusal", () => {
    const { claims } = grounded(
      "stress-ab-emigration-flows",
      "Lisboa has the highest.",
    );
    const claim = claims[0];
    expect(claim.detail).not.toContain("origin_lat");
    expect(claim.detail).not.toContain("dest_lon");
  });
});

describe("ROUND SIX — a four-digit measure value is not forced onto the period column (beat AC)", () => {
  it("should not put a measure value on the period column just because it reads as a year", () => {
    const { claims } = grounded(
      "stress-ac-alcanede-kilns",
      "The kilns employed 1860 people in 1980.",
    );
    const claim = claims.find((c) => c.claim === "1860");
    // Before this round: `could not be placed in the column this sentence names, "year" [1980, 2026]`
    // — a measure value put to the period column, which cannot hold it.
    expect(claim.detail).not.toContain(
      'the column this sentence names, "year"',
    );
    expect(claim.detail).toContain("kilns_active");
    expect(claim.detail).toContain("coincidence");
  });

  it("should still place a real year on the period column", () => {
    const { claims } = grounded(
      "stress-ac-alcanede-kilns",
      "The kilns employed 1860 people in 1980.",
    );
    const claim = claims.find((c) => c.claim === "1980");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain('"year"');
  });

  it("should refuse to place a bare year inside a measure's range by coincidence", () => {
    const { claims } = grounded(
      "stress-ab-emigration-flows",
      "In 2025, 18400 people left Lisboa.",
    );
    const year = claims.find((c) => c.claim === "2025");
    expect(year.verdict).toBe("unverifiable");
    expect(year.detail).toMatch(/coincidence/);
  });
});

describe("ROUND SIX — the frozen table settles a thousands separator (beats AA and AC)", () => {
  it("should read a comma-grouped numeral the frozen table can settle", () => {
    const { claims } = grounded(
      "stress-aa-salary-spread",
      "The highest salary is 238,530 euros.",
    );
    const claim = claims.find((c) => c.claim === "238,530");
    expect(claim.verdict).toBe("consistent");
    expect(claim.detail).toContain("238530");
    expect(claim.detail).toContain("maximum");
  });

  it("should settle the finding-4 numeral against its own frozen column", () => {
    const { claims } = grounded(
      "stress-j-partial-year-permits",
      "Only 14,205 permits were issued.",
    );
    const claim = claims.find((c) => c.claim === "14,205");
    expect(claim.verdict).not.toBe("unverifiable");
    expect(claim.detail).toContain("14205");
  });

  it("should still refuse a comma the frozen table cannot settle", () => {
    const { claims } = grounded(
      "stress-n-chomage-cantons",
      "Le taux atteint 1,7 pour cent.",
    );
    const claim = claims.find((c) => c.claim.includes("1,7"));
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("comma");
  });

  it("should never turn one token into two claims, the round-three rule", () => {
    const { claims } = grounded(
      "stress-aa-salary-spread",
      "The highest salary is 238,530 euros.",
    );
    expect(claims.filter((c) => c.claim === "238").length).toBe(0);
    expect(claims.filter((c) => c.claim === "530").length).toBe(0);
  });
});

describe("ROUND SIX — the two-year comparison reads its direction word wherever it sits", () => {
  it("should decide a comparison whose direction word comes AFTER the first year", () => {
    const { claims } = grounded(
      "stress-ac-alcanede-kilns",
      "Kilns in 2020 were fewer than in 1990.",
    );
    const pair = claims.find((c) => /2020[\s\S]*1990/.test(c.claim));
    expect(pair).toBeTruthy();
    expect(pair.verdict).toBe("supported");
    expect(pair.detail).toContain("kilns_active");
  });

  it("should CONTRADICT the same shape when the frozen data refutes it", () => {
    const { claims } = grounded(
      "stress-ac-alcanede-kilns",
      "Kilns in 2020 were more than in 1990.",
    );
    const pair = claims.find((c) => /2020[\s\S]*1990/.test(c.claim));
    expect(pair.verdict).toBe("contradicted");
  });

  it("should still decide the direction-word-first shape it always could", () => {
    const { claims } = grounded(
      "stress-ac-alcanede-kilns",
      "There were fewer kilns in 2020 than in 1990.",
    );
    expect(claims.find((c) => /2020[\s\S]*1990/.test(c.claim)).verdict).toBe(
      "supported",
    );
  });
});

// ROUND EIGHT — A TOTAL IS EQUALLED AT THE NUMERAL'S OWN PRECISION, AND AT NOTHING WIDER.
//
// Round five closed the small end of this: a flat 0.5 floor declared 0.61 equal to a sum of 0.482,
// a window wider than the numbers it compared. It kept a RELATIVE term beside the fix — `|sum| * 1%`
// — on the reasoning that a big column is allowed a little slack. A real story found the mirror
// image at the other end of the scale: WHO's measles workbook sums to 126,380, an article's headline
// said 127,350, and `groundTakeaway` came back `supported` — the verdict that CLOSES G1 — quoting a
// total 970 away as the thing the number equalled. Bisected at the time: every value from 126,380 to
// 127,643 "equalled" that sum, so a numeral written to the unit was allowed 2,527x its own precision.
describe("a total is equalled at the numeral's own precision", () => {
  const millions = {
    columns: [{ name: "cases", type: "number", min: 0, max: 60000, sum: 126380 }],
    rowCount: 53,
  };

  it("should refuse a headline 970 away from the sum it is offered against", () => {
    const { claims } = groundTakeaway("Europe recorded 127350 cases in the year.", millions);
    const numeral = claims.find((c) => c.claim.includes("127350"))!;
    expect(numeral.verdict).not.toBe("supported");
  });

  it("should still confirm the sum written exactly", () => {
    const { claims } = groundTakeaway("Europe recorded 126380 cases in the year.", millions);
    const numeral = claims.find((c) => c.claim.includes("126380"))!;
    expect(numeral.verdict).toBe("supported");
    expect(numeral.detail).toContain("equals the sum");
  });

  it("should still confirm a numeral whose OWN precision reaches the sum", () => {
    // "33.8" written to the tenth admits half a tenth; a column summing to 33.83 is inside it. The
    // numeral says how much rounding it has done, and that is the whole of the window.
    const small = { columns: [{ name: "tonnes", type: "number", min: 0, max: 20, sum: 33.83 }], rowCount: 4 };
    const { claims } = groundTakeaway("The four sites together hold 33.8 tonnes.", small);
    const numeral = claims.find((c) => c.claim.includes("33.8"))!;
    expect(numeral.verdict).toBe("supported");
  });
});

// ROUND EIGHT — AN ENGLISH WORD IS NOT AN ISO CODE.
//
// Eurostat's tables key countries by two-letter code, and the caseless fallback that reads a table's
// own keys out of a sentence is case-insensitive — right for a name ("monaco" should find "Monaco"),
// wrong for a code. Measured on a real story: "Austria has the highest share in 2024, as seen in the
// 22.58 % it reports" came back `contradicted` ABOUT ITALY, because the word "it" matched the row
// key `IT`. Deleting that one word made the same check answer correctly. On a table where the
// accidentally-matched row holds the extreme, the same reading is a false confirmation.
describe("a two-letter code is matched as a code, not as a word", () => {
  const codes = {
    columns: [
      { name: "geo", type: "text" },
      { name: "label", type: "text" },
      { name: "year", type: "number", min: 2020, max: 2024 },
      { name: "v", type: "number", min: 19.49, max: 26.5 },
    ],
    rows: [
      { geo: "IT", label: "Italy", year: 2024, v: 19.49 },
      { geo: "EE", label: "Estonia", year: 2024, v: 22.6 },
      { geo: "AT", label: "Austria", year: 2020, v: 26.5 },
    ],
  };

  it("should not decide about Italy because the sentence contains the word \"it\"", () => {
    const { claims } = groundTakeaway(
      "Austria has the highest share in 2024, as seen in the 22.58 % it reports.",
      codes,
    );
    const superlative = claims.find((c) => c.claim.includes("the highest"))!;
    expect(superlative.detail).not.toContain("IT");
    expect(superlative.detail).toContain("Austria");
  });

  it("should still resolve a code written as a code", () => {
    const { claims } = groundTakeaway("In 2024 EE has the highest share.", codes);
    const superlative = claims.find((c) => c.claim.includes("the highest"))!;
    expect(superlative.verdict).toBe("supported");
  });

  it("should still resolve a full name whatever its case", () => {
    const { claims } = groundTakeaway("In 2024 estonia has the highest share.", codes);
    const superlative = claims.find((c) => c.claim.includes("the highest"))!;
    expect(superlative.verdict).toBe("supported");
  });
});

// ROUND EIGHT — A COLUMN WHERE EVERY ROW HOLDS THE EXTREME DECIDES NOTHING.
//
// USDA's honey release carries a column of table identifiers, every cell `20`. The superlative shape
// decided against it: "Ohio has the highest" came back `supported` AND "Florida has the lowest" came
// back `supported` — two mutually exclusive claims, both confirmed, because on a column with no
// spread every row's value IS the maximum and IS the minimum. The numeral range check in this same
// file has said for two rounds that a range whose min and max are equal is a check that cannot fail;
// this shape had never been told.
describe("a superlative is not decided against a column with no spread", () => {
  const flat = {
    columns: [
      { name: "state", type: "text" },
      { name: "tbl", type: "number", min: 20, max: 20 },
    ],
    rows: [
      { state: "Ohio", tbl: 20 },
      { state: "Florida", tbl: 20 },
      { state: "Mississippi", tbl: 20 },
    ],
  };

  it("should refuse both ends rather than confirm them both", () => {
    for (const takeaway of ["Ohio has the highest tbl.", "Florida has the lowest tbl."]) {
      const { claims } = groundTakeaway(takeaway, flat);
      const superlative = claims.find((c) => /highest|lowest/.test(c.claim))!;
      expect(superlative.verdict).toBe("unverifiable");
      expect(superlative.detail).toContain("holds 20 in every row");
    }
  });

  it("should still decide a superlative against a column that does vary", () => {
    const spread = {
      columns: [
        { name: "state", type: "text" },
        { name: "yield", type: "number", min: 41, max: 89 },
      ],
      rows: [
        { state: "Ohio", yield: 52 },
        { state: "Florida", yield: 41 },
        { state: "Mississippi", yield: 89 },
      ],
    };
    const { claims } = groundTakeaway("Mississippi has the highest yield.", spread);
    expect(claims.find((c) => /highest/.test(c.claim))!.verdict).toBe("supported");
  });
});

// =============================================================================================
// ROUND NINE — A SPACE-GROUPED NUMERAL IS ONE NUMERAL.
//
// Reported twice, hours apart, by two independent stories: WHO's own fact sheet writes "59 000",
// and this file scored "59" and "000" as two claims. "000" is not a claim anybody made. The same
// house style is what Eurostat, the ECDC, the EEA and every French-language statistical office
// publish in (ISO 80000-1: the group separator is a space, never a comma).
// =============================================================================================
describe("ROUND NINE — a space-grouped numeral is ONE numeral (WHO, Eurostat, ECDC, the EEA)", () => {
  const RABIES = "r9-map-web-reported-rabies-deaths";

  it("should read WHO's own '59 000' as one claim, never as '59' and '000'", () => {
    const { claims } = grounded(
      RABIES,
      "WHO estimates 59 000 people die of rabies every year.",
    );
    expect(claims.some((c) => c.claim === "59")).toBe(false);
    expect(claims.some((c) => c.claim === "000")).toBe(false);
    const whole = claims.find((c) => c.claim === "59 000");
    expect(whole).toBeTruthy();
    // SETTLED, not merely refused whole: "000" is not a numeral anybody writes on its own, so the
    // grouping is the only reading left, and the sentence says which rule settled it.
    expect(whole!.detail).toContain("reading \"59 000\" as 59000");
    expect(whole!.detail).toContain("leading zero");
  });

  it("should read '3 021' as one claim, never as '3' and '021'", () => {
    const { claims } = grounded(
      RABIES,
      "For 2024 the world's health ministries wrote down 3 021 between them.",
    );
    expect(claims.some((c) => c.claim === "021")).toBe(false);
    const whole = claims.find((c) => c.claim === "3 021");
    expect(whole).toBeTruthy();
    expect(whole!.detail).toContain("reading \"3 021\" as 3021");
    expect(whole!.detail).toContain("leading zero");
  });

  it("should settle a space-grouped numeral the frozen table holds, naming the column", () => {
    const { claims } = grounded(
      "stress-j-partial-year-permits",
      "Only 14 205 permits were issued.",
    );
    const claim = claims.find((c) => c.claim === "14 205");
    expect(claim).toBeTruthy();
    expect(claim!.verdict).not.toBe("unverifiable");
    expect(claim!.detail).toContain("which is what settles the space");
    expect(claim!.detail).toContain("permits_issued");
  });

  it("should refuse, as ONE claim, a space group the frozen table cannot settle", () => {
    const { claims } = grounded(
      "stress-j-partial-year-permits",
      "The register holds 5 100 rows.",
    );
    expect(claims.some((c) => c.claim === "5")).toBe(false);
    expect(claims.some((c) => c.claim === "100")).toBe(false);
    const whole = claims.find((c) => c.claim === "5 100");
    expect(whole).toBeTruthy();
    expect(whole!.verdict).toBe("unverifiable");
    expect(whole!.detail).toContain("5100");
    expect(whole!.detail).toContain("two numerals");
  });

  it("should read a NO-BREAK space the same as a plain one, which is what a CMS emits", () => {
    const { claims } = grounded(
      RABIES,
      "WHO estimates 59\u00A0000 people die of rabies every year.",
    );
    expect(claims.some((c) => c.claim === "000")).toBe(false);
    const whole = claims.find((c) => c.claim === "59\u00A0000");
    expect(whole).toBeTruthy();
    expect(whole!.detail).toContain("as 59000");
  });

  it("should read a numeral carrying more than one space group as the grouping it can only be", () => {
    const { claims } = grounded(
      RABIES,
      "The register carries 1 234 567 readings.",
    );
    expect(claims.some((c) => c.claim === "1")).toBe(false);
    const whole = claims.find((c) => c.claim === "1 234 567");
    expect(whole).toBeTruthy();
    expect(whole!.detail).toContain("reading \"1 234 567\" as 1234567");
    expect(whole!.detail).toContain("two space groups");
  });

  it("should not read two numerals a sentence really does put side by side", () => {
    const { claims } = grounded(RABIES, "In 2010 500 people were counted.");
    expect(claims.some((c) => c.claim === "2010 500")).toBe(false);
    expect(claims.some((c) => c.claim === "500")).toBe(true);
  });
});
