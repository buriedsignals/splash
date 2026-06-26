import { describe, it, expect } from "bun:test";
import {
  computeGanttLayout,
  growGanttBar,
  type GanttData,
} from "../src/gantt-geometry";

const dims = {
  width: 800,
  height: 400,
  padding: { top: 20, right: 20, bottom: 30, left: 120 },
};

const data: GanttData = {
  items: [
    { label: "Design", start: "2023-01", end: "2023-06", category: "Plan" },
    { label: "Build", start: "2023-06", end: "2024-09", category: "Deliver" },
    { label: "Survey", start: "2022-10", end: "2023-02", category: "Plan" },
  ],
};

describe("computeGanttLayout", () => {
  it("orders rows by start date (top → bottom)", () => {
    const l = computeGanttLayout(data, dims);
    expect(l.bars.map((b) => b.label)).toEqual(["Survey", "Design", "Build"]);
  });

  it("makes bar width proportional to duration", () => {
    const l = computeGanttLayout(data, dims);
    const design = l.bars.find((b) => b.label === "Design")!; // ~5 months
    const build = l.bars.find((b) => b.label === "Build")!; // ~15 months
    expect(build.x1 - build.x0).toBeGreaterThan(design.x1 - design.x0);
  });

  it("keeps every bar inside the plot", () => {
    const l = computeGanttLayout(data, dims);
    for (const b of l.bars) {
      expect(b.x0).toBeGreaterThanOrEqual(-0.5);
      expect(b.x1).toBeLessThanOrEqual(l.innerWidth + 0.5);
    }
  });

  it("throws when an item ends before it starts", () => {
    expect(() =>
      computeGanttLayout(
        { items: [{ label: "X", start: "2023-06", end: "2023-01" }] },
        dims,
      ),
    ).toThrow(/ends before it starts/);
  });

  it("throws on an unparseable date", () => {
    expect(() =>
      computeGanttLayout(
        { items: [{ label: "X", start: "soon", end: "2023" }] },
        dims,
      ),
    ).toThrow(/bad date/);
  });
});

describe("growGanttBar — grows from the start", () => {
  it("has zero width at progress 0 and full width at progress 1", () => {
    const l = computeGanttLayout(data, dims);
    const b = l.bars[0];
    expect(growGanttBar(b, 0)).toBeCloseTo(b.x0, 5);
    expect(growGanttBar(b, 1)).toBeCloseTo(b.x1, 5);
  });
});
