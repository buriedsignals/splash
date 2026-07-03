import { describe, it, expect } from "bun:test";
import { specToMetadata } from "../src/spec-to-metadata";
import { findLabelViolations, type TextRect } from "../src/label-safety";
import type { ChartSpec } from "../src/chart-spec";

// ── Single-series line/area: no line-end direct label (the clip source) ──────
describe("label safety — single-series direct labelling", () => {
  const single: ChartSpec = {
    type: "d3-lines",
    title: "US median home prices have cooled",
    data: "period,median_home_price_usd\n2014,275200\n2026,403200",
    seriesLabels: { median_home_price_usd: "Median home price" },
    altInsight: "prices rose then eased",
  };

  it("turns direct labelling OFF for a single-series line chart", () => {
    const p = specToMetadata(single);
    expect(p.metadata.visualize["labeling"]).toBe("off");
  });

  it("turns direct labelling OFF for a single-series area chart", () => {
    const p = specToMetadata({ ...single, type: "d3-area" });
    expect(p.metadata.visualize["labeling"]).toBe("off");
  });

  it("keeps direct labelling ON for a multi-series line chart", () => {
    const p = specToMetadata({
      type: "multiple-lines",
      title: "Two series",
      data: "year,A,B\n2020,1,2\n2021,3,4",
      altInsight: "x",
    } as ChartSpec);
    expect(p.metadata.visualize["labeling"]).toBe("right");
  });

  it("does not set labeling for a non-line chart (bar)", () => {
    const p = specToMetadata({
      type: "d3-bars",
      title: "T",
      data: "a,b\n1,2",
      altInsight: "x",
    } as ChartSpec);
    expect(p.metadata.visualize["labeling"]).toBeUndefined();
  });
});

// ── Annotations clamped inward, deterministically ────────────────────────────
describe("label safety — annotation placement", () => {
  it("anchors a right-edge annotation inward (right-align + negative dx)", () => {
    // 2026 is the last x → xFrac 1.0; y at the bottom → near bottom edge.
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,7495\n2018,7299\n2026,7170",
      altInsight: "x",
      annotations: [{ text: "Sawe — first sub-2:00", x: "2026", y: 7170 }],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align[1]).toBe("r"); // right-anchored → extends left, inward
    expect(ann.dx).toBeLessThan(0); // pulled inward from the right edge
    expect(ann.connectorLine.enabled).toBe(true);
  });

  it("anchors a left-edge annotation inward (left-align + positive dx)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,10\n2018,50\n2026,90",
      altInsight: "x",
      annotations: [{ text: "start", x: "2003", y: 10 }],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align[1]).toBe("l");
    expect(ann.dx).toBeGreaterThan(0);
  });

  it("overrides a manual near-edge align that would clip (case 3 regression)", () => {
    // Spec asks for tr/dx:-8 — computed inward placement must still win/augment.
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,7495\n2026,7170",
      altInsight: "x",
      annotations: [
        { text: "Sawe", x: "2026", y: 7170, align: "tr", dx: -8, dy: -6 },
      ],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.align[1]).toBe("r");
    expect(ann.dx).toBeLessThan(-8); // inward pull ADDED to the spec nudge
  });

  it("keeps an interior annotation's authored nudge (case 2 interior point)", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "p,v\n2014,275200\n2020,322600\n2022,442600\n2026,403200",
      altInsight: "x",
      annotations: [{ text: "Peak", x: "2022", y: 442600, dx: -6, dy: 6 }],
    } as ChartSpec);
    const ann = (p.metadata.visualize["text-annotations"] as any[])[0];
    expect(ann.dx).toBe(-6); // interior → no inward override, authored value kept
  });

  it("offsets a second annotation on the same point so they cannot overlap", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "T",
      data: "year,v\n2003,7495\n2026,7170",
      altInsight: "x",
      annotations: [
        { text: "one", x: "2026", y: 7170 },
        { text: "two", x: "2026", y: 7170 },
      ],
    } as ChartSpec);
    const [a, b] = p.metadata.visualize["text-annotations"] as any[];
    expect(b.dy).not.toBe(a.dy); // stacked apart
  });
});

// ── Guardrail geometry: pure clip/overlap detection ──────────────────────────
describe("label safety — findLabelViolations (guardrail core)", () => {
  const box = { x: 0, y: 0, w: 600, h: 400 };

  it("passes when all text rects are inside and disjoint", () => {
    const rects: TextRect[] = [
      { text: "2024", x: 10, y: 380, w: 40, h: 14 },
      { text: "$400K", x: 5, y: 100, w: 50, h: 14 },
      { text: "Peak", x: 200, y: 50, w: 60, h: 16 },
    ];
    expect(findLabelViolations(box, rects)).toHaveLength(0);
  });

  it("fails when a label extends beyond the right edge (clipped)", () => {
    const rects: TextRect[] = [
      { text: "Median home price", x: 560, y: 100, w: 80, h: 40 },
    ];
    const v = findLabelViolations(box, rects);
    expect(v.length).toBeGreaterThan(0);
    expect(v[0]).toContain("clipped");
  });

  it("fails when two text rects intersect (overlap)", () => {
    const rects: TextRect[] = [
      { text: "Record time", x: 500, y: 380, w: 70, h: 14 },
      { text: "2026", x: 520, y: 384, w: 40, h: 14 },
    ];
    const v = findLabelViolations(box, rects);
    expect(v.length).toBeGreaterThan(0);
    expect(v.some((s) => s.includes("overlap"))).toBe(true);
  });

  it("tolerates sub-pixel touching (antialiasing slack)", () => {
    const rects: TextRect[] = [
      { text: "a", x: 100, y: 100, w: 20, h: 14 },
      { text: "b", x: 121, y: 100, w: 20, h: 14 }, // 1px gap
    ];
    expect(findLabelViolations(box, rects)).toHaveLength(0);
  });
});
