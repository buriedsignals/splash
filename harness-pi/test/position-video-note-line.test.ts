// mvg23 (gx-dot-strip video, the 12B, 2026-11-18): "Pologne: le plancher : 1,6 % puis 31,1 %, +30 points" was written
// at the left of the line above the plot, and the unit line "Part de bas-carbone … à la même échelle" at its right:
// both on one line, the two ran into each other. A note that does not fit beside the unit takes a line of its own.
import { describe, expect, it } from "bun:test";
import * as runModule from "../craft/_shared/gesture-position-run.mjs";

const { noteLineStacks } = runModule as any;

describe("the line above a Position video's plot", () => {
  it("should stack a note that would run into the unit line", () => {
    expect(noteLineStacks({ notes: [560], unit: 720, width: 1200, gap: 24 })).toBe(true);
  });
  it("should keep a short note beside the unit line", () => {
    expect(noteLineStacks({ notes: [300], unit: 720, width: 1200, gap: 24 })).toBe(false);
  });
});
