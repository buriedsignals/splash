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
import { DERIVED_SIZE_RATIO } from "#shared/chart-beat/registers.mjs";
import { webRegister, webRegisters } from "#shared/design-base/web.mjs";

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

/**
 * A REGISTER IS RESOLVED IN ITS FAMILY'S VOCABULARY, AND THE FAMILY IS THE CALLER'S TO NAME.
 *
 * `family` picks the APPARATUS registers a beat may write into (`FAMILY_REGISTERS`: a chart derives
 * `axis` out of `body`, a map derives `place` out of `annot`) — never a font ladder. Ladders are per
 * ROLE and `ladderHeadFor` reads the direction's own decisions by register NAME, so nothing about a
 * face travels in this ctx. It is additive and default-identical: without it `registerOf` resolves a
 * chart, exactly as it did before, and a map's `place` is REFUSED rather than answered wrongly.
 */
describe("a register resolved in its family", () => {
  const direction = resolveDirectionFamilies(filedDirections()[0], {
    ...TEXT,
    place: "Genève",
  });

  it("should resolve a map's place out of the annot voice it derives from", () => {
    const annot = registerOf(direction, "annot");
    const place = registerOf(direction, "place", { family: "map" });
    expect(place.derivedFrom).toBe("annot");
    expect(place.fontFamily).toBe(annot.fontFamily);
    expect(place.leading).toBe(annot.leading);
    expect(place.lineHeight).toBeCloseTo(annot.lineHeight, 9);
    // The filed size is the annot's, one derived step down; the DRAWN size follows it through the
    // same cap-height resolution, so the ratio survives.
    expect(place.filedSize).toBeCloseTo(
      Math.round(annot.filedSize * DERIVED_SIZE_RATIO * 10) / 10,
      9,
    );
    expect(place.fontSize / annot.fontSize).toBeCloseTo(
      place.filedSize / annot.filedSize,
      6,
    );
  });

  it("should refuse a map's place to a caller that named no family", () => {
    expect(() => registerOf(direction, "place")).toThrow(
      /no such register for a chart/,
    );
  });

  it("should answer a chart exactly as it did with no ctx at all", () => {
    for (const name of ["display", "eyebrow", "body", "axis", "annot", "value"])
      expect(registerOf(direction, name, { family: "chart" })).toEqual(
        registerOf(direction, name),
      );
  });
});

/**
 * THE WEB CARRIES THE LINE THE TRUNK RESOLVED, AND CARRIES IT UNITLESS.
 *
 * `webRegister` turned a register into a React inline style and set NO `lineHeight`, so the leading
 * a direction files reached a still and never a page: the two genres disagreed on vertical rhythm
 * with nothing going red (`docs/splash/2026-09-13-adaptive-leading-spec.md` §7, "écart connu, côté
 * web"). It goes out UNITLESS — a ratio the browser multiplies by each element's own font-size,
 * which is exactly `leadOf(r) = r.lineHeight * r.fontSize` — because a `px` value inherits as a
 * fixed box and would set a nested run on its parent's line.
 */
describe("a register spoken in CSS", () => {
  const INK = { ink: "#111111", muted: "#666666", accent: "#008060" };
  const direction = resolveDirectionFamilies(filedDirections()[0], {
    ...TEXT,
    place: "Genève",
  });

  it("should emit the trunk's line height, unitless", () => {
    for (const name of ["display", "eyebrow", "body", "axis", "annot", "value"]) {
      const css = webRegister(direction, name, { ink: INK });
      const r = registerOf(direction, name);
      expect([name, css.lineHeight]).toEqual([name, r.lineHeight]);
      // A number, not "1.45px" and not "145%": both would be dropped or misread on inheritance.
      expect([name, typeof css.lineHeight]).toEqual([name, "number"]);
      expect([name, css.lineHeight > 1 && css.lineHeight < 3]).toEqual([name, true]);
    }
  });

  it("should set the page on the same line the still is set on", () => {
    const css = webRegisters(direction, { ink: INK });
    for (const name of Object.keys(css)) {
      const r = registerOf(direction, name);
      // px per line, computed the way a browser would from what the page actually declares.
      const onThePage = Number.parseFloat(css[name].fontSize) * css[name].lineHeight;
      expect([name, onThePage]).toEqual([name, leadOf(r)]);
    }
  });

  it("should size the page at the cap height the still is sized at", () => {
    const css = webRegisters(direction, { ink: INK });
    for (const name of Object.keys(css))
      expect([name, css[name].fontSize]).toEqual([
        name,
        `${registerOf(direction, name).fontSize}px`,
      ]);
  });

  /** The assertion above is vacuous on the corpus as filed — every register of every filed
   *  direction resolves to the head of its own ladder for this text, so the drawn size equals the
   *  filed one and `resolveRegister` and `registerOf` cannot be told apart. This is the case that
   *  tells them apart: the ladder moved off its head, which is what a missing code point does. */
  it("should carry the size the LADDER landed on, not the size the direction filed", () => {
    const moved = {
      ...direction,
      registers: {
        ...direction.registers,
        display: { ...direction.registers.display, family: "Roboto Slab" },
      },
      decisions: direction.decisions.map((d) =>
        d.register === "display" ? { ...d, family: "Roboto Slab" } : d,
      ),
    };
    const r = registerOf(moved, "display");
    expect(r.referenceFamily).toBe("Merriweather");
    expect(r.fontFamily).toBe("Roboto Slab");
    // A narrower cap needs a larger point size to reach the same cap height.
    expect(r.fontSize).toBeGreaterThan(r.filedSize);
    const css = webRegister(moved, "display", { ink: INK });
    expect(css.fontSize).toBe(`${r.fontSize}px`);
    expect(css.fontSize).not.toBe(`${r.filedSize}px`);
    expect(Number.parseFloat(css.fontSize) * css.lineHeight).toBe(leadOf(r));
  });

  it("should speak a map's apparatus register when the caller names the family", () => {
    const css = webRegister(direction, "place", { ink: INK, family: "map" });
    expect(css.lineHeight).toBe(
      registerOf(direction, "place", { family: "map" }).lineHeight,
    );
  });
});

/*
 * THE MUTATIONS THAT REDDEN THESE, each run against this tree and then reverted.
 *
 *   1. `webRegister` drops `lineHeight: r.lineHeight` from its returned object
 *      -> "should emit the trunk's line height, unitless"
 *         expect(["display", undefined]).toEqual(["display", 1.2005…])
 *      and "should set the page on the same line the still is set on" (NaN against the lead).
 *
 *   2. `webRegister` emits `lineHeight: \`${r.lineHeight}px\`` instead of the bare number
 *      -> "should emit the trunk's line height, unitless"
 *         expect(["display", "string"]).toEqual(["display", "number"])
 *
 *   3. `webRegister` goes back to `resolveRegister(direction, name, { family })`
 *      -> "should size the page at the cap height the still is sized at" (the filed size, not the
 *         drawn one) and "should emit the trunk's line height, unitless" (no lineHeight at all).
 *
 *   4. `registerOf` drops its third parameter and calls `resolveRegister(direction, name)`
 *      -> "should resolve a map's place out of the annot voice it derives from"
 *         threw "no such register for a chart: place"
 */
