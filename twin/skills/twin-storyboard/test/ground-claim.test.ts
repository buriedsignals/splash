import { describe, it, expect } from "bun:test";
import { groundTakeaway } from "../scripts/ground-claim.mjs";

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
    const claims = groundTakeaway(
      "Norway emitted less CO₂ in 2024 than in any year since 1993",
      NORWAY_PROFILE,
    );
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(true);
  });

  it("should not falsely flag the Swiss proof takeaway, which is true", () => {
    const claims = groundTakeaway(
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
    const claims = groundTakeaway("the total reached 500 units", PROFILE);
    const claim = claims.find((c) => c.claim === "500");
    expect(claim.verdict).toBe("unverifiable");
  });

  it("should mark a numeric token inside a column's range as supported", () => {
    const claims = groundTakeaway("the total reached 42 units", PROFILE);
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
    const claims = groundTakeaway(
      "le total atteint 34 millions de tonnes",
      OLYMPICS_PROFILE,
    );
    const claim = claims.find((c) => c.claim === "34");
    expect(claim.verdict).toBe("supported");
    expect(claim.detail).toContain("glace_fondue_mt");
  });

  it("should mark a year matching no range and no sum as unverifiable, never contradicted", () => {
    const claims = groundTakeaway(
      "les JO de 2026 feront fondre la glace",
      OLYMPICS_PROFILE,
    );
    const claim = claims.find((c) => c.claim === "2026");
    expect(claim.verdict).toBe("unverifiable");
  });

  it("should return no contradicted verdict at all for the run's own verbatim takeaway", () => {
    const claims = groundTakeaway(OLYMPICS_TAKEAWAY, OLYMPICS_PROFILE);
    expect(claims.some((c) => c.verdict === "contradicted")).toBe(false);
    expect(claims.find((c) => c.claim === "34").verdict).toBe("supported");
  });

  it("should not stretch the aggregate match to a value well off the sum", () => {
    // 44 is 29% above glace_fondue_mt's total of 34, and in no column's range. Widening
    // AGGREGATE_TOLERANCE far enough to swallow it is what this case exists to redden.
    const claims = groundTakeaway(
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
    const claims = groundTakeaway(
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
    const claims = groundTakeaway(
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
    const claims = groundTakeaway(
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
    const claims = groundTakeaway(
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
      ),
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
    const claims = groundTakeaway(
      "Emissions in 2024 were the highest ever recorded",
      PROFILE,
    );
    const superlative = claims.find((c) => c.claim.includes("highest ever"));
    expect(superlative.verdict).toBe("contradicted");
  });

  it("should confirm a 'highest ever' superlative the data actually supports", () => {
    const claims = groundTakeaway(
      "Emissions in 2010 were the highest ever recorded",
      PROFILE,
    );
    const superlative = claims.find((c) => c.claim.includes("highest ever"));
    expect(superlative.verdict).toBe("supported");
  });
});
