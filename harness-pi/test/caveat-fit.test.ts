import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped module
import { fitCaveat, ONE_LINE_PX } from "../craft/_shared/caveat-fit.mjs";

// One character = 6 px: the line holds about 236 of them.
const width = (t: string) => t.length * 6;
const chars = (n: number) => "a".repeat(n);

describe("fitCaveat", () => {
  it("should keep the derived sentence on the standfirst when both fit one line", () => {
    expect(
      fitCaveat({
        limits: chars(100),
        derived: chars(100),
        reading: "R",
        width,
      }).caveat,
    ).toBe(`${chars(100)} ${chars(100)}`);
  });
  it("should move the derived sentence to the reading line when both do not fit", () => {
    expect(
      fitCaveat({
        limits: chars(150),
        derived: chars(150),
        reading: "R",
        width,
      }),
    ).toEqual({ caveat: chars(150), reading: `${chars(150)} R` });
  });
  it("should refuse a first form that cannot fit alone, offering the journalist's words", () => {
    expect(() =>
      fitCaveat({
        limits: chars(300),
        derived: "",
        reading: "R",
        width,
        named: "Les mots du journaliste.",
      }),
    ).toThrow(
      /limits' first form runs \d+ px past .* a value that works: limits: "Les mots du journaliste\."/,
    );
  });
  it("should hold the line at the desktop window less its gutters", () => {
    expect(Math.round(ONE_LINE_PX)).toBe(1420);
  });
});
