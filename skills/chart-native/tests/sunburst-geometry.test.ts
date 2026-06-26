import { describe, it, expect } from "bun:test";
import {
  computeSunburstLayout,
  sweepArcEnd,
  type SunburstData,
} from "../src/sunburst-geometry";

const dims = {
  width: 400,
  height: 400,
  padding: { top: 20, right: 20, bottom: 20, left: 20 },
};

const data: SunburstData = {
  unit: "£m",
  root: {
    label: "Budget",
    children: [
      {
        label: "People",
        children: [
          { label: "Care", value: 60 },
          { label: "Schools", value: 40 },
        ],
      },
      {
        label: "Place",
        children: [
          { label: "Housing", value: 30 },
          { label: "Transport", value: 20 },
        ],
      },
    ],
  },
};

describe("computeSunburstLayout", () => {
  it("rolls up internal node values from the leaves", () => {
    const l = computeSunburstLayout(data, dims);
    const people = l.arcs.find((a) => a.label === "People")!;
    expect(people.value).toBe(100); // 60 + 40
    expect(l.total).toBe(150);
  });

  it("nests a child's angular range inside its parent's", () => {
    const l = computeSunburstLayout(data, dims);
    const people = l.arcs.find((a) => a.label === "People")!;
    const care = l.arcs.find((a) => a.label === "Care")!;
    const schools = l.arcs.find((a) => a.label === "Schools")!;
    expect(care.x0).toBeGreaterThanOrEqual(people.x0 - 1e-6);
    expect(schools.x1).toBeLessThanOrEqual(people.x1 + 1e-6);
  });

  it("makes a child's angle proportional to its value", () => {
    const l = computeSunburstLayout(data, dims);
    const care = l.arcs.find((a) => a.label === "Care")!; // 60
    const schools = l.arcs.find((a) => a.label === "Schools")!; // 40
    const span = (a: { x0: number; x1: number }) => a.x1 - a.x0;
    expect(span(care) / span(schools)).toBeCloseTo(60 / 40, 5);
  });

  it("puts deeper nodes on outer rings", () => {
    const l = computeSunburstLayout(data, dims);
    const people = l.arcs.find((a) => a.label === "People")!;
    const care = l.arcs.find((a) => a.label === "Care")!;
    expect(care.y0).toBeGreaterThan(people.y0);
  });

  it("throws when a leaf has no positive value", () => {
    expect(() =>
      computeSunburstLayout(
        {
          unit: "x",
          root: { label: "r", children: [{ label: "a", value: 0 }] },
        },
        dims,
      ),
    ).toThrow(/value > 0/);
  });
});

describe("sweepArcEnd — opens from the start angle", () => {
  it("is the start at progress 0 and the full end at progress 1", () => {
    const l = computeSunburstLayout(data, dims);
    const a = l.arcs[0];
    expect(sweepArcEnd(a, 0)).toBeCloseTo(a.x0, 6);
    expect(sweepArcEnd(a, 1)).toBeCloseTo(a.x1, 6);
  });
});
