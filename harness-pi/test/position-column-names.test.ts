import { describe, expect, it } from "bun:test";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";

const { columnNames } = familyModule as any;
const measure = (t: string) => t.length * 7;
const decades = ["années 1950", "années 1960", "années 1970"];

// gx-box-plot web (2026-11-19): eight "années 1950" columns printed over each other at 375 px.
describe("columnNames", () => {
  it("should drop the words every name shares when the names do not fit a phone's column", () => {
    expect(columnNames(decades, { pitchPx: 40, measure })).toEqual(["1950", "1960", "1970"]);
  });
  it("should keep the whole names when they fit", () => {
    expect(columnNames(decades, { pitchPx: 120, measure })).toEqual(decades);
  });
  it("should keep the whole names when they share nothing", () => {
    expect(columnNames(["France", "Japon"], { pitchPx: 10, measure })).toEqual(["France", "Japon"]);
  });
});
