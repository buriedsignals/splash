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

// BUG F2 (grounded, caught live on a German rainfall chart) — BLUE_FIT_SUBJECT was
// English-only, so a DE/FR/IT water/cold/sky subject was NOT recognised as blue-fit
// and the guard wrongly rejected the correct default blue. Mirrors dw-chart's
// chart-spec.ts BLUE_FIT_SUBJECT — same fix, same test shape, both engines.
describe("checkGlobalConformance — subject-fit colour, DE/FR/IT water-subject recognition (F2)", () => {
  const base = {
    title: "A clear insight about the data over time",
    source: { name: "Source" },
    colors: {
      data: OKABE_ITO.blue,
      text: [COLORS.ink, COLORS.muted],
      bg: COLORS.bg,
    },
  };

  it("does NOT flag blue for a German water subject (Niederschlag)", () => {
    const v = checkGlobalConformance({ ...base, subject: "Niederschlag" });
    expect(v.some((m) => m.includes("blue-family"))).toBe(false);
  });

  it("does NOT flag blue for a French water subject (pluie)", () => {
    const v = checkGlobalConformance({ ...base, subject: "pluie" });
    expect(v.some((m) => m.includes("blue-family"))).toBe(false);
  });

  it("does NOT flag blue for an Italian water subject (pioggia)", () => {
    const v = checkGlobalConformance({ ...base, subject: "pioggia" });
    expect(v.some((m) => m.includes("blue-family"))).toBe(false);
  });

  it("does NOT flag blue for an accented French water subject (rivière)", () => {
    const v = checkGlobalConformance({
      ...base,
      subject: "débit de la rivière",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(false);
  });

  it("does NOT flag blue for an accented French water subject (océan)", () => {
    const v = checkGlobalConformance({
      ...base,
      subject: "niveau de l'océan",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(false);
  });

  it("still flags blue for a genuinely non-water subject in French (chômage)", () => {
    const v = checkGlobalConformance({ ...base, subject: "chômage" });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });

  it("still flags blue for a genuinely non-water subject in German (Arbeitslosigkeit)", () => {
    const v = checkGlobalConformance({
      ...base,
      subject: "Arbeitslosigkeit",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });

  // False-friend guards (F2 review follow-up): these foreign water/cold terms were
  // REMOVED from BLUE_FIT_SUBJECT because they collide with unrelated common
  // English/proper-noun words in freeform subject strings. The guard must still
  // fire (default blue rejected) for these genuinely non-water subjects.
  it("still flags blue for a subject containing the English word 'mare' (not the IT 'sea')", () => {
    const v = checkGlobalConformance({
      ...base,
      subject: "wild mare population",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });

  it("still flags blue for 'Marin County' (not the FR/IT 'marine')", () => {
    const v = checkGlobalConformance({
      ...base,
      subject: "Marin County housing",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });

  it("still flags blue for 'Dan Marino' (not the IT 'marine')", () => {
    const v = checkGlobalConformance({
      ...base,
      subject: "Dan Marino passing yards",
    });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });

  it("still flags blue for 'ventes de glace' (ice cream sales, not water ice)", () => {
    const v = checkGlobalConformance({ ...base, subject: "ventes de glace" });
    expect(v.some((m) => m.includes("blue-family"))).toBe(true);
  });
});
