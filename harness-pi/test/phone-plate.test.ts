import { describe, expect, it } from "bun:test";
import { PHONE_PLOT_PX, phoneFitCss, phonePlateScale, phoneUnitsBox } from "../craft/_shared/phone-plate.mjs";
import { layoutRows } from "../craft/_shared/gesture-family-units.mjs";

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
    expect(phoneFitCss(".f")[1]).toBe('@container (max-width: 640px) { .f .chart-plot [data-fit="wide"] { display: none !important; } }');
  });
});

// Three pictogram rows of up to 18 squares on one line printed each square ~7 px wide at 375 px (gx-pictogram-isotype
// web, 2026-11-19). The phone box wraps a row's squares onto lines, so the layout picks squares a reader can count.
describe("phoneUnitsBox", () => {
  const box = phoneUnitsBox({ gutterPx: 127, maxCount: 18, rows: 3, rowPx: 28 });
  const geo = layoutRows({
    groups: [16, 6, 18].map((count, i) => ({ name: `g${i}`, count })),
    variant: "pictogram-isotype",
    box: { x: 0, y: 0, width: box.width * 0.86, height: box.height },
    gutter: 0,
  });
  it("should give the phone plate's squares at least the 14 px it asks for", () => {
    expect(geo.cell).toBeGreaterThanOrEqual(14);
  });
  it("should keep each row at least as tall as its own floor", () => {
    expect(box.height / 3).toBeGreaterThanOrEqual(28);
  });
});
