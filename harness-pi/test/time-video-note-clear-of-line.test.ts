// gx-line video, Qwen3.5-9B (mvq39, 2026-11-17): "pic de 1973 : 46,2 Mt" was set right of the peak, where the line
// runs on at 44–46 Mt for thirty years; the note's halo erased the line under the words. The video's notes stepped
// clear of each other only — the still's (nudgeNotes) already stepped clear of the drawn lines.
import { describe, expect, it } from "bun:test";
import { crossesLine, placeNoteBeside } from "../craft/_shared/gesture-time-notes.mjs";

// A peak at x=100, then a plateau just under it running right to x=600 (y grows downward).
const lines = [[[0, 400], [100, 100], [130, 160], [200, 96], [600, 94], [700, 300]]];
const plot = { left: 0, right: 700, top: 0, bottom: 500 };
const opts = { width: 180, gap: 8, lead: 30, fontSize: 24, plot, placed: [] as any[], lines };
const boxOf = (ax: number, ay: number, n: { dx: number; dy: number }) => ({ left: ax + n.dx, right: ax + n.dx + 180, top: ay + n.dy - 24, bottom: ay + n.dy + 24 * 0.3 });

describe("a video note beside a reading", () => {
  it("should not sit on the drawn line", () => {
    const n = placeNoteBeside({ ...opts, placed: [], ax: 100, ay: 100 });
    expect(crossesLine(lines, boxOf(100, 100, n))).toBe(false);
  });
  it("should keep its first place when nothing is under it", () => {
    const n = placeNoteBeside({ ...opts, placed: [], lines: [], ax: 100, ay: 100 });
    expect([n.dx, n.dy]).toEqual([8, -8]);
  });
});

// mvq39 again: cleared of the line on its right side only, the peak's note fell four leads, onto the comparison's
// rule, while the space left of the peak was free.
describe("a video note whose right side is crossed at every near distance", () => {
  // The peak at (400, 100); a plateau right of it at the note's height and a lead either side; the rise left of it far below.
  const plateau = [[[200, 400], [400, 100], [420, 95], [700, 95]], [[420, 65], [700, 65]], [[420, 125], [700, 125]]];
  it("should sit beside the reading on the free side rather than step far away", () => {
    const n = placeNoteBeside({ ...opts, plot: { left: 0, right: 700, top: 0, bottom: 500 }, placed: [], lines: plateau, ax: 400, ay: 100 });
    expect([n.dx, n.dy]).toEqual([-8 - 180, -8]);
  });
});
