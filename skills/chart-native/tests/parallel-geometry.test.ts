import { describe, it, expect } from "bun:test";
import {
  computeParallelLayout,
  type ParallelData,
} from "../src/parallel-geometry";

const dims = {
  width: 600,
  height: 400,
  padding: { top: 40, right: 40, bottom: 40, left: 40 },
};

const data: ParallelData = {
  dimensions: [
    { key: "exam", label: "Exam" },
    { key: "attend", label: "Attendance" },
    { key: "arts", label: "Arts" },
  ],
  highlight: ["Northgate"],
  items: [
    { label: "Northgate", exam: 82, attend: 94, arts: 40 },
    { label: "Southfield", exam: 60, attend: 88, arts: 85 },
    { label: "Eastwood", exam: 71, attend: 80, arts: 65 },
  ],
};

describe("computeParallelLayout", () => {
  it("produces one axis per dimension, left → right", () => {
    const l = computeParallelLayout(data, dims);
    expect(l.axes).toHaveLength(3);
    expect(l.axes[0].x).toBeLessThan(l.axes[2].x);
  });

  it("gives each axis its OWN min/max scale", () => {
    const l = computeParallelLayout(data, dims);
    const exam = l.axes.find((a) => a.key === "exam")!;
    const arts = l.axes.find((a) => a.key === "arts")!;
    expect(exam.minVal).toBe(60);
    expect(exam.maxVal).toBe(82);
    expect(arts.minVal).toBe(40);
    expect(arts.maxVal).toBe(85);
  });

  it("draws one polyline per item, crossing every axis", () => {
    const l = computeParallelLayout(data, dims);
    expect(l.lines).toHaveLength(3);
    for (const ln of l.lines) expect(ln.points).toHaveLength(3);
  });

  it("places the highest value of an axis above the lowest (y inverted)", () => {
    const l = computeParallelLayout(data, dims);
    // Northgate has the top exam (82) → smaller y than Southfield's exam (60)
    const north = l.lines.find((x) => x.label === "Northgate")!;
    const south = l.lines.find((x) => x.label === "Southfield")!;
    expect(north.points[0].y).toBeLessThan(south.points[0].y);
  });

  it("marks only the highlighted items", () => {
    const l = computeParallelLayout(data, dims);
    expect(l.lines.find((x) => x.label === "Northgate")!.highlighted).toBe(
      true,
    );
    expect(l.lines.find((x) => x.label === "Eastwood")!.highlighted).toBe(
      false,
    );
  });

  it("throws with fewer than 2 dimensions", () => {
    expect(() =>
      computeParallelLayout(
        {
          dimensions: [{ key: "a", label: "A" }],
          items: [{ label: "x", a: 1 }],
        },
        dims,
      ),
    ).toThrow(/≥ 2 dimensions/);
  });
});
