import { describe, it, expect } from "bun:test";
import { computeCartogram } from "../src/cartogram-geo";
import { area } from "@turf/turf";

// Four unit-square regions in a 2x2 arrangement, keyed A..D.
const sq = (id: string, x: number, y: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x, y],
      ],
    ],
  },
});
const features: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [sq("A", 0, 1), sq("B", 2, 1), sq("C", 0, -1), sq("D", 2, -1)],
};
const values = [
  { id: "A", value: 4 },
  { id: "B", value: 16 },
  { id: "C", value: 1 },
  { id: "D", value: 9 },
];

describe("computeCartogram — scaled", () => {
  const layout = computeCartogram(
    { variant: "scaled", values, valueLabel: "pop" },
    features,
  );
  it("emits one cell per matched region", () => {
    expect(layout.cells.length).toBe(4);
    expect(layout.variant).toBe("scaled");
  });
  it("scales area proportional to value (B:16 has 4x the area of A:4)", () => {
    const a = area(layout.cells.find((c) => c.id === "A")!.feature);
    const b = area(layout.cells.find((c) => c.id === "B")!.feature);
    expect(b / a).toBeGreaterThan(3.6);
    expect(b / a).toBeLessThan(4.4);
  });
  it("is deterministic (same input → identical geometry)", () => {
    const again = computeCartogram(
      { variant: "scaled", values, valueLabel: "pop" },
      features,
    );
    expect(JSON.stringify(again.cells)).toBe(JSON.stringify(layout.cells));
  });
});

describe("computeCartogram — grid", () => {
  const layout = computeCartogram(
    { variant: "grid", values, valueLabel: "pop" },
    features,
  );
  it("emits one uniform square per region with no two on the same cell", () => {
    expect(layout.cells.length).toBe(4);
    const centers = layout.cells.map((c) =>
      JSON.stringify(area(c.feature).toFixed(6)),
    );
    // all cells same area (uniform)
    const areas = layout.cells.map((c) => Number(area(c.feature).toFixed(3)));
    expect(new Set(areas).size).toBe(1);
    // no two cells share the same centroid position
    const pos = layout.cells.map((c) => JSON.stringify(c.feature.geometry));
    expect(new Set(pos).size).toBe(4);
  });
  it("is deterministic (stable assignment)", () => {
    const again = computeCartogram(
      { variant: "grid", values, valueLabel: "pop" },
      features,
    );
    expect(JSON.stringify(again.cells)).toBe(JSON.stringify(layout.cells));
  });
});

describe("computeCartogram — colour + guards", () => {
  it("assigns a bin colour to every cell and carries the value label", () => {
    const layout = computeCartogram(
      { variant: "scaled", values, valueLabel: "residents" },
      features,
    );
    expect(
      layout.cells.every(
        (c) => typeof c.color === "string" && c.color.startsWith("#"),
      ),
    ).toBe(true);
    expect(layout.valueLabel).toBe("residents");
    expect(layout.bins.length).toBe(5);
  });
  it("drops regions with no value", () => {
    const layout = computeCartogram(
      { variant: "scaled", values: [{ id: "A", value: 4 }], valueLabel: "x" },
      features,
    );
    expect(layout.cells.length).toBe(1);
    expect(layout.cells[0].id).toBe("A");
  });
  it("throws when no region matches", () => {
    expect(() =>
      computeCartogram(
        { variant: "scaled", values: [{ id: "Z", value: 1 }], valueLabel: "x" },
        features,
      ),
    ).toThrow();
  });
});
