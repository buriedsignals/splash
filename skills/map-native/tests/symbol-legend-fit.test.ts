import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { endLabelGutterPx, textWidth } from "../../../lib/core/text-fit";

describe("the symbol legend is sized on the labels it will draw", () => {
  it("should reserve more than the fixed 60px for a long unit-carrying label", () => {
    // "8 magnitud…" — the measured clip. The legend text starts at max*2+10 and the SVG is
    // max*2+70 wide, i.e. exactly 60px for the string, whatever the string is.
    const labels = ["8 magnitude Richter", "4 magnitude Richter"];
    const gutter = endLabelGutterPx(labels, 11, { gapPx: 10, floorPx: 60 });
    expect(gutter).toBeGreaterThan(60);
    expect(gutter).toBeGreaterThanOrEqual(textWidth(labels[0], 11) + 10);
  });

  it("should not shrink below the historical floor for short labels", () => {
    expect(endLabelGutterPx(["8", "4"], 11, { gapPx: 10, floorPx: 60 })).toBe(
      60,
    );
  });

  it("should be what SymbolMap actually calls", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "src", "SymbolMap.tsx"),
      "utf8",
    );
    expect(src).toContain("endLabelGutterPx");
    expect(src).not.toContain("max * 2 + 70");
  });
});
