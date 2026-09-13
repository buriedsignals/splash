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
});
