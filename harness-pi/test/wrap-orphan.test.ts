import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { wrapWords } from "../craft/_shared/gesture-family-position.mjs";

// gx-dot-strip static (Qwen3.5-9B, 2026-11-14): the title broke as "…le plafond de" / "2" — the figure the claim is
// about, alone on its own line. A last line under a quarter of the column takes words down from the line above.
const chars = (s: string) => s.length;
const TITLE = "Le plancher européen est monté de 30 points, le plafond de 2";

describe("wrapWords", () => {
  it("should not leave a lone short word on the last line", () => {
    const lines = wrapWords(TITLE, 58, chars);
    expect(lines.at(-1)!.length).toBeGreaterThanOrEqual(58 / 4);
  });

  it("should keep every word, in order", () => {
    expect(wrapWords(TITLE, 58, chars).join(" ")).toBe(TITLE);
  });

  it("should keep every line within the width", () => {
    expect(Math.max(...wrapWords(TITLE, 58, chars).map(chars))).toBeLessThanOrEqual(58);
  });

  it("should leave a single line alone", () => {
    expect(wrapWords("Le plafond de 2", 58, chars)).toEqual(["Le plafond de 2"]);
  });
});
