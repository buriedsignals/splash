import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// gx-connected-scatter web, Qwen3.5-9B (mvq17, mvq18): the example's limits was one string continued with "+"; told
// to put the journalist's limits first, Qwen replaced the first line, ended it with a comma and left the second line
// loose — "Expected identifier" twice, in two runs. The refusal asks for a list of forms; the example shows one.
const example = (format: string) => readFileSync(join(import.meta.dirname, "..", "craft", format, "connected-scatter", "beat.example.mjs"), "utf8");

describe("the connected-scatter examples' limits", () => {
  for (const format of ["web", "scrolly"])
    it(`should be a list of forms in ${format}`, () => {
      expect(example(format)).toMatch(/\n {2}limits: \[\n/);
    });
});
