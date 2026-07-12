import { describe, it, expect } from "bun:test";
import {
  worstContrast,
  isContrastViolation,
  wcagMinContrast,
  LARGE_TEXT_BOLD_PX,
  LARGE_TEXT_NORMAL_PX,
} from "../src/core/contrast-scan";

describe("contrast-scan", () => {
  it("should flag vermillion text on white paper (3.87 < 4.5)", () => {
    expect(isContrastViolation("#D55E00", ["#ffffff"])).toBe(true);
  });

  it("should pass ink text on white paper", () => {
    expect(isContrastViolation("#1a1a1a", ["#ffffff"])).toBe(false);
  });

  it("should take the worst background when a label straddles two colours", () => {
    // white label: fine over a dark blue slice, failing over the white paper
    const w = worstContrast("#ffffff", ["#0072B2", "#ffffff"]);
    expect(w).toBeCloseTo(1, 1); // white-on-white ~1:1 dominates
    expect(isContrastViolation("#ffffff", ["#0072B2", "#ffffff"])).toBe(true);
  });

  it("should pass white label fully inside a dark slice", () => {
    expect(isContrastViolation("#ffffff", ["#0072B2"])).toBe(false);
  });
});

// WCAG SC 1.4.3 (Contrast Minimum): "large-scale text" — ≥18pt (24px) normal, OR
// ≥14pt (18.66px) BOLD — needs only 3:1, not 4.5:1. This matters for the heatmap's
// in-cell value labels: colour is the data (a continuous sequential ramp), so a
// mid-tone cell has NO 4.5:1 text colour (neither white nor ink clears it), but the
// max-contrast choice always clears ~4.16:1 ⇒ conformant AS large bold text.
describe("contrast-scan — WCAG large-text 3:1 provision (SC 1.4.3)", () => {
  it("small text keeps the 4.5:1 floor", () => {
    expect(wcagMinContrast(13, false)).toBe(4.5);
    expect(wcagMinContrast(13, true)).toBe(4.5); // small even if bold
    expect(wcagMinContrast(LARGE_TEXT_BOLD_PX - 1, true)).toBe(4.5);
  });
  it("bold text at ≥18.66px drops to the 3:1 large-text floor", () => {
    expect(wcagMinContrast(LARGE_TEXT_BOLD_PX, true)).toBe(3);
    expect(wcagMinContrast(20, true)).toBe(3);
  });
  it("normal-weight text needs ≥24px to reach the 3:1 large-text floor", () => {
    expect(wcagMinContrast(20, false)).toBe(4.5); // large but not large ENOUGH unbolded
    expect(wcagMinContrast(LARGE_TEXT_NORMAL_PX, false)).toBe(3);
  });
  it("a mid-tone heatmap cell (worst ≈ 4.2) is a violation as small text but conformant as large bold text", () => {
    // ink on a mid-dark ramp blue: ~4.2:1 — under 4.5 (small) but over 3.0 (large bold)
    const bg = ["#3282be"];
    expect(worstContrast("#1a1a1a", bg)).toBeLessThan(4.5);
    expect(worstContrast("#1a1a1a", bg)).toBeGreaterThan(3);
    expect(isContrastViolation("#1a1a1a", bg, wcagMinContrast(13, false))).toBe(
      true,
    );
    expect(isContrastViolation("#1a1a1a", bg, wcagMinContrast(20, true))).toBe(
      false,
    );
  });
});
