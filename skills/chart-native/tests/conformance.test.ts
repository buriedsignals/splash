// The conformance guard, run on the REAL shipped config + tokens. This is what
// makes design-conformance.md enforced for the native path (the equivalent of
// dw-chart's validateChartSpec). Every native chart we add must pass this.
import { describe, it, expect } from "bun:test";
import {
  checkConformance,
  contrastRatio,
  isOkabeIto,
  relativeLuminance,
} from "../src/core/conformance";
import { COLORS } from "../src/core/tokens";
import type { ChartConfig } from "../src/LineChart";
import sample from "../assets/sample-data/series.json";

const config = sample as unknown as ChartConfig;

// The colours the component actually renders (see LineChart.tsx):
//  - data/series + direct-label text = COLORS.line
//  - text = title/ink, axis+source muted, and the blue direct label
const colors = {
  data: COLORS.line,
  text: [COLORS.ink, COLORS.muted, COLORS.line],
  bg: COLORS.bg,
};

describe("contrastRatio / luminance (WCAG math)", () => {
  it("black on white is 21:1, white on white is 1:1", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });
  it("luminance is order-independent in the ratio", () => {
    expect(contrastRatio("#0072B2", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#0072B2"),
      10,
    );
  });
  it("relativeLuminance rejects non-hex input", () => {
    expect(() => relativeLuminance("blue")).toThrow();
  });
});

describe("Okabe-Ito membership", () => {
  it("accepts the default blue, rejects an off-palette colour", () => {
    expect(isOkabeIto("#0072B2")).toBe(true);
    expect(isOkabeIto("#1f77b4")).toBe(false); // matplotlib blue, not CVD-safe set
  });
});

describe("the shipped chart is conformant (design-conformance.md)", () => {
  it("passes every conformance rule with zero violations", () => {
    expect(checkConformance(config, colors)).toEqual([]);
  });
  it("every rendered text colour clears 4.5:1 on the background", () => {
    for (const t of colors.text) {
      expect(contrastRatio(t, colors.bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("the guard actually catches violations (not a rubber stamp)", () => {
  it("flags a year-range title, off-palette colour, and missing source url", () => {
    const bad = {
      ...config,
      title: "2019-2024",
      source: { name: "X", url: "" },
    } as ChartConfig;
    const violations = checkConformance(bad, { ...colors, data: "#1f77b4" });
    expect(violations.length).toBeGreaterThanOrEqual(3);
  });
  it("flags low-contrast text", () => {
    const v = checkConformance(config, { ...colors, text: ["#BBBBBB"] });
    expect(v.some((m) => m.includes("contrast"))).toBe(true);
  });
});
