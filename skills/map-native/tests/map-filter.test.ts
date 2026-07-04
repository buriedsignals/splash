import { describe, it, expect } from "bun:test";
import {
  deriveFilterOptions,
  filterStateToExpression,
  activeTimeStep,
  validateMapFilters,
  toggleCategory,
  type MapFilter,
} from "../src/core/map-filter";

const rows = [
  { name: "A", kind: "city", pop: 10, year: 2000 },
  { name: "B", kind: "port", pop: 40, year: 2010 },
  { name: "C", kind: "city", pop: 25, year: 2020 },
];

describe("deriveFilterOptions", () => {
  it("category → sorted distinct values; range → [min,max]+step; time → sorted steps", () => {
    const opts = deriveFilterOptions(
      [
        { kind: "category", field: "kind" },
        { kind: "range", field: "pop" },
        { kind: "time", field: "year" },
      ],
      rows,
    );
    expect(opts[0]).toMatchObject({
      kind: "category",
      field: "kind",
      values: ["city", "port"],
    });
    expect(opts[1]).toMatchObject({
      kind: "range",
      field: "pop",
      min: 10,
      max: 40,
    });
    expect(opts[1].step).toBeGreaterThan(0);
    expect(opts[2]).toMatchObject({
      kind: "time",
      field: "year",
      steps: [2000, 2010, 2020],
    });
  });
});

describe("filterStateToExpression", () => {
  const filters: MapFilter[] = [
    { kind: "category", field: "kind" },
    { kind: "range", field: "pop", mode: "atLeast" },
  ];
  it("no constraint (all cats, threshold at min) → show-all ['all']", () => {
    const expr = filterStateToExpression(
      { kind: ["city", "port"], pop: 10 },
      deriveFilterOptions(filters, rows),
    );
    expect(expr).toEqual(["all"]);
  });
  it("a hidden category → an 'in' clause over the visible ones only", () => {
    const expr = filterStateToExpression(
      { kind: ["city"], pop: 10 },
      deriveFilterOptions(filters, rows),
    );
    expect(expr).toEqual([
      "all",
      ["in", ["get", "kind"], ["literal", ["city"]]],
    ]);
  });
  it("a raised atLeast threshold → a >= clause", () => {
    const expr = filterStateToExpression(
      { kind: ["city", "port"], pop: 25 },
      deriveFilterOptions(filters, rows),
    );
    expect(expr).toEqual(["all", [">=", ["get", "pop"], 25]]);
  });
});

describe("validateMapFilters", () => {
  it("accepts a valid set", () => {
    expect(
      validateMapFilters([{ kind: "category", field: "kind" }], rows).ok,
    ).toBe(true);
  });
  it("rejects an absent field, bad cardinality, >2 filters, non-numeric range", () => {
    expect(
      validateMapFilters([{ kind: "category", field: "nope" }], rows).ok,
    ).toBe(false);
    expect(
      validateMapFilters([{ kind: "range", field: "name" }], rows).ok,
    ).toBe(false);
    expect(
      validateMapFilters(
        [
          { kind: "category", field: "kind" },
          { kind: "range", field: "pop" },
          { kind: "time", field: "year" },
        ],
        rows,
      ).ok,
    ).toBe(false); // > 2
  });
  it("rejects a category with cardinality outside 2–8", () => {
    const one = [{ name: "A", kind: "x" }];
    expect(
      validateMapFilters([{ kind: "category", field: "kind" }], one).ok,
    ).toBe(false);
  });
});

describe("toggleCategory", () => {
  it("adds a value when absent", () => {
    expect(toggleCategory(["city"], "port")).toEqual(["city", "port"]);
  });
  it("removes a value when one of two remain", () => {
    expect(toggleCategory(["city", "port"], "city")).toEqual(["port"]);
  });
  it("returns visible unchanged when removing would empty it", () => {
    expect(toggleCategory(["city"], "city")).toEqual(["city"]);
  });
});

describe("activeTimeStep", () => {
  it("returns the selected step, or the latest when unset", () => {
    const opts = deriveFilterOptions([{ kind: "time", field: "year" }], rows);
    expect(activeTimeStep({ year: 2010 }, opts)).toBe(2010);
    expect(activeTimeStep({}, opts)).toBe(2020); // default = latest
  });
});
