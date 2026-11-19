import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { PHONE_PLOT_PX, phoneFitCss, phonePlateScale } from "../craft/_shared/phone-plate.mjs";

// Three small-multiple columns (756 units) letterboxed into a 375 px page printed the panel names at ~7 px
// (gx-small-multiples web, 2026-11-19). The phone plate draws two columns with its words scaled to print at size.
describe("phonePlateScale", () => {
  const printed = (plateWidth: number, drawnAt: number, axisPx: number) =>
    (drawnAt * phonePlateScale({ plateWidth, drawnAt, axisPx }) * PHONE_PLOT_PX) / plateWidth;
  it("should print a two-column plate's panel names at the axis register's size", () => {
    expect(printed(498, 15, 12)).toBeCloseTo(12, 6);
  });
  it("should never draw the phone plate's words smaller than the wide plate's", () => {
    expect(phonePlateScale({ plateWidth: 200, drawnAt: 15, axisPx: 12 })).toBe(1);
  });
});

describe("phoneFitCss", () => {
  it("should hide the wide plates under the narrow breakpoint", () => {
    expect(phoneFitCss(".f")[1]).toBe('@container (max-width: 640px) { .f .chart-plot svg[data-fit="wide"] { display: none !important; } }');
  });
});
