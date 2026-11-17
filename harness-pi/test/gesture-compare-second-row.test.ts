import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { validateGestures } from "../craft/_shared/gesture-core.mjs";

// gx-dot-density video (Qwen3.5-9B, mvq71): `{ do: "filter", marks: ["Nuclear"] }` then a compare on Nuclear alone
// was refused with « marks: [subject, other] » — a shape, not a value. A refusal names the rows that work.
const BEAT = {
  rows: [
    { name: "Hydro", value: 3400 },
    { name: "Wind", value: 2900 },
    { name: "Nuclear", value: 72 },
  ],
  family: "length",
  format: "static",
  claim: { takeaway: "72 réacteurs sur 6 372 centrales", subject: "Nuclear" },
};

describe("a compare on one row", () => {
  it("should give the subject against the largest other row as the value that works", () => {
    expect(() => validateGestures({ ...BEAT, gestures: [{ do: "compare", marks: ["Nuclear"] }] })).toThrow(
      /marks: \["Nuclear", "Hydro"\]/,
    );
  });

  it("should give of: \"whole\" as the other value that works", () => {
    expect(() => validateGestures({ ...BEAT, gestures: [{ do: "compare", marks: ["Nuclear"] }] })).toThrow(/of: "whole"/);
  });
});
