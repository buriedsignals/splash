// LANE: heavy
/**
 * A REGISTER'S LINE IS ITS FACE'S OWN LINE, TIMES THE DIRECTION'S COEFFICIENT, AT THE SIZE IT IS
 * DRAWN.
 *
 * Calibrated so the head of every role's ladder sets exactly where the typed multipliers used to
 * (spec §4): the page does not move on the faces the corpus draws with, and the line follows any
 * other face the ladder picks.
 */
import { describe, it, expect } from "bun:test";
import {
  filedDirections,
  resolveDirectionFamilies,
} from "#shared/design-base/index.mjs";
import { LADDERS } from "#shared/design-base/resolve-families.mjs";
import { naturalLineHeightOf } from "#shared/design-base/vertical-metrics.mjs";
import {
  EYEBROW_TO_DISPLAY,
  READING_TO_SOURCE,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

const LEGACY: Record<string, number> = {
  display: 1.22,
  eyebrow: 1.2,
  body: 1.45,
  axis: 1.2,
  annot: 1.4,
  value: 1.2,
};
const TEXT = {
  display: "Titre",
  eyebrow: "Climat",
  body: "Texte",
  axis: "0",
  annot: "Note",
  value: "1,2",
};

describe("a register's lead", () => {
  for (const filed of filedDirections()) {
    const direction = resolveDirectionFamilies(filed, TEXT);
    for (const name of Object.keys(LEGACY)) {
      it(`should set ${filed.id}'s ${name} where the typed multiplier did, on the head face`, () => {
        const r = registerOf(direction, name);
        // Only a head face reproduces the legacy multiplier; the ladder resolves to it for this text.
        const head = (LADDERS as Record<string, string[]>)[
          filed.registers[name].family
        ][0];
        expect(r.fontFamily).toBe(head);
        expect(Math.abs(leadOf(r) - r.fontSize * LEGACY[name])).toBeLessThan(
          0.01,
        );
      });
    }
  }

  it("should be the face's natural line times the leading times the drawn size", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const r = registerOf(direction, "body");
    const natural = naturalLineHeightOf(r.fontFamily, r.fontWeight, {
      italic: r.fontStyle === "italic",
    });
    expect(r.naturalLineHeight).toBe(natural);
    expect(leadOf(r)).toBeCloseTo(natural * r.leading * r.fontSize, 9);
  });

  it("should follow a copy drawn at another size", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const display = registerOf(direction, "display");
    const shrunk = { ...display, fontSize: display.fontSize * 0.9 };
    expect(leadOf(shrunk)).toBeCloseTo(leadOf(display) * 0.9, 9);
  });

  it("should express a gap as a multiple of the lead", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const eyebrow = registerOf(direction, "eyebrow");
    const annot = registerOf(direction, "annot");
    expect(gapOf(eyebrow, EYEBROW_TO_DISPLAY)).toBeCloseTo(
      leadOf(eyebrow) * 0.75,
      9,
    );
    // The two trunk gaps reproduce the typed ones on the head face.
    expect(
      Math.abs(gapOf(eyebrow, EYEBROW_TO_DISPLAY) - eyebrow.fontSize * 0.9),
    ).toBeLessThan(0.01);
    expect(
      Math.abs(gapOf(annot, READING_TO_SOURCE) - annot.fontSize * 0.6),
    ).toBeLessThan(0.01);
  });

  it("should refuse a register whose direction files no leading", () => {
    const direction = resolveDirectionFamilies(filedDirections()[0], TEXT);
    const stripped = {
      ...direction,
      registers: {
        ...direction.registers,
        body: { ...direction.registers.body, leading: undefined },
      },
    };
    expect(() => registerOf(stripped, "body")).toThrow(/leading/);
  });
});
