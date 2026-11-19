import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { lollipopRowFloor, pairLiftPx } from "../craft/web/lollipop/phone-floor.mjs";

// A 375 px phone shrank gx-lollipop's plot to ~180 × 90 px under a long title (2026-11-19); a floor on its value axis
// keeps it the page's width, and tall enough that the tallest head's lifted figure stays inside the plot.
const o = { intervals: 5, height: 360, headroom: 0.14, valuePx: 13, lead: 1.3, headClearPx: 11 };

describe("lollipopRowFloor", () => {
  it("should keep the tallest head's two stacked figures inside the headroom of a floored cell", () => {
    const f = lollipopRowFloor(o);
    const cellPx = (f.px * o.height) / f.pitch;
    expect(cellPx * (o.headroom / (1 + o.headroom))).toBeGreaterThanOrEqual(o.headClearPx + 2 * pairLiftPx(o.valuePx, o.lead));
  });
  it("should lay its intervals at the pitch the scale gives them under the headroom", () => {
    expect(lollipopRowFloor(o).pitch).toBeCloseTo(360 / 1.14 / 5, 9);
  });
  it("should declare nothing for an axis with no interval", () => {
    expect(lollipopRowFloor({ ...o, intervals: 0 })).toBeNull();
  });
});
