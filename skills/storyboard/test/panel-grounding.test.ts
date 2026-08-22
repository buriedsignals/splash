// GROUNDING A CLAIM AGAINST A PANEL — the shape essentially all open data has.
//
// Every fixture this file's checks were built against holds ONE row per period. Real open data
// (Our World in Data, the World Bank, Eurostat, Ember) holds one row per ENTITY per period, and on
// 2026-08-22 three real stories showed what that costs: a two-year comparison answered about the
// alphabetically first entity in the file and came back `supported`; the same reading came back
// `contradicted` — the verdict that blocks G1 — on a TRUE sentence about another country; and a
// numeral's "the frozen table holds it verbatim for X" named a country the sentence never mentions,
// from another century.
//
// The subjects here are the real files, committed under `stories/real-*`, not fixtures written to
// make a point. `renewable_share_of_electricity__pct` really does run 7,585 rows over 246 entities,
// and Ghana's collapse from 91.4% to 38.5% is really in it.

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { groundTakeaway, panelShapeOf, readFrozenRows } from "../scripts/ground-claim.mjs";
import { resolveGrounding } from "../scripts/propose.mjs";

const ROOT = join(import.meta.dir, "../../..");
const read = (story: string, file: string) =>
  readFileSync(join(ROOT, "stories", story, "source", file), "utf8");

const EMBER = "real-ember-renewables-share";
const OWID = "real-owid-life-expectancy";

const emberProfile = JSON.parse(read(EMBER, "profile.json"));
const emberCsv = read(EMBER, "data.csv");
const owidProfile = JSON.parse(read(OWID, "profile.json"));
const owidCsv = read(OWID, "data.csv");

const ground = (takeaway: string, profile: any, csv: string, options: any = {}) =>
  groundTakeaway(takeaway, profile, { csv, ...options });
const detailOf = (claims: any[]) => claims.map((c) => `${c.verdict}: ${c.detail}`).join(" | ");

// ASEAN (Ember) is the first row of every year in the Ember file; Afghanistan is the first row of
// every year in the OWID file. Any verdict quoting these numbers for a sentence about somebody
// else is the defect.
const ASEAN_2023 = "26.164715";
const AFGHANISTAN_1950 = "28.1563";

describe("panelShapeOf — the shape is derived from the rows, never named", () => {
  it("should report a panel, its period column and the column that keys its rows apart", () => {
    const shape = panelShapeOf(emberProfile.columns, readFrozenRows(emberCsv));
    expect(shape.isPanel).toBe(true);
    expect(shape.periodColumn.name).toBe("year");
    expect(shape.entityColumn.name).toBe("entity");
    expect(shape.rowsPerPeriod).toBeGreaterThan(1);
  });

  it("should NOT report a panel for a table holding one row per period", () => {
    const flat = {
      columns: [
        { name: "year", type: "number", min: 2000, max: 2002 },
        { name: "value", type: "number", min: 1, max: 3 },
      ],
    };
    const rows = [
      { year: 2000, value: 1 },
      { year: 2001, value: 2 },
      { year: 2002, value: 3 },
    ];
    expect(panelShapeOf(flat.columns, rows).isPanel).toBe(false);
  });

  it("should prefer the key column that is never blank over one that is", () => {
    // `code` keys the Ember rows apart just as well as `entity` does, and is blank on 645 of them.
    const shape = panelShapeOf(emberProfile.columns, readFrozenRows(emberCsv));
    expect(shape.entityColumn.name).not.toBe("code");
  });
});

describe("a two-year comparison over a panel", () => {
  it("should not answer about the file's first entity when the sentence names another", () => {
    const { claims } = ground(
      "The world's renewable share of electricity was higher in 2023 than in 2000.",
      emberProfile,
      emberCsv,
    );
    expect(detailOf(claims)).not.toContain(ASEAN_2023);
  });

  it("should resolve the entity the sentence names, in the sentence's own words", () => {
    const { claims } = ground(
      "The world's renewable share of electricity was higher in 2023 than in 2000.",
      emberProfile,
      emberCsv,
    );
    const comparison = claims.find((c: any) => /higher in 2023/.test(c.claim));
    expect(comparison.detail).toContain("World");
  });

  it("should confirm a TRUE fall that today comes back contradicted", () => {
    const { claims } = ground(
      "Ghana's renewable share of electricity was lower in 2023 than in 2000.",
      emberProfile,
      emberCsv,
    );
    const comparison = claims.find((c: any) => /lower in 2023/.test(c.claim));
    expect(comparison.verdict).toBe("supported");
    expect(comparison.detail).toContain("Ghana");
  });

  it("should give two different entities two different answers", () => {
    const ghana = ground(
      "Ghana's renewable share of electricity was lower in 2023 than in 2000.",
      emberProfile,
      emberCsv,
    );
    const zambia = ground(
      "Zambia's renewable share of electricity was lower in 2023 than in 2000.",
      emberProfile,
      emberCsv,
    );
    expect(detailOf(ghana.claims)).not.toBe(detailOf(zambia.claims));
  });

  it("should refuse, naming the panel, when the sentence names no entity the table carries", () => {
    const { claims } = ground(
      "Life expectancy in 2023 was higher than in 1950.",
      owidProfile,
      owidCsv,
    );
    const comparison = claims.find((c: any) => /higher/.test(c.claim));
    expect(comparison.verdict).toBe("unverifiable");
    expect(comparison.detail).toContain("entity");
    expect(detailOf(claims)).not.toContain(AFGHANISTAN_1950);
  });

  it("should refuse rather than read row one when an entity holds several rows for one period", () => {
    const doubled = {
      columns: [
        { name: "entity", type: "text" },
        { name: "year", type: "number", min: 2000, max: 2001 },
        { name: "value", type: "number", min: 1, max: 9 },
      ],
    };
    const rows = [
      { entity: "Alpha", year: 2000, value: 1 },
      { entity: "Alpha", year: 2000, value: 9 },
      { entity: "Beta", year: 2000, value: 4 },
      { entity: "Alpha", year: 2001, value: 2 },
      { entity: "Beta", year: 2001, value: 5 },
    ];
    const { claims } = groundTakeaway("Alpha's value was higher in 2001 than in 2000.", {
      ...doubled,
      rows,
    });
    const comparison = claims.find((c: any) => /higher/.test(c.claim));
    expect(comparison.verdict).toBe("unverifiable");
    expect(comparison.detail).toContain("2");
  });
});

describe("an 'ever' superlative over a panel", () => {
  it("should not decide it from another entity's rows", () => {
    const { claims } = ground(
      "Renewables supplied 30.3% of the world's electricity in 2023, the highest share ever recorded.",
      emberProfile,
      emberCsv,
    );
    expect(detailOf(claims)).not.toContain(ASEAN_2023);
  });
});

describe("an entity superlative over a panel", () => {
  it("should decide it inside the period the sentence names, not refuse for having many rows", () => {
    const { claims } = ground(
      "In 2023 the country with the longest period life expectancy at birth was Monaco.",
      owidProfile,
      owidCsv,
    );
    const superlative = claims.find((c: any) => /longest/.test(c.claim));
    expect(superlative.verdict).not.toBe("unverifiable");
    expect(superlative.detail).not.toContain("matches 74 rows");
  });

  it("should measure the extreme INSIDE that period, not across the whole column", () => {
    // San Marino held the longest life expectancy in 1950 (71.5897); the column's own maximum is
    // 86.3724, seventy years later. A superlative about 1950 answered against the column's maximum
    // refutes a true sentence, which is the verdict that blocks the gate.
    const { claims } = ground(
      "In 1950 the country with the longest period life expectancy at birth was San Marino.",
      owidProfile,
      owidCsv,
    );
    const superlative = claims.find((c: any) => /longest/.test(c.claim));
    expect(superlative.verdict).toBe("supported");
    expect(superlative.detail).toContain("71.5897");
  });

  it("should not read the first word of a sentence as an entity name", () => {
    const { claims } = ground(
      "In 2023 the country with the shortest period life expectancy at birth was Nigeria.",
      owidProfile,
      owidCsv,
    );
    expect(detailOf(claims)).not.toContain('could not resolve "In"');
  });
});

describe("a numeral's verbatim holder", () => {
  it("should never attribute a value to a row the sentence does not name", () => {
    const { claims } = ground(
      "Life expectancy in Nigeria was 54.5 years in 2023.",
      owidProfile,
      owidCsv,
    );
    // The holder may still be NAMED — knowing the number exists elsewhere is useful — but never
    // attributed to the sentence, which is what "holds it verbatim for Switzerland" did.
    expect(detailOf(claims)).not.toMatch(/holds it verbatim for "Switzerland"/);
    expect(detailOf(claims)).toContain("which this sentence does not name");
  });

  it("should say the holder is not the sentence's subject when the sentence names none", () => {
    const { claims } = ground("One country reached 54.5 years.", owidProfile, owidCsv);
    const placed = claims.find((c: any) => c.verdict === "consistent");
    if (placed && /holds it verbatim/.test(placed.detail))
      expect(placed.detail).toContain("not necessarily");
  });
});

describe("a correctly rounded extreme", () => {
  it("should be placed as the rounding of the column's own maximum, not refused", () => {
    const { claims } = ground(
      "The longest life expectancy in this table is 86.4 years.",
      owidProfile,
      owidCsv,
    );
    const numeral = claims.find((c: any) => c.claim.includes("86.4"));
    expect(numeral.verdict).toBe("consistent");
    expect(numeral.detail).toContain("86.3724");
  });
});

describe("a totality claim against a panel's share column", () => {
  it("should not refute a sentence from the sum of 7,585 independent percentages", () => {
    const { claims } = ground(
      "In 2023 renewables supplied 30.3% of the world's electricity, and the national shares behind that one number run from 0% to 100%.",
      emberProfile,
      emberCsv,
    );
    expect(claims.some((c: any) => c.verdict === "contradicted")).toBe(false);
  });

  it("should let the numeral it could not decide reach the range check", () => {
    const { claims } = ground(
      "In 2023 renewables supplied 30.3% of the world's electricity, and the national shares behind that one number run from 0% to 100%.",
      emberProfile,
      emberCsv,
    );
    expect(detailOf(claims)).toContain("maximum (100)");
  });
});

describe("a numeral governed by a difference word", () => {
  it("should not be placed inside the column's own range as if it were a level", () => {
    const { claims } = ground(
      "Life expectancy in 2023 spanned more than 30 years between the shortest and the longest.",
      owidProfile,
      owidCsv,
    );
    const numeral = claims.find((c: any) => c.claim.includes("30"));
    expect(numeral.detail).toContain("DIFFERENCE rather than a level");
  });
});

describe("a recorded claim that refuses", () => {
  it("should not be outvoted by the pattern reading of its own sentence", () => {
    const takeaway = "Costa Rica generated more of its electricity from renewables in 2023 than in 2000.";
    const resolved = resolveGrounding(takeaway, emberProfile, {
      csv: emberCsv,
      recorded: {
        shape: "comparison",
        column: "renewable_share_of_electricity__pct",
        entity: "Costa Rica",
      },
    });
    const recorded = resolved.claims.find((c: any) => /recorded/.test(c.detail ?? ""));
    if (recorded && recorded.verdict === "unverifiable") expect(resolved.verdict).not.toBe("supported");
  });
});
