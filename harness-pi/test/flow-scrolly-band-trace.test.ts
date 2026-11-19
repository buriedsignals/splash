import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { bandTrace } from "../craft/scrolly/flow-map-route-and-origin-destination/flow-drive.mjs";

describe("bandTrace", () => {
  it("should count the last band as arrived where the bake settles, a hair short of the card", () => {
    expect(bandTrace(2 + 0.98 * 8, 9)).toBe(1);
  });
  it("should not start a band before its own step", () => {
    expect(bandTrace(2, 2)).toBe(0);
  });
});

// @ts-expect-error untyped module
import { fallbackPoint } from "../craft/scrolly/flow-map-route-and-origin-destination/flow-drive.mjs";

describe("fallbackPoint", () => {
  it("should place a baked point as object-fit cover scales and crops the card image", () => {
    expect(fallbackPoint({ width: 1000, height: 400 }, { width: 500, height: 250 }, { at: [[250, 125]] }, 0)).toEqual({ x: 500, y: 200 });
  });
  it("should crop the overflow evenly on the longer side", () => {
    expect(fallbackPoint({ width: 1000, height: 400 }, { width: 500, height: 250 }, { at: [[0, 0]] }, 0)).toEqual({ x: 0, y: -50 });
  });
  it("should crop the overflow evenly on a narrow stage", () => {
    expect(fallbackPoint({ width: 400, height: 500 }, { width: 500, height: 250 }, { at: [[0, 0]] }, 0)).toEqual({ x: -300, y: 0 });
  });
});
