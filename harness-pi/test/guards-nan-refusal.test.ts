import { describe, expect, it } from "bun:test";
import { assertNumbers } from "../craft/_shared/guards.mjs";

const refusal = (entries: [string, unknown][]) => {
  try {
    assertNumbers(entries, "markers");
  } catch (e) {
    return (e as Error).message;
  }
  return "";
};

describe("assertNumbers on a NaN", () => {
  // gx-bullet scrolly (Gemma 12B, mvg105): shares summed over names.slice(3), which took the text column
  // Entity_fr in; every share became NaN, printed "France=null", and the remedy "Convert them with Number()"
  // was already applied — the model repeated the same render until the cap, 31 turns, no render.
  it("should name a NaN as NaN, not null", () => {
    expect(refusal([["France", NaN]])).toContain("France=NaN");
  });
  it("should point a NaN at the arithmetic that read a cell that is not a number", () => {
    expect(refusal([["France", NaN]])).toMatch(/text column|not a number.*cell/);
  });
  it("should still ask for Number() when the value is a string", () => {
    expect(refusal([["France", "12,5"]])).toContain("Number()");
  });
});
