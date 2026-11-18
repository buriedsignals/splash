import { describe, expect, it } from "bun:test";
import { validateGestures } from "../craft/_shared/gesture-core.mjs";

// gx-beeswarm video (12B, mvg89, 2026-11-18): told a note was laid out wider in Chrome than in Bun, the model broke
// it with newlines inside its template literal; every family on the ladder then refused U+000A, and it spent 25 turns
// moving the breaks before the craft stopped on "same failure 3x".
const rows = [
  { name: "Qatar", value: 40.1 },
  { name: "Inde", value: 2.1 },
];
const noteOf = (note: string) =>
  validateGestures({
    gestures: [{ do: "highlight", mark: "Qatar", note }],
    rows,
    family: "length",
    format: "static",
    claim: { takeaway: "Le Qatar émet 40,1 t" },
  }).gestures[0].note;

describe("a note's whitespace", () => {
  it("should drop a leading newline and fold inner line breaks to one space", () => {
    expect(noteOf("\nQatar,\n  40,1 t ")).toBe("Qatar, 40,1 t");
  });

  it("should keep the no-break spaces French typography sets", () => {
    expect(noteOf("40,1 t : Qatar")).toBe("40,1 t : Qatar");
  });
});
