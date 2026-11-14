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

// The same rule in every static kit: each one carried its own greedy wrap, so the dot strip's fix alone left the other
// twelve kits free to strand a title's last figure.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { balanceLast } from "../craft/_shared/wrap-balance.mjs";

describe("balanceLast", () => {
  it("should leave no last line under a quarter of the column when the line above can give a word", () => {
    const lines = balanceLast(["Le plancher européen est monté de 30 points, le", "plafond de 2"].flatMap((l) => l), 58, (s: string) => s.length);
    expect(lines.at(-1)!.length).toBeGreaterThanOrEqual(58 / 4);
  });
});

describe("every static kit's wrap", () => {
  const dir = join(import.meta.dir, "../craft/_shared");
  const kits = readdirSync(dir).filter((f) => /^Gesture.*Static.*\.tsx$|^gesture-keyed\.mjs$/.test(f));
  for (const f of kits) {
    const src = readFileSync(join(dir, f), "utf8");
    const greedy = (src.match(/\.push\((current|cur|line)\);\n\s*(return|wrapCache|balanceLast)/g) ?? []).length;
    if (!greedy) continue;
    it(`should balance its last line in ${f}`, () => {
      expect((src.match(/balanceLast\(/g) ?? []).length).toBeGreaterThanOrEqual(greedy);
    });
  }
});
