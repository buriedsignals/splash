// F2 — runProduceConformance honours the brand-explicit bypass (policy b). A bar
// whose baseColor is a journalist-chosen house hue that fails CVD-safety / contrast
// produces a render-review CONCERN, not a hard violation — but ONLY when the config
// carries `brandExplicit`. Without that marker the same colour hard-fails (the auto
// path is unchanged). This is what lets produce.mjs keep the brand colour on the
// mark instead of refusing to produce.
import { describe, it, expect } from "bun:test";
import { runProduceConformance } from "../src/core/produce-conformance";
import barsSample from "../assets/sample-data/bars.json";

// A non-Okabe-Ito house amber that ALSO fails value-label contrast (2.03:1 on white).
const HOUSE_HUE = "#F5A623";

describe("runProduceConformance — F2 brand-explicit bypass", () => {
  it("brand-explicit non-safe baseColor: 0 hard violations, ≥1 recorded concern", () => {
    const branded = {
      ...barsSample,
      baseColor: HOUSE_HUE,
      brandExplicit: true,
    };
    const r = runProduceConformance("bar", branded);
    expect(r.checked).toBe(true);
    expect(r.violations).toEqual([]);
    expect(r.concerns.length).toBeGreaterThan(0);
    expect(r.concerns.join(" ")).toContain(HOUSE_HUE);
    expect(r.concerns.join(" ")).toContain("house style");
  });

  it("SAME non-safe baseColor WITHOUT brandExplicit: hard-fails (auto path unchanged)", () => {
    const auto = { ...barsSample, baseColor: HOUSE_HUE };
    const r = runProduceConformance("bar", auto);
    expect(r.checked).toBe(true);
    expect(r.violations.length).toBeGreaterThan(0);
    expect(r.violations.some((v) => v.includes("Okabe-Ito"))).toBe(true);
    expect(r.concerns).toEqual([]);
  });

  it("brand-explicit but a NON-a11y violation still hard-fails (bad title)", () => {
    const branded = {
      ...barsSample,
      title: "2019", // a bare year range — a hard, non-a11y violation
      baseColor: HOUSE_HUE,
      brandExplicit: true,
    };
    const r = runProduceConformance("bar", branded);
    expect(r.checked).toBe(true);
    expect(r.violations.length).toBeGreaterThan(0); // the title violation stays hard
    expect(r.concerns.length).toBeGreaterThan(0); // the colour still downgrades
  });
});
