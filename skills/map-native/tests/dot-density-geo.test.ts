import { describe, it, expect } from "bun:test";
import {
  computeDotDensity,
  univariateAccent,
  UNIVARIATE_ACCENT,
} from "../src/dot-density-geo";
import { QUALITATIVE } from "../src/route-geo";

const feat = (id: string): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
    ],
  },
});
const world = {
  type: "FeatureCollection",
  features: [feat("AAA"), feat("BBB")],
} as GeoJSON.FeatureCollection;

describe("computeDotDensity — univariate", () => {
  const layout = computeDotDensity(
    {
      regionKey: "id",
      valueField: "pop",
      rows: [
        { id: "AAA", pop: 500000 },
        { id: "BBB", pop: 100000 },
      ],
    },
    world,
    "iso_a3",
  );
  it("auto-derives a nice dotValue near the target total", () => {
    // 600k units / ~5000 target ≈ 120 → nice round to 200 (nice ∈ 1/2/5×10^k)
    expect([100, 200, 500]).toContain(layout.dotValue);
    expect(layout.totalDots).toBeGreaterThan(1000);
    expect(layout.totalDots).toBeLessThanOrEqual(10000);
  });
  it("allocates one monochrome group per region, count = round(value/dotValue)", () => {
    expect(layout.hasCategories).toBe(false);
    const aaa = layout.regions.find((r) => r.key === "AAA")!;
    expect(aaa.groups.length).toBe(1);
    expect(aaa.groups[0].category).toBeNull();
    expect(aaa.groups[0].count).toBe(Math.round(500000 / layout.dotValue));
    expect(layout.legend).toEqual([]);
  });
});

describe("computeDotDensity — multivariate", () => {
  const layout = computeDotDensity(
    {
      regionKey: "id",
      categories: [
        { field: "a", label: "Group A" },
        { field: "b", label: "Group B" },
      ],
      rows: [
        { id: "AAA", a: 300000, b: 100000 },
        { id: "BBB", a: 50000, b: 50000 },
      ],
    },
    world,
    "iso_a3",
  );
  it("splits a region's dots by category, coloured from the CVD palette (sorted)", () => {
    expect(layout.hasCategories).toBe(true);
    expect(layout.categories).toEqual(["a", "b"]);
    expect(layout.legend).toEqual([
      { category: "Group A", color: QUALITATIVE[0] },
      { category: "Group B", color: QUALITATIVE[1] },
    ]);
    const aaa = layout.regions.find((r) => r.key === "AAA")!;
    expect(aaa.groups.map((g) => g.category)).toEqual(["a", "b"]);
    expect(aaa.groups[0].count).toBe(Math.round(300000 / layout.dotValue));
    expect(aaa.groups[0].color).toBe(QUALITATIVE[0]);
  });
});

describe("univariateAccent — dark-safe single-source token", () => {
  it("returns the light hue by default / when dark is false", () => {
    expect(univariateAccent(false)).toBe(UNIVARIATE_ACCENT.light);
    expect(UNIVARIATE_ACCENT.light).toBe("#2171b5");
  });
  it("returns a distinct, non-near-white hue when dark is true", () => {
    expect(univariateAccent(true)).toBe(UNIVARIATE_ACCENT.dark);
    expect(UNIVARIATE_ACCENT.dark).not.toBe(UNIVARIATE_ACCENT.light);
    expect(UNIVARIATE_ACCENT.dark.toLowerCase()).not.toBe("#e8e8ec");
  });
});

describe("computeDotDensity — dark threading", () => {
  it("paints univariate dots with the light accent by default (back-compat)", () => {
    const layout = computeDotDensity(
      {
        regionKey: "id",
        valueField: "pop",
        rows: [{ id: "AAA", pop: 500000 }],
      },
      world,
      "iso_a3",
    );
    expect(layout.regions[0].groups[0].color).toBe(univariateAccent(false));
  });
  it("paints univariate dots with the dark-safe accent when dark=true", () => {
    const layout = computeDotDensity(
      {
        regionKey: "id",
        valueField: "pop",
        rows: [{ id: "AAA", pop: 500000 }],
      },
      world,
      "iso_a3",
      true,
    );
    expect(layout.regions[0].groups[0].color).toBe(univariateAccent(true));
    expect(layout.regions[0].groups[0].color).not.toBe(univariateAccent(false));
  });
  it("ignores the dark flag for multivariate maps (colours come from QUALITATIVE)", () => {
    const layout = computeDotDensity(
      {
        regionKey: "id",
        categories: [{ field: "a", label: "Group A" }],
        rows: [{ id: "AAA", a: 300000 }],
      },
      world,
      "iso_a3",
      true,
    );
    expect(layout.regions[0].groups[0].color).toBe(QUALITATIVE[0]);
  });
});

describe("computeDotDensity — dotValue override + cap", () => {
  it("honours a supplied dotValue and flags the cap when total dots exceed the max", () => {
    const layout = computeDotDensity(
      {
        regionKey: "id",
        valueField: "pop",
        dotValue: 10,
        rows: [{ id: "AAA", pop: 500000 }],
      },
      world,
      "iso_a3",
    );
    expect(layout.dotValue).toBe(10);
    expect(layout.capped).toBe(true); // 50000 dots >> 10000 cap
  });
});
