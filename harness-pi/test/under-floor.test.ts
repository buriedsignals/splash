import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { assertNoneUnderFloor } from "../craft/_shared/guards.mjs";

// gx-proportional-symbol web (12B, 2026-11-14, i18): the shared area-scale refused "m107, m108, m109, m110, m111"
// under "the legibility floor of 1" and said "raise the anchor radius" — a constant of the kit the beat cannot touch,
// keys the beat never wrote, and no value. The first pass spent its 15 minutes there.

const rows = [
  { name: "France", value: 97000 },
  { name: "Allemagne", value: 60000 },
  { name: "Malte", value: 40 },
  { name: "Andorre", value: 12 },
];
const floor = { maxRadius: 40, floor: 1, exponent: 0.5 };

describe("assertNoneUnderFloor", () => {
  it("should name the places drawn under the floor", () => {
    expect(() => assertNoneUnderFloor(rows, floor)).toThrow(/Malte, Andorre/);
  });

  it("should give the smallest value a circle can be drawn at", () => {
    expect(() => assertNoneUnderFloor(rows, floor)).toThrow(/a value that works: .*value >= 61\b/);
  });

  it("should pass places all drawn at or over the floor", () => {
    expect(() => assertNoneUnderFloor(rows.slice(0, 2), floor)).not.toThrow();
  });
});
