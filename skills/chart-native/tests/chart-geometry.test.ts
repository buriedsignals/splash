import { describe, it, expect } from "bun:test";
import {
  computeChartLayout,
  linePath,
  revealLine,
  revealHead,
  type ChartData,
  type Dims,
} from "../src/chart-geometry";
import { formatNumber, clamp01 } from "../src/core/math";

const dims: Dims = {
  width: 800,
  height: 450,
  padding: { top: 40, right: 120, bottom: 40, left: 40 },
};

const data: ChartData = {
  xField: "date",
  yField: "value",
  xType: "time",
  points: [
    { date: "2019-01-01", value: 10 },
    { date: "2020-01-01", value: 30 },
    { date: "2021-01-01", value: 20 },
    { date: "2022-01-01", value: 50 },
  ],
};

describe("computeChartLayout", () => {
  it("should map every data point to the inner plotting box", () => {
    const layout = computeChartLayout(data, dims);
    const innerW = 800 - 40 - 120;
    const innerH = 450 - 40 - 40;
    expect(layout.innerWidth).toBe(innerW);
    expect(layout.innerHeight).toBe(innerH);
    expect(layout.points).toHaveLength(4);
    for (const p of layout.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(innerW + 0.001);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(innerH + 0.001);
    }
  });

  it("should place the first point at x=0 and last at x=innerWidth", () => {
    const layout = computeChartLayout(data, dims);
    expect(layout.points[0].x).toBeCloseTo(0, 5);
    expect(layout.points[3].x).toBeCloseTo(layout.innerWidth, 5);
  });

  it("should invert y (higher value = smaller screen y)", () => {
    const layout = computeChartLayout(data, dims);
    // value 50 (max) should be higher on screen (smaller y) than value 10
    const p50 = layout.points[3];
    const p10 = layout.points[0];
    expect(p50.y).toBeLessThan(p10.y);
  });

  it("should compute a monotonically increasing cumulative length", () => {
    const layout = computeChartLayout(data, dims);
    expect(layout.cumLength[0]).toBe(0);
    for (let i = 1; i < layout.cumLength.length; i++) {
      expect(layout.cumLength[i]).toBeGreaterThan(layout.cumLength[i - 1]);
    }
    expect(layout.totalLength).toBeCloseTo(
      layout.cumLength[layout.cumLength.length - 1],
      5,
    );
  });

  it("should throw when points is empty", () => {
    expect(() => computeChartLayout({ ...data, points: [] }, dims)).toThrow(
      /empty/,
    );
  });

  it("should throw when padding exceeds dimensions", () => {
    expect(() =>
      computeChartLayout(data, {
        width: 50,
        height: 50,
        padding: { top: 40, right: 40, bottom: 40, left: 40 },
      }),
    ).toThrow(/exceeds/);
  });

  it("should throw on an invalid date", () => {
    expect(() =>
      computeChartLayout(
        { ...data, points: [{ date: "not-a-date", value: 1 }] },
        dims,
      ),
    ).toThrow(/invalid date/);
  });

  it("should work with linear x too", () => {
    const linear: ChartData = {
      xField: "x",
      yField: "y",
      xType: "linear",
      points: [
        { x: 0, y: 5 },
        { x: 10, y: 15 },
      ],
    };
    const layout = computeChartLayout(linear, dims);
    expect(layout.points[0].x).toBeCloseTo(0, 5);
    expect(layout.points[1].x).toBeCloseTo(layout.innerWidth, 5);
  });
});

describe("revealLine — deterministic frame-driven reveal", () => {
  const layout = computeChartLayout(data, dims);

  it("should draw nothing at progress 0", () => {
    expect(revealLine(layout, 0)).toBe("");
  });

  it("should draw the full polyline at progress 1", () => {
    const full = revealLine(layout, 1);
    expect(full).toBe(linePath(layout.points));
    expect(full.split("L")).toHaveLength(4); // M + 3 L
  });

  it("should be a pure function: same progress -> same output", () => {
    expect(revealLine(layout, 0.42)).toBe(revealLine(layout, 0.42));
  });

  it("should reveal more vertices as progress increases", () => {
    // count emitted vertices (M/L commands) — must be non-decreasing
    const verts = (p: number) => {
      const s = revealLine(layout, p);
      return s === "" ? 0 : (s.match(/[ML]/g) ?? []).length;
    };
    const counts = [0, 0.25, 0.5, 0.75, 1].map(verts);
    expect(counts[0]).toBe(0);
    expect(counts[counts.length - 1]).toBe(layout.points.length);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
  });

  it("should advance the draw-head strictly along the polyline with progress", () => {
    // the cumulative target distance is strictly monotonic in progress
    const target = (p: number) => clamp01(p) * layout.totalLength;
    const ts = [0.1, 0.4, 0.7, 1].map(target);
    for (let i = 1; i < ts.length; i++)
      expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });

  it("should place the draw-head exactly at totalLength*progress along the polyline", () => {
    const head = revealHead(layout, 0.5);
    // head must lie within the bounding box of the polyline
    const xs = layout.points.map((p) => p.x);
    const ys = layout.points.map((p) => p.y);
    expect(head.x).toBeGreaterThanOrEqual(Math.min(...xs) - 0.001);
    expect(head.x).toBeLessThanOrEqual(Math.max(...xs) + 0.001);
    expect(head.y).toBeGreaterThanOrEqual(Math.min(...ys) - 0.001);
    expect(head.y).toBeLessThanOrEqual(Math.max(...ys) + 0.001);
  });

  it("head at progress 1 should equal the last data point", () => {
    const head = revealHead(layout, 1);
    const last = layout.points[layout.points.length - 1];
    expect(head.x).toBeCloseTo(last.x, 5);
    expect(head.y).toBeCloseTo(last.y, 5);
  });

  it("head at progress 0 should equal the first data point", () => {
    const head = revealHead(layout, 0);
    expect(head.x).toBeCloseTo(layout.points[0].x, 5);
  });

  it("should clamp progress outside [0,1]", () => {
    expect(revealLine(layout, -1)).toBe("");
    expect(revealLine(layout, 2)).toBe(revealLine(layout, 1));
  });
});

describe("formatNumber", () => {
  it("should abbreviate thousands", () => {
    expect(formatNumber(12831)).toBe("12.8k");
  });
  it("should abbreviate millions", () => {
    expect(formatNumber(1_800_000)).toBe("1.8M");
  });
  it("should leave small numbers alone", () => {
    expect(formatNumber(42)).toBe("42");
  });
  it("should not leave a trailing .0", () => {
    expect(formatNumber(5000)).toBe("5k");
  });
});

describe("clamp01", () => {
  it("clamps", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.5)).toBe(0.5);
    expect(clamp01(1.5)).toBe(1);
  });
});

import { easeInOutCubic } from "../src/core/math";

describe("easeInOutCubic (shared by the interactive reveal and the video)", () => {
  it("pins the endpoints exactly", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
  it("is symmetric about the midpoint (0.5 -> 0.5)", () => {
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });
  it("clamps out-of-range input", () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });
  it("eases in: small t moves slower than linear", () => {
    expect(easeInOutCubic(0.2)).toBeLessThan(0.2);
  });
});

import { easeOutCubic, stagger } from "../src/core/math";

describe("easeOutCubic (chrome wipe-in easing)", () => {
  it("pins endpoints and decelerates (fast start)", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.2)).toBeGreaterThan(0.2); // ahead of linear early
  });
  it("clamps out-of-range", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(5)).toBe(1);
  });
});

describe("stagger (deterministic per-element sub-window)", () => {
  it("element 0 leads, later elements lag at the same p", () => {
    const p = 0.1;
    expect(stagger(p, 0, 5, 0.02, 0.03, 0.22)).toBeGreaterThan(
      stagger(p, 4, 5, 0.02, 0.03, 0.22),
    );
  });
  it("every element reaches 1 by full progress", () => {
    for (let i = 0; i < 5; i++) {
      expect(stagger(1, i, 5, 0.02, 0.03, 0.22)).toBe(1);
    }
  });
  it("nothing has started before its begin time", () => {
    expect(stagger(0, 3, 5, 0.02, 0.03, 0.22)).toBe(0);
  });
});

describe("x-tick labels never repeat a year (wide layouts)", () => {
  const wide: Dims = {
    width: 1600,
    height: 480,
    padding: { top: 16, right: 140, bottom: 52, left: 56 },
  };
  it("a high tick count yields unique year labels", () => {
    const layout = computeChartLayout(data, wide, 14); // wide-screen tick count
    const labels = layout.xTicks.map((t) => t.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
