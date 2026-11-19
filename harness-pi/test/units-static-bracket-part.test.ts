import { describe, expect, it } from "bun:test";
import { bracketPart } from "../craft/_shared/gesture-units-static.mjs";

// The static units plate drew a bracket of the whole as one even spine over every group with "s / total" beside it
// — the same misreading the video and the scrolly fixed (mvg98, mvq148): the part has to show on the spine.
const rows = { a: { top: 100, band: 30 }, b: { top: 140, band: 30 }, c: { top: 180, band: 30 } };
const rowOf = (n: string) => (rows as any)[n];

describe("units static — a bracket measured against the whole", () => {
  it("should give the group's own stretch along the whole's spine", () => {
    expect(bracketPart({ whole: true, own: ["b"] }, rowOf)).toEqual({ y1: 140, y2: 170 });
  });
  it("should give no stretch to a bracket of its own groups", () => {
    expect(bracketPart({ whole: false, own: ["a", "b"] }, rowOf)).toBeNull();
  });
});
