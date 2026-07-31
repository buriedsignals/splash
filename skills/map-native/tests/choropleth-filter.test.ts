// Finding 2 (Task 16 review): resolveChoroplethFilterExpression is brand-new production logic
// (not in the Task 16 brief — added to preserve the filter-by-valueField capability once the
// D8 properties merge was removed) that shipped with only ONE branch (category-free "atLeast")
// exercised, once, via a live Playwright drag. Table-driven, per-branch coverage below.
import { describe, it, expect } from "bun:test";
import { resolveChoroplethFilterExpression } from "../src/choropleth-filter";
import type { FilterOption, FilterState } from "../src/core/map-filter";
import type { ChoroplethFeatureState } from "../src/choropleth-geo";

const JOIN_KEY = "iso_a3";
const VALUE_FIELD = "share";

// 5 regions: A/B/C/D data-bearing (values 5/10/50/60), E has NO data (null/hasData:false) —
// E must NEVER appear in a passing set regardless of filter thresholds.
const states: ChoroplethFeatureState = {
  A: { value: 5, hasData: true },
  B: { value: 10, hasData: true },
  C: { value: 50, hasData: true },
  D: { value: 60, hasData: true },
  E: { value: null, hasData: false },
};

function passingKeysOf(expr: unknown[]): string[] {
  // Shape: ["all", ...otherClauses, ["in", ["get", joinKey], ["literal", [...keys]]]]
  const last = expr[expr.length - 1] as unknown[];
  expect(last[0]).toBe("in");
  expect(last[1]).toEqual(["get", JOIN_KEY]);
  const literal = last[2] as unknown[];
  expect(literal[0]).toBe("literal");
  return (literal[1] as string[]).slice().sort();
}

describe("resolveChoroplethFilterExpression — category branch", () => {
  const option: FilterOption = {
    kind: "category",
    field: VALUE_FIELD,
    label: "Share bucket",
    values: ["5", "10", "50", "60"],
  };

  // Mutation-proven against the SHIPPED choropleth-filter.ts (temporarily edited, this test
  // re-run, reverted — transcript in the Task 16 report's "Fix round 1"): dropping the
  // `String(v)` coercion (states carry numeric `value`, category `values` are strings) reddens
  // exactly this test — `.includes()` never matches a number against a string array.
  it("keeps only data-bearing regions whose (stringified) value is in the visible set", () => {
    const filterState: FilterState = { [VALUE_FIELD]: ["5", "50"] };
    const expr = resolveChoroplethFilterExpression(
      filterState,
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["A", "C"]);
  });

  it("defaults to ALL of the option's own values when filterState has no entry for the field (no-data E still excluded)", () => {
    const expr = resolveChoroplethFilterExpression(
      {},
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["A", "B", "C", "D"]);
  });
});

describe("resolveChoroplethFilterExpression — range branch, mode 'between'", () => {
  const option: FilterOption = {
    kind: "range",
    field: VALUE_FIELD,
    label: "Share",
    min: 0,
    max: 100,
    step: 1,
    mode: "between",
  };

  // Mutation-proven against the SHIPPED choropleth-filter.ts (temporarily edited, this test
  // re-run, reverted — transcript in the Task 16 report's "Fix round 1"): swapping this
  // branch's inclusive `>=`/`<=` for exclusive `>`/`<` reddens exactly this test — B=10 and
  // C=50 (below) sit ON the fixture's boundary by design, so an exclusive mutation drops both.
  it("keeps only regions with value inside [lo, hi], inclusive", () => {
    const filterState: FilterState = { [VALUE_FIELD]: [10, 50] };
    const expr = resolveChoroplethFilterExpression(
      filterState,
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["B", "C"]); // 5 and 60 excluded, bounds inclusive
  });

  it("defaults to [option.min, option.max] when filterState has no entry (everything with data passes)", () => {
    const expr = resolveChoroplethFilterExpression(
      {},
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["A", "B", "C", "D"]);
  });
});

describe("resolveChoroplethFilterExpression — range branch, mode 'atMost'", () => {
  const option: FilterOption = {
    kind: "range",
    field: VALUE_FIELD,
    label: "Share",
    min: 0,
    max: 100,
    step: 1,
    mode: "atMost",
  };

  it("keeps only regions with value <= threshold", () => {
    const filterState: FilterState = { [VALUE_FIELD]: 10 };
    const expr = resolveChoroplethFilterExpression(
      filterState,
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["A", "B"]);
  });

  it("defaults the threshold to option.max when filterState has no entry (mirrors filterStateToExpression's own atMost default)", () => {
    const expr = resolveChoroplethFilterExpression(
      {},
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["A", "B", "C", "D"]); // threshold = 100, everything <= it
  });
});

describe("resolveChoroplethFilterExpression — range branch, mode 'atLeast'", () => {
  const option: FilterOption = {
    kind: "range",
    field: VALUE_FIELD,
    label: "Share",
    min: 0,
    max: 100,
    step: 1,
    mode: "atLeast",
  };

  it("keeps only regions with value >= threshold (the live-verified Playwright case, now also unit-proven)", () => {
    const filterState: FilterState = { [VALUE_FIELD]: 50 };
    const expr = resolveChoroplethFilterExpression(
      filterState,
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["C", "D"]);
  });

  it("defaults the threshold to option.min when filterState has no entry (mirrors filterStateToExpression's own atLeast default)", () => {
    const expr = resolveChoroplethFilterExpression(
      {},
      [option],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(passingKeysOf(expr)).toEqual(["A", "B", "C", "D"]); // threshold = 0, everything >= it
  });
});

describe("resolveChoroplethFilterExpression — no option targets valueField", () => {
  it("returns a plain ['all', ...baseClauses] with no id-membership clause when filterOptions is empty", () => {
    const expr = resolveChoroplethFilterExpression(
      {},
      [],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(expr).toEqual(["all"]);
  });

  it("still applies an UNRELATED filter's clause via the shared builder, untouched by the valueField logic", () => {
    const unrelated: FilterOption = {
      kind: "category",
      field: "region",
      label: "Region",
      values: ["north", "south"],
    };
    const expr = resolveChoroplethFilterExpression(
      { region: ["north"] },
      [unrelated],
      states,
      VALUE_FIELD,
      JOIN_KEY,
    );
    expect(expr).toEqual([
      "all",
      ["in", ["get", "region"], ["literal", ["north"]]],
    ]);
  });
});
