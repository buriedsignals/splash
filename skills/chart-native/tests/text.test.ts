import { describe, it, expect } from "bun:test";
import {
  wrapLabel,
  textWidth,
  rotatedLabelDescentPx,
  rotatedLabelFitPx,
  ROTATED_TICK_ANGLE_DEG,
} from "../src/core/text";

const F = 13; // base axis font
const cos = (deg: number) => Math.cos((deg * Math.PI) / 180);
const sin = (deg: number) => Math.sin((deg * Math.PI) / 180);

describe("rotatedLabelDescentPx — bottom margin a rotated tick label needs", () => {
  it("is sinθ · width", () => {
    expect(rotatedLabelDescentPx(200, 40)).toBeCloseTo(sin(40) * 200, 5);
  });

  it("grows with the label width", () => {
    expect(rotatedLabelDescentPx(200)).toBeGreaterThan(
      rotatedLabelDescentPx(100),
    );
  });

  it("is never negative", () => {
    expect(rotatedLabelDescentPx(-5)).toBe(0);
    expect(rotatedLabelDescentPx(0)).toBe(0);
  });
});

describe("rotatedLabelFitPx — width that keeps the readable START on-canvas", () => {
  it("places the rotated label's far (start) end exactly at safeLeft", () => {
    const tickX = 161;
    const safeLeft = 4;
    const maxPx = rotatedLabelFitPx(tickX, safeLeft, 40);
    const startX = tickX - cos(40) * maxPx;
    expect(startX).toBeCloseTo(safeLeft, 5);
  });

  it("gives a wider budget to a tick further from the left edge", () => {
    expect(rotatedLabelFitPx(600, 4)).toBeGreaterThan(
      rotatedLabelFitPx(120, 4),
    );
  });

  it("is 0 when the tick sits at or left of the safe margin", () => {
    expect(rotatedLabelFitPx(4, 4)).toBe(0);
    expect(rotatedLabelFitPx(2, 10)).toBe(0);
  });

  it("uses the shared −40° tick angle by default", () => {
    expect(ROTATED_TICK_ANGLE_DEG).toBe(40);
    expect(rotatedLabelFitPx(161, 4)).toBeCloseTo(
      rotatedLabelFitPx(161, 4, 40),
      5,
    );
  });
});
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
