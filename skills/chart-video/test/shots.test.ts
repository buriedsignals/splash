import { describe, expect, it } from "bun:test";
import { measureText } from "../scripts/render-still.mjs";
import { frameInsetFor, sizeFor } from "../scripts/sizes.mjs";
import {
  DRAWN_WIDER,
  keyFor,
  sourceCreditFor,
  titleCardFor,
  verticalInsetFor,
  widthOf,
  wrap,
} from "../scripts/shots.mjs";

/**
 * The shots every directed video beat is cut into (`references/directed-type-choreography.md`, « The shots,
 * and how little to write »): the title card, the key, the source credit. Widths are measured again here.
 */

const face = { fontFamily: "Open Sans", fontStyle: "normal" };
const reg = (fontSize: number, extra: object = {}) => ({
  ...face,
  fontSize,
  fontWeight: 400,
  letterSpacing: 0,
  lead: fontSize * 1.3,
  transform: "none",
  ...extra,
});
const registers = {
  display: reg(90, { fontFamily: "Merriweather", fontWeight: 700 }),
  eyebrow: reg(36, { letterSpacing: 4, transform: "uppercase" }),
  value: reg(60, { fontWeight: 700 }),
  axis: reg(39),
};
const row = sizeFor("landscape");
const measured = (text: string, r: any) =>
  measureText(text, {
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
    fontStyle: "normal",
  }) +
  r.letterSpacing * Math.max(0, [...text].length - 1);

describe("wrap", () => {
  it("should break at ordinary spaces and never at a no-break space", () => {
    // The measure holds « Our World in Data » and not one character more: an ordinary space before « · »
    // would leave the dot to start the next line.
    const measure = widthOf("Our World in Data", registers.axis) + 1;
    const lines = wrap(
      "Our World in Data · Natural Earth",
      registers.axis,
      measure,
    );
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.some((l: any) => l.text.startsWith("·"))).toBe(false);
  });
});

describe("titleCardFor", () => {
  const card = titleCardFor({
    registers,
    eyebrow: "Énergie · Europe",
    title: ["Le bas-carbone européen est au nord-ouest — et en Albanie"],
    size: "landscape",
    eyebrowToDisplay: 0.75,
  });

  it("should set the title from the frame's inset in at most three lines of 72 % of the content width", () => {
    const measure = 0.72 * (row.width - 2 * frameInsetFor("landscape"));
    expect(card.title.length).toBeLessThanOrEqual(3);
    for (const l of card.title) {
      expect(l.x).toBe(frameInsetFor("landscape"));
      expect(
        measured(l.text, card.register) * (1 + DRAWN_WIDER),
      ).toBeLessThanOrEqual(measure + 0.01);
    }
  });

  it("should case the eyebrow by its register and sit it above the title", () => {
    expect(card.eyebrow.text).toBe("ÉNERGIE · EUROPE");
    expect(card.eyebrow.y).toBeLessThan(
      card.title[0].y - card.register.fontSize,
    );
  });

  it("should centre the block on the frame's height within a lead", () => {
    const top = card.eyebrow.y - registers.eyebrow.fontSize;
    const bottom = card.title.at(-1).y;
    expect(Math.abs(row.height - bottom - top)).toBeLessThan(
      card.register.lead,
    );
  });
});

describe("sourceCreditFor", () => {
  const credit = sourceCreditFor({
    registers,
    forms: [
      "Source : Ember, Energy Institute, via Our World in Data · Natural Earth",
    ],
    size: "landscape",
    k: 3,
  });

  it("should set the credit at the type floor, in at most three lines, inside its own box", () => {
    expect(credit.register.fontSize).toBe(row.minTypePx);
    expect(credit.lines.length).toBeLessThanOrEqual(3);
    for (const l of credit.lines)
      expect(
        l.x + measured(l.text, credit.register) * (1 + DRAWN_WIDER),
      ).toBeLessThanOrEqual(credit.width + 0.01);
  });
});

describe("keyFor", () => {
  const key = keyFor({
    registers,
    k: 3,
    counters: [["40 pays", "7 pays"], ["au km² 44,9 %"]],
    breaks: ["40 %", "60 %", "75 %", "94 %"],
    missingLabel: "sans donnée",
  });

  it("should stack one row per counter, then the swatches, the bornes and the absence", () => {
    expect(key.counters.length).toBe(2);
    expect(key.counters[1][0].y).toBeGreaterThan(key.counters[0][0].y);
    expect(key.swatches.length).toBe(5);
    expect(key.swatches[0].y).toBeGreaterThan(key.counters[1][0].y);
    expect(key.bornes[0].y).toBeGreaterThan(key.swatches[0].y);
    expect(key.missingLabel.y).toBeGreaterThan(key.bornes[0].y);
  });

  it("should hold every word inside its width and height", () => {
    for (const w of [...key.counters.flat(), ...key.bornes, key.missingLabel]) {
      const r = key.counters.flat().includes(w)
        ? registers.value
        : registers.axis;
      expect([
        w.text,
        w.x + measured(w.text, r) * (1 + DRAWN_WIDER) <= key.width + 0.01,
        w.y <= key.height,
      ]).toEqual([w.text, true, true]);
    }
  });
});

describe("verticalInsetFor", () => {
  it("should read the margin ratio on the frame's height, never under two floors of type", () => {
    expect(verticalInsetFor("landscape")).toBeGreaterThanOrEqual(
      2 * row.minTypePx,
    );
  });
});
