import { describe, expect, it } from "bun:test";
import {
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";

const ROWS = [
  { name: "Lisboa", value: 214 },
  { name: "Porto", value: 96 },
  { name: "Braga", value: 31 },
];
const CLAIM = { takeaway: "Lisboa carries more than twice Porto's trips." };
// gx-marimekko video (12B, 2026-11-18) wrote an object inside `of`: the refusal printed "[object Object]" and offered
// the nearest name to that text, "France · Solar", a row the claim never touched.
const refusal = (): GestureRefusal | undefined => {
  try {
    validateGestures({
      gestures: [
        {
          do: "compare",
          mark: "Lisboa",
          of: [{ name: "Porto" }],
          note: "214 against 96",
        },
      ],
      rows: ROWS,
      family: "length",
      format: "static",
      claim: CLAIM,
    });
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
};

describe("a mark name that is not a string", () => {
  it("should not print the object as [object Object]", () => {
    expect(refusal()?.message).not.toContain("[object Object]");
  });

  it("should say the entry must be a row's name written as a string", () => {
    expect(refusal()?.message).toContain("not a row's name");
  });

  it("should offer no nearest-name guess as the value that works", () => {
    expect((refusal() as any)?.fix?.set?.value).toBeUndefined();
  });
});

describe("repairing a mark name that is not a string", () => {
  it("should reach an accepted list instead of looping on the same refusal", async () => {
    const { repairGestures } = await import("../craft/_shared/gesture-core.mjs");
    const { gestures } = repairGestures({
      gestures: [{ do: "compare", mark: "Lisboa", of: [{ name: "Porto" }], note: "214 against 96" }],
      rows: ROWS,
      family: "length",
      format: "static",
      claim: CLAIM,
    });
    expect(JSON.stringify(gestures)).not.toContain("{\"name\"");
  });
});
