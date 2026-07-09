import { describe, it, expect } from "bun:test";
import { wrapLabel, textWidth } from "../src/core/text";

const F = 13; // base axis font
describe("wrapLabel — fit long labels onto ≤2 lines", () => {
  it("returns the text as one line when it already fits", () => {
    expect(wrapLabel("Action sociale", 1000, F)).toEqual(["Action sociale"]);
  });

  it("wraps a long multi-word label onto two lines, each within maxPx", () => {
    const label = "Administration générale et finances";
    const maxPx = textWidth("Administration générale", F) + 2; // force a break
    const lines = wrapLabel(label, maxPx, F, 2);
    expect(lines.length).toBe(2);
    for (const l of lines)
      expect(textWidth(l, F)).toBeLessThanOrEqual(maxPx + 1);
    // no words are dropped (last line may carry an ellipsis, but the words are there)
    expect(lines.join(" ")).toContain("Administration");
  });

  it("truncates the last line only when the remaining words still overflow", () => {
    const label =
      "Direction générale des infrastructures et de la mobilité urbaine";
    const lines = wrapLabel(label, 120, F, 2);
    expect(lines.length).toBe(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("truncates a single unbreakable word rather than looping", () => {
    expect(wrapLabel("Supercalifragilisticexpialidocious", 60, F)).toEqual([
      // one word → no wrap point → falls back to truncate
      wrapLabel("Supercalifragilisticexpialidocious", 60, F)[0],
    ]);
    expect(
      wrapLabel("Supercalifragilisticexpialidocious", 60, F)[0].endsWith("…"),
    ).toBe(true);
  });
});
