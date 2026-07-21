import { describe, it, expect } from "bun:test";
import { relativeLuminance, contrastRatio, wcagMinContrast } from "./contrast";
// The current authoritative implementations we must stay byte-equal to:
import {
  relativeLuminance as cnLum,
  contrastRatio as cnRatio,
} from "../../skills/chart-native/src/core/conformance";

const SAMPLES = [
  "#ffffff",
  "#000000",
  "#18181b",
  "#009e73",
  "#71717a",
  "#e5e7eb",
];

describe("core/contrast parity with chart-native/conformance", () => {
  it("relativeLuminance matches on every sample", () => {
    for (const c of SAMPLES)
      expect(relativeLuminance(c)).toBeCloseTo(cnLum(c), 12);
  });
  it("contrastRatio matches on every ordered pair", () => {
    for (const a of SAMPLES)
      for (const b of SAMPLES)
        expect(contrastRatio(a, b)).toBeCloseTo(cnRatio(a, b), 12);
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
