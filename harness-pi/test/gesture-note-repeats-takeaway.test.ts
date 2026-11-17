import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { repairGestures, validateGestures } from "../craft/_shared/gesture-core.mjs";

// gx-dot-density video (Qwen3.5-9B, mvq71): the filter's note was the takeaway again, with the exact count where the
// takeaway rounds ("72 réacteurs sur 8 872 centrales…" under the title "72 réacteurs sur 8 900 centrales…"). The frame
// printed the title twice. A note says what its gesture adds.
const BEAT = {
  rows: [
    { name: "Hydro", value: 3400 },
    { name: "Wind", value: 5400 },
    { name: "Nuclear", value: 72 },
  ],
  family: "length",
  format: "static",
  claim: { takeaway: "72 réacteurs sur 8 900 centrales bas-carbone — et un tiers de la puissance", subject: "Nuclear" },
};
const REPEAT = { do: "highlight", mark: "Nuclear", note: "72 réacteurs sur 8 872 centrales bas-carbone — et un tiers de la puissance" };

describe("a note that repeats the takeaway", () => {
  it("should be refused as the title printed twice", () => {
    expect(() => validateGestures({ ...BEAT, gestures: [REPEAT] })).toThrow(/gestures\[0\]\.note.*repeats the takeaway/);
  });

  it("should repair to the gesture without its note", () => {
    expect(repairGestures({ ...BEAT, gestures: [REPEAT] }).gestures[0].note).toBeUndefined();
  });

  it("should pass a note that shares the takeaway's figure and says something else", () => {
    expect(() =>
      validateGestures({ ...BEAT, gestures: [{ do: "highlight", mark: "Nuclear", note: "72 réacteurs, un tiers de la puissance" }] }),
    ).not.toThrow();
  });
});
