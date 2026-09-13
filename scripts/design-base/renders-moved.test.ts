import { describe, it, expect } from "bun:test";
import { geometryDelta } from "./renders-moved.mjs";

describe("the geometry delta between two renders", () => {
  it("should report no movement for identical SVGs", () => {
    const svg = `<svg><text x="10.5" y="20">A</text></svg>`;
    expect(geometryDelta(svg, svg)).toEqual({ structure: false, max: 0 });
  });

  it("should report the largest numeric move when the structure is the same", () => {
    const before = `<svg><text x="10.5" y="20">A</text><line y1="4"/></svg>`;
    const after = `<svg><text x="10.5" y="20.3">A</text><line y1="4.1"/></svg>`;
    const delta = geometryDelta(before, after);
    expect([delta.structure, Number(delta.max.toFixed(3))]).toEqual([
      false,
      0.3,
    ]);
  });

  it("should report a structural change when an element or a line of text differs", () => {
    const before = `<svg><text y="20">A B</text></svg>`;
    const after = `<svg><text y="20">A</text><text y="40">B</text></svg>`;
    expect(geometryDelta(before, after).structure).toBe(true);
  });

  /** A base64 image in an SVG carries digit runs that are not numbers anyone drew: a 400-digit run
   *  parses to Infinity, Infinity − Infinity is NaN, and a NaN maximum is never over the tolerance —
   *  so a render that moved after that token used to read as `same`. */
  const HUGE = "7".repeat(400);

  it("should still see a move that follows a token too long to be a finite number", () => {
    const before = `<svg><image href="data:image/png;base64,A${HUGE}B"/><text y="20">A</text></svg>`;
    const after = `<svg><image href="data:image/png;base64,A${HUGE}B"/><text y="21">A</text></svg>`;
    const { max } = geometryDelta(before, after);
    expect([Number.isNaN(max), max > 0.25]).toEqual([false, true]);
  });

  it("should report no movement when that token and everything else are identical", () => {
    const svg = `<svg><image href="data:image/png;base64,A${HUGE}B"/><text y="20">A</text></svg>`;
    expect(geometryDelta(svg, svg)).toEqual({ structure: false, max: 0 });
  });

  it("should count a token that differs but is not a finite number as moved", () => {
    const before = `<svg><image href="data:A${HUGE}B"/></svg>`;
    const after = `<svg><image href="data:A${"8".repeat(400)}B"/></svg>`;
    expect(geometryDelta(before, after).max).toBe(Infinity);
  });
});
