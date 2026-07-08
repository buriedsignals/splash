import { describe, it, expect } from "bun:test";
import { specToMetadata } from "../src/spec-to-metadata";
import {
  applyValueLabels,
  checkValueLabelContrast,
} from "../src/value-label-safety";
import { contrastRatio, WHITE } from "../src/contrast";
import type { ChartSpec } from "../src/chart-spec";

describe("contrast math (WCAG)", () => {
  it("computes the failing white-on-subject-hue ratios that motivate the fix", () => {
    // The B3 evidence: white value labels below 4.5:1 on darker Okabe-Ito hues.
    expect(contrastRatio(WHITE, "#D55E00")).toBeCloseTo(3.87, 1); // vermilion
    expect(contrastRatio(WHITE, "#009E73")).toBeCloseTo(3.42, 1); // green
    expect(contrastRatio(WHITE, "#0072B2")).toBeGreaterThan(4.5); // blue is safe
    // Dark ink on the white canvas (the safe path) clears AA with huge margin.
    expect(contrastRatio("#18181b", "#ffffff")).toBeGreaterThan(4.5);
  });
});

describe("applyValueLabels — vertical columns (fixes B4: hover-only → visible)", () => {
  it("places labels OUTSIDE in dark ink, shown always, on a column chart", () => {
    const vis: Record<string, unknown> = {};
    applyValueLabels("column-chart", vis, undefined, "0,0");
    expect(vis["valueLabels"]).toEqual({
      enabled: true,
      placement: "outside",
      show: "always",
      format: "0,0",
    });
  });

  it("honours an explicit valueLabels:false by not forcing them on", () => {
    const vis: Record<string, unknown> = {};
    applyValueLabels("grouped-column-chart", vis, false, undefined);
    expect(vis["valueLabels"]).toEqual({
      enabled: false,
      placement: "outside",
      show: "hover",
      format: null,
    });
  });
});

describe("applyValueLabels — horizontal bars (fixes B3: no white inside label)", () => {
  it("turns off the inside auto-white label and shows the value axis", () => {
    const vis: Record<string, unknown> = {};
    applyValueLabels("d3-bars", vis, undefined, undefined);
    expect(vis["show-value-labels"]).toBe(false);
    expect(vis["force-grid"]).toBe(true);
  });

  it("keeps inside labels off even when value labels are not wanted", () => {
    const vis: Record<string, unknown> = {};
    applyValueLabels("d3-bars", vis, false, undefined);
    expect(vis["show-value-labels"]).toBe(false);
    expect(vis["force-grid"]).toBeUndefined();
  });
});

describe("specToMetadata routes bar/column value labels safely", () => {
  const barSpec: ChartSpec = {
    type: "d3-bars",
    title: "Heat is highest in the south",
    data: "region,value\nSouth,72\nWest,21",
    baseColor: "#D55E00",
    subject: "heat",
    valueLabels: true,
    altInsight: "The south is the hottest region",
  };

  it("a coloured horizontal bar never emits an inside value label", () => {
    const p = specToMetadata(barSpec);
    expect(p.metadata.visualize["show-value-labels"]).toBe(false);
    expect(p.metadata.visualize["force-grid"]).toBe(true);
  });

  it("a column chart emits outside labels shown always (visible on the PNG)", () => {
    const p = specToMetadata({
      ...barSpec,
      type: "column-chart",
    });
    const vl = p.metadata.visualize["valueLabels"] as Record<string, unknown>;
    expect(vl.placement).toBe("outside");
    expect(vl.show).toBe("always");
  });
});

describe("checkValueLabelContrast — the regression guard", () => {
  it("passes the safe metadata the mapper actually emits", () => {
    const p = specToMetadata({
      type: "d3-bars",
      title: "Heat is highest in the south",
      data: "region,value\nSouth,72\nWest,21",
      baseColor: "#D55E00",
      subject: "heat",
      altInsight: "hottest in the south",
    });
    expect(checkValueLabelContrast(p)).toEqual([]);
  });

  it("catches a white inside label on a coloured horizontal bar (< 4.5:1)", () => {
    const patch = {
      type: "d3-bars",
      metadata: {
        visualize: { "base-color": "#009E73", "show-value-labels": true },
      },
    };
    const v = checkValueLabelContrast(patch);
    expect(v).toHaveLength(1);
    expect(v[0].ratio).toBeLessThan(4.5);
    expect(v[0].color).toBe("#009E73");
  });

  it("catches an INSIDE column label on a coloured mark but allows OUTSIDE", () => {
    const base = { "base-color": "#D55E00" };
    const inside = {
      type: "column-chart",
      metadata: {
        visualize: {
          ...base,
          valueLabels: { enabled: true, placement: "inside" },
        },
      },
    };
    const outside = {
      type: "column-chart",
      metadata: {
        visualize: {
          ...base,
          valueLabels: { enabled: true, placement: "outside" },
        },
      },
    };
    expect(checkValueLabelContrast(inside)).toHaveLength(1);
    expect(checkValueLabelContrast(outside)).toEqual([]);
  });

  it("does not fire on a safe blue bar (white clears 4.5:1)", () => {
    const patch = {
      type: "d3-bars",
      metadata: {
        visualize: { "base-color": "#0072B2", "show-value-labels": true },
      },
    };
    expect(checkValueLabelContrast(patch)).toEqual([]);
  });
});
