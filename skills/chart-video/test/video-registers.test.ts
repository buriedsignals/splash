import { describe, expect, it } from "bun:test";
import {
  filedDirections,
  resolveDirectionFamilies,
} from "#shared/design-base/index.mjs";
import {
  scaleRegister,
  videoRegistersOf,
} from "../scripts/video-registers.mjs";

/**
 * A register filed for a 960×540 still is resolved by the trunk (cap height, the face's own line)
 * and then drawn at the VIDEO size: multiplied by the row's type scale and never below its floor.
 * The lead travels in pixels — the web seam dropped it without a word, and this one must not.
 */

const LANDSCAPE = { typeScale: 2.5, minTypePx: 30 };
const body = {
  fontFamily: "Open Sans",
  fontSize: 13,
  fontWeight: 400,
  fontStyle: "normal",
  letterSpacing: 0.26,
  transform: "none",
  lineHeight: 1.9068,
  fill: "#61605a",
};

describe("scaleRegister", () => {
  it("should multiply the size by the row's type scale", () => {
    expect(scaleRegister(body, LANDSCAPE).fontSize).toBeCloseTo(32.5, 6);
  });

  it("should carry the lead in pixels at the drawn size", () => {
    expect(scaleRegister(body, LANDSCAPE).lead).toBeCloseTo(61.971, 3);
  });

  it("should scale the tracking with the size", () => {
    expect(scaleRegister(body, LANDSCAPE).letterSpacing).toBeCloseTo(0.65, 6);
  });

  it("should lift a register the scale leaves under the floor to the floor", () => {
    const axis = { ...body, fontSize: 11.44 };
    expect(scaleRegister(axis, LANDSCAPE).fontSize).toBe(30);
  });

  it("should lead a lifted register on its lifted size", () => {
    const axis = { ...body, fontSize: 11.44 };
    expect(scaleRegister(axis, LANDSCAPE).lead).toBeCloseTo(57.204, 3);
  });
});

describe("videoRegistersOf", () => {
  const text = {
    display: "Émissions de CO₂",
    eyebrow: "Climat",
    body: "Source",
    annot: "Lecture",
    value: "12,5",
    axis: "2024",
  };

  for (const direction of filedDirections()) {
    it(`should draw every ${direction.id} register at or above the landscape floor`, () => {
      const registers = videoRegistersOf(
        resolveDirectionFamilies(direction, text),
        "landscape",
      );
      const under = Object.entries(registers)
        .filter(([, r]) => r.fontSize < 30)
        .map(([name]) => name);
      expect([direction.id, under]).toEqual([direction.id, []]);
    });
  }
});
