// F2 — the dw-chart engine honours the brand-explicit bypass (policy b, brand-first).
// A house colour that isn't CVD-safe / a value label that fails contrast is KEPT and
// downgraded to a recorded concern — but ONLY when the journalist set it explicitly
// via the brand profile. The auto path (no brandExplicit) stays hard-guarded.
import { describe, it, expect } from "bun:test";
import { validateChartSpec } from "../src/chart-spec";
import { checkValueLabelContrast } from "../src/value-label-safety";

const HOUSE_RED = "#E30613"; // a real newsroom red — NOT in the Okabe-Ito set

const baseSpec = {
  type: "d3-bars",
  title: "The south runs hottest of every region",
  data: "region,value\nSouth,72\nWest,21",
  altInsight: "hottest in the south",
};

describe("validateChartSpec — F2 brand-explicit baseColor", () => {
  it("REJECTS a non-Okabe-Ito baseColor on the auto path (unchanged)", () => {
    const r = validateChartSpec({ ...baseSpec, baseColor: HOUSE_RED });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("Okabe-Ito"))).toBe(true);
  });

  it("ACCEPTS the same baseColor when brandExplicit, recording it as a warning", () => {
    const r = validateChartSpec({
      ...baseSpec,
      baseColor: HOUSE_RED,
      brandExplicit: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => w.includes(HOUSE_RED))).toBe(true);
      expect(r.warnings.some((w) => w.toLowerCase().includes("house"))).toBe(
        true,
      );
    }
  });
});

describe("checkValueLabelContrast — F2 brand-explicit value label", () => {
  const patch = {
    type: "d3-bars",
    metadata: {
      visualize: { "base-color": "#009E73", "show-value-labels": true },
    },
  };

  it("hard-fails a low-contrast inside label on the auto path (unchanged)", () => {
    const v = checkValueLabelContrast(patch);
    expect(v).toHaveLength(1);
    expect(v[0].concern).toBeUndefined();
  });

  it("downgrades the SAME label to a concern when the fill is brand-explicit", () => {
    const v = checkValueLabelContrast(patch, { brandColors: ["#009E73"] });
    expect(v).toHaveLength(1);
    expect(v[0].concern).toBe(true);
  });
});
