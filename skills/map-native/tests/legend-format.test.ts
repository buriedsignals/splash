import { describe, it, expect } from "bun:test";
import { fmtBin, fmtBinRange } from "../src/core/legend-format";

describe("fmtBin (no minGap — matches the prior inline `fmt`)", () => {
  it("prints integers bare", () => {
    expect(fmtBin(2)).toBe("2");
    expect(fmtBin(0)).toBe("0");
    expect(fmtBin(-5)).toBe("-5");
  });

  it("rounds non-integers to 1 decimal", () => {
    expect(fmtBin(2.5)).toBe("2.5");
    expect(fmtBin(2.567)).toBe("2.6");
  });
});

describe("fmtBin (minGap — adjacent labels must stay distinct)", () => {
  it("derives 2 decimals when minGap is 0.02, so 0/0.02/0.04 stay distinct", () => {
    // A flat 1-decimal format would print "0.0" for all three — indistinguishable.
    expect(fmtBin(0, { minGap: 0.02 })).toBe("0.00");
    expect(fmtBin(0.02, { minGap: 0.02 })).toBe("0.02");
    expect(fmtBin(0.04, { minGap: 0.02 })).toBe("0.04");
  });

  it("derives 3 decimals when minGap is 0.001", () => {
    expect(fmtBin(0.001, { minGap: 0.001 })).toBe("0.001");
    expect(fmtBin(0.005, { minGap: 0.001 })).toBe("0.005");
  });

  it("clamps precision at 4 decimals even for a tiny minGap", () => {
    expect(fmtBin(0.000012, { minGap: 0.00001 })).toBe("0.0000");
  });

  it("ignores minGap >= 1 (default 1-decimal formatting is already sufficient)", () => {
    expect(fmtBin(2, { minGap: 1 })).toBe("2");
    expect(fmtBin(2.5, { minGap: 5 })).toBe("2.5");
  });

  it("ignores a zero or negative minGap (falls back to default)", () => {
    expect(fmtBin(2, { minGap: 0 })).toBe("2");
    expect(fmtBin(2, { minGap: -1 })).toBe("2");
  });
});

describe("fmtBinRange (Fix 1a — the legend bins carry the value unit, not just the header)", () => {
  it("appends the unit ONCE at the end of the range", () => {
    // The choropleth legend showed bare "16–30"; a static reader could not tell it was a
    // percentage. With the unit the bin reads "16–30%".
    expect(fmtBinRange(16, 30, { unit: "%" })).toBe("16–30%");
  });

  it("is a no-op suffix when no unit is given (back-compat with the bare range)", () => {
    expect(fmtBinRange(16, 30)).toBe("16–30");
    expect(fmtBinRange(16, 30, {})).toBe("16–30");
  });

  it("NEVER multiplies — a percentage-point boundary (29) stays 29, not 2900", () => {
    // map-native appends the unit as a literal suffix (like Datawrapper's number-append),
    // so the value must already be in display units. This is the guard against the 100× bug.
    expect(fmtBinRange(29, 45, { unit: "%" })).toBe("29–45%");
  });

  it("keeps decimal precision from minGap and appends the unit after it", () => {
    expect(fmtBinRange(0, 0.02, { unit: "%", minGap: 0.02 })).toBe(
      "0.00–0.02%",
    );
  });

  it("localizes the boundaries (French comma decimal) and still appends the unit", () => {
    // Avoid asserting the exact FR thousands glyph (U+202F) — use decimals, which the
    // French locale renders with a comma. The unit still lands after the localized range.
    expect(fmtBinRange(19.3, 45.6, { unit: " %", lang: "fr" })).toBe(
      "19,3–45,6 %",
    );
  });
});
