import { describe, it, expect } from "bun:test";
import { specToMetadata } from "../src/spec-to-metadata";
import {
  applyValueLabels,
  checkValueLabelContrast,
  dwInsideLabelIsWhite,
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

describe("applyValueLabels — horizontal bars (direct value labels ON by default)", () => {
  it("shows direct value labels ON the bars by default AND keeps the value axis as fallback", () => {
    // FT/data-to-viz best-practice #3: label the magnitude on the mark. Datawrapper's
    // show-value-labels draws the value at the bar end (inside long bars, outside short
    // ones). The value axis (force-grid) is kept on as the WCAG-clean fallback for the
    // mid-tone hues DW auto-picks a sub-4.5:1 white inside label on (no override exists).
    const vis: Record<string, unknown> = {};
    applyValueLabels("d3-bars", vis, undefined, undefined);
    expect(vis["show-value-labels"]).toBe(true);
    expect(vis["force-grid"]).toBe(true);
  });

  it("omits the on-bar labels on an explicit valueLabels:false but keeps the value axis", () => {
    // The rare cluttered case opts out of the direct labels — but a value chart must
    // still carry a value scale, so the axis (force-grid) stays on.
    const vis: Record<string, unknown> = {};
    applyValueLabels("d3-bars", vis, false, undefined);
    expect(vis["show-value-labels"]).toBe(false);
    expect(vis["force-grid"]).toBe(true);
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

  it("a horizontal bar emits direct on-bar value labels AND the value axis", () => {
    const p = specToMetadata(barSpec);
    expect(p.metadata.visualize["show-value-labels"]).toBe(true);
    expect(p.metadata.visualize["force-grid"]).toBe(true);
  });

  it("a bar chart carries the numberFormat via value-label-format", () => {
    const p = specToMetadata({ ...barSpec, numberFormat: "0,0" });
    expect(p.metadata.visualize["value-label-format"]).toBe("0,0");
  });

  it("a horizontal bar with valueLabels:false omits the on-bar labels but keeps the axis", () => {
    const p = specToMetadata({ ...barSpec, valueLabels: false });
    expect(p.metadata.visualize["show-value-labels"]).toBe(false);
    expect(p.metadata.visualize["force-grid"]).toBe(true);
  });

  it("a non-bar type (line) never emits show-value-labels", () => {
    const p = specToMetadata({
      type: "d3-lines",
      title: "Unemployment fell",
      data: "year,value\n2019,10\n2024,20",
      baseColor: "#0072B2",
      valueLabels: true,
      altInsight: "It fell over five years",
    });
    expect(p.metadata.visualize["show-value-labels"]).toBeUndefined();
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
  it("records a mid-tone bar inside label as a CONCERN (not hard) when the axis fallback is present", () => {
    // The mapper now ships direct on-bar labels + the value axis (force-grid). A mid-tone
    // subject hue (vermilion, white 3.87:1) is below AA and DW offers no colour/placement
    // override — but the axis carries the value in black ink, so it is a recorded
    // render-review concern, never a hard failure that would strip the direct labels.
    const p = specToMetadata({
      type: "d3-bars",
      title: "Heat is highest in the south",
      data: "region,value\nSouth,72\nWest,21",
      baseColor: "#D55E00",
      subject: "heat",
      altInsight: "hottest in the south",
    });
    const v = checkValueLabelContrast(p);
    expect(v).toHaveLength(1);
    expect(v[0].concern).toBe(true);
    expect(v[0].color).toBe("#D55E00");
  });

  it("catches a white inside label on a coloured horizontal bar with NO axis fallback (hard)", () => {
    // Without the value axis fallback (force-grid), the sub-4.5:1 white inside label is a
    // HARD failure — there is no accessible way to read the value.
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
    expect(v[0].concern).toBeUndefined();
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

  // The false-positive fix: DW renders DARK ink (not white) inside LIGHT bars, so a light
  // fill's inside label is safe and must NOT be flagged — even though white-on-that-fill
  // would score below 4.5:1. Verified live: amber/grey/yellow bars render dark labels.
  it("does NOT flag a light amber bar with labels on (DW renders safe dark ink, not white)", () => {
    const patch = {
      type: "d3-bars",
      metadata: {
        visualize: {
          "base-color": "#E69F00",
          "show-value-labels": true,
          "force-grid": true,
        },
      },
    };
    expect(checkValueLabelContrast(patch)).toEqual([]);
  });
});

describe("dwInsideLabelIsWhite — DW's YIQ-brightness auto-pick (live-verified)", () => {
  it("picks WHITE on dark/mid-tone fills DW renders white on", () => {
    // Live-observed white inside labels (YIQ < 160).
    for (const dark of ["#0072B2", "#009E73", "#D55E00", "#CC79A7", "#56B4E9", "#000000"])
      expect(dwInsideLabelIsWhite(dark)).toBe(true);
  });
  it("picks DARK ink on light fills DW renders dark on", () => {
    // Live-observed dark inside labels (YIQ >= 160) — the sky/amber pair is the key
    // discriminator: near-identical WCAG luminance, opposite DW picks.
    for (const light of ["#E69F00", "#c4c4c4", "#F0E442"])
      expect(dwInsideLabelIsWhite(light)).toBe(false);
  });
});
