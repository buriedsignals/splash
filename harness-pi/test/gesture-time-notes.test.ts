import { describe, expect, it } from "bun:test";
import { crossesLine, nudgeNotes } from "../craft/_shared/gesture-time-notes.mjs";

type N = { x: number; y: number; w: number; fixed?: boolean; leader?: boolean };
const boxOf = (n: N) => ({ left: n.x, right: n.x + n.w, top: n.y - 20, bottom: n.y + 6 });
const opts = (lines: number[][][]) => ({ boxes: [], boxOf, leadOf: () => 30, fontSizeOf: () => 20, plot: { top: 0, bottom: 500 }, lines });

// r8 on Osaurus (2026-11-12): "36 pedelec riders killed" sat right of its reading, on the rising line.
describe("the still's notes", () => {
  const rising = [[[100, 400], [300, 360], [500, 340]]];

  it("should step a note off the line that runs through it", () => {
    const [n] = nudgeNotes([{ x: 110, y: 392, w: 260 }], opts(rising));
    expect(crossesLine(rising, boxOf(n))).toBe(false);
  });

  it("should leave a note the line does not touch where it was", () => {
    const [n] = nudgeNotes([{ x: 110, y: 200, w: 260 }], opts(rising));
    expect(n.y).toBe(200);
  });
});
