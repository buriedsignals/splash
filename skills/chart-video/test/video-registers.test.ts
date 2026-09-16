import { describe, expect, it } from "bun:test";
import {
  filedDirections,
  resolveDirectionFamilies,
} from "#shared/design-base/index.mjs";
import { registerOf } from "#shared/design-base/register.mjs";
import { REGISTERS } from "#shared/chart-beat/registers.mjs";
import { sizeFor } from "../scripts/sizes.mjs";
import {
  scaleRegister,
  videoRegistersOf,
} from "../scripts/video-registers.mjs";

/**
 * A register filed for a 960×540 still is resolved by the trunk (cap height, the face's own line)
 * and then drawn at the VIDEO size: every one of the six registers multiplied by the SAME factor
 * k, never below the row's floor. The lead travels in pixels — the web seam dropped it without a
 * word, and this one must not.
 */

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
  it("should multiply the size by k", () => {
    expect(scaleRegister(body, 2.5).fontSize).toBeCloseTo(32.5, 6);
  });

  it("should carry the lead in pixels at the drawn size", () => {
    expect(scaleRegister(body, 2.5).lead).toBeCloseTo(61.971, 3);
  });

  it("should scale the tracking with the size", () => {
    expect(scaleRegister(body, 2.5).letterSpacing).toBeCloseTo(0.65, 6);
  });
});

describe("videoRegistersOf — the floor lifts the whole ladder", () => {
  // Hand-derived (spec §3): landscape row is typeScale 2.5, floor 30. The smallest resolved size
  // here is eyebrow's 10, so k = max(2.5, 30 / 10) = 3 — every register scales by 3, not only the
  // one that would otherwise land under the floor.
  const resolvedByName = {
    display: { ...body, fontSize: 30 },
    eyebrow: { ...body, fontSize: 10 },
    body: { ...body, fontSize: 13 },
    annot: { ...body, fontSize: 12 },
    value: { ...body, fontSize: 13 },
    axis: { ...body, fontSize: 11.44 },
  };

  it("should lift every register by the same k, derived from the smallest", () => {
    const drawn = videoRegistersOf(resolvedByName, "landscape");
    expect({
      display: drawn.display.fontSize,
      eyebrow: drawn.eyebrow.fontSize,
      body: drawn.body.fontSize,
      annot: drawn.annot.fontSize,
      value: drawn.value.fontSize,
      axis: drawn.axis.fontSize,
    }).toEqual({
      display: 90,
      eyebrow: 30,
      body: 39,
      annot: 36,
      value: 39,
      axis: 34.32,
    });
  });

  it("should preserve the size ORDER of the six registers after scaling", () => {
    const before = Object.entries(resolvedByName)
      .sort((a, b) => a[1].fontSize - b[1].fontSize)
      .map(([name]) => name);
    const drawn = videoRegistersOf(resolvedByName, "landscape");
    const after = Object.entries(drawn)
      .sort((a, b) => a[1].fontSize - b[1].fontSize)
      .map(([name]) => name);
    expect(after).toEqual(before);
  });
});

describe("videoRegistersOf — every filed direction", () => {
  const text = {
    display: "Émissions de CO₂",
    eyebrow: "Climat",
    body: "Source",
    annot: "Lecture",
    value: "12,5",
    axis: "2024",
  };

  for (const direction of filedDirections()) {
    for (const sizeName of ["landscape", "portrait"] as const) {
      it(`should draw every ${direction.id} register at or above the ${sizeName} floor, led by its own lineHeight`, () => {
        const fitted = resolveDirectionFamilies(direction, text);
        const resolvedByName = Object.fromEntries(
          REGISTERS.map((name) => [name, registerOf(fitted, name)]),
        );
        const drawn = videoRegistersOf(resolvedByName, sizeName);
        const row = sizeFor(sizeName);
        const failures = Object.entries(drawn)
          .filter(([name, r]: [string, any]) => {
            const underFloor = r.fontSize < row.minTypePx;
            const wrongLead =
              Math.abs(r.lead - resolvedByName[name].lineHeight * r.fontSize) >
              1e-9;
            return underFloor || wrongLead;
          })
          .map(([name]) => name);
        expect([direction.id, sizeName, failures]).toEqual([
          direction.id,
          sizeName,
          [],
        ]);
      });
    }
  }
});
