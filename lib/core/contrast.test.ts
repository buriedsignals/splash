import { describe, it, expect } from "bun:test";
import { relativeLuminance, contrastRatio, wcagMinContrast } from "./contrast";

// Analytic WCAG goldens, derived independently from the spec formulas
// (sRGB -> linear channel, then 0.2126R + 0.7152G + 0.0722B for luminance;
// (L1 + 0.05) / (L2 + 0.05) for contrast ratio) — NOT computed via the
// module under test, so these can actually fail if the implementation drifts.
describe("core/contrast analytic WCAG goldens", () => {
  it("relativeLuminance matches hand-derived values", () => {
    expect(relativeLuminance("#ffffff")).toBe(1);
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#18181b")).toBeCloseTo(0.009265898451188897, 12);
    expect(relativeLuminance("#0072B2")).toBeCloseTo(0.15248980125973846, 12);
    expect(relativeLuminance("#009E73")).toBeCloseTo(0.25691524416758404, 12);
    expect(relativeLuminance("#f4c9d7")).toBeCloseTo(0.6591268164588283, 12);
  });
  it("contrastRatio matches hand-derived values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#0072B2", "#ffffff")).toBeCloseTo(
      5.185446345779855,
      12,
    );
    expect(contrastRatio("#009E73", "#ffffff")).toBeCloseTo(
      3.421139939945999,
      12,
    );
  });
  it("throws on a non-#rrggbb colour", () => {
    expect(() => relativeLuminance("red")).toThrow();
  });
  it("wcagMinContrast is 3 for large/bold text, 4.5 otherwise", () => {
    expect(wcagMinContrast(24, false)).toBe(3);
    expect(wcagMinContrast(18.66, true)).toBe(3);
    expect(wcagMinContrast(16, false)).toBe(4.5);
  });
});
