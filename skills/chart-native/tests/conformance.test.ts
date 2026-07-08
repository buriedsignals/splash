// The conformance guard, run on the REAL shipped config + tokens. This is what
// makes design-conformance.md enforced for the native path (the equivalent of
// dw-chart's validateChartSpec). Every native chart we add must pass this.
import { describe, it, expect } from "bun:test";
import {
  checkConformance,
  checkGlobalConformance,
  contrastRatio,
  isOkabeIto,
  relativeLuminance,
} from "../src/core/conformance";
import { COLORS, OKABE_ITO } from "../src/core/tokens";
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
  it("flags a year-range title, off-palette colour, and a missing source name", () => {
    const bad = {
      ...config,
      title: "2019-2024",
      source: { name: "", url: "" }, // name is required (anti-fabrication); url is optional
    } as ChartConfig;
    const violations = checkConformance(bad, { ...colors, data: "#1f77b4" });
    expect(violations.length).toBeGreaterThanOrEqual(3);
    expect(violations.some((m) => m.includes("missing source name"))).toBe(
      true,
    );
  });
  it("flags low-contrast text", () => {
    const v = checkConformance(config, { ...colors, text: ["#BBBBBB"] });
    expect(v.some((m) => m.includes("contrast"))).toBe(true);
  });
});

// BUG B (a11y regression: geneve-loyers / loyers-dispersion-beeswarm shipped with no
// altInsight anywhere) — checkGlobalConformance's L0 check now catches a missing/empty
// altInsight, mirroring dw-chart's validateChartSpec (chart-spec.ts) requirement. Opt-in
// via `"altInsight" in input` (see the field's doc comment) so the ~30 existing
// render-config callers below, which never pass it, are provably unaffected.
describe("checkGlobalConformance — altInsight (WCAG 1.1.1, opt-in)", () => {
  const validInput = {
    title: "A clear insight about the data over time",
    source: { name: "Source" },
    colors: {
      data: OKABE_ITO.blue,
      text: [COLORS.ink, COLORS.muted],
      bg: COLORS.bg,
    },
  };

  it("flags a missing (key omitted but value undefined) altInsight when the caller opts in", () => {
    const v = checkGlobalConformance({ ...validInput, altInsight: undefined });
    expect(v.some((m) => m.includes("altInsight"))).toBe(true);
  });

  it("flags an empty-string altInsight", () => {
    const v = checkGlobalConformance({ ...validInput, altInsight: "" });
    expect(v.some((m) => m.includes("altInsight"))).toBe(true);
  });

  it("passes a non-empty altInsight", () => {
    const v = checkGlobalConformance({
      ...validInput,
      altInsight: "Rents rose fastest in the North East",
    });
    expect(v.some((m) => m.includes("altInsight"))).toBe(false);
  });

  it("is non-vacuous: callers that never declare the key are NOT affected (today's ~30 render-config call sites)", () => {
    const v = checkGlobalConformance(validInput);
    expect(v).toEqual([]);
  });
});

// BUG A (a "cross-border commuting" chart-native chart shipped baseColor #56B4E9; a
// housing/rent chart shipped no baseColor at all) — checkGlobalConformance's L0 check
// now flags a declared, non-blue-fit subject left on EITHER Okabe-Ito blue shade, not
// just the literal default #0072B2. Opt-in via `"subject" in input`.
describe("checkGlobalConformance — subject-fit colour (opt-in, blue-family aware)", () => {
  const base = {
    title: "A clear insight about the data over time",
    source: { name: "Source" },
  };

  it("flags the literal default blue for a non-blue-fit subject", () => {
    const v = checkGlobalConformance({
      ...base,
      colors: {
        data: OKABE_ITO.blue,
        text: [COLORS.ink, COLORS.muted],
        bg: COLORS.bg,
      },
      subject: "cross-border commuting",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });

  it("flags sky-blue (#56B4E9) for a non-blue-fit subject — the near-default escape hatch", () => {
    const v = checkGlobalConformance({
      ...base,
      colors: {
        data: OKABE_ITO.skyblue,
        text: [COLORS.ink, COLORS.muted],
        bg: COLORS.bg,
      },
      subject: "cross-border commuting",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });

  it("does NOT flag blue for a genuinely blue-fit subject (water/cold/sky/marine)", () => {
    const v = checkGlobalConformance({
      ...base,
      colors: {
        data: OKABE_ITO.blue,
        text: [COLORS.ink, COLORS.muted],
        bg: COLORS.bg,
      },
      subject: "water levels",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(false);
  });

  it("does NOT flag a deliberate non-blue hue for a non-blue-fit subject (housing → amber)", () => {
    const v = checkGlobalConformance({
      ...base,
      colors: {
        data: OKABE_ITO.orange,
        text: [COLORS.ink, COLORS.muted],
        bg: COLORS.bg,
      },
      subject: "housing costs",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(false);
  });

  it("is non-vacuous: callers that never declare a subject are NOT affected (today's ~30 render-config call sites, still all-blue by default)", () => {
    const v = checkGlobalConformance({
      ...base,
      colors: {
        data: OKABE_ITO.blue,
        text: [COLORS.ink, COLORS.muted],
        bg: COLORS.bg,
      },
    });
    expect(v).toEqual([]);
  });
});
