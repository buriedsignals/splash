import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { validateGestures } from "../craft/_shared/gesture-core.mjs";

// gx-cartogram video (Qwen3.5-9B, mvq76): the takeaway's verb "est" matched the row coded EST, so a name on Russia,
// the storyboard's own subject, was refused as not serving a takeaway "about Estonia", twice.
const BEAT = {
  rows: [
    { name: "EST", value: 30.2 },
    { name: "RUS", value: 37.5 },
    { name: "NOR", value: 98.6 },
  ],
  family: "length",
  format: "static",
  claim: {
    takeaway: "Compté par pays, le bas-carbone européen est à 65,1 %",
    subject: "la Russie, le plus grand territoire",
  },
};

describe("a country code in a sentence", () => {
  it("should not read a lowercase word as the row it spells", () => {
    expect(() => validateGestures({ ...BEAT, gestures: [{ do: "highlight", mark: "NOR" }] })).not.toThrow(/about EST/);
  });

  it("should still read the code written in capitals", () => {
    const { entities } = validateGestures({
      ...BEAT,
      claim: { takeaway: "EST à 30,2 %, NOR à 98,6 %" },
      gestures: [{ do: "highlight", mark: "NOR" }],
    });
    expect([...entities]).toContain("EST");
  });
});
