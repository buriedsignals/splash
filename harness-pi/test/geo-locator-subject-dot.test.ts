import { describe, expect, it } from "bun:test";
import { dotUnderLabel } from "../craft/_shared/geo-label-clear.mjs";

// gx-locator static (the 12B, 2026-11-15): Dnipro's ring sat on the « Z » of the subject's « Zaporizhzhia »;
// a reader who sees « ○Zaporizhzhia » gives the station the wrong dot.
describe("a settlement dot under the subject's label", () => {
  const label = [{ x0: 1262, y0: 478, x1: 1425, y1: 508 }];

  it("should be found when the dot sits on the label", () => {
    expect(dotUnderLabel(label, 1264, 480, 2.4)).toBe(true);
  });

  it("should be found when the ring only touches the label's edge", () => {
    expect(dotUnderLabel(label, 1258, 476, 2.4)).toBe(true);
  });

  it("should not be found clear of the label", () => {
    expect(dotUnderLabel(label, 1200, 430, 2.4)).toBe(false);
  });
});
