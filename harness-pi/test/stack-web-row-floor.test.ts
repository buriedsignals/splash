import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { stackBarUnits, stackRowFloor } from "../craft/_shared/stack-row-floor.mjs";

// gx-likert web at 375 px (2026-11-19): the floor counted the name alone, so the six bars drew 6.6 px tall and every
// figure printed inside them had to go — chart-web refused the page ("0 of 10 drawn at this size").
describe("stackRowFloor", () => {
  const six = { rows: 6, height: 280, maxBar: 22, namePx: 14, figurePx: 18 };
  it("should floor a row so its bar holds one line of the figures inside it", () => {
    const f = stackRowFloor(six)!;
    expect(stackBarUnits(f.pitch, six.maxBar) / f.pitch * f.px).toBeGreaterThanOrEqual(six.figurePx);
  });
  it("should keep the name's floor when the name is the taller need", () => {
    expect(stackRowFloor({ ...six, namePx: 60 })!.px).toBe(60);
  });
  it("should declare nothing for a single bar", () => {
    expect(stackRowFloor({ ...six, rows: 1 })).toBeNull();
  });
});
